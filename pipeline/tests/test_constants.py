"""Smoke tests for pipeline.constants.

Verifies that all schema definitions are non-empty lists of strings
and that key constants have expected values.

bd-2ks
"""

from __future__ import annotations

from pipeline.constants import (
    ALL_AREAS,
    DEFAULT_AREA,
    DEFAULT_STATE_CODE,
    MARKETS,
    MASTER_SCHEMA,
    OPTIMIZE_OUTPUT_COLS,
    PERIPHERAL_CITIES,
    PHOENIX_ACCOUNTS_COLS,
    PHOENIX_AREAS,
    PHOENIX_ZIP_DETAIL_COLS,
    TUCSON_ACCOUNTS_COLS,
    TUCSON_MAPPING_COLS,
)


class TestAreaDefinitions:
    def test_phoenix_areas_subset_of_all(self):
        assert set(PHOENIX_AREAS).issubset(set(ALL_AREAS))

    def test_all_areas_includes_tucson(self):
        assert "Tucson" in ALL_AREAS

    def test_default_area_is_valid(self):
        assert DEFAULT_AREA in ALL_AREAS

    def test_markets_non_empty(self):
        assert len(MARKETS) >= 2
        assert "Phoenix" in MARKETS
        assert "Tucson" in MARKETS


class TestSchemas:
    def test_master_schema_non_empty(self):
        assert len(MASTER_SCHEMA) >= 10
        assert all(isinstance(c, str) for c in MASTER_SCHEMA)

    def test_master_schema_has_key_columns(self):
        assert "Account_ID" in MASTER_SCHEMA
        assert "Zip_Code" in MASTER_SCHEMA
        assert "Area" in MASTER_SCHEMA
        assert "Market" in MASTER_SCHEMA

    def test_phoenix_accounts_cols(self):
        assert len(PHOENIX_ACCOUNTS_COLS) >= 3
        assert "ShippingPostalCode" in PHOENIX_ACCOUNTS_COLS

    def test_tucson_accounts_cols(self):
        assert len(TUCSON_ACCOUNTS_COLS) >= 2
        assert "ShippingPostalCode" in TUCSON_ACCOUNTS_COLS

    def test_phoenix_zip_detail_cols(self):
        assert "ConsolidatedArea" in PHOENIX_ZIP_DETAIL_COLS

    def test_tucson_mapping_cols(self):
        assert "Customer_Number__c" in TUCSON_MAPPING_COLS

    def test_optimize_output_cols(self):
        assert "Area" in OPTIMIZE_OUTPUT_COLS
        assert "Source" in OPTIMIZE_OUTPUT_COLS

    def test_no_duplicate_columns_in_master(self):
        assert len(MASTER_SCHEMA) == len(set(MASTER_SCHEMA))


class TestDefaults:
    def test_state_code(self):
        assert DEFAULT_STATE_CODE == "AZ"

    def test_peripheral_cities_non_empty(self):
        assert len(PERIPHERAL_CITIES) >= 5
        assert all(isinstance(c, str) for c in PERIPHERAL_CITIES)
        assert all(c == c.upper() for c in PERIPHERAL_CITIES)
