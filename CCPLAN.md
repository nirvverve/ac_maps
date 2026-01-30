# CCPLAN — APS Territory Map Platform Rebuild

**Date:** January 30, 2026
**Author:** Claude Opus 4.5
**Status:** Draft for Review

---

## Table of Contents

1. [Project History & Context](#1-project-history--context)
2. [Current Feature Inventory](#2-current-feature-inventory)
3. [Target Feature Set](#3-target-feature-set)
4. [Architecture: Current vs. Target](#4-architecture-current-vs-target)
5. [Data Model & Upload System](#5-data-model--upload-system)
6. [DeepAgent Script Triage](#6-deepagent-script-triage)
7. [Configuration-Driven Design](#7-configuration-driven-design)
8. [Scenario Builder Design](#8-scenario-builder-design)
9. [Security & Access Control](#9-security--access-control)
10. [Deployment & Self-Management](#10-deployment--self-management)
11. [Phased Implementation Plan](#11-phased-implementation-plan)
12. [Risk Register](#12-risk-register)
13. [Appendices](#appendices)

---

## 1. Project History & Context

### How We Got Here

This project began as a focused tool to break the Amenity Pool Service (APS) Phoenix branch into three smaller branches, with residential accounts sorted by ZIP code into territories. It was built using **DeepAgent** (Abacus.AI's automated development agent), which handles Vercel deployment and code generation without requiring the user to understand the deployment toolchain.

Over time, the scope expanded organically:
- Phoenix analysis grew to include density analysis, revenue, routes, commercial accounts, and more
- Tucson was folded into the Phoenix operation as a fourth territory
- Five additional locations were added (Dallas, Orlando, Jacksonville, Miami, and a sixth)
- Miami received extensive scenario analysis for territory breakup planning
- Each new request was handled as a fresh DeepAgent interaction (~100+ total sessions)

This history explains the codebase's current state:
- **~40 Python/JS scripts** at the project root and in subdirectories — most were one-time data transformations created by DeepAgent to convert CSV/XLSX uploads into the JSON format its AI suite needed. Many are likely obsolete.
- **Three separate Next.js apps** — the main app plus two earlier density map prototypes (Mapbox-based) that were superseded.
- **Copy-paste patterns** — DeepAgent solved each new location/view request independently rather than abstracting shared patterns, leading to heavy duplication.
- **Hardcoded business data** — Branch definitions, ZIP assignments, and color mappings embedded directly in source files because each DeepAgent session started fresh.

### What's Changing Now

The operator (you) is now well-versed in Vercel deployment and wants to:
1. **Self-manage deployment** — no more DeepAgent dependency for builds and deploys
2. **Clean up the codebase** — eliminate DeepAgent artifacts, deduplicate, establish maintainable patterns
3. **Retain all working functionality** — nothing should break or disappear
4. **Add data upload capability** — admin users can refresh data via CSV/XLSX upload (Salesforce integration in a future iteration)
5. **Generalize the platform** — make features available across all locations via configuration, not custom code per location

---

## 2. Current Feature Inventory

### Arizona (Phoenix / Tucson) — Full Feature Set

| View | Description | Data Source |
|------|-------------|-------------|
| **Residential Territory Map** | 4 territories (Glendale, Scottsdale, Chandler, Tucson), ZIP-coded markers with color-coded boundaries and account count popups | `phoenix-tucson-map-data.json` |
| **Density Analysis** | Active / Terminated / Churn rates by ZIP and territory, account density heatmaps | `phoenix-density-data.json` |
| **Market Size** | Total addressable market by ZIP code | Static JSON |
| **Revenue Analysis** | Monthly residential revenue per ZIP, average contract price, color-coded by amount | Static JSON |
| **Employee Locations** | Admin-only view showing employee home addresses on map | Static JSON |
| **Commercial Accounts** | Commercial pool account locations (counted separately from residential) | Static JSON |
| **Routes By Tech** | Service technician routing, clickable to show stops sorted by Branch or Day of Service. Techs are not branch-assigned. | `route-assignments.json` |
| **Ancillary Sales** | Non-service sales metrics aggregated by ZIP — shows highest-value ZIPs and customer spend patterns | Static JSON |
| **Customer Lookup** | Look up customer by account number, shows address and map location | Static JSON |

### Dallas, Orlando, Jacksonville — Standard Set

| View | Available |
|------|-----------|
| Density Analysis | Yes |
| Revenue Analysis | Yes |
| Routes By Tech | Yes |

### Miami — Standard Set + Scenario Studies

| View | Available |
|------|-----------|
| Density Analysis | Yes |
| Revenue Analysis | Yes |
| Routes By Tech | Yes |
| Breakup Scenario I — Fixed Boundaries | Yes (one-time study, now to become generic) |
| Breakup Scenario II — Zip Codes | Yes |
| Final Miami Territory Map | Yes |
| 10% Reassignment | Yes |
| Zip Optimized / Zip Optimized #2 | Yes |
| Radical Reroute | Yes |
| Commercial Routes / Future Commercial | Yes |

---

## 3. Target Feature Set

### Core Views (All Locations)

Every location gets access to all core views. Whether a view is *populated* depends on whether data has been uploaded for that location. The UI shows the view option but displays an empty state with an upload prompt if no data exists.

| View | All Locations | Notes |
|------|:---:|-------|
| **Residential Territory Map** | Yes | For locations actively breaking into sub-territories; shows "no territory data" for others until configured |
| **Density Analysis** | Yes | Active / Terminated / Churn by ZIP |
| **Market Size** | Yes | Total market by ZIP |
| **Revenue Analysis** | Yes | Monthly revenue + avg contract price by ZIP |
| **Routes By Tech** | Yes | Tech routing with branch/day sorting |
| **Customer Lookup** | Yes | Account number search |
| **Employee Locations** | Yes | Admin-only |
| **Commercial Accounts** | Yes | Separate from residential |
| **Ancillary Sales** | Yes | Non-service sales by ZIP |
| **Scenario Builder** | Yes | Generic territory reassignment scenario tool (replaces Miami-specific scenarios) |

### New Capabilities

| Capability | Description | Access |
|------------|-------------|--------|
| **CSV/XLSX Upload** | Admin uploads a data file, system processes it into the JSON format the app consumes. Replaces the current "give data to DeepAgent" workflow. | Admin only |
| **Scenario Builder** | Create, save, and compare territory reassignment scenarios for any location. Replaces the 9 Miami-specific hardcoded scenario views. | All authenticated users can view; Admin can create/edit |
| **Salesforce Integration** (future) | Direct data pull from Salesforce, replacing manual CSV/XLSX upload | Future iteration — architecture should not block this |

### Decommissioned

| Item | Disposition |
|------|-------------|
| Miami-specific scenario views (9 views) | **Migrated** into the generic Scenario Builder as saved scenarios. The underlying data is preserved; only the hardcoded UI is replaced. |
| `density_map/` Next.js app | **Archived** — functionality absorbed into main app |
| `phoenix_density_clean/` Next.js app | **Archived** — functionality absorbed into main app |
| DeepAgent one-time scripts | **Triaged** per Section 6; useful logic extracted, remainder archived |

---

## 4. Architecture: Current vs. Target

### Current Architecture

```
User → Vercel (via DeepAgent) → Next.js App
                                    ├── territory-map.tsx (1,606-line God Component)
                                    │   ├── 23 view modes via ternary chain
                                    │   ├── All views eagerly imported
                                    │   └── Location-specific conditionals everywhere
                                    ├── 20+ view components (heavily duplicated)
                                    ├── Static JSON in /public/ (unauthenticated)
                                    └── No data refresh mechanism

DeepAgent → Python scripts → CSV/XLSX → JSON → manually copied to /public/
```

### Target Architecture

```
Admin → Upload UI → API Route → Process & Store → JSON (authenticated access)
                                                        ↓
User → Vercel (self-deployed) → Next.js App
                                    ├── Slim layout shell
                                    │   ├── TerritoryContext (location + data)
                                    │   ├── FilterContext (filters + density mode)
                                    │   └── URL search params (view + location)
                                    ├── ViewRegistry → next/dynamic loaded views
                                    ├── locations.config.ts (what each location offers)
                                    ├── Shared components (FilterPanel, MapContainer, etc.)
                                    └── Authenticated API routes for data access

config/
├── branch_definitions.json   ← Single source of truth (Python + TS read this)
├── locations.config.ts       ← Per-location: views, data files, center, zoom, colors
├── upload-schemas/           ← Expected CSV/XLSX column schemas per data type
└── colors.ts                 ← All territory color mappings
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Keep Next.js 14 (App Router)** | Already in use, works well, no reason to migrate |
| **Keep Google Maps** | Invested in it, works, Mapbox alternatives already abandoned |
| **Keep static JSON as primary data format** | Fast, simple, no database needed for map data. Upload system generates new JSON files. |
| **Add server-side JSON storage** | Move JSON files behind authenticated API routes instead of `/public/`. Upload system writes here. |
| **Use TanStack Query for data fetching** | Already installed, provides caching + loading/error states |
| **Use `next/dynamic` for code splitting** | Next.js-native, SSR-aware, reduces initial bundle |
| **URL search params for navigation state** | Enables bookmarking, sharing, back/forward |
| **Config-driven location system** | Adding a location = adding config + uploading data |
| **Generic Scenario Builder** | Replaces 9 Miami-specific views with one reusable tool |

---

## 5. Data Model & Upload System

### Data Types

Each location can have data for any of these types. The upload system accepts CSV or XLSX and transforms it into the JSON format the app expects.

| Data Type | Used By Views | Key Columns (CSV/XLSX) |
|-----------|---------------|----------------------|
| **Territory Assignments** | Residential Territory Map | ZIP, Territory, AccountCount, Lat, Lng |
| **Account Density** | Density Analysis | ZIP, ActiveAccounts, TerminatedAccounts, ChurnRate, Territory |
| **Market Size** | Market Size | ZIP, TotalMarket, Penetration |
| **Revenue** | Revenue Analysis | ZIP, MonthlyRevenue, AvgContractPrice, Territory |
| **Route Assignments** | Routes By Tech | TechName, AccountNumber, Address, Lat, Lng, Branch, DayOfService |
| **Employee Addresses** | Employee Locations | EmployeeName, Address, Lat, Lng (Admin data) |
| **Commercial Accounts** | Commercial Accounts | AccountName, Address, Lat, Lng, Type |
| **Ancillary Sales** | Ancillary Sales | ZIP, SalesAmount, Category, Period |
| **Customer Directory** | Customer Lookup | AccountNumber, CustomerName, Address, Lat, Lng, Territory |

### Upload Flow

```
Admin selects location + data type
    → Uploads CSV/XLSX file
    → Server validates columns against expected schema (Zod)
    → Server transforms to JSON format (geocoding addresses if needed)
    → Server writes JSON to data store
    → App fetches fresh data via TanStack Query (cache invalidated)
```

### Upload API Design

```
POST /api/admin/upload
  Body: FormData { file, location, dataType }
  Auth: Admin only (middleware check)
  Response: { success, recordCount, warnings[] }

GET /api/data/[location]/[dataType]
  Auth: Authenticated users
  Response: JSON data file contents
  Cache: TanStack Query with staleTime based on data type
```

### Schema Validation

Each data type has a Zod schema defining required and optional columns. On upload:
1. Parse the file (CSV via `csv-parse`, XLSX via `xlsx`/`exceljs`)
2. Validate each row against the schema
3. Return warnings for rows that fail validation (don't reject the whole file for partial issues)
4. Transform valid rows into the target JSON structure
5. Write the JSON file

The schemas live in `config/upload-schemas/` and are shared between the upload API (validation) and the frontend (showing expected format to the admin).

### Geocoding Strategy

Some data types (routes, commercial accounts, customer directory) include addresses that need lat/lng coordinates. Options:
- **If lat/lng provided in upload**: Use directly (preferred)
- **If only address provided**: Batch geocode via Google Geocoding API (existing pattern in `zip-boundaries` route), with rate limiting and caching
- **If only ZIP provided**: Use ZIP centroid (already available in the density data)

---

## 6. DeepAgent Script Triage

The ~40 Python and JavaScript scripts scattered across the project were created by DeepAgent across ~100+ sessions. Most were one-time data transformations. The triage process:

### Triage Categories

| Category | Action | Criteria |
|----------|--------|----------|
| **Extract** | Pull reusable logic into `pipeline/utils.py` | Scripts containing ZIP cleaning, geocoding, or data transformation patterns that the upload system will need |
| **Migrate** | Convert to upload processing logic | Scripts whose transformation logic maps to one of the upload data types |
| **Archive** | Move to `archive/deepagent-scripts/` with a manifest | One-time analyses, superseded prototypes, or scripts whose output is already baked into the app's static JSON |
| **Delete** | Remove after archiving | Exact duplicates or broken scripts |

### Script Inventory (to be completed during implementation)

The triage should be done file-by-file during Phase 1. For each script:
1. Read the script and identify what it does
2. Check if its output files are still referenced by the app
3. Categorize per the table above
4. If **Extract** or **Migrate**: document the transformation logic for reuse in the upload pipeline

### Likely Extractions

Based on the code review, these patterns appear across multiple scripts and should be extracted:

| Pattern | Current Location | Target |
|---------|-----------------|--------|
| ZIP code cleaning (strip, 5-digit, leading zeros) | Multiple .py files | `pipeline/utils.py` → `clean_zip_code()` |
| Branch/territory assignment by ZIP | `phoenix_analysis.py` (hardcoded dict) | `config/branch_definitions.json` + lookup function |
| Excel sheet parsing with specific column mapping | Multiple .py files | Upload processing pipeline |
| Density calculation (active/terminated/churn) | Multiple .py files | Upload processor for density data type |
| Revenue aggregation by ZIP | Multiple .py files | Upload processor for revenue data type |

---

## 7. Configuration-Driven Design

### The Core Principle

Every location-specific behavior should be driven by configuration, not conditional code. When someone asks "add Tampa," the answer should be: "Add an entry to the config file and upload the data."

### `locations.config.ts`

```typescript
import type { LocationConfig } from '@/lib/types'

export const LOCATIONS: Record<string, LocationConfig> = {
  arizona: {
    key: 'arizona',
    label: 'Phoenix / Tucson, AZ',
    shortLabel: 'Arizona',
    center: { lat: 33.4484, lng: -112.0740 },
    zoom: 10,
    territories: [
      { key: 'glendale', label: 'APS-Glendale', color: '#4CAF50' },
      { key: 'scottsdale', label: 'APS-Scottsdale', color: '#2196F3' },
      { key: 'chandler', label: 'APS-Chandler', color: '#FF9800' },
      { key: 'tucson', label: 'APS-Tucson', color: '#9C27B0' },
    ],
    availableViews: [
      'territory', 'density', 'marketSize', 'revenue',
      'routes', 'customerLookup', 'employeeLocations',
      'commercial', 'ancillarySales', 'scenarios',
    ],
    dataEndpoints: {
      territory: '/api/data/arizona/territory',
      density: '/api/data/arizona/density',
      marketSize: '/api/data/arizona/market-size',
      revenue: '/api/data/arizona/revenue',
      routes: '/api/data/arizona/routes',
      customers: '/api/data/arizona/customers',
      employees: '/api/data/arizona/employees',
      commercial: '/api/data/arizona/commercial',
      ancillarySales: '/api/data/arizona/ancillary-sales',
    },
    hasActiveTerritoryBreakup: true,
  },

  miami: {
    key: 'miami',
    label: 'Miami, FL',
    shortLabel: 'Miami',
    center: { lat: 25.7617, lng: -80.1918 },
    zoom: 11,
    territories: [], // Will be defined when Miami starts territory breakup
    availableViews: [
      'density', 'revenue', 'routes', 'scenarios',
      'customerLookup', 'commercial', 'ancillarySales',
    ],
    dataEndpoints: {
      density: '/api/data/miami/density',
      revenue: '/api/data/miami/revenue',
      routes: '/api/data/miami/routes',
      // ... populated as data is uploaded
    },
    hasActiveTerritoryBreakup: false,
  },

  dallas: { /* ... */ },
  orlando: { /* ... */ },
  jacksonville: { /* ... */ },
}
```

### How Config Drives the UI

| UI Element | Driven By |
|------------|-----------|
| Location selector dropdown | `Object.keys(LOCATIONS)` |
| View mode buttons shown for a location | `LOCATIONS[loc].availableViews` |
| Map center and zoom when switching locations | `LOCATIONS[loc].center`, `LOCATIONS[loc].zoom` |
| Territory filter checkboxes | `LOCATIONS[loc].territories` |
| Color coding on map | `LOCATIONS[loc].territories[n].color` |
| Data fetch URLs | `LOCATIONS[loc].dataEndpoints` |
| "Upload data" prompts for missing data | Check if endpoint returns data or 404 |
| Territory assignment view availability | `LOCATIONS[loc].hasActiveTerritoryBreakup` |

### Adding a New Location

1. Add entry to `LOCATIONS` in `locations.config.ts`
2. Upload data files via the admin upload UI
3. Done — no code changes, no deployment needed for data-only updates

If the new location is breaking into territories, also define the `territories` array and set `hasActiveTerritoryBreakup: true`.

---

## 8. Scenario Builder Design

### What It Replaces

The 9 Miami-specific scenario views are currently hardcoded as separate components/view modes, each with its own static JSON data. The Scenario Builder replaces all of these with one generic, reusable tool.

### How It Works

A **scenario** is a saved configuration that says: "For this location, reassign these ZIP codes from Territory A to Territory B." The app then visualizes the before/after impact.

### Data Model

```typescript
interface Scenario {
  id: string
  name: string                    // e.g., "Miami Fixed Boundaries"
  location: string                // e.g., "miami"
  description: string
  createdBy: string               // user email
  createdAt: string               // ISO timestamp
  baselineDataVersion: string     // Which data snapshot this was built against
  reassignments: ZipReassignment[]
  status: 'draft' | 'published'   // Only admins can publish
}

interface ZipReassignment {
  zipCode: string
  fromTerritory: string           // Original territory (or "unassigned")
  toTerritory: string             // Proposed territory
  accountCount: number            // Computed from current data
  revenueImpact: number           // Computed from current data
}
```

### Scenario Builder UI

1. **Select location** — shows current territory map as baseline
2. **Define proposed territories** — name new territories, assign colors
3. **Reassign ZIPs** — click ZIP codes on the map to move them between territories, or bulk-assign via a table
4. **See impact** — sidebar shows account counts, revenue totals, and density metrics for each proposed territory vs. baseline
5. **Save** — stores the scenario as JSON (admin can publish to make visible to all users)
6. **Compare** — side-by-side or overlay comparison of two scenarios

### Migration of Existing Miami Scenarios

Each of the 9 Miami scenario views has underlying data that defines a particular ZIP-to-territory assignment. During migration:
1. Extract the assignment data from each view's static JSON
2. Create a `Scenario` object for each
3. Store them as published scenarios for the Miami location
4. Remove the 9 hardcoded view components
5. The Scenario Builder renders them identically (or better) using the generic engine

### Storage

Scenarios are stored as JSON files in the data directory (same pattern as other data), not in the database. This keeps the architecture simple and file-based. If the number of scenarios grows large, we can move to database storage later.

```
data/scenarios/
├── miami/
│   ├── fixed-boundaries.json
│   ├── zip-codes.json
│   ├── 10-pct-reassignment.json
│   ├── radical-reroute.json
│   └── ...
├── arizona/
│   └── ...
```

---

## 9. Security & Access Control

### Current Role Model

| Role | Access |
|------|--------|
| ADMIN | All views + employee locations + user management |
| LEVEL2 | All views except employee locations |
| LEVEL1 | Limited views (specific per deployment) |

### Enhanced Role Model

| Role | Views | Upload | Scenarios | User Mgmt |
|------|-------|--------|-----------|-----------|
| ADMIN | All views including Employee Locations | Upload CSV/XLSX for any location | Create, edit, publish, delete scenarios | Full |
| LEVEL2 | All views except Employee Locations | No upload | View published scenarios | No |
| LEVEL1 | Core views only (density, revenue, routes) | No upload | View published scenarios | No |

### Data Protection Changes

| Current | Target |
|---------|--------|
| JSON files in `/public/` (unauthenticated) | JSON files served via authenticated API routes |
| No upload capability | Admin-only upload with schema validation |
| No rate limiting on API routes | Rate limiting on geocoding and upload endpoints |
| Google Maps API key potentially unrestricted | Verify HTTP referrer restrictions in GCP Console |

---

## 10. Deployment & Self-Management

### Current State
- Deployed via DeepAgent to Vercel
- No documented deploy process
- No CI/CD pipeline

### Target State

| Aspect | Approach |
|--------|----------|
| **Hosting** | Vercel (unchanged) |
| **Deployment** | `vercel` CLI or GitHub push-to-deploy |
| **Environment Variables** | Managed in Vercel dashboard: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_MAPS_API_KEY` |
| **Data Storage** | JSON files stored on server filesystem (Vercel serverless functions can read from a persistent data layer, or we use Vercel Blob/S3 for uploaded data) |
| **Domain** | Configure in Vercel dashboard |

### Data Persistence on Vercel

Vercel's serverless functions have an ephemeral filesystem — files written during a request are lost after the function shuts down. This means we need a persistent storage layer for uploaded data:

| Option | Pros | Cons |
|--------|------|------|
| **Vercel Blob Storage** | Native Vercel integration, simple API, pay-per-use | Relatively new, limited querying |
| **AWS S3** | Mature, widely supported, already in dependencies | Requires AWS account setup |
| **Database (JSON column)** | Already have Prisma + database | JSON data can be large; not ideal for large files |
| **Keep static JSON in repo** | Simplest; git tracks changes | Requires redeploy for data updates; no runtime upload |

**Recommended approach:** Start with **Vercel Blob Storage** for uploaded data files. It's the simplest path that supports runtime uploads without requiring external infrastructure. The existing static JSON files in `/public/` continue working as-is during migration — we move them behind API routes incrementally.

If S3 is preferred (the AWS SDK is already in dependencies), that works too. The abstraction layer should make the storage backend swappable.

```typescript
// lib/data-store.ts — abstraction over storage backend
interface DataStore {
  read(location: string, dataType: string): Promise<any>
  write(location: string, dataType: string, data: any): Promise<void>
  exists(location: string, dataType: string): Promise<boolean>
}
```

---

## 11. Phased Implementation Plan

### Success Criteria

- **New locations require config + data only** — zero code changes.
- **Admin can upload data** — CSV/XLSX upload replaces "ask DeepAgent."
- **All existing functionality preserved** — every current view continues to work.
- **Miami scenarios migrated** — all 9 scenario views work in the generic Scenario Builder.
- **Pipeline runs on any machine** — documented, portable, reproducible.
- **Sensitive data is protected** — no unauthenticated access to customer-level data.
- **Initial load stays lean** — only the active view's JS is loaded.
- **Dependency footprint is minimal** — one charting lib, one CSV parser, one date lib.

### Guardrails

- **No destructive deletes without explicit approval** — deprecated apps/scripts are archived first.
- **Refactors happen in small slices** — prefer focused, reviewable changes over large codemods.
- **Every phase produces a working app** — no phase leaves the app in a broken state.
- **Existing static JSON continues working** — API route migration is incremental, not a big-bang cutover.

---

### Phase 1 — Foundation: Security, Portability, and Shared Config

Establish the base that all subsequent phases build on.

| # | Action | Detail |
|---|--------|--------|
| 1.1 | **Triage DeepAgent scripts** | Read each .py and .js script, categorize as Extract / Migrate / Archive / Delete per Section 6. Document findings. |
| 1.2 | **Archive secondary Next.js apps** | Move `density_map/` and `phoenix_density_clean/` to `archive/` with a README noting they're superseded. |
| 1.3 | **Create `requirements.txt`** | Pin Python dependencies for any scripts we keep. |
| 1.4 | **Create `config/branch_definitions.json`** | Extract hardcoded branch/ZIP dictionaries from Python scripts into a single shared config file. |
| 1.5 | **Create `lib/colors.ts`** | Extract all territory color mappings from 8+ component files into one module. |
| 1.6 | **Create `lib/map-config.ts`** | Extract `LOCATION_CONFIG`, `MAP_DEFAULTS`, `mapContainerStyle`, and `mapOptions` from 6+ files. |
| 1.7 | **Fix PrismaClient singleton** | Replace standalone `new PrismaClient()` in `auth.ts` and `register/route.ts` with `import { prisma } from '@/lib/db'`. |
| 1.8 | **Remove IE11 from browserslist** | Delete `"ie >= 11"` from `package.json`. |
| 1.9 | **Fix version mismatches** | Align `@next/swc-wasm-nodejs` and `eslint-config-next` with Next.js 14. |
| 1.10 | **Protect customer data** | Create authenticated API routes for JSON data access; update fetch calls to use them. Existing `/public/` JSON files stay as fallback during migration. |

**Exit criteria:** Shared config files exist and are imported by at least one component each. Customer data has an authenticated access path. DeepAgent scripts are categorized.

---

### Phase 2 — Component Decomposition

Break the God Component apart and establish clean UI architecture.

| # | Action | Detail |
|---|--------|--------|
| 2.1 | **Create `ViewRegistry`** | `Record<ViewMode, React.ComponentType>` mapping view mode strings to components. Replaces the ternary chain in `territory-map.tsx`. |
| 2.2 | **Implement `next/dynamic`** | Dynamically import all view components via `next/dynamic` with `ssr: false` and loading skeletons. Only the default view is eagerly loaded. |
| 2.3 | **Extract `<MiamiFilterBar />`** | Replace the 7 identical copies in `territory-map.tsx` with one shared component. |
| 2.4 | **Extract `<ViewSelector />`** | View mode button bar, driven by the location's `availableViews` from config. |
| 2.5 | **Extract `<FilterPanel />`** | Area filter, density mode, and account type controls as a standalone component. |
| 2.6 | **Create `<MapContainer />`** | Shared wrapper providing consistent map chrome: responsive height, loading skeleton, empty state. |
| 2.7 | **Create `<LoadingState />` and `<EmptyState />`** | Shared feedback components used by all views. |
| 2.8 | **Create `TerritoryContext`** | React Context providing current location, territory data, and location config to the component tree. Eliminates prop drilling. |
| 2.9 | **Create `FilterContext`** | React Context for filter state (area filter, density mode, account type). |
| 2.10 | **Slim down `territory-map.tsx`** | After extractions, this file should be a thin layout shell: render `<ViewSelector>`, `<FilterPanel>`, and `<ViewRegistry[currentView]>` inside `<MapContainer>`. Target: under 200 lines. |

**Exit criteria:** `territory-map.tsx` is under 300 lines. All views render correctly. No duplicated filter bars. Bundle size reduced measurably.

---

### Phase 3 — Config-Driven Location System

Make every location data-driven.

| # | Action | Detail |
|---|--------|--------|
| 3.1 | **Create `locations.config.ts`** | Full location config per Section 7 — center, zoom, territories, available views, data endpoints, color schemes. |
| 3.2 | **Refactor view components to consume config** | Remove all `location === 'miami'` / `location === 'arizona'` conditionals. Components read from `TerritoryContext` which provides the current `LocationConfig`. |
| 3.3 | **Refactor `getColor()`** | Replace the 213-line if/else tree in `density-map-view.tsx` with a config-driven threshold lookup table. Adding a location = adding thresholds to config. |
| 3.4 | **URL-based navigation** | Use Next.js `useSearchParams` for `location` and `view`. Update `<ViewSelector>` and `<LocationSelector>` to set search params. Browser back/forward works. Bookmarkable. |
| 3.5 | **Implement TanStack Query** | Wrap all JSON data fetching in `useQuery` with location-aware cache keys and `staleTime: Infinity` (data doesn't change during a session unless admin uploads). |
| 3.6 | **Verify all 6 locations work** | End-to-end testing that each location loads, shows correct views, filters work, data displays correctly. |

**Exit criteria:** Adding a hypothetical 7th location requires only a config entry and data upload. All existing locations work identically to before.

---

### Phase 4 — Data Upload System

Enable admin self-service data refresh.

| # | Action | Detail |
|---|--------|--------|
| 4.1 | **Design upload schemas** | Create Zod schemas for each data type (territory assignments, density, revenue, routes, etc.) per Section 5. |
| 4.2 | **Create `DataStore` abstraction** | Interface for read/write/exists operations, with initial implementation using Vercel Blob Storage (or S3 if preferred). |
| 4.3 | **Build `POST /api/admin/upload`** | Admin-only API route: accepts FormData (file + location + dataType), validates against schema, transforms to JSON, stores via DataStore. Returns record count + warnings. |
| 4.4 | **Build `GET /api/data/[location]/[dataType]`** | Authenticated API route serving JSON data from the DataStore. Falls back to static `/public/` JSON if no uploaded version exists. |
| 4.5 | **Build admin upload UI** | Page at `/admin/upload` (or a modal): select location, select data type, see expected columns, upload file, see validation results. |
| 4.6 | **Add geocoding to upload pipeline** | When uploaded data has addresses but no lat/lng, batch geocode via Google Geocoding API with rate limiting. Show progress to admin. |
| 4.7 | **Cache invalidation** | After successful upload, invalidate the relevant TanStack Query cache key so the app fetches fresh data. |
| 4.8 | **Upload history / audit log** | Simple log showing who uploaded what, when, record counts. Stored in database via Prisma. |

**Exit criteria:** Admin can upload a CSV for any location/data-type, and the app immediately reflects the new data without redeployment.

---

### Phase 5 — Scenario Builder

Replace the 9 Miami-specific views with a generic tool.

| # | Action | Detail |
|---|--------|--------|
| 5.1 | **Extract Miami scenario data** | Parse each of the 9 Miami scenario views to extract their ZIP-to-territory assignment data into `Scenario` JSON objects. |
| 5.2 | **Build scenario storage** | API routes for CRUD operations on scenarios, stored as JSON files via DataStore. |
| 5.3 | **Build Scenario Builder UI** | The core tool per Section 8: baseline map, click-to-reassign ZIPs, impact sidebar (account counts, revenue, density deltas). |
| 5.4 | **Build scenario comparison view** | Side-by-side or overlay comparison of two scenarios showing deltas. |
| 5.5 | **Migrate Miami scenarios** | Load the 9 extracted scenarios into the Scenario Builder as published scenarios for Miami. |
| 5.6 | **Remove Miami-specific view components** | Delete the 9 hardcoded scenario views. Update `ViewRegistry` and `locations.config.ts` — Miami's `scenarios` view now points to the Scenario Builder. |
| 5.7 | **Verify equivalence** | Confirm that each migrated scenario renders identically (or better) in the Scenario Builder compared to the old hardcoded views. |

**Exit criteria:** All 9 Miami scenarios are viewable in the Scenario Builder. Any location can create new scenarios. No Miami-specific view components remain.

---

### Phase 6 — Dependency Cleanup & Quality

Reduce bloat and improve type safety.

| # | Action | Detail |
|---|--------|--------|
| 6.1 | **Audit and remove unused dependencies** | Run `npx depcheck`. Remove: mapbox-gl, formik, yup, jotai, zustand, swr, gray-matter, xml2js, webpack, @aws-sdk/* (unless using S3), duplicate date/CSV libs. |
| 6.2 | **Consolidate charting** | Pick Recharts (simpler, React-native) OR Plotly (more powerful). Migrate all charts. Remove the others. |
| 6.3 | **Consolidate CSV parsing** | Keep `csv-parse` (most standard). Remove `csv` and `csv-parser`. |
| 6.4 | **Consolidate date handling** | Keep `dayjs` (lighter). Remove `date-fns`. |
| 6.5 | **Fix `any` types** | Add NextAuth module augmentation. Type all map data interfaces. Type density/revenue/route data. Eliminate `any` from hot paths. |
| 6.6 | **Replace deprecated Google Maps components** | `Marker` → `MarkerF`, `InfoWindow` → `InfoWindowF`, `Polygon` → `PolygonF` across all files. |
| 6.7 | **Replace deprecated React APIs** | `onKeyPress` → `onKeyDown`. |
| 6.8 | **Remove debug logging** | Remove all `console.log` debug statements from production code. |
| 6.9 | **Replace `alert()` with toasts** | Use `sonner` (already installed) for all user feedback. |

**Exit criteria:** `npx depcheck` shows no unused dependencies. No `any` in data model types. No deprecated API usage. Bundle size reduced by 30%+.

---

### Phase 7 — Data Pipeline Modernization

Transform retained Python scripts into a maintainable pipeline. (This phase can run in parallel with Phases 4-6.)

| # | Action | Detail |
|---|--------|--------|
| 7.1 | **Create `pipeline/` directory structure** | `pipeline/__init__.py`, `utils.py`, `constants.py`, `tests/` |
| 7.2 | **Build `pipeline/utils.py`** | Shared functions: `clean_zip_code()`, `load_excel_safe()`, `validate_dataframe()`, `geocode_batch()` |
| 7.3 | **Build `pipeline/constants.py`** | Column name constants, sheet name constants, expected schemas |
| 7.4 | **Modularize retained scripts** | Refactor into functions with `def main()` and `if __name__ == "__main__":`. Use `argparse` for CLI args. |
| 7.5 | **Add error handling** | `try/except` with user-friendly messages around all file I/O and data transformations. |
| 7.6 | **Remove `warnings.filterwarnings('ignore')`** | Fix underlying pandas issues (use `.loc`, handle dtypes explicitly). |
| 7.7 | **Add unit tests** | Test ZIP assignment, territory calculations, data transformations against known inputs/outputs. |
| 7.8 | **Create `Makefile`** | Document and automate the full pipeline: ingest → transform → export → verify. |
| 7.9 | **Write pipeline README** | Document: what each script does, expected inputs/outputs, how to run, how outputs feed into the app. |

**Exit criteria:** Pipeline runs on any machine with Python 3.x + `pip install -r requirements.txt`. All tests pass. README is complete.

---

### Phase 8 — Polish & Documentation

| # | Action | Detail |
|---|--------|--------|
| 8.1 | **Make map height responsive** | Replace fixed `600px` with viewport-based calculation in shared `MapContainer`. |
| 8.2 | **Add search debounce** | Debounce ZIP code and customer search inputs. |
| 8.3 | **Add rate limiting** | Rate limit `/api/admin/upload`, `/api/zip-boundaries`, and auth routes. |
| 8.4 | **Create deployment runbook** | Document: how to deploy, environment variables needed, how to configure domain, how to do a data refresh. |
| 8.5 | **Create user guide** | Brief guide for admins: how to upload data, create scenarios, manage users. |
| 8.6 | **Final cleanup** | Remove any remaining dead code, orphaned files, or TODO comments. |

**Exit criteria:** App is fully self-deployable. Admin can manage data without developer assistance. Documentation covers all operational tasks.

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Vercel Blob Storage limitations** | Medium | Medium | Abstract storage behind `DataStore` interface so backend is swappable to S3 |
| **Geocoding API costs spike** | Low | Medium | Require lat/lng in upload where possible; cache geocoded results; rate limit |
| **Breaking existing views during refactor** | Medium | High | Phase-by-phase approach; each phase exits with working app; manual testing checklist per location |
| **Scenario Builder complexity exceeds estimate** | Medium | Medium | Start with view-only migration of existing scenarios; add interactive editing incrementally |
| **Large CSV uploads timeout** | Low | Medium | Process async with progress indicator; chunked upload for very large files |
| **Config drift between locations.config.ts and actual data** | Low | Low | Validate config against available data at startup; show warnings in admin panel |

---

## Appendices

### Appendix A — Current File Structure (Relevant Portions)

```
ac_maps/
├── *.py (12 scripts)              ← DeepAgent-generated, needs triage
├── *.js (1 script)                ← DeepAgent-generated
├── Uploads/                       ← Raw data files (Excel/CSV)
├── density_map/                   ← Abandoned prototype (Mapbox)
├── phoenix_density_clean/         ← Abandoned prototype (Mapbox)
├── phoenix_territory_map/
│   ├── *.js (28 scripts)          ← DeepAgent-generated processing scripts
│   └── nextjs_space/              ← MAIN APPLICATION
│       ├── app/
│       │   ├── page.tsx
│       │   ├── api/
│       │   │   ├── auth/
│       │   │   └── zip-boundaries/
│       │   └── admin/
│       ├── components/
│       │   ├── territory-map.tsx   ← 1,606-line God Component
│       │   ├── density-map-view.tsx
│       │   ├── google-map-view.tsx
│       │   ├── location-data-views.tsx
│       │   ├── location-revenue-analysis.tsx
│       │   ├── miami-territory-view.tsx
│       │   ├── customer-lookup.tsx
│       │   ├── routes-map-view.tsx
│       │   └── ... (20+ view components)
│       ├── lib/
│       │   ├── auth.ts
│       │   ├── db.ts
│       │   ├── types.ts
│       │   └── utils.ts
│       └── public/
│           ├── *.json              ← Map data files (unauthenticated!)
│           └── zip-boundaries/
└── config/                        ← TO BE CREATED
```

### Appendix B — Target File Structure

```
ac_maps/
├── config/
│   ├── branch_definitions.json
│   ├── locations.config.ts
│   ├── colors.ts
│   ├── map-defaults.ts
│   └── upload-schemas/
│       ├── territory.ts
│       ├── density.ts
│       ├── revenue.ts
│       ├── routes.ts
│       └── ...
├── pipeline/
│   ├── __init__.py
│   ├── utils.py
│   ├── constants.py
│   ├── Makefile
│   ├── README.md
│   └── tests/
├── archive/
│   ├── deepagent-scripts/          ← Triaged scripts with manifest
│   ├── density_map/                ← Archived prototype
│   └── phoenix_density_clean/      ← Archived prototype
├── phoenix_territory_map/
│   └── nextjs_space/
│       ├── app/
│       │   ├── page.tsx
│       │   ├── admin/
│       │   │   └── upload/
│       │   │       └── page.tsx     ← Upload UI
│       │   └── api/
│       │       ├── auth/
│       │       ├── admin/
│       │       │   └── upload/
│       │       │       └── route.ts ← Upload processing
│       │       ├── data/
│       │       │   └── [location]/
│       │       │       └── [dataType]/
│       │       │           └── route.ts ← Authenticated data serving
│       │       └── scenarios/
│       │           └── route.ts     ← Scenario CRUD
│       ├── components/
│       │   ├── territory-map.tsx    ← Slim layout shell (~200 lines)
│       │   ├── view-registry.ts
│       │   ├── view-selector.tsx
│       │   ├── filter-panel.tsx
│       │   ├── miami-filter-bar.tsx
│       │   ├── map-container.tsx
│       │   ├── loading-state.tsx
│       │   ├── empty-state.tsx
│       │   ├── scenario-builder/
│       │   │   ├── scenario-builder.tsx
│       │   │   ├── scenario-comparison.tsx
│       │   │   └── zip-reassignment-panel.tsx
│       │   └── views/               ← Individual view components
│       │       ├── density-map-view.tsx
│       │       ├── revenue-map-view.tsx
│       │       ├── routes-map-view.tsx
│       │       └── ...
│       ├── contexts/
│       │   ├── territory-context.tsx
│       │   └── filter-context.tsx
│       ├── lib/
│       │   ├── auth.ts
│       │   ├── db.ts
│       │   ├── types.ts
│       │   ├── utils.ts
│       │   ├── colors.ts            ← From config/
│       │   ├── map-config.ts        ← From config/
│       │   └── data-store.ts        ← Storage abstraction
│       └── data/                    ← Server-side data (replaces /public/ JSON)
├── requirements.txt
└── ...
```

### Appendix C — Dependency Rationalization

```
KEEP                          REMOVE
─────────────────────         ─────────────────────
@react-google-maps/api        mapbox-gl
recharts (OR plotly)           chart.js + react-chartjs-2 (+ the unchosen one)
csv-parse                      csv, csv-parser
dayjs                          date-fns
react-hook-form + zod          formik + yup
@tanstack/react-query          swr
next-auth                      (keep)
prisma                         (keep)
tailwindcss                    (keep)
sonner                         react-hot-toast (pick one)
                               zustand, jotai (unused)
                               @aws-sdk/* (unless using S3)
                               gray-matter, xml2js, webpack
                               react-datepicker, react-day-picker
                               react-intersection-observer
                               react-resizable-panels
                               vaul, react-select
                               cookie (unused)
```

### Appendix D — View Mode Mapping (Current → Target)

| Current ViewMode | Location | Target |
|-----------------|----------|--------|
| `territory` | AZ | **Territory Map** view (config-driven) |
| `density` | All | **Density Analysis** view (config-driven) |
| `marketSize` | AZ | **Market Size** view (available to all via config) |
| `revenue` | All | **Revenue Analysis** view (config-driven) |
| `routes` | All | **Routes By Tech** view (config-driven) |
| `customerLookup` | AZ | **Customer Lookup** view (available to all via config) |
| `employeeLocations` | AZ | **Employee Locations** view (admin-only, all locations) |
| `commercial` | AZ | **Commercial Accounts** view (available to all via config) |
| `ancillarySales` | AZ | **Ancillary Sales** view (available to all via config) |
| `fixedBoundaries` | Miami | **Scenario Builder** (migrated scenario) |
| `zipCodes` | Miami | **Scenario Builder** (migrated scenario) |
| `finalTerritory` | Miami | **Scenario Builder** (migrated scenario) |
| `tenPctReassign` | Miami | **Scenario Builder** (migrated scenario) |
| `zipOptimized` | Miami | **Scenario Builder** (migrated scenario) |
| `zipOptimized2` | Miami | **Scenario Builder** (migrated scenario) |
| `radicalReroute` | Miami | **Scenario Builder** (migrated scenario) |
| `commercialRoutes` | Miami | **Scenario Builder** (migrated scenario) |
| `futureCommercial` | Miami | **Scenario Builder** (migrated scenario) |

---

*End of CCPLAN*
