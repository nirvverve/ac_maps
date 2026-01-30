# APS Territory Map — Project Technical Overview

> **This document describes the codebase as it exists today.** For the plan to refactor and extend it, see **CCPLAN.md**.

## Project Purpose & Business Context

This application is an internal operations tool for **Amenity Pool Services (APS)**, a pool maintenance company operating across multiple regions in Arizona, Florida, and Texas. The application serves as a comprehensive territory management, route optimization, and data visualization platform for executive decision-making, operations planning, and technician route assignments.

The business problems it solves include:
- Visualizing customer distribution across geographic territories
- Optimizing technician routes to minimize drive time and maximize pool count balance
- Analyzing revenue by territory, ZIP code, and technician
- Planning branch expansions (e.g., new office openings in 2026)
- Tracking commercial vs. residential accounts separately
- Supporting "what-if" scenario planning for route restructuring
- Analyzing ancillary (non-service) sales by geography

### How This Project Was Built

This project was originally built using **DeepAgent** (Abacus.AI's automated development agent), which handles Vercel deployment and code generation. It started as a focused tool to break the APS Phoenix branch into three smaller branches, then grew organically as new locations and analysis types were requested.

Over approximately **100+ DeepAgent sessions**, the project expanded from a single-location territory map to a multi-location platform with density analysis, revenue views, route mapping, scenario planning, and more. Each request was handled as a fresh DeepAgent interaction, which explains several characteristics of the current codebase:

- **~40 Python/JS data processing scripts** scattered across the project root and subdirectories — most were one-time transformations DeepAgent created to convert CSV/XLSX uploads into JSON format. Many are likely obsolete.
- **Copy-paste patterns** — DeepAgent solved each new location/view request independently rather than abstracting shared patterns, leading to heavy duplication across components.
- **Hardcoded business data** — Branch definitions, ZIP assignments, and color mappings are embedded directly in source files because each DeepAgent session started fresh without context of prior sessions.
- **Three separate Next.js apps** — the main app plus two earlier density map prototypes (Mapbox-based) that were superseded but never removed.

**The project is now transitioning to self-managed development and deployment**, with the goal of cleaning up the codebase while retaining all working functionality. See CCPLAN.md for the full plan.

---

## Tech Stack

### Core Framework
- **Next.js 14** with App Router (`/app` directory structure)
- **TypeScript** for type safety throughout
- **React 18** with hooks-based component architecture

### Package Manager
- **Yarn** (Berry/v3+) is configured via `.yarnrc.yml` in the Next.js app directory
- See AGENTS.md "Node / JS Toolchain" section for the project-wide JS toolchain conventions

### Styling
- **Tailwind CSS** with custom brand colors:
  - APS Blue: `#1e759d`
  - Wave Blue: `#27add6`
  - Accent Yellow: `#ffdb43`
- **shadcn/ui** components (Radix primitives with Tailwind styling) in `/components/ui/`

### Mapping
- **Google Maps JavaScript API** via `@react-google-maps/api`
- Custom `GoogleMapsProvider` component centralizes API loading to prevent duplicate script errors
- Libraries loaded: `places`, `geometry`
- Note: `mapbox-gl` is in `package.json` but **not used** — it's a leftover from the earlier density map prototypes

### Authentication
- **NextAuth.js** with Prisma adapter
- Role-based access control: ADMIN / LEVEL2 / LEVEL1
- JWT session strategy with middleware protection
- Pre-provisioned user model (no open registration)

### Database
- **PostgreSQL** via **Prisma ORM**
- Schema in `/prisma/schema.prisma`
- Used primarily for user management (the map data is JSON-file-based)
- **Known issue:** `lib/auth.ts` and `app/api/auth/register/route.ts` each create standalone `PrismaClient` instances instead of importing the singleton from `lib/db.ts`. See CCPLAN.md Phase 1.

### Data Storage Pattern
- **Static JSON files** in `/public/` directory for all territory, customer, and route data
- Data was pre-processed via DeepAgent sessions using Node.js and Python scripts
- This pattern was chosen for performance (no database queries on map load) and simplicity (data changes infrequently)
- **Known issue:** All JSON files in `/public/` are accessible without authentication. The middleware matcher excludes `.json` files from auth checks. This means customer names, addresses, and revenue data are exposed to anyone with the URL.

---

## Project Directory Structure

```
/data/projects/ac_maps/                     # Project root
├── *.py (12 scripts)                       # DeepAgent-generated Python analysis scripts
├── *.js (1 script)                         # DeepAgent-generated JS script
├── *.csv, *.json, *.xlsx                   # Data artifacts from DeepAgent sessions
├── *.md, *.pdf                             # Documentation and reports
├── Uploads/                                # Raw data files (Excel/CSV source data)
├── config/                                 # TO BE CREATED (see CCPLAN.md)
├── density_map/                            # ABANDONED — earlier Mapbox-based prototype
│   └── nextjs_space/                       # Separate Next.js app (not in use)
├── phoenix_density_clean/                  # ABANDONED — another Mapbox-based prototype
│   └── nextjs_space/                       # Separate Next.js app (not in use)
├── phoenix_territory_map/
│   ├── *.js (28 scripts)                   # DeepAgent-generated processing scripts
│   └── nextjs_space/                       # *** THE MAIN APPLICATION ***
│       ├── app/                            # Next.js App Router
│       │   ├── page.tsx                    # Main entry point (v0.71)
│       │   ├── layout.tsx                  # Root layout with metadata
│       │   ├── (auth)/                     # Auth routes (login, register)
│       │   ├── admin/                      # Admin panel
│       │   └── api/                        # API routes (auth, zip-boundaries)
│       ├── components/                     # React components
│       │   ├── territory-map.tsx           # MAIN orchestrator (1,606 lines — God Component)
│       │   ├── google-maps-provider.tsx    # Centralized Maps API loading
│       │   ├── location-selector.tsx       # Multi-location dropdown
│       │   ├── *-view.tsx                  # Individual map views (20+ components)
│       │   └── ui/                         # shadcn/ui primitives
│       ├── lib/
│       │   ├── utils.ts                    # Shared utilities
│       │   ├── types.ts                    # Core type definitions
│       │   ├── auth.ts                     # NextAuth configuration
│       │   └── db.ts                       # Prisma client (singleton)
│       ├── public/                         # Static data files (JSON) — served without auth
│       └── prisma/
│           └── schema.prisma               # Database schema
├── AGENTS.md                               # Agent operations guide
├── CCPLAN.md                               # Refactoring and feature plan
├── CODE_REVIEW_REPORT.md                   # Detailed code review findings
└── PROJECT_TECHNICAL_OVERVIEW.md           # This file
```

---

## Data Architecture

### Locations Supported

The app supports **6 locations**, each with its own data files:

| Location | Key in Code | Feature Set |
|----------|-------------|-------------|
| **Phoenix / Tucson (Arizona)** | `arizona` | Full — territory map, density, market size, revenue, routes, employee locations (admin), commercial, ancillary sales, customer lookup |
| **Miami** | `miami` | Standard + 9 breakup scenario views |
| **Dallas** | `dallas` | Standard (density, revenue, routes) |
| **Orlando** | `orlando` | Standard |
| **Jacksonville** | `jacksonville` | Standard |
| **Port Charlotte** | `portCharlotte` | Standard |

The `Location` type is defined in `page.tsx`:
```typescript
type Location = 'arizona' | 'miami' | 'dallas' | 'orlando' | 'jacksonville' | 'portCharlotte'
```

Default location is `'arizona'`.

### Key Data Files (in `/public/`)

| File Pattern | Purpose |
|--------------|---------|
| `*-route-assignments.json` | Customer records with geocoded addresses, route/technician assignments |
| `*-zip-boundaries.json` | GeoJSON-style polygon coordinates for ZIP code visualization |
| `*-density-data.json` | Aggregated account counts per ZIP for heatmap views |
| `*-commercial-accounts.json` | Commercial customer data (separate from residential) |
| `*-zip-revenue-data.json` | Revenue metrics aggregated by ZIP code |
| `office-locations.json` | Branch office coordinates and metadata |
| `phoenix-tucson-map-data.json` | Territory assignment data for Arizona |

### Data Processing Scripts (Legacy)

These scripts were created by DeepAgent to transform raw Excel/CSV data into the JSON format the app consumes. They are scattered across multiple directories:

| Location | Count | Examples |
|----------|-------|---------|
| Project root | 12 Python, 1 JS | `phoenix_analysis.py`, `tucson_analysis.py`, `create_visualizations.py` |
| `phoenix_territory_map/` | 28 JS | `geocode_addresses_fast.js`, `process_miami_commercial.js`, `process_radical_reroute.js` |
| `phoenix_territory_map/nextjs_space/` | 3 JS | `examine_jacksonville.js` |

**Important:** Most of these scripts are one-time use artifacts from DeepAgent sessions. They often contain hardcoded absolute paths (e.g., `/home/ubuntu/Uploads/...`) and hardcoded business data (branch-to-ZIP dictionaries). They will be triaged as part of CCPLAN.md Phase 1. Do not assume any particular script is current or correct without reading it first.

---

## Component Architecture

### Main Controller: `territory-map.tsx`

This is the **central orchestrator** component (1,606 lines). It:
1. Receives the selected `location` from `page.tsx`
2. Manages `viewMode` state (which map view to show)
3. Renders location-specific buttons for available views
4. Conditionally renders the appropriate `*-view.tsx` component via a large ternary chain
5. Contains 7 identical copies of the Miami filter bar
6. Eagerly imports all 20+ view components (no code splitting)

**Known issues:** This is the primary technical debt item in the codebase. See CODE_REVIEW_REPORT.md Section 3.1 and CCPLAN.md Phase 2 for the decomposition plan.

### ViewMode System

Each location has different available views controlled by conditional rendering in `territory-map.tsx`.

**Arizona views:**
- `territory` — Residential territory map (4 territories: Glendale, Scottsdale, Chandler, Tucson)
- `density` — Customer density heatmaps (active/terminated/churn)
- `marketSize` — Total addressable market by ZIP
- `revenue` — Revenue analysis by ZIP
- `routes` — Technician route visualization
- `customerLookup` — Account number search
- `employeeLocations` — Employee addresses (admin only)
- `commercial` — Commercial account locations
- `ancillarySales` — Non-service sales metrics by ZIP

**Miami views (standard + scenarios):**
- `density`, `revenue`, `routes` — Standard views
- `miamiFixedBoundaries` — Breakup Scenario I
- `miamiZipScenario` — Breakup Scenario II (ZIP codes)
- `miamiTerritory` — Final Miami territory map
- `miamiTenPct` — 10% reassignment scenario
- `miamiZipOptimized` / `miamiZipOptimized2` — ZIP optimization scenarios
- `radicalReroute` — Complete route restructuring
- `miamiCommercialRoutes` — Commercial routes
- `miamiCommercial` — Future commercial view

**Dallas, Orlando, Jacksonville, Port Charlotte:** `density`, `revenue`, `routes`

### Shared Patterns Across Views

Most view components follow this pattern:
1. Load data from `/public/*.json` via `fetch()` in `useEffect`
2. Use `useState` for filters, selections, and UI state
3. Render `<GoogleMap>` with `<PolygonF>` for boundaries and `<MarkerF>` for points
4. Include filter controls (territory, technician, day-of-week)
5. Display summary statistics in cards
6. Provide CSV export functionality

**Known issues:**
- Color mappings, map configuration, and `LOCATION_CONFIG` are duplicated across 8+ files
- Some components use deprecated `Marker`/`InfoWindow`/`Polygon` instead of `MarkerF`/`InfoWindowF`/`PolygonF`
- `any` types are used extensively, defeating TypeScript's purpose
- No data caching — switching views re-fetches JSON files every time
- `@tanstack/react-query` and `swr` are both installed but neither is used

---

## Key Utilities

### `lib/utils.ts`
- `getAreaDisplayName(area)` — Maps internal territory names to brand format ("West" → "APS of Glendale")
- `safeString(value)` — Filters out "nan"/"null" strings from data
- `cn()` — Tailwind class merging utility

### Color Conventions
Territory colors are used consistently across views (but are currently duplicated in 8+ files):
- North/West (Glendale): `#3b82f6` (blue)
- Central (Scottsdale): `#10b981` (green)
- South/East (Chandler): `#f97316` (orange)
- Commercial: `#9333ea` (purple)
- Tucson: `#a855f7` (violet)

---

## Authentication Flow

1. User visits any protected route
2. Middleware (`middleware.ts`) checks session via NextAuth
3. Unauthenticated users redirect to `/login`
4. NextAuth handles credential validation against Prisma/PostgreSQL
5. Session stored as JWT, accessible via `useSession()` hook
6. Role checked in components for admin-only features

### Role Access

| Role | Access Level |
|------|-------------|
| `ADMIN` | All views + employee locations + admin panel + user management |
| `LEVEL2` | All views except employee locations |
| `LEVEL1` | Limited views (core set only) |

---

## Environment Variables

Stored in `.env` in the Next.js app directory:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key (client-side, requires HTTP referrer restriction in GCP Console) |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth session encryption secret |
| `NEXTAUTH_URL` | NextAuth callback URL (set in Vercel for production) |
| `RESEND_API_KEY` | Resend email service for verification emails |

---

## Deployment

### Current State
- Hosted on **Vercel**
- Originally deployed via DeepAgent
- Now transitioning to self-managed deployment via `vercel` CLI or GitHub push-to-deploy
- Standard Next.js scripts: `yarn dev`, `yarn build`, `yarn start`, `yarn lint`

### Build Notes
- ESLint is configured but `eslint-config-next` is version 15.3.0 while Next.js is 14.x — this mismatch may cause lint issues
- `@next/swc-wasm-nodejs` is pinned to 13.5.1 (mismatched with Next.js 14.2.28)
- The `browserslist` includes IE11 which inflates transpiled output unnecessarily

---

## Critical Gotchas for Agents

1. **Project paths**: The Next.js app is at `/data/projects/ac_maps/phoenix_territory_map/nextjs_space/`. The broader project root is `/data/projects/ac_maps/`.

2. **Data is JSON, not database**: Customer/route data lives in `/public/*.json` files, not PostgreSQL. The database is only for user management.

3. **Google Maps API key**: Stored in `.env` as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. The `GoogleMapsProvider` handles loading. Ensure the key has HTTP referrer restrictions in the GCP Console.

4. **Location-specific components**: Views are conditionally rendered per location in `territory-map.tsx`. Arizona has the most views; other locations have subsets. Check `territory-map.tsx` to see which views are available per location.

5. **Massive duplication**: Color maps, map configs, `LOCATION_CONFIG`, and filter UIs are copy-pasted across many files. When fixing something, check if the same pattern exists in other files (see CODE_REVIEW_REPORT.md Section 3.2-3.3 for the full list).

6. **DeepAgent scripts are unreliable**: The Python and JS scripts at the project root and in `phoenix_territory_map/` were created by DeepAgent across 100+ sessions. Many use hardcoded paths (`/home/ubuntu/...`), embed business data, and may be obsolete. Do not run them without reading them first.

7. **Two abandoned apps**: `density_map/` and `phoenix_density_clean/` are earlier prototypes that are no longer used. The main app is the only active Next.js application.

8. **Customer data is unprotected**: JSON files in `/public/` are served without authentication. This includes customer names, addresses, and revenue data.

9. **Hydration errors**: The codebase has careful handling to avoid SSR/client mismatches. Avoid non-deterministic values in initial render. Map components should use `ssr: false` with `next/dynamic`.

10. **Dependency bloat**: The project has 3 charting libraries, 3 CSV parsers, 2 date libraries, 2 form libraries, 2 validation libraries, and many likely-unused packages. See CODE_REVIEW_REPORT.md Appendix B for the full overlap chart.

---

## Key Documents

| Document | Purpose |
|----------|---------|
| **AGENTS.md** | Agent operations guide — rules, tooling, issue tracking, session workflow |
| **CCPLAN.md** | Implementation plan — phased refactoring and feature roadmap |
| **CODE_REVIEW_REPORT.md** | Detailed code review — file-by-file findings, dependency analysis |
| **PROJECT_TECHNICAL_OVERVIEW.md** | This file — current-state technical reference |

---

*This document should be updated at the end of each CCPLAN phase to reflect the new state of the codebase.*
