"""Shared utilities for data pipeline scripts."""

from __future__ import annotations

from dataclasses import dataclass
import json
import logging
import os
from pathlib import Path
import time
from typing import Iterable, Mapping, Sequence
from urllib.parse import urlencode
from urllib.request import urlopen

import pandas as pd

logger = logging.getLogger(__name__)


def clean_zip_code(series: pd.Series) -> pd.Series:
    """Normalize ZIP codes to 5-digit strings, preserving leading zeros."""
    cleaned = series.astype("string").str.strip()
    cleaned = cleaned.replace({"nan": pd.NA, "None": pd.NA, "": pd.NA})
    cleaned = cleaned.str.replace(r"\.0$", "", regex=True)
    cleaned = cleaned.str.split("-").str[0]
    cleaned = cleaned.str[:5]
    cleaned = cleaned.replace({"": pd.NA})
    return cleaned.str.zfill(5)


def load_excel_safe(path: str | Path, sheet_name: str) -> pd.DataFrame:
    """Load an Excel sheet with clear, user-friendly errors."""
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(
            "Required data file not found: "
            f"{file_path}\nExpected location: {file_path.resolve()}"
        )

    try:
        return pd.read_excel(file_path, sheet_name=sheet_name)
    except ValueError as exc:
        available = pd.ExcelFile(file_path).sheet_names
        raise ValueError(
            f"Sheet '{sheet_name}' not found in {file_path}.\n"
            f"Available sheets: {available}"
        ) from exc


def load_branch_definitions(path: str | Path) -> dict:
    """Load shared branch/territory definitions from JSON."""
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(
            "Branch definitions file not found: "
            f"{file_path}\nExpected location: {file_path.resolve()}"
        )

    with file_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def build_branch_to_area_map(branch_definitions: Mapping[str, object]) -> dict[str, str]:
    """Build a branch name -> area map from branch_definitions.json."""
    locations = branch_definitions.get("locations") if isinstance(branch_definitions, dict) else {}
    arizona = locations.get("arizona", {}) if isinstance(locations, dict) else {}
    consolidation = arizona.get("consolidationMap", {}) if isinstance(arizona, dict) else {}
    mapping: dict[str, str] = {}

    if isinstance(consolidation, dict):
        for branch_name, area in consolidation.items():
            if not isinstance(branch_name, str) or not isinstance(area, str):
                continue
            mapping[branch_name] = area
            if " - " in branch_name:
                mapping[branch_name.split(" - ")[0]] = area

    return mapping


def validate_dataframe(
    df: pd.DataFrame,
    required_columns: Sequence[str],
    *,
    context: str = "DataFrame",
) -> None:
    """Ensure required columns exist before processing."""
    missing = [column for column in required_columns if column not in df.columns]
    if missing:
        available = ", ".join(map(str, df.columns))
        raise ValueError(
            f"{context} is missing required columns: {missing}. "
            f"Available columns: [{available}]"
        )


@dataclass(frozen=True)
class GeocodeStats:
    processed: int
    geocoded: int
    skipped: int
    failed: int


def geocode_batch(
    df: pd.DataFrame,
    *,
    api_key: str | None = None,
    batch_size: int = 10,
    batch_delay_seconds: float = 1.1,
    max_retries: int = 2,
    address_columns: Sequence[str] | None = None,
    lat_column: str = "latitude",
    lng_column: str = "longitude",
) -> tuple[pd.DataFrame, GeocodeStats]:
    """Batch geocode rows that lack coordinates using Google Geocoding API."""
    resolved_key = api_key or os.getenv("GOOGLE_GEOCODING_API_KEY") or os.getenv(
        "GOOGLE_MAPS_API_KEY"
    )
    if not resolved_key:
        logger.warning("No Google Geocoding API key found; skipping geocoding.")
        return df, GeocodeStats(processed=len(df), geocoded=0, skipped=len(df), failed=0)

    output = df.copy()
    if lat_column not in output.columns:
        output[lat_column] = pd.NA
    if lng_column not in output.columns:
        output[lng_column] = pd.NA

    address_sets = [
        ("address",),
        ("Address",),
        ("full_address",),
        ("fullAddress",),
        ("street", "city", "state", "zip"),
        ("Street", "City", "State", "Zip"),
        ("ShippingStreet", "ShippingCity", "ShippingState", "ShippingPostalCode"),
        ("ShippingStreet", "ShippingCity", "ShippingStateCode", "ShippingPostalCode"),
    ]
    if address_columns:
        address_sets.insert(0, tuple(address_columns))

    cache: dict[str, tuple[float, float] | None] = {}
    needs_geocoding: list[tuple[int, str]] = []

    for index, row in output.iterrows():
        if _has_coordinates(row, lat_column, lng_column):
            continue
        address = _extract_address(row, address_sets)
        if address:
            needs_geocoding.append((index, address))

    processed = len(output)
    geocoded = 0
    failed = 0
    skipped = processed - len(needs_geocoding)

    for start in range(0, len(needs_geocoding), batch_size):
        batch = needs_geocoding[start : start + batch_size]

        for index, address in batch:
            coords = cache.get(address)
            if coords is None and address in cache:
                failed += 1
                continue

            if coords is None:
                coords = _geocode_with_retry(address, resolved_key, max_retries)
                cache[address] = coords

            if coords:
                output.at[index, lat_column] = coords[0]
                output.at[index, lng_column] = coords[1]
                geocoded += 1
            else:
                failed += 1

        if start + batch_size < len(needs_geocoding):
            time.sleep(batch_delay_seconds)

    return output, GeocodeStats(
        processed=processed,
        geocoded=geocoded,
        skipped=skipped,
        failed=failed,
    )


def _has_coordinates(row: pd.Series, lat_column: str, lng_column: str) -> bool:
    lat = row.get(lat_column)
    lng = row.get(lng_column)
    return pd.notna(lat) and pd.notna(lng)


def _extract_address(row: pd.Series, address_sets: Iterable[Sequence[str]]) -> str | None:
    for columns in address_sets:
        if not all(column in row for column in columns):
            continue
        parts = [str(row[column]).strip() for column in columns if pd.notna(row[column])]
        parts = [part for part in parts if part]
        if len(parts) >= 1:
            return ", ".join(parts)
    return None


def _geocode_with_retry(address: str, api_key: str, max_retries: int) -> tuple[float, float] | None:
    delay_seconds = 0.5
    for attempt in range(max_retries + 1):
        result = _geocode_once(address, api_key)
        if result:
            return result

        time.sleep(delay_seconds)
        delay_seconds = min(delay_seconds * 2, 2.0)

    logger.warning("Geocoding failed for address after retries: %s", address)
    return None


def _geocode_once(address: str, api_key: str) -> tuple[float, float] | None:
    query = urlencode({"address": address, "key": api_key})
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{query}"

    try:
        with urlopen(url, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001 - keep pipeline resilient
        logger.warning("Geocoding request failed for %s: %s", address, exc)
        return None

    if payload.get("status") != "OK":
        status = payload.get("status")
        if status and status != "ZERO_RESULTS":
            logger.warning("Geocoding status for %s: %s", address, status)
        return None

    results = payload.get("results") or []
    if not results:
        return None

    location = results[0].get("geometry", {}).get("location", {})
    lat = location.get("lat")
    lng = location.get("lng")

    if lat is None or lng is None:
        return None

    return float(lat), float(lng)
