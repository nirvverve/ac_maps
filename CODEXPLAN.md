# CODEXPLAN — APS Territory Platform Modernization Plan

**Plan Date:** January 30, 2026  
**Goal:** Preserve all current analytical tools while enabling safe, repeatable data updates via CSV/XLSX uploads, with a clean path away from DeepAgent-era scripts and toward a maintainable, config‑driven platform that supports multi‑location territory studies.

---

## 0) What We Must Preserve (Non‑Negotiables)

**Arizona (Phoenix/Tucson) — Residential & Ops**
- Residential Territory Assignment map (APS‑Glendale, APS‑Scottsdale, APS‑Chandler, APS‑Tucson) with colored ZIP polygons + markers + account count popups.
- Density Analysis (Active, Terminated, Churn Rate by ZIP/territory).
- Market Size.
- Revenue Analysis (monthly revenue + average contract by ZIP).
- Employee Locations (admin‑only).
- Commercial Accounts (separate dataset).
- Routes by Tech (technician filter, branch/day view).
- Ancillary Sales (ZIP‑level spend/priority).
- Customer Lookup (by account number, map pin + address).

**Other locations (Dallas, Orlando, Jacksonville, Miami)**
- Density Analysis, Revenue Analysis, Routes by Tech.
- Miami scenario maps (current/active): **Final Miami Territory Map**, **Commercial Routes**, **Future Commercial**, **Radical Reroute**.
- Miami scenario maps (archive/historical): Breakup Scenario I (fixed), Breakup Scenario II (ZIP), 10% Reassignment, Zip Optimized, Zip Optimized #2.

**Miami Residential Territory Split (New)**
- Three territories: **APS of Central Miami**, **APS of North Miami**, **APS of South Miami**.
- The **Final Miami Territory Map** reflects the latest setup with pools overlaid.

**New Requirement**
- **Upload‑driven updates** (CSV/XLSX) for the studies above without writing code.

---

## 1) Guiding Principles

- **Functionality first, refactor second.** Keep all existing studies intact while we modernize.
- **Config‑driven by default.** Locations, view availability, and data file paths must be controlled via configuration, not hardcoded conditionals.
- **Separation of concerns.** Ingestion → validation → transformation → output should be a repeatable pipeline.
- **Auditable data changes.** Every upload produces a versioned output with a clear source file and processing log.
- **Security by default.** Customer data must not be publicly reachable without authentication.
- **No destructive deletes without explicit approval.**

---

## 2) Data Architecture — The New Spine

### 2.1 Canonical Data Inputs
Introduce a stable input contract to support uploads:

```
data/
  input/
    arizona/
      residential_accounts.xlsx
      commercial_accounts.xlsx
      routes.csv
      employee_locations.xlsx
      ancillary_sales.csv
      market_size.csv
    miami/
      residential_accounts.xlsx
      commercial_accounts.xlsx
      routes.csv
      scenario_*.xlsx
```

### 2.2 Output Contracts (UI‑Ready JSON)
Each upload produces standardized JSON files used by the map views:

```
data/output/
  arizona/
    territory_assignments.json
    density_data.json
    revenue_data.json
    routes.json
    customer_lookup.json
    market_size.json
    ancillary_sales.json
```

These outputs are then copied/served to the app (or served via API).

### 2.3 Versioning
Every run generates:
- `data/output/<location>/<dataset>.json`
- `data/output/<location>/<dataset>.meta.json` (source filename, checksum, row counts, timestamp)

**Retention:** Keep all historical uploads and outputs for auditability.

---

## 3) UX & Workflow — Upload‑Based Updates

### 3.1 Admin Upload Console (New)
Create an admin‑only page where the user can:
- Select location
- Select dataset type (e.g., “Residential Accounts”, “Routes”, “Revenue”)
- Upload CSV/XLSX
- See validation results
- Trigger transform + preview
- Approve publish

### 3.2 Validation Feedback
Immediate validation:
- Required columns present
- Row counts & error rows listed
- Sample record preview
- Warnings for null geocodes or missing ZIPs

---

