"""Unit tests for pipeline.utils.

Covers ZIP code cleaning, DataFrame validation, branch mapping,
coordinate detection, and address extraction.

bd-2ks
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import pytest

from pipeline.utils import (
    build_branch_to_area_map,
    clean_zip_code,
    geocode_batch,
    load_branch_definitions,
    load_excel_safe,
    validate_dataframe,
)


# ---------------------------------------------------------------------------
# clean_zip_code
# ---------------------------------------------------------------------------

class TestCleanZipCode:
    """Tests for ZIP code normalization."""

    def test_basic_five_digit(self):
        s = pd.Series(["85001", "85251", "85308"])
        result = clean_zip_code(s)
        assert list(result) == ["85001", "85251", "85308"]

    def test_strips_whitespace(self):
        s = pd.Series(["  85001  ", "85251\t"])
        result = clean_zip_code(s)
        assert list(result) == ["85001", "85251"]

    def test_removes_trailing_decimal(self):
        """Numeric ZIP codes loaded from Excel sometimes have .0 suffix."""
        s = pd.Series(["85001.0", "85251.0"])
        result = clean_zip_code(s)
        assert list(result) == ["85001", "85251"]

    def test_strips_zip_plus_four(self):
        s = pd.Series(["85001-1234", "85251-5678"])
        result = clean_zip_code(s)
        assert list(result) == ["85001", "85251"]

    def test_preserves_leading_zeros(self):
        """East coast ZIPs like 01234 must keep leading zeros."""
        s = pd.Series(["1234", "234"])
        result = clean_zip_code(s)
        assert list(result) == ["01234", "00234"]

    def test_nan_values_become_na(self):
        s = pd.Series(["nan", "None", ""])
        result = clean_zip_code(s)
        assert result.isna().all()

    def test_numeric_input(self):
        """Integer ZIP codes (from numeric Excel columns) should work."""
        s = pd.Series([85001, 85251])
        result = clean_zip_code(s)
        assert list(result) == ["85001", "85251"]

    def test_truncates_to_five(self):
        s = pd.Series(["850011234"])
        result = clean_zip_code(s)
        assert list(result) == ["85001"]


# ---------------------------------------------------------------------------
# validate_dataframe
# ---------------------------------------------------------------------------

class TestValidateDataframe:
    """Tests for required column validation."""

    def test_passes_with_all_columns(self):
        df = pd.DataFrame({"A": [1], "B": [2], "C": [3]})
        validate_dataframe(df, ["A", "B"])  # Should not raise

    def test_raises_on_missing_column(self):
        df = pd.DataFrame({"A": [1], "B": [2]})
        with pytest.raises(ValueError, match="missing required columns.*C"):
            validate_dataframe(df, ["A", "C"], context="test data")

    def test_context_in_error_message(self):
        df = pd.DataFrame({"X": [1]})
        with pytest.raises(ValueError, match="my context"):
            validate_dataframe(df, ["Y"], context="my context")

    def test_empty_required_columns(self):
        df = pd.DataFrame({"A": [1]})
        validate_dataframe(df, [])  # Should not raise


# ---------------------------------------------------------------------------
# build_branch_to_area_map
# ---------------------------------------------------------------------------

class TestBuildBranchToAreaMap:
    """Tests for branch name → area mapping."""

    def test_basic_mapping(self):
        defs = {
            "locations": {
                "arizona": {
                    "consolidationMap": {
                        "Branch 1 - North Scottsdale": "East",
                        "Branch 5 - Peoria": "West",
                    }
                }
            }
        }
        result = build_branch_to_area_map(defs)
        assert result["Branch 1 - North Scottsdale"] == "East"
        assert result["Branch 5 - Peoria"] == "West"
        # Short names (prefix before " - ") also mapped
        assert result["Branch 1"] == "East"
        assert result["Branch 5"] == "West"

    def test_empty_definitions(self):
        assert build_branch_to_area_map({}) == {}
        assert build_branch_to_area_map({"locations": {}}) == {}

    def test_missing_consolidation_map(self):
        defs = {"locations": {"arizona": {}}}
        assert build_branch_to_area_map(defs) == {}

    def test_non_string_values_skipped(self):
        defs = {
            "locations": {
                "arizona": {
                    "consolidationMap": {
                        "Good Branch": "West",
                        123: "East",  # non-string key
                        "Bad Area": None,  # non-string value
                    }
                }
            }
        }
        result = build_branch_to_area_map(defs)
        assert result == {"Good Branch": "West"}


# ---------------------------------------------------------------------------
# load_branch_definitions
# ---------------------------------------------------------------------------

class TestLoadBranchDefinitions:
    """Tests for JSON config loading."""

    def test_loads_valid_json(self, tmp_path: Path):
        data = {"locations": {"arizona": {"territories": []}}}
        fp = tmp_path / "branch_defs.json"
        fp.write_text(json.dumps(data))
        result = load_branch_definitions(fp)
        assert result == data

    def test_raises_on_missing_file(self, tmp_path: Path):
        with pytest.raises(FileNotFoundError, match="not found"):
            load_branch_definitions(tmp_path / "nonexistent.json")


# ---------------------------------------------------------------------------
# load_excel_safe
# ---------------------------------------------------------------------------

class TestLoadExcelSafe:
    """Tests for safe Excel loading."""

    def test_raises_on_missing_file(self, tmp_path: Path):
        with pytest.raises(FileNotFoundError, match="not found"):
            load_excel_safe(tmp_path / "missing.xlsx", "Sheet1")

    def test_raises_on_wrong_sheet(self, tmp_path: Path):
        fp = tmp_path / "test.xlsx"
        pd.DataFrame({"A": [1]}).to_excel(fp, sheet_name="RealSheet", index=False)
        with pytest.raises(ValueError, match="not found"):
            load_excel_safe(fp, "FakeSheet")

    def test_loads_correct_sheet(self, tmp_path: Path):
        fp = tmp_path / "test.xlsx"
        expected = pd.DataFrame({"col1": [10, 20], "col2": ["a", "b"]})
        expected.to_excel(fp, sheet_name="Data", index=False)
        result = load_excel_safe(fp, "Data")
        pd.testing.assert_frame_equal(result, expected)


# ---------------------------------------------------------------------------
# geocode_batch (without API key → skip all)
# ---------------------------------------------------------------------------

class TestGeocodeBatch:
    """Tests for batch geocoding (unit-safe, no real API calls)."""

    def test_skips_when_no_api_key(self):
        df = pd.DataFrame({"address": ["123 Main St"], "latitude": [pd.NA], "longitude": [pd.NA]})
        with patch.dict("os.environ", {}, clear=True):
            result_df, stats = geocode_batch(df, api_key=None)
        assert stats.geocoded == 0
        assert stats.skipped == len(df)

    def test_skips_rows_with_existing_coordinates(self):
        df = pd.DataFrame({
            "address": ["123 Main St"],
            "latitude": [33.45],
            "longitude": [-112.07],
        })
        with patch.dict("os.environ", {}, clear=True):
            result_df, stats = geocode_batch(df, api_key=None)
        assert stats.skipped == 1
        assert stats.geocoded == 0
