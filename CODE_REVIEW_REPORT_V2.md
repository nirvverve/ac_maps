# Comprehensive Code Review Report: Data Analysis & Processing Pipeline

**Review Date:** January 29, 2026
**Reviewer:** Gemini CLI
**Scope:** Review of the Python data analysis scripts and processing pipeline located in `/data/projects/ac_maps/`.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Critical Issues](#3-critical-issues)
4. [Code Quality Findings](#4-code-quality-findings)
5. [Reproducibility & Environment](#5-reproducibility--environment)
6. [Maintainability & Technical Debt](#6-maintainability--technical-debt)
7. [Prioritized Action Items](#7-prioritized-action-items)

---

## 1. Executive Summary

The codebase currently consists of a loose collection of imperative Python scripts designed for ad-hoc data analysis, report generation, and visualization of territory maps. While these scripts successfully generate the required outputs (CSVs, HTML charts), they exhibit the classic characteristics of "research code" that has been pushed into production use without engineering rigor.

The primary concerns are:
1.  **Brittle Environment Dependencies:** Hardcoded absolute paths (e.g., `/home/ubuntu/Uploads/...`) make the scripts non-portable and liable to fail on any other machine or user account.
2.  **Lack of Modularity:** Code is written as linear, top-to-bottom execution streams without functions, classes, or shared modules. This leads to significant code duplication and testing difficulties.
3.  **Hardcoded Business Logic:** Critical business rules (branch definitions, ZIP code mappings, territory colors) are embedded directly into the source code of multiple files, creating a "single source of truth" problem.

Transitioning this from a set of "one-off scripts" to a **Data Processing Pipeline** is critical for the long-term reliability of the territory mapping project.

---

## 2. Architecture Overview

### Current State: "Script Sprawl"
The project follows a flat directory structure where each analysis task corresponds to a standalone Python script.

-   **Data Ingestion:** `pandas.read_excel()` / `pd.read_csv()` called directly in every script.
-   **Transformation:** Logic is repeated across scripts (e.g., ZIP code stripping/cleaning).
-   **Output:** Scripts write directly to the local filesystem (CSVs, HTML files) with no central output management.
-   **Visualization:** Plotly is used to generate HTML files, which are saved individually.

### What Works Well
-   **Library Choice:** The use of `pandas` for data manipulation and `plotly` for interactive visualization is appropriate and powerful for this domain.
-   **Visual Output:** The generated HTML dashboards are self-contained and easy to share, providing high immediate value to stakeholders.

---

## 3. Critical Issues

### 3.1 Hardcoded Absolute Paths
**Files:** `phoenix_analysis.py`, `create_visualizations.py`, `tucson_analysis.py`

Scripts rely on specific files existing in a user's home directory:
```python
# phoenix_analysis.py
df_current = pd.read_excel('/home/ubuntu/Uploads/Residential Data for Phoenix.xlsx')
```
**Impact:** These scripts will fail immediately if run by another user, in a CI/CD environment, or if the `Uploads` folder is reorganized.
**Recommendation:** Use relative paths, environment variables, or a command-line argument parser to define input/output locations.

### 3.2 Hardcoded Business Data
**File:** `phoenix_analysis.py` (Lines 22-86)

A massive dictionary defining 11 branches and their assigned ZIP codes is hardcoded directly in the script:
```python
branches = {
    1: { 'name': 'North Scottsdale', 'zips': ['85255', ...] },
    # ... 100+ lines of configuration
}
```
**Impact:** If a ZIP code moves from one branch to another, a developer must find and update this dictionary in every script that uses it.
**Recommendation:** Move this configuration to a separate JSON or YAML file (e.g., `config/branch_definitions.json`) and load it dynamically.

### 3.3 Lack of Error Handling
**Files:** All Scripts

There are no `try/except` blocks around file I/O operations.
```python
df_analysis = pd.read_excel(file_path, sheet_name='#3 - Analysis by Zip Code')
```
**Impact:** If the file is missing, the sheet name changes, or the format is invalid, the script crashes with a raw Python stack trace, which is unfriendly for end-users.
**Recommendation:** Implement robust file loading with user-friendly error messages validating file existence and schema expectations.

---

## 4. Code Quality Findings

### 4.1 Imperative "Main-less" Execution
Scripts execute immediately upon import. There is no `if __name__ == "__main__":` block.
**Impact:** You cannot import `phoenix_analysis.py` to test a specific calculation without running the entire analysis and generating all files.
**Recommendation:** Encapsulate logic in functions (`load_data`, `process_data`, `generate_report`) and use a `main()` entry point.

### 4.2 Magic Strings & Integers
Column names are repeated as string literals throughout the codebase:
-   `'ShippingPostalCode'`
-   `'ProposedBranch'`
-   `'ActiveAccounts'`

**Impact:** A typo in one string (`'ActiveAccount'` vs `'ActiveAccounts'`) will cause runtime errors that are hard to debug.
**Recommendation:** Define constant variables for column names (e.g., `COL_ZIP_CODE = 'ShippingPostalCode'`).

### 4.3 Silent Data Dropping
In `phoenix_analysis.py`:
```python
warnings.filterwarnings('ignore')
```
**Impact:** This suppresses potential warnings about deprecated features or data integrity issues (like SettingWithCopyWarning), potentially hiding subtle bugs.
**Recommendation:** Remove the warning filter and fix the underlying issues (usually by using `.loc` for assignments).

---

## 5. Reproducibility & Environment

### 5.1 No Dependency Definition
There is no `requirements.txt`, `Pipfile`, or `pyproject.toml` visible in the file list.
**Impact:** A new developer does not know which versions of `pandas`, `plotly`, or `openpyxl` are required to run these scripts. Version mismatches could break the visualizations.
**Recommendation:** Generate a `requirements.txt` immediately.

---

## 6. Maintainability & Technical Debt

### 6.1 Logic Duplication
The logic to clean ZIP codes (strip whitespace, ensure 5 digits) appears to be repeated:
```python
# phoenix_analysis.py
df_current['ShippingPostalCode'] = df_current['ShippingPostalCode'].astype(str).str.strip().str[:5]
```
If this logic needs to change (e.g., to handle 9-digit ZIPs), it must be fixed everywhere.

### 6.2 "Magic" Excel Sheet Names
Scripts rely on specific sheet names like `'#3 - Analysis by Zip Code'`.
**Impact:** This implies the input data is being manually prepared or formatted in Excel before being fed to the script, creating a fragile manual dependency in the pipeline.

---

## 7. Prioritized Action Items

### Tier 1 — High Impact, Low Effort (Immediate Fixes)
| # | Action | Rationale |
|---|--------|-----------|
| 1 | **Create `requirements.txt`** | Pin dependency versions to ensure reproducibility. |
| 2 | **Externalize Config** | Move the `branches` dictionary from `phoenix_analysis.py` to `branch_config.json`. |
| 3 | **Fix Absolute Paths** | Replace `/home/ubuntu/Uploads/...` with relative paths (e.g., `./data/input/`). |

### Tier 2 — High Impact, Moderate Effort (Refactoring)
| # | Action | Rationale |
|---|--------|-----------|
| 4 | **Modularize Code** | Refactor scripts into functions (`load()`, `transform()`, `export()`) wrapped in `if __name__ == "__main__":`. |
| 5 | **Shared Utility Module** | Create a `utils.py` for common tasks like ZIP code cleaning and standardized file loading. |
| 6 | **Constants File** | Create `constants.py` to hold column names and magic strings. |

### Tier 3 — Long Term (Architecture)
| # | Action | Rationale |
|---|--------|-----------|
| 7 | **CLI Interface** | Use `argparse` to allow users to specify input files and output directories via command line. |
| 8 | **Automated Testing** | Add unit tests for the transformation logic (e.g., ensuring ZIP codes are correctly assigned to branches). |

---

*End of Report*
