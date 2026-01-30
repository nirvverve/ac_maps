# DeepAgent Script Triage (bd-2us)

**Date:** January 30, 2026  
**Scope:** Root `*.py` scripts, `phoenix_territory_map/*.js`, `phoenix_territory_map/nextjs_space/*.js`, and root `examine_jacksonville.js`.  
**Method:** Quick code scan for inputs/outputs and purpose; categorize as **Extract**, **Migrate**, **Archive**, or **Delete candidate**.  
**Note:** No files were moved or deleted (per AGENTS.md). Categories are recommendations only.

---

## Legend
- **Extract** — Reusable logic worth pulling into the new pipeline or shared utilities.
- **Migrate** — Direct data transformation scripts that should be re-implemented in the upload pipeline.
- **Archive** — One-off analyses/visuals; keep for historical reference.
- **Delete candidate** — Test/exploratory scripts with no ongoing value (do **not** delete without explicit approval).

---

## Extract (Reusable Logic)
### Python
- `phoenix_territory_optimization/optimize_territories.py` — Territory rebalance algorithm; potential Scenario Builder “auto-balance” logic.

### JavaScript
- `phoenix_territory_map/geocode_addresses.js` — Rate-limited batch geocoding; use as basis for `geocode_batch`.
- `phoenix_territory_map/geocode_addresses_fast.js` — Faster geocode variant; consolidate with above.
- `phoenix_territory_map/geocode_miami_commercial.js` — Commercial geocoding helpers; merge into shared geocoder.
- `phoenix_territory_map/geocode_portcharlotte.js` — Port Charlotte geocoding; merge into shared geocoder.
- `phoenix_territory_map/nextjs_space/parse_miami_kml_boundaries.js` — KML boundary parsing + territory assignment.

---

## Migrate (Re-implement in Upload Pipeline)
### Python
- `create_master_assignments.py` — Builds standardized master account file across Phoenix/Tucson; should become a pipeline transform.

### JavaScript (phoenix_territory_map/)
- `process_all_locations.js` — Multi-location ingest + geocode + revenue aggregation.
- `process_miami_customers.js` — Miami customer ingest + territory assignment (North/Central/South).
- `process_miami_commercial.js` — Miami commercial routes ingest; merges existing geocodes.
- `process_future_commercial.js` — Future commercial scenario ingest.
- `process_radical_reroute.js` — Radical reroute scenario ingest.
- `process_final_miami_territories.js` — Final Miami territory map ingest.
- `process_miami_update_2026.js` — Latest Miami update ingest.
- `update_radical_reroute.js` — Scenario update transform.
- `update_commercial_accounts.js` — Commercial accounts refresh.
- `regenerate_zip_revenue_with_territories.js` — Aggregates ZIP revenue from route assignments.
- `fix_customer_lookup.js` — Builds customer lookup dataset from routes.
- `fix_pricing_data.js` — Recomputes pricing + revenue from source sheets.
- `fix_all_commercial.js` — Commercial data cleanup (treat as transform).
- `fix_miami_commercial.js` — Miami commercial cleanup (treat as transform).
- `fix_tucson_commercial.js` — Tucson commercial cleanup (treat as transform).

### JavaScript (phoenix_territory_map/nextjs_space/)
- `process_ancillary_sales.js` — Ancillary sales aggregation by ZIP/year/type.
- `expand_miami_zips.js` — Expand Miami ZIP coverage; assign territories for boundary-only ZIPs.

---

## Archive (Historical / One-off Analysis)
### Python
- `phoenix_analysis.py` — Phoenix 11-branch analysis; **archive after extracting ZIP/branch mappings**.
- `phoenix_strategic_analysis.py` — Strategic analysis outputs.
- `phoenix_3branch_consolidation_analysis.py` — Consolidation analysis outputs.
- `tucson_comprehensive_analysis.py` — Tucson analysis (multi-metric).
- `tucson_analysis.py` — Exploratory Tucson data overview.
- `create_visualizations.py` — Phoenix consolidation charts (HTML).
- `create_summary_viz.py` — Master assignment summary charts.
- `create_tucson_visualizations.py` — Tucson charts (PNG).
- `create_tucson_report.py` — Tucson narrative report (Markdown).
- `analyze_unassigned_zips.py` — Unassigned ZIP analysis.
- `fix_report.py` — Patch report output (one-off).

### JavaScript (phoenix_territory_map/)
- `fetch_portcharlotte_boundaries.js` — Boundary fetcher (static data once captured).
- `fetch_jacksonville_boundaries.js` — Boundary fetcher.
- `fetch_miami_boundaries.js` — Boundary fetcher.
- `fetch_orlando_boundaries.js` — Boundary fetcher.
- `fetch_florida_zcta.js` — ZCTA fetcher (Florida).
- `fetch_texas_zcta.js` — ZCTA fetcher (Texas).
- `examine_jacksonville.js` — One-off Jacksonville analysis.
- `analyze_jorge.js` — One-off analysis (purpose unclear).

---

## Delete Candidates (No Ongoing Value)
- `phoenix_territory_map/test_geocode.js` — Ad-hoc geocode test.
- `phoenix_territory_map/read_branch_xlsx.js` — Exploratory XLSX inspection.

---

## Cross-Cutting Logic to Extract (for pipeline/utils)
- ZIP normalization and 5-digit padding (found in multiple Python scripts).
- Geocode batching with rate limiting and retry.
- Revenue aggregation by ZIP from route-level data.
- Customer lookup creation from route assignments.
- Territory assignment by latitude/KML boundaries (Miami).

---

## Follow-ups / Gaps
- Several scripts hardcode API keys and `/home/ubuntu/` paths. These must be replaced with env vars and a data root in the pipeline.
- Boundary fetchers should remain archived unless we plan a recurring boundary refresh job.
- Miami scenario scripts include legacy scenarios that are now “historical”; ensure only current scenarios remain active per product guidance.