## 4) Platform Cleanup Strategy (DeepAgent Legacy)

### 4.1 Script Triage
Classify all `.py` scripts into:
1. **Active** (still used in pipeline)
2. **Recoverable** (logic used but needs refactor)
3. **Legacy/Archived** (no longer needed)

No deletions yet — archive after approval.

### 4.2 Single Source of Truth
Move all hardcoded ZIP assignments, branch names, territory color maps into:
```
config/
  branch_definitions.json
  locations.config.ts
  colors.ts
```

Both Python and TypeScript will read from this config.

---

## 5) Revised Phase Plan (Hybrid + Updated)

### Phase 1 — Safety, Reproducibility, and Data Protection
1. Add `requirements.txt` and optional `requirements-dev.txt`.
2. Define `APS_DATA_ROOT` + `data/input` and `data/output` conventions (local disk first, S3 optional later).
3. Create `config/branch_definitions.json`.
4. Remove hardcoded absolute paths in Python scripts.
5. Use Prisma singleton in all API routes.
6. Protect customer JSON behind auth (or signed URLs).
7. Add rate‑limit to verification + zip-boundary endpoints.
8. Move public scripts (`public/*.js`) to `scripts/` (no delete).
9. Remove IE11 from `browserslist`.
10. Add shared `lib/colors.ts` + `lib/map-config.ts`.

### Phase 2 — UI Stabilization (No Functional Loss)
1. Extract `<MiamiFilterBar />`.
2. Create `ViewRegistry` for view routing.
3. Extract `<ViewSelector />`, `<FilterPanel />`, `<MapContainer />`.
4. Introduce `TerritoryContext` + `FilterContext`.
5. Lazy-load heavy views via `next/dynamic`.
6. Replace deprecated Google Maps components.

### Phase 3 — Config‑Driven Views
1. Create `locations.config.ts` defining:
   - available views
   - data file paths
   - filter rules
2. Replace all `location === 'miami'` conditionals.
3. Make `density-map-view` thresholds config‑driven.
4. Move `location`, `view` into URL search params.
5. Add TanStack Query caching.

### Phase 4 — Upload‑Driven Data Updates
1. Build Admin Upload Console (admin‑only).
2. Implement upload parsing for CSV/XLSX.
3. Define Zod/Pandera validation per dataset (standardize column names now).
4. Run pipeline transforms + store outputs.
5. Add preview + approval step before publish.
6. Add run logs + output metadata.
7. Archive legacy Miami scenarios into `data/output/miami/scenarios/historical/` and keep only active scenarios in the primary view list.

### Phase 5 — Pipeline Modernization
1. Modularize Python scripts with `main()` and reusable functions.
2. Add `pipeline/utils.py` and `pipeline/constants.py`.
3. Add CLI with `argparse`.
4. Remove warning suppression.
5. Add unit tests for ZIP mapping and revenue summaries.

### Phase 6 — Dependency & Quality Cleanup
1. Consolidate charting libraries to **one**.
2. Consolidate CSV parser to **one**.
3. Consolidate date libraries to **one**.
4. Fix `any` types (auth + maps).
5. Align Next.js + ESLint versions.
6. Re‑enable lint during build once stable.

### Phase 7 — Repository Hygiene
1. Archive `density_map/` and `phoenix_density_clean/` (after approval).
2. Consolidate scripts into `/pipeline` + README.
3. Document upload file schema expectations.
4. Add operational runbook for data refresh + deployment.

**Cadence:** Monthly uploads and refreshes assumed for operational planning.

---

## 6) Confirmed Decisions

- **Storage:** Local disk for uploads/outputs now, with optional S3 later.
- **Schema:** Enforce standardized column names starting with the next monthly update.
7. **Miami scenarios:** Are scenario inputs still updated manually, or should they be upload‑driven as well?

---

## 7) Immediate Next Step (If You Approve)

I can start with **Phase 1** (security + reproducibility) and build the **data upload contract** so the admin upload console has a stable target. That will preserve all current views while unlocking safe updates.

---

*End of CODEXPLAN*
