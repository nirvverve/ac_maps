"""Shared constants for data pipeline scripts.

Single source of truth for column names, sheet names, expected schemas,
area/market definitions, and output file names used by
create_master_assignments.py and optimize_territories.py.

bd-5ka
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Geographic / Territory Definitions
# ---------------------------------------------------------------------------

PHOENIX_AREAS: list[str] = ["West", "Central", "East"]
ALL_AREAS: list[str] = ["West", "Central", "East", "Tucson"]
MARKETS: list[str] = ["Phoenix", "Tucson"]
DEFAULT_STATE_CODE: str = "AZ"
DEFAULT_AREA: str = "East"  # Fallback when ZIP has no mapping

PERIPHERAL_CITIES: list[str] = [
    "CASA GRANDE",
    "MARICOPA",
    "SAN TAN VALLEY",
    "COOLIDGE",
    "ELOY",
    "ARIZONA CITY",
    "STANFIELD",
    "RED ROCK",
]

# ---------------------------------------------------------------------------
# Excel Sheet Names
# ---------------------------------------------------------------------------

SHEET_ZIP_CODE_DETAIL: str = "ZIP Code Detail"
SHEET_TUCSON_INTEGRATION: str = "Tucson Integration"

# ---------------------------------------------------------------------------
# Source DataFrame Column Names (as they appear in input files)
# ---------------------------------------------------------------------------

COL_SHIPPING_POSTAL_CODE: str = "ShippingPostalCode"
COL_SHIPPING_STREET: str = "ShippingStreet"
COL_SHIPPING_CITY: str = "ShippingCity"
COL_SHIPPING_STATE_CODE: str = "ShippingStateCode"
COL_DISPLAY_NAME: str = "Display Name"
COL_CUSTOMER_NUMBER: str = "Customer_Number__c"
COL_NAME: str = "Name"
COL_CONSOLIDATED_AREA: str = "ConsolidatedArea"
COL_SOURCE: str = "Source"
COL_PROPOSED_BRANCH: str = "Proposed_Branch"

# Optional source columns (may or may not be present)
COL_SERVICE_CONTRACT: str = "Service Contract Description"
COL_TERRITORY: str = "Territory"
COL_ROUTE_NAME: str = "Route Name"
COL_MAINTENANCE_DAY: str = "Maintenance Plan Day of Week"
COL_INVOICE_EMAIL: str = "Invoice Bill To Email"
COL_SHORT_BRANCH_NAME: str = "Short Branch Name"

# ---------------------------------------------------------------------------
# Expected Input Schemas (required columns per data source)
# ---------------------------------------------------------------------------

PHOENIX_ZIP_DETAIL_COLS: list[str] = [
    COL_SHIPPING_POSTAL_CODE,
    COL_CONSOLIDATED_AREA,
    COL_SOURCE,
]

PHOENIX_ACCOUNTS_COLS: list[str] = [
    COL_SHIPPING_POSTAL_CODE,
    COL_SHIPPING_STREET,
    COL_SHIPPING_CITY,
    COL_DISPLAY_NAME,
]

TUCSON_ACCOUNTS_COLS: list[str] = [
    COL_SHIPPING_POSTAL_CODE,
    COL_CUSTOMER_NUMBER,
    COL_NAME,
]

TUCSON_MAPPING_COLS: list[str] = [
    COL_CUSTOMER_NUMBER,
    COL_PROPOSED_BRANCH,
]

OPTIMIZE_PHOENIX_COLS: list[str] = [
    COL_SHIPPING_POSTAL_CODE,
    COL_CUSTOMER_NUMBER,
    COL_NAME,
    COL_SHIPPING_STREET,
]

OPTIMIZE_TUCSON_COLS: list[str] = [
    COL_SHIPPING_POSTAL_CODE,
    COL_SHIPPING_CITY,
    COL_CUSTOMER_NUMBER,
    COL_NAME,
    COL_SHIPPING_STREET,
]

OPTIMIZE_BRANCH_COLS: list[str] = [
    COL_SHIPPING_POSTAL_CODE,
    "ProposedBranch",
]

# ---------------------------------------------------------------------------
# Master Output Schema (standardised column names)
# ---------------------------------------------------------------------------

MASTER_COL_ACCOUNT_ID: str = "Account_ID"
MASTER_COL_CUSTOMER_NUMBER: str = "Customer_Number"
MASTER_COL_STREET_ADDRESS: str = "Street_Address"
MASTER_COL_CITY: str = "City"
MASTER_COL_ZIP_CODE: str = "Zip_Code"
MASTER_COL_STATUS: str = "Status"
MASTER_COL_MARKET: str = "Market"
MASTER_COL_BRANCH_ASSIGNMENT: str = "Branch_Assignment"
MASTER_COL_AREA: str = "Area"
MASTER_COL_SERVICE_CONTRACT: str = "Service_Contract"
MASTER_COL_TERRITORY: str = "Territory"
MASTER_COL_ROUTE: str = "Route"
MASTER_COL_MAINTENANCE_DAY: str = "Maintenance_Day"
MASTER_COL_SPECIAL_FLAG: str = "Special_Flag"
MASTER_COL_EMAIL: str = "Email"

MASTER_SCHEMA: list[str] = [
    MASTER_COL_ACCOUNT_ID,
    MASTER_COL_CUSTOMER_NUMBER,
    MASTER_COL_STREET_ADDRESS,
    MASTER_COL_CITY,
    MASTER_COL_ZIP_CODE,
    MASTER_COL_STATUS,
    MASTER_COL_MARKET,
    MASTER_COL_BRANCH_ASSIGNMENT,
    MASTER_COL_AREA,
    MASTER_COL_SERVICE_CONTRACT,
    MASTER_COL_TERRITORY,
    MASTER_COL_ROUTE,
    MASTER_COL_MAINTENANCE_DAY,
    MASTER_COL_SPECIAL_FLAG,
    MASTER_COL_EMAIL,
]

# Summary / map-data output columns
SUMMARY_COLS: list[str] = [
    MASTER_COL_BRANCH_ASSIGNMENT,
    "Account_Count",
    "Primary_Market",
]

MARKET_SUMMARY_COLS: list[str] = [
    MASTER_COL_MARKET,
    MASTER_COL_AREA,
    "Account_Count",
]

MAP_DATA_COLS: list[str] = [
    MASTER_COL_ZIP_CODE,
    MASTER_COL_AREA,
    MASTER_COL_BRANCH_ASSIGNMENT,
    "Active_Accounts",
    "Special_Flag_Count",
]

# ---------------------------------------------------------------------------
# Optimize output columns
# ---------------------------------------------------------------------------

OPTIMIZE_OUTPUT_COLS: list[str] = [
    COL_CUSTOMER_NUMBER,
    COL_NAME,
    COL_SHIPPING_STREET,
    COL_SHIPPING_STATE_CODE,
    COL_SHIPPING_POSTAL_CODE,
    "ZipCode",
    "Area",
    COL_SOURCE,
]

# ---------------------------------------------------------------------------
# Special Flag Values
# ---------------------------------------------------------------------------

FLAG_TUCSON_ASSOCIATED: str = "Tucson-Associated (Phoenix East)"
FLAG_UNASSIGNED_ZIP: str = "Unassigned ZIP Code"
FLAG_NO_BRANCH: str = "No branch assignment found"

# ---------------------------------------------------------------------------
# Source Tags
# ---------------------------------------------------------------------------

SOURCE_PHOENIX: str = "Phoenix"
SOURCE_TUCSON: str = "Tucson"
SOURCE_TUCSON_PERIPHERAL: str = "Tucson (Peripheral)"

# ---------------------------------------------------------------------------
# Optimization Defaults
# ---------------------------------------------------------------------------

DEFAULT_TARGET_WEST: int = 510
DEFAULT_TARGET_CENTRAL: int = 546
DEFAULT_TARGET_EAST: int = 585
DEFAULT_MAX_ITERATIONS: int = 1000

# ---------------------------------------------------------------------------
# Output File Names
# ---------------------------------------------------------------------------

# create_master_assignments outputs
OUT_MASTER_WORKBOOK: str = "Master_Account_Branch_Assignments.xlsx"
OUT_PHOENIX_MAP_JSON: str = "Phoenix_Zip_Code_Map_Data.json"
OUT_PHOENIX_MAP_CSV: str = "Phoenix_Zip_Code_Map_Data.csv"
OUT_TUCSON_MAP_JSON: str = "Tucson_Zip_Code_Map_Data.json"
OUT_TUCSON_MAP_CSV: str = "Tucson_Zip_Code_Map_Data.csv"
OUT_MASTER_REPORT: str = "Master_Account_Assignment_Report.md"

# optimize_territories outputs
OUT_ALL_ACCOUNTS_CSV: str = "All_Accounts_with_Area_Assignments.csv"
OUT_TERRITORY_SUMMARY_CSV: str = "Territory_Summary.csv"
OUT_ZIP_ASSIGNMENTS_CSV: str = "Zip_Code_Area_Assignments.csv"
OUT_TERRITORY_CHANGES_CSV: str = "Territory_Changes.csv"
OUT_OPTIMIZATION_REPORT: str = "Optimization_Report.txt"
OUT_MAP_DATA_JSON: str = "map_data.json"

# ---------------------------------------------------------------------------
# Default Input File Names (used as argparse defaults)
# ---------------------------------------------------------------------------

DEFAULT_PHOENIX_WORKBOOK: str = "Phoenix_3Branch_Final_Consolidation.xlsx"
DEFAULT_PHOENIX_ACCOUNTS: str = "Uploads/Residential Data for Phoenix.xlsx"
DEFAULT_TUCSON_ACCOUNTS: str = "Uploads/Tucson CG Active List.csv"
DEFAULT_TUCSON_MAPPING: str = "tucson_account_mapping.csv"
DEFAULT_BRANCH_DEFINITIONS: str = "config/branch_definitions.json"
