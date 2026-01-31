# Data Pipeline

Processes raw account data from Excel/CSV exports into territory assignments
and map-ready JSON for the Next.js visualization app.

## Directory Layout

```
pipeline/
├── __init__.py
├── constants.py        # Column names, schemas, output filenames, area definitions
├── utils.py            # clean_zip_code, load_excel_safe, validate_dataframe, geocode_batch
├── Makefile            # Automation: ingest → transform → export → verify
├── tests/
│   ├── test_utils.py       # 23 unit tests for utils functions
│   └── test_constants.py   # 14 smoke tests for schema integrity
```

## Scripts

| Script | Purpose |
|--------|---------|
| `create_master_assignments.py` | Reads Phoenix & Tucson account data, maps ZIPs to branches/areas, produces master assignment workbook and map JSON |
| `phoenix_territory_optimization/optimize_territories.py` | Rebalances Phoenix territories (West/Central/East) + integrates Tucson accounts, outputs optimized assignments |

## Inputs

All paths are configurable via CLI flags or Makefile variables.

| File | Description | Default Location |
|------|-------------|-----------------|
| `Phoenix_3Branch_Final_Consolidation.xlsx` | ZIP-to-area mapping (sheets: "ZIP Code Detail", "Tucson Integration") | Project root |
| `Uploads/Residential Data for Phoenix.xlsx` | Active Phoenix residential accounts | `Uploads/` |
| `Uploads/Tucson CG Active List.csv` | Active Tucson accounts | `Uploads/` |
| `tucson_account_mapping.csv` | Tucson account → branch mapping | Project root |
| `config/branch_definitions.json` | Territory definitions, consolidation map, branch ZIP lists | `config/` |

## Outputs

### create_master_assignments.py

| Output | Format | Description |
|--------|--------|-------------|
| `Master_Account_Branch_Assignments.xlsx` | Excel | Full master assignment workbook |
| `Phoenix_Zip_Code_Map_Data.json` / `.csv` | JSON/CSV | Phoenix ZIP → area/branch for map rendering |
| `Tucson_Zip_Code_Map_Data.json` / `.csv` | JSON/CSV | Tucson ZIP → area/branch for map rendering |
| `Master_Account_Assignment_Report.md` | Markdown | Summary statistics report |

### optimize_territories.py

| Output | Format | Description |
|--------|--------|-------------|
| `All_Accounts_with_Area_Assignments.csv` | CSV | Every account with final area |
| `Territory_Summary.csv` | CSV | Account counts per area |
| `Zip_Code_Area_Assignments.csv` | CSV | ZIP → area lookup |
| `Territory_Changes.csv` | CSV | ZIPs that moved between areas |
| `Optimization_Report.txt` | Text | Detailed run log |
| `map_data.json` | JSON | Territory data for the web app |

## How to Run

### Using the Makefile (recommended)

```bash
# Full pipeline: verify inputs → build assignments → optimize → syntax check
make -f pipeline/Makefile pipeline

# Individual stages
make -f pipeline/Makefile ingest       # Check input files exist
make -f pipeline/Makefile transform    # Run create_master_assignments.py
make -f pipeline/Makefile export       # Run optimize_territories.py
make -f pipeline/Makefile verify       # Syntax-check scripts
```

Override data paths:

```bash
make -f pipeline/Makefile pipeline DATA_ROOT=/path/to/data
```

### Direct execution

```bash
# Master assignments
python3 create_master_assignments.py \
  --data-root . \
  --config config/branch_definitions.json \
  --phoenix-workbook Phoenix_3Branch_Final_Consolidation.xlsx \
  --phoenix-accounts "Uploads/Residential Data for Phoenix.xlsx" \
  --tucson-accounts "Uploads/Tucson CG Active List.csv" \
  --tucson-mapping tucson_account_mapping.csv

# Territory optimization
python3 phoenix_territory_optimization/optimize_territories.py \
  --data-root . \
  --config config/branch_definitions.json \
  --target-west 510 --target-central 546 --target-east 585
```

### Running tests

```bash
python3 -m pytest pipeline/tests/ -v
```

## How Outputs Feed the App

The Next.js app (`phoenix_territory_map/nextjs_space/`) loads pipeline outputs
from its `public/` directory:

1. Map JSON files → `public/` → fetched by territory map components
2. Customer lookup data → `public/customer-lookup.json`
3. Route assignments → `public/route-assignments.json`

After running the pipeline, copy relevant outputs to `public/` and redeploy.
