# Comprehensive Code Review Report

## APS Territory Map & Data Processing Platform

**Review Date:** January 29, 2026
**Reviewer:** Claude Opus 4.5
**Scope:** Full-stack review — the main Next.js application at `phoenix_territory_map/nextjs_space/`, the Python data processing pipeline at project root, secondary density map apps, and all supporting scripts.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Critical Issues — Next.js Application](#3-critical-issues--nextjs-application)
4. [Critical Issues — Data Processing Pipeline](#4-critical-issues--data-processing-pipeline)
5. [Code Quality Findings](#5-code-quality-findings)
6. [Performance Recommendations](#6-performance-recommendations)
7. [UX Recommendations](#7-ux-recommendations)
8. [Security Review](#8-security-review)
9. [Reproducibility & Environment](#9-reproducibility--environment)
10. [Dependency Analysis](#10-dependency-analysis)
11. [Maintainability & Technical Debt](#11-maintainability--technical-debt)
12. [Phased Action Plan](#12-phased-action-plan)

---

## 1. Executive Summary

The APS Territory Map platform consists of two interconnected systems: a **Next.js 14 web application** serving territory management and route optimization across 6 geographic locations, and a **Python data processing pipeline** that ingests raw Excel/CSV business data and transforms it into the JSON files the web app consumes. Both systems work and deliver value, but both have accumulated significant structural debt from organic growth.

The primary concerns fall into five categories:

1. **The "God Component" problem** — `territory-map.tsx` is a 1,606-line monolith that acts as both router and state manager for the entire app, making it fragile and hard to extend.
2. **Massive code duplication** — Identical patterns (color maps, filter UIs, map configurations, data loading) are copy-pasted across 20+ view components rather than abstracted.
3. **Oversized dependency footprint** — The project ships three charting libraries, three CSV parsers, two date libraries, two form libraries, two validation libraries, and other redundancies that inflate bundle size.
4. **Brittle data pipeline** — Python scripts use hardcoded absolute paths, embed business configuration in source code, lack error handling, and have no dependency management, making the entire data ingestion chain non-portable and fragile.
5. **Missing configuration-driven design** — Both the web app and the data pipeline embed location-specific business logic (branch definitions, ZIP code mappings, territory colors, view availability) directly in source code instead of reading from a shared, centralized configuration. This makes scaling to new locations unnecessarily expensive.

None of these are showstoppers for an internal tool, but they compound into real costs: every new location or view requires touching many files across both systems, bugs get fixed in one copy but not others, the application loads more JavaScript than necessary, and the data pipeline can only be run by a specific user on a specific machine.

---

## 2. Architecture Overview

### 2.1 What Works Well

**Next.js Application:**
- **GoogleMapsProvider pattern** (`google-maps-provider.tsx`) — Centralizing the Maps API load prevents duplicate script errors. Clean, minimal implementation.
- **Static JSON data pattern** — Pre-processed JSON files in `/public/` give fast load times with no database round-trips for map data. Good architectural choice for data that changes infrequently.
- **Auth system** — NextAuth with JWT strategy, Prisma adapter, pre-provisioned users with email verification, password requirements. Solid for an internal tool.
- **Prisma singleton** (`lib/db.ts`) — Correctly uses the global singleton pattern to prevent connection exhaustion in development.
- **Role-based access** — The three-tier role system (ADMIN/LEVEL2/LEVEL1) with middleware protection is appropriate.
- **Type definitions** (`lib/types.ts`) — Core types are defined centrally, enabling type safety.
- **UI component library** — Shadcn UI / Radix primitives provide a polished, accessible component foundation.

**Data Pipeline:**
- **Library choice** — The use of `pandas` for data manipulation and `plotly` for interactive visualization is appropriate and powerful for this domain.
- **Visual output** — The generated HTML dashboards are self-contained and easy to share, providing high immediate value to stakeholders.

### 2.2 Structural Issues

| Area | Issue | Severity |
|------|-------|----------|
| `territory-map.tsx` | 1,606-line God Component with 23 view modes | High |
| View components | 20+ components with heavily duplicated patterns | High |
| Python scripts | Hardcoded paths, no modularity, embedded business config | High |
| No shared config | Location/branch definitions duplicated across Python and JS | High |
| `package.json` | Redundant/unused dependencies inflate bundle | Medium |
| Color/config maps | Same color definitions repeated in 8+ files | Medium |
| `any` type usage | Widespread `any` defeats TypeScript's purpose | Medium |
| Prop drilling | Filter state threaded through multiple component layers | Medium |
| No Python dependency management | No `requirements.txt` or `pyproject.toml` | Medium |
| Secondary apps | `density_map/` and `phoenix_density_clean/` appear to be abandoned prototypes | Low |

### 2.3 Architectural Recommendations — Config-Driven Design

The single most impactful architectural change across the entire platform is adopting **Configuration-Driven Design**: a pattern where location-specific properties (available views, data endpoints, map centers, territory colors, branch definitions, ZIP mappings) are defined in a centralized configuration file rather than scattered across source code.

**Proposed configuration hierarchy:**

```
config/
├── branch_definitions.json    # Branch names, ZIP assignments, regions
├── locations.config.ts        # Per-location: center coords, zoom, available views,
│                              #   data file paths, color schemes, filter options
├── colors.ts                  # All territory/area color mappings
└── map-defaults.ts            # Shared map options, container styles
```

**For the Next.js app**, the UI should render based on this config — not hardcoded `location === 'miami'` conditionals. Adding a new location becomes a configuration change rather than a code change.

**For the Python pipeline**, the same `branch_definitions.json` should be the single source of truth for branch-to-ZIP assignments, eliminating the massive hardcoded dictionaries embedded in scripts.

### 2.4 Architectural Recommendations — State Management

The current application threads `areaFilter`, `viewMode`, `location`, and other state through props across multiple component layers (prop drilling). This should be replaced with:

1. **`TerritoryContext`** — A React Context providing location, view mode, and territory data to the entire component tree without explicit prop threading.
2. **`FilterContext`** — A separate React Context for filter state (area filter, density mode, account type) shared across map and control components.
3. **URL-based state for navigation** — `viewMode` and `location` should be reflected in URL search parameters (`?location=miami&view=radicalReroute`), enabling bookmarking, sharing, and proper browser back-button behavior. This eliminates the need for complex `useState` management for navigation concerns.

---

## 3. Critical Issues — Next.js Application

### 3.1 `territory-map.tsx` — The God Component

**File:** `components/territory-map.tsx` (1,606 lines)
**Impact:** Maintainability, performance, testability

This single component:
- Manages state for Arizona, Miami, and all other locations simultaneously
- Contains a 23-value `ViewMode` union type
- Has a ~1,000-line JSX return with deeply nested ternary chains (`viewMode === 'x' ? ... : viewMode === 'y' ? ...`)
- Duplicates the Miami filter bar UI **7 times** verbatim (lines 939-974, 994-1028, 1049-1083, 1104-1138, 1159-1193, 1214-1248, identical JSX)
- Loads Arizona data even when viewing Miami, and vice versa

**Recommendation — Dismantle into composable parts:**

1. **`ViewRegistry`** — A component map (`Record<ViewMode, ComponentType>`) that maps view mode strings to components dynamically, replacing the ternary chain.
2. **`<ViewSelector />`** — Extracted component for the view mode button bar, driven by the location config.
3. **`<FilterPanel />`** — Extracted component for filters (area filter, density mode), consuming `FilterContext`.
4. **`<MiamiFilterBar />`** — A single component replacing the 7 identical copies.
5. **`<MapContainer />`** — A layout wrapper providing consistent map chrome (loading states, empty states, responsive sizing).
6. **Dynamic imports** — Use `next/dynamic` (the Next.js-idiomatic approach) with `Suspense` to load view components only when requested, rather than eagerly importing all 20+ views:

```typescript
import dynamic from 'next/dynamic'

const DensityMapView = dynamic(() => import('./density-map-view'), {
  loading: () => <MapSkeleton />,
  ssr: false, // Map components don't benefit from SSR
})
```

### 3.2 Duplicated Color/Configuration Maps

The same territory color definitions appear in at least 8 separate files:

| File | What's duplicated |
|------|-------------------|
| `google-map-view.tsx:173-178` | Arizona territory colors |
| `google-map-view.tsx:197-202` | Same colors again (marker version) |
| `density-map-view.tsx:779-786` | `getAreaColor()` |
| `customer-lookup.tsx:27-43` | `getAreaColor()` (Tailwind version) |
| `customer-lookup.tsx:46-61` | `getMarkerColor()` (hex version) |
| `customer-lookup.tsx:65-73` | `getAreaDisplayName()` (duplicates `lib/utils.ts`) |
| `miami-territory-view.tsx:56-67` | `getTerritoryColor()` |
| `routes-map-view.tsx:53-62` | `getAreaColor()` |
| `location-revenue-analysis.tsx:72-80` | `getTerritoryColor()` |
| `territory-map.tsx:746-760` | Inline style objects for Miami colors |

**Recommendation:** Create a single `lib/colors.ts` (or extend `lib/utils.ts`) that exports all color mappings and helper functions. Every view should import from there. This should be part of the centralized config hierarchy described in Section 2.3.

### 3.3 Duplicated Map Configuration

Each component defines its own `mapContainerStyle`, `mapOptions`, `center` coordinates, and `LOCATION_CONFIG`:

- `google-map-view.tsx:18-54` — `mapContainerStyle`, `center`, `options`
- `density-map-view.tsx:46-58` — `mapContainerStyle`, `getMapCenter()`
- `location-data-views.tsx:42-59` — `mapContainerStyle`, `mapOptions`, `LOCATION_CONFIG`
- `location-revenue-analysis.tsx:43-70` — `mapContainerStyle`, `mapOptions`, `LOCATION_CONFIG`
- `miami-territory-view.tsx:38-54` — `mapContainerStyle`, `mapOptions`
- `routes-map-view.tsx:43-51` — `mapContainerStyle`, `center`

`LOCATION_CONFIG` is defined identically in at least 3 files.

**Recommendation:** Create `lib/map-config.ts` with all shared map constants and location configurations. This becomes part of `locations.config.ts` in the centralized config hierarchy.

### 3.4 Hardcoded Location Conditionals

The application is riddled with hardcoded location-specific logic:
```typescript
{location === 'miami' && ( ... )}
{location === 'arizona' && ( ... )}
```

This "if/else" sprawl makes the codebase resistant to scaling. Every new location requires finding and updating every conditional.

**Recommendation:** The `locations.config.ts` file should declare which views, filters, and data sources are available per location. The UI renders based on this config object — not hardcoded checks. For example:

```typescript
// locations.config.ts
export const LOCATIONS: Record<LocationKey, LocationConfig> = {
  arizona: {
    label: 'Arizona',
    center: { lat: 33.4484, lng: -112.0740 },
    zoom: 10,
    availableViews: ['territory', 'density', 'revenue', 'routes', 'commercial'],
    dataFiles: {
      territory: '/phoenix-tucson-map-data.json',
      density: '/phoenix-density-data.json',
      // ...
    },
    colorScheme: ARIZONA_COLORS,
    filterOptions: { showAreaFilter: true, showDensityMode: true },
  },
  miami: {
    label: 'Miami',
    center: { lat: 25.7617, lng: -80.1918 },
    // ...
  },
}
```

### 3.5 PrismaClient Instantiation Inconsistency

**Files:** `lib/db.ts`, `lib/auth.ts`, `app/api/auth/register/route.ts`

`lib/db.ts` correctly uses the singleton pattern:
```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

But `lib/auth.ts` and `app/api/auth/register/route.ts` each create their own `new PrismaClient()` at module scope, bypassing the singleton. In development this creates multiple database connections; in serverless production it creates a new client per cold start per route.

**Recommendation:** All files should `import { prisma } from '@/lib/db'` instead of constructing their own `PrismaClient`.

---

## 4. Critical Issues — Data Processing Pipeline

The project root contains 12+ Python scripts and 28+ JavaScript scripts that form the data processing pipeline feeding the web application. These scripts exhibit classic "research code" patterns that create reliability and portability risks.

### 4.1 Hardcoded Absolute Paths

**Files:** `phoenix_analysis.py`, `create_visualizations.py`, `tucson_analysis.py`, and others

Scripts rely on specific files existing in a user's home directory:
```python
# phoenix_analysis.py
df_current = pd.read_excel('/home/ubuntu/Uploads/Residential Data for Phoenix.xlsx')
```

**Impact:** These scripts will fail immediately if run by another user, in a CI/CD environment, or if the `Uploads` folder is reorganized. The pipeline is locked to a single machine and user account.

**Recommendation:** Use relative paths with a configurable data directory:
```python
import os
DATA_DIR = os.environ.get('APS_DATA_DIR', os.path.join(os.path.dirname(__file__), 'data', 'input'))
df_current = pd.read_excel(os.path.join(DATA_DIR, 'Residential Data for Phoenix.xlsx'))
```

### 4.2 Hardcoded Business Data in Scripts

**File:** `phoenix_analysis.py` (Lines 22-86)

A massive dictionary defining 11 branches and their assigned ZIP codes is hardcoded directly in the script:
```python
branches = {
    1: { 'name': 'North Scottsdale', 'zips': ['85255', ...] },
    # ... 100+ lines of configuration
}
```

This same business data (branch definitions, ZIP-to-territory mappings) also appears in the Next.js application's TypeScript components — creating two separate sources of truth that can drift out of sync.

**Impact:** If a ZIP code moves from one branch to another, a developer must find and update this dictionary in every Python script and every TypeScript component that uses it.

**Recommendation:** Move this configuration to the shared `config/branch_definitions.json` file described in Section 2.3. Both the Python scripts and the Next.js app load from this single file. This is the highest-leverage change across the entire platform.

### 4.3 Lack of Error Handling

**Files:** All Python scripts

There are no `try/except` blocks around file I/O operations:
```python
df_analysis = pd.read_excel(file_path, sheet_name='#3 - Analysis by Zip Code')
```

**Impact:** If the file is missing, the sheet name changes, or the format is invalid, the script crashes with a raw Python stack trace, which is unfriendly for end-users and provides no actionable guidance.

**Recommendation:** Implement robust file loading with user-friendly error messages:
```python
def load_excel_safe(path: str, sheet_name: str) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Required data file not found: {path}\n"
                                f"Expected location: {os.path.abspath(path)}")
    try:
        return pd.read_excel(path, sheet_name=sheet_name)
    except ValueError as e:
        available = pd.ExcelFile(path).sheet_names
        raise ValueError(f"Sheet '{sheet_name}' not found in {path}.\n"
                         f"Available sheets: {available}") from e
```

### 4.4 Imperative "Main-less" Execution

Scripts execute immediately upon import. There is no `if __name__ == "__main__":` block.

**Impact:** You cannot import `phoenix_analysis.py` to test a specific calculation without running the entire analysis and generating all files. This makes unit testing impossible and prevents code reuse between scripts.

**Recommendation:** Encapsulate logic in functions (`load_data()`, `process_data()`, `generate_report()`) and use a `main()` entry point:
```python
def load_data(data_dir: str) -> pd.DataFrame:
    ...

def process_territories(df: pd.DataFrame, branch_config: dict) -> pd.DataFrame:
    ...

def generate_outputs(df: pd.DataFrame, output_dir: str) -> None:
    ...

def main():
    args = parse_args()
    df = load_data(args.data_dir)
    result = process_territories(df, load_config(args.config))
    generate_outputs(result, args.output_dir)

if __name__ == "__main__":
    main()
```

### 4.5 Magic Strings and Silent Data Issues

**Magic strings:** Column names are repeated as string literals throughout the codebase:
- `'ShippingPostalCode'`
- `'ProposedBranch'`
- `'ActiveAccounts'`

A typo in one string (`'ActiveAccount'` vs `'ActiveAccounts'`) will cause runtime errors that are hard to debug.

**Suppressed warnings:**
```python
# phoenix_analysis.py
warnings.filterwarnings('ignore')
```

This suppresses potential warnings about deprecated features or data integrity issues (like `SettingWithCopyWarning`), potentially hiding subtle bugs where pandas operations modify copies instead of the original DataFrame.

**Magic Excel sheet names:** Scripts rely on specific sheet names like `'#3 - Analysis by Zip Code'`, implying the input data is manually prepared in Excel before being fed to the script — a fragile manual dependency.

**Recommendation:**
- Define constant variables for column names in a shared `constants.py`: `COL_ZIP_CODE = 'ShippingPostalCode'`
- Remove `warnings.filterwarnings('ignore')` and fix the underlying issues (usually by using `.loc` for DataFrame assignments)
- Document expected input file schemas (column names, sheet names) in the config or a data dictionary

### 4.6 Logic Duplication Across Scripts

The logic to clean ZIP codes (strip whitespace, ensure 5 digits) appears to be repeated in every script:
```python
# phoenix_analysis.py
df_current['ShippingPostalCode'] = df_current['ShippingPostalCode'].astype(str).str.strip().str[:5]
```

If this logic needs to change (e.g., to handle 9-digit ZIPs or leading-zero preservation), it must be fixed everywhere.

**Recommendation:** Create a shared `pipeline/utils.py` module for common tasks:
```python
def clean_zip_code(series: pd.Series) -> pd.Series:
    """Normalize ZIP codes to 5-digit strings, preserving leading zeros."""
    return series.astype(str).str.strip().str[:5].str.zfill(5)
```

---

## 5. Code Quality Findings

### 5.1 Widespread `any` Usage (TypeScript)

TypeScript's value is negated when `any` is used extensively:

- `territory-map.tsx:80` — `const [miamiData, setMiamiData] = useState<any[]>([])`
- `territory-map.tsx:57` — `const userRole = (session?.user as any)?.role`
- `density-map-view.tsx:62-63` — `useState<any[]>([])` for both zipBoundaries and selectedZip
- `location-data-views.tsx` — `(b: any)` in boundary finding callbacks
- Auth callbacks — `(user as any).role`, `(session.user as any).id`

For auth types, NextAuth provides module augmentation:
```typescript
declare module "next-auth" {
  interface User { role: string }
  interface Session { user: { id: string; role: string } & DefaultSession["user"] }
}
```

### 5.2 Excessive Console Logging in Production Code

`territory-map.tsx:107-121` contains emoji-prefixed debug logs:
```typescript
console.log('📊 Starting to load territory data...')
console.log('📊 Fetch response received:', response?.status, response?.ok)
console.log('📊 Data loaded successfully:', data?.length, 'records')
console.log('📊 State updated with data')
console.log('📊 Loading complete')
```

Similar patterns exist in `routes-map-view.tsx:80` and other files. These should be removed or gated behind a debug flag.

### 5.3 Defensive Coding Gone Too Far

The optional chaining (`?.`) is used on values that can never be null/undefined:

```typescript
// territory-map.tsx:95-102
if (territoryData?.length) {
  const filtered = territoryData.filter(item =>
    areaFilter?.[item?.area as keyof AreaFilter] === true
  )
  // ...
}
```

`territoryData` is initialized as `[]` — it's never `null`. `areaFilter` is a required state variable. The excessive `?.` obscures intent and suggests the code doesn't trust its own type system.

### 5.4 Hardcoded Business Data in Components

Several components embed specific business data directly in JSX:

- `territory-map.tsx:1472` — "73 commercial pool accounts" hardcoded
- `territory-map.tsx:1484-1497` — Exact percentages (58.9%, 38.4%, 2.7%) hardcoded
- `territory-map.tsx:1534-1552` — Exact account counts (43, 28, 2) hardcoded

These will silently become wrong when data changes. They should be computed from the actual loaded data.

### 5.5 `useEffect` Dependency Array Issues

```typescript
// territory-map.tsx:84-86
useEffect(() => {
  loadTerritoryData()
}, [])
```

The `loadTerritoryData` function is not stable (not wrapped in `useCallback`) but is called from a `useEffect` with an empty dependency array. While this works for the initial load, it means React's exhaustive-deps lint rule would flag it.

### 5.6 Mixing Google Maps Component Versions

Some files import the deprecated `Marker`/`InfoWindow`/`Polygon`:
```typescript
// location-data-views.tsx
import { GoogleMap, Marker, InfoWindow, Polygon } from '@react-google-maps/api';
```

While others correctly use the `F`-suffixed versions:
```typescript
// google-map-view.tsx
import { GoogleMap, MarkerF, InfoWindowF, PolygonF } from '@react-google-maps/api';
```

The non-F versions use class components and are deprecated. All should use `MarkerF`/`InfoWindowF`/`PolygonF`.

### 5.7 `onKeyPress` is Deprecated

`google-map-view.tsx:279`:
```typescript
onKeyPress={handleKeyPress}
```

`onKeyPress` is deprecated in React. Use `onKeyDown` instead.

---

## 6. Performance Recommendations

### 6.1 Eager Import of All View Components

`territory-map.tsx` statically imports all 20+ view components at the top of the file:

```typescript
import GoogleMapView from './google-map-view'
import DensityMapView from './density-map-view'
import MarketSizeMapView from './market-size-map-view'
import RevenueMapView from './revenue-map-view'
// ... 16 more imports
```

Every user loads the JavaScript for every view, even though they'll typically only use 1-2 per session.

**Recommendation:** Use `next/dynamic` (the Next.js-idiomatic approach, preferred over raw `React.lazy` because it integrates with Next.js SSR, provides built-in loading components, and supports `ssr: false` for client-only components like maps):

```typescript
import dynamic from 'next/dynamic'

const DensityMapView = dynamic(() => import('./density-map-view'), {
  loading: () => <MapSkeleton />,
  ssr: false,
})

const RevenueMapView = dynamic(() => import('./revenue-map-view'), {
  loading: () => <MapSkeleton />,
  ssr: false,
})
```

This integrates naturally with the `ViewRegistry` pattern:
```typescript
const VIEW_REGISTRY: Record<ViewMode, React.ComponentType<ViewProps>> = {
  territory: GoogleMapView,        // Eagerly loaded (default view)
  density: DensityMapView,         // Dynamically loaded
  revenue: RevenueMapView,         // Dynamically loaded
  // ...
}
```

### 6.2 Large JSON Files Loaded Uncached

Each view component fetches JSON files via `fetch()` in `useEffect`, with no caching layer:

```typescript
// Every time the component mounts:
const response = await fetch('/phoenix-tucson-map-data.json')
```

If a user switches between views and returns, the data is re-fetched. The project has `@tanstack/react-query` and `swr` in dependencies but neither appears to be used for data fetching.

**Recommendation:** Use TanStack Query (already installed as `@tanstack/react-query`) to handle caching, loading states, and background updates:
```typescript
const { data: territoryData, isLoading, error } = useQuery({
  queryKey: ['territory-data', location],
  queryFn: () => fetch(locationConfig.dataFiles.territory).then(r => r.json()),
  staleTime: Infinity, // Data doesn't change during a session
})
```

This also provides free loading/error states, eliminating the need for manual `isLoading` state management.

### 6.3 `getColor()` in `density-map-view.tsx` — 500 Lines of Branching

The `getColor()` function (lines 298-511) is a 213-line cascading if/else tree that checks location, accountType, and densityMode for every single polygon on every render. With potentially hundreds of polygons, this runs hundreds of times.

**Recommendation:** Pre-compute a lookup table (e.g., a mapping from `${location}-${accountType}-${densityMode}` to a threshold array) and use binary search or a simple loop over the thresholds. This also makes it trivial to add new locations — just add a new entry to the threshold config.

### 6.4 Boundary Loading Recalculates on Every Filter Change

`density-map-view.tsx:98-259` has `areaFilter` in the `useEffect` dependency array for boundary loading:

```typescript
useEffect(() => {
  // ... loads and processes all boundaries
}, [mapLoaded, densityData, areaFilter, location])
```

Changing a filter re-fetches and reprocesses all boundary data. The boundaries don't change when filters change — only visibility does. Load boundaries once, filter in the render.

### 6.5 Bundle Size Concerns

The `package.json` reveals significant dependency overlap:

| Category | Libraries Installed | Recommendation |
|----------|-------------------|----------------|
| **Charting** | Chart.js + react-chartjs-2, Recharts, Plotly.js + react-plotly.js | Pick one. Recharts for simple React charts, Plotly for complex interactive. |
| **CSV** | csv, csv-parse, csv-parser | Pick one. `csv-parse` is most standard. |
| **Dates** | date-fns, dayjs | Pick one. dayjs is lighter. |
| **Forms** | react-hook-form + @hookform/resolvers, Formik | Pick one. react-hook-form is more performant. |
| **Validation** | Zod, Yup | Pick one. Zod pairs well with react-hook-form. |
| **State** | Zustand, Jotai, useState | Pick one external store if needed. |
| **HTTP** | SWR, @tanstack/react-query, fetch | Pick one. TanStack Query is more feature-complete. |
| **Mapping** | @react-google-maps/api, mapbox-gl | Remove mapbox-gl if only Google Maps is used. |
| **Misc unused** | @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, gray-matter, webpack | Likely unused in production; remove. |

The `browserslist` target includes `"ie >= 11"` which forces much larger transpiled output. IE 11 is long dead. Remove this.

---

## 7. UX Recommendations

### 7.1 View Mode Navigation

The current button bar in `territory-map.tsx` renders up to 14 buttons for Miami — all in a single wrapping row. This is visually overwhelming and provides no grouping or hierarchy.

**Recommendation:**
- Group buttons by category (Scenarios, Analysis, Data Views)
- Use a tabbed interface or a sidebar navigation for view selection
- Collapse less-used views into a dropdown or secondary panel
- Show a visual indicator of which group the current view belongs to
- Drive available buttons from the location config (Section 2.3) so each location shows only its relevant views

### 7.2 No URL Routing for Views

Switching between view modes uses only React state — there's no URL change. This means:
- Users can't bookmark a specific view
- Browser back button doesn't work as expected
- Sharing a link to a specific analysis isn't possible

**Recommendation:** Use Next.js search parameters:
```
/dashboard?location=miami&view=radicalReroute
```

This also serves as a state management mechanism, reducing the reliance on complex `useState` chains for navigation. The URL becomes the source of truth for which view is active.

### 7.3 `alert()` for Search Failures

`google-map-view.tsx:243`:
```typescript
alert(`ZIP code ${trimmedZip} not found in territory data.`)
```

Native `alert()` blocks the UI thread and looks unprofessional. The project already has `react-hot-toast` and `sonner` installed.

**Recommendation:** Use toast notifications for all user feedback.

### 7.4 Map Height is Fixed at 600px

Most map components use:
```typescript
const mapContainerStyle = { width: '100%', height: '600px' }
```

On large monitors this wastes screen space; on small screens it may overflow.

**Recommendation:** Use responsive height (`calc(100vh - Xpx)` or a min/max constraint) so the map fills available space. This should be defined once in the shared map config.

### 7.5 Loading States Are Inconsistent

- `territory-map.tsx` shows a centered spinner with text
- `location-data-views.tsx` shows a spinner with different styling
- Some views show nothing during load

**Recommendation:** Create a shared `<LoadingState />` component used consistently everywhere. When using TanStack Query, the `isLoading` / `isPending` states come for free.

### 7.6 No Empty State Handling

When a filter excludes all data, or a location has no commercial accounts, the map renders empty with no explanation. Users don't know if it's loading, broken, or just empty.

**Recommendation:** Show an explicit "No data matches your current filters" message when applicable. Create a shared `<EmptyState />` component.

---

## 8. Security Review

### 8.1 Overall Assessment: Adequate for Internal Tool

The security posture is reasonable for an internal-only application:

- Password hashing uses bcrypt with salt rounds of 10 (sufficient)
- Password requirements enforce minimum 9 chars, uppercase, and special character
- Pre-provisioned user model prevents unauthorized registration
- Email verification required before password setup
- JWT session strategy with middleware route protection
- Admin-only routes properly gated

### 8.2 Minor Concerns

**NEXT_PUBLIC_GOOGLE_MAPS_API_KEY exposed to client:** This is intentional (the Maps API requires client-side loading), but ensure the key has proper HTTP referrer restrictions in the Google Cloud Console.

**The `/api/zip-boundaries` route uses `fs/promises` to read files:** This is fine since it reads from `public/` (a known path), but the server-side `google.maps.LatLngLiteral` type reference in `route.ts:14-15` is incorrect — `google.maps` types are client-only. This compiles only because of skipLibCheck or ambient declarations. The actual runtime data is just `{ lat: number, lng: number }`.

**The middleware matcher allows `.json` file access without authentication:**
```typescript
'/((?!....*\\.json|.*\\.css|.*\\.js).*)'
```
All customer data JSON files in `/public/` are accessible without login. Anyone with the URL can access `miami-route-assignments.json`, which contains customer names, addresses, and revenue figures.

**Recommendation:** If this data is sensitive, move it behind an authenticated API route instead of serving it as static files. For an internal tool behind a VPN, this may be acceptable.

### 8.3 Rate Limiting

The `/api/zip-boundaries` endpoint calls the Google Geocoding API for missing ZIP codes with a batch size of 10 and 1-second delays. There's no rate limiting on the endpoint itself, so a malicious (or buggy) client could trigger excessive Google API calls.

---

## 9. Reproducibility & Environment

### 9.1 No Python Dependency Management

There is no `requirements.txt`, `Pipfile`, or `pyproject.toml` visible in the project.

**Impact:** A new developer does not know which versions of `pandas`, `plotly`, or `openpyxl` are required to run the data processing scripts. Version mismatches could break visualizations or produce subtly different results.

**Recommendation:** Generate a `requirements.txt` immediately:
```
pandas>=2.0
plotly>=5.0
openpyxl>=3.0
xlsxwriter>=3.0
```

Better yet, create a `pyproject.toml` with pinned versions for full reproducibility.

### 9.2 No Data Pipeline Documentation

Processing scripts are spread across three directories:
- Project root (12 Python scripts, 1 JS script)
- `phoenix_territory_map/` (28 JS scripts)
- `phoenix_territory_map/nextjs_space/` (3 JS scripts)

There is no documentation about:
- Which scripts are current vs. one-time-use
- What order to run them in
- What input files they expect
- What output files they produce
- Which outputs feed into the Next.js app's `/public/` directory

**Recommendation:** Create a `scripts/` directory with a `README.md` and a `Makefile` or shell script that runs the pipeline end-to-end:
```makefile
# Makefile
pipeline: clean process export

process:
	python scripts/phoenix_analysis.py --config config/branch_definitions.json
	python scripts/tucson_analysis.py --config config/branch_definitions.json

export:
	cp output/*.json phoenix_territory_map/nextjs_space/public/
```

### 9.3 Three Separate Next.js Applications

The repository contains three Next.js apps:
- `phoenix_territory_map/nextjs_space/` — Main app (active)
- `density_map/nextjs_space/` — Density map prototype
- `phoenix_density_clean/nextjs_space/` — Another density map prototype

The two density map apps appear to be earlier iterations whose functionality was absorbed into the main app. They use Mapbox instead of Google Maps, have their own `node_modules`, and serve no purpose now.

**Recommendation:** Archive or remove the two secondary apps to avoid confusion.

---

## 10. Dependency Analysis

### 10.1 Version Concerns

| Package | Installed | Note |
|---------|-----------|------|
| `@next/swc-wasm-nodejs` | 13.5.1 | **Version mismatch** — Next.js is 14.2.28 but the SWC WASM fallback is pinned to 13.5.1. This may cause build issues. |
| `eslint` | 9.24.0 | ESLint 9 uses flat config. `eslint-config-next@15.3.0` may not be compatible with Next.js 14. |
| `eslint-config-next` | 15.3.0 | **Version mismatch** — Next.js is 14.x but the ESLint config is for Next.js 15. |
| `typescript` | 5.2.2 | Reasonable but not latest; could be updated. |

### 10.2 Likely Unused Dependencies

These appear in `package.json` but no evidence of usage was found in the reviewed source:

- `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` — No S3 code observed
- `gray-matter` — Markdown frontmatter parser; no markdown processing in app
- `mapbox-gl` — App uses Google Maps exclusively
- `xml2js` — No XML processing in the app
- `webpack` — Next.js handles bundling internally
- `formik` + `yup` — App appears to use react-hook-form + zod instead
- `jotai`, `zustand` — No store files observed; app uses `useState`
- `swr` — Not used; `@tanstack/react-query` is also installed but also not used
- `react-datepicker`, `react-day-picker` — Two date pickers, neither observed in use
- `react-intersection-observer` — Not observed in use
- `react-resizable-panels` — Not observed in use
- `vaul` — Drawer component, not observed in use
- `react-select` — Shadcn Select is used instead
- `cookie` — Not observed in direct use
- `resend` — Email API; may be used for verification but wasn't in the reviewed routes

**Recommendation:** Audit each dependency. Running `npx depcheck` would identify unused packages programmatically.

---

## 11. Maintainability & Technical Debt

### 11.1 Adding a New Location Today

To add a 7th location (e.g., "Tampa"), a developer must currently:

1. Prepare raw data in Excel with specific sheet names and column naming conventions
2. Run Python scripts to process the data, updating hardcoded branch dictionaries in each script
3. Manually copy output JSON files into the Next.js `/public/` directory
4. Add the location to the `Location` type in `territory-map.tsx` AND `page.tsx`
5. Add it to `LocationSelector` (`location-selector.tsx`)
6. Add conditional button blocks in `territory-map.tsx` (copy ~30 lines from another location block)
7. Add location handling in `density-map-view.tsx` `getColor()` (add ~60 lines of color thresholds)
8. Add location handling in `density-map-view.tsx` boundary loading (add ~30 lines)
9. Add location to `getMapCenter()` in `density-map-view.tsx`
10. Add to `LOCATION_CONFIG` in `location-data-views.tsx` AND `location-revenue-analysis.tsx`
11. Add location-specific color mappings in multiple component files
12. Potentially create location-specific view components

This is **12+ files touched** across two languages with lots of copy-paste. With Config-Driven Design (Section 2.3), this reduces to:

1. Add an entry to `config/branch_definitions.json`
2. Add an entry to `config/locations.config.ts`
3. Run the data pipeline (which reads the config automatically)
4. Verify the new location appears in the app

**Four steps, two config files, zero code changes.**

### 11.2 The Dual-Language Config Problem

The most insidious form of duplication in this project is **business configuration that exists in both Python and TypeScript**. Branch definitions, ZIP-to-territory mappings, and area names are embedded in Python scripts AND in TypeScript components. When a ZIP code is reassigned:

- The Python analysis script must be updated
- The JSON output must be regenerated
- The TypeScript components referencing that ZIP must be updated
- The color mapping may need updating

The `config/branch_definitions.json` approach solves this by making both languages read from the same file.

---

## 12. Phased Action Plan

### Success Criteria (Definition of Done)

- **New locations require config + data only** — Add a location by editing config + running the pipeline, without touching view components.
- **Pipeline runs on any machine** — `requirements.txt` + a documented data directory allow a clean run from scratch.
- **Sensitive customer data is protected** — No unauthenticated access to customer-level JSON unless explicitly intended.
- **Initial load stays lean** — Only the active view’s JS is loaded at first render.
- **Dependency footprint is minimal** — One charting library, one CSV parser, one date library.
- **Type safety improves measurably** — Core data models are fully typed, no `any` in hot paths.

### Guardrails

- **No destructive deletes without explicit approval** — Deprecated apps or files are archived first.
- **Refactors happen in small slices** — Prefer focused, reviewable changes over large codemods.

### Phase 1 — Security + Reproducibility Foundations

Quick wins that reduce risk and make the system portable and safe.

| # | Action | Files Affected | Rationale |
|---|--------|---------------|-----------|
| 1 | **Create `requirements.txt` (and optional `requirements-dev.txt`)** | New files | Pin Python dependencies; make pipeline reproducible |
| 2 | **Define a data directory contract** — `data/raw/`, `data/input/`, `data/output/` + `APS_DATA_ROOT` env var | Python scripts | Eliminates hardcoded `/home/ubuntu/...` paths |
| 3 | **Create `config/branch_definitions.json`** — Extract hardcoded branch/ZIP dictionaries from Python | New config + scripts | Single source of truth for business rules |
| 4 | **Fix absolute paths in Python scripts** — Use path helper + CLI args | All Python scripts | Portability + CI/CD readiness |
| 5 | **Prisma singleton everywhere** — Replace `new PrismaClient()` in *all* API routes + `scripts/seed.ts` | Auth/admin APIs + scripts | Prevents connection exhaustion |
| 6 | **Protect customer JSON** — Move customer/route data behind authenticated API routes or signed URLs | Next.js app + middleware | Closes unauthenticated data exposure |
| 7 | **Add rate limiting / abuse protection** for `/api/auth/send-verification` and `/api/zip-boundaries` | API routes | Prevents abuse and quota drain |
| 8 | **Remove web-exposed scripts** — Move `public/add_cities_to_routes.js` into `scripts/` or `pipeline/` | Public + scripts | Prevents accidental public access to internal tooling |
| 9 | **Remove IE11 from `browserslist`** | package.json | Shrinks transpiled output with no downside |
| 10 | **Extract shared constants** — `lib/colors.ts`, `lib/map-config.ts` | New files + views | Foundation for config-driven UI |

### Phase 2 — Component Decomposition (Structure)

Break apart the God Component and establish clean UI boundaries.

| # | Action | Files Affected | Rationale |
|---|--------|---------------|-----------|
| 11 | **Extract `<MiamiFilterBar />`** | New component + `territory-map.tsx` | Eliminates 7x duplicated JSX blocks |
| 12 | **Create `ViewRegistry`** — `Record<ViewMode, ComponentType>` | New module + `territory-map.tsx` | Removes ternary chain complexity |
| 13 | **Extract `<ViewSelector />`** — Location-driven view buttons | New component | Removes UI logic from God Component |
| 14 | **Extract `<FilterPanel />`** — Area filter + density controls | New component | Centralizes filter UX |
| 15 | **Create `<MapContainer />`, `<LoadingState />`, `<EmptyState />`** | New UI components | Consistent map chrome and feedback |
| 16 | **Introduce `TerritoryContext` + `FilterContext`** | New context files + views | Eliminates prop drilling |
| 17 | **Implement `next/dynamic` imports for views** | `territory-map.tsx` | Dramatically reduces initial bundle size |

### Phase 3 — Config-Driven Architecture (Scale)

Make the platform scalable with minimal code changes.

| # | Action | Files Affected | Rationale |
|---|--------|---------------|-----------|
| 18 | **Create `locations.config.ts`** — Per-location: center, zoom, available views, data files, filter options | New config file | Adding a location becomes a config change |
| 19 | **Refactor components to consume config** — Remove `location === 'miami'` conditionals | All view components | Eliminates hardcoded logic |
| 20 | **Refactor `getColor()` in density-map-view** — Use config-driven thresholds | `density-map-view.tsx` + config | Easier to add locations and tune thresholds |
| 21 | **Define a JSON data contract** — Zod schemas + generated TypeScript types | `lib/` + pipeline | Ensures pipeline output matches UI expectations |
| 22 | **URL-based routing for `location` + `view`** — Use search params | `page.tsx`, `territory-map.tsx` | Enables bookmarking + back/forward navigation |
| 23 | **Implement TanStack Query** — Cache JSON fetches with `staleTime: Infinity` | All view components | Eliminates redundant network requests |

### Phase 4 — Dependency Cleanup + Quality Gates

Reduce bloat, improve correctness, and stabilize tooling.

| # | Action | Files Affected | Rationale |
|---|--------|---------------|-----------|
| 24 | **Audit unused dependencies** — Run `bunx depcheck` and remove dead packages | package.json | Smaller bundle + lower attack surface |
| 25 | **Consolidate charting libraries** — Choose Recharts *or* Plotly | Components + package.json | Removes duplicate heavy deps |
| 26 | **Consolidate CSV + date libraries** — Choose one parser and one date lib | Components + package.json | Simplifies maintenance |
| 27 | **Fix `any` types** — NextAuth module augmentation + typed map data | `lib/types.ts`, auth, views | Restores TypeScript value |
| 28 | **Replace deprecated Google Maps components** — `MarkerF`/`PolygonF`/`InfoWindowF` | Map views | Future-proofing |
| 29 | **Align Next + ESLint versions** — Match `eslint-config-next` and `@next/swc-wasm-nodejs` to Next 14 | package.json | Avoids tooling drift |
| 30 | **Re-enable lint in builds (after cleanup)** | next.config.js | Prevents silent regressions |

### Phase 5 — Data Pipeline Modernization (Reliability)

Turn scripts into a reliable, testable pipeline.

| # | Action | Files Affected | Rationale |
|---|--------|---------------|-----------|
| 31 | **Modularize Python scripts** — `main()` + reusable functions | All Python scripts | Enables testing and reuse |
| 32 | **Create `pipeline/utils.py`** — ZIP cleaning, file loading, schema checks | New module | Deduplicates logic |
| 33 | **Create `pipeline/constants.py`** — Column names + sheet names | New module | Removes magic strings |
| 34 | **Add error handling with friendly messages** | All Python scripts | Improves operator UX |
| 35 | **Add CLI interface (`argparse`)** | All Python scripts | Enables CI/CD and batch runs |
| 36 | **Remove warning suppression** — Fix pandas issues directly | Python scripts | Prevents hidden data bugs |
| 37 | **Add schema validation** — Pandera or Pydantic checks | Pipeline | Enforces data contract |
| 38 | **Create pipeline `Makefile` or runner** | New file | Standardizes end-to-end runs |
| 39 | **Add unit tests for transformations** | New tests | Protects business logic |
| 40 | **Document pipeline output -> app ingestion** | README / runbook | Makes data refresh reliable |

### Phase 6 — UX + Operational Polish

Improve usability and operational clarity.

| # | Action | Rationale |
|---|--------|-----------|
| 41 | Remove console.log debug statements | Cleaner production logs |
| 42 | Replace `alert()` with toast notifications (e.g., `sonner`) | Non-blocking UX |
| 43 | Replace `onKeyPress` with `onKeyDown` | Deprecated API |
| 44 | Make map height responsive (viewport-based) | Better use of screen space |
| 45 | Add search debounce + result virtualization for large lists | Keeps UI snappy with growth |
| 46 | Add visible empty states for filters and no-data cases | Reduces user confusion |

### Phase 7 — Repository Hygiene + Documentation

| # | Action | Rationale |
|---|--------|-----------|
| 47 | Archive secondary density map apps (no deletion without explicit approval) | Reduce confusion while preserving history |
| 48 | Consolidate data scripts into `pipeline/` or `scripts/` with README | Faster onboarding |
| 49 | Document expected input file schemas (column names, sheet names, formats) | Prevents pipeline breakage |
| 50 | Add a release/runbook checklist for data refresh + deploy | Operational consistency |

---

## Appendix A — File-by-File Findings Summary

| File | Lines | Key Issues |
|------|-------|-----------|
| `territory-map.tsx` | 1,606 | God component; 23 view modes; 7x duplicated filter bar; hardcoded stats; prop drilling |
| `density-map-view.tsx` | 788 | 213-line `getColor()` function; `any` types; boundary reload on filter change |
| `google-map-view.tsx` | 493 | Deprecated `onKeyPress`; hash-based coordinate fallback; `alert()` usage |
| `location-data-views.tsx` | 585 | Deprecated Google Maps imports; duplicate `LOCATION_CONFIG` |
| `location-revenue-analysis.tsx` | ~600 | Duplicate `LOCATION_CONFIG`; duplicate color maps |
| `customer-lookup.tsx` | ~200 | Duplicates `getAreaDisplayName` from `lib/utils.ts`; duplicate color maps |
| `miami-territory-view.tsx` | ~400 | Duplicate `getTerritoryColor`; duplicate `getTerritoryDisplayName` |
| `routes-map-view.tsx` | ~400 | Duplicate `getAreaColor`; console.log in data load |
| `lib/auth.ts` | 71 | Standalone `PrismaClient` instead of singleton import |
| `api/auth/register/route.ts` | 86 | Standalone `PrismaClient`; otherwise solid |
| `api/zip-boundaries/route.ts` | 174 | Uses `google.maps` types server-side (invalid); otherwise functional |
| `lib/utils.ts` | 28 | Clean and correct; could be expanded with shared helpers |
| `lib/types.ts` | 34 | Good start; needs expansion for Miami/Florida types |
| `lib/db.ts` | 10 | Correct singleton pattern |
| `package.json` | 134 | ~15 likely unused dependencies; version mismatches; IE11 browserslist |
| `phoenix_analysis.py` | ~300+ | Hardcoded paths; hardcoded branch config; no error handling; no main guard; suppressed warnings |
| `tucson_analysis.py` | ~200+ | Hardcoded paths; duplicated ZIP cleaning logic; no error handling |
| `create_visualizations.py` | ~200+ | Hardcoded paths; magic strings for column names |

## Appendix B — Dependency Overlap Chart

```
Charting:     chart.js ─── react-chartjs-2
              recharts ←── (Pick ONE of these three)
              plotly.js ── react-plotly.js

CSV:          csv
              csv-parse    ←── (Pick ONE)
              csv-parser

Dates:        date-fns     ←── (Pick ONE)
              dayjs

Forms:        react-hook-form + @hookform/resolvers
              formik       ←── (Remove one pair)

Validation:   zod          ←── (Pick ONE)
              yup

State Mgmt:   zustand
              jotai        ←── (Neither appears used; useState suffices)

Data Fetch:   swr
              @tanstack/react-query  ←── (Pick ONE, or use neither)

Mapping:      @react-google-maps/api  ←── (This is the one in use)
              mapbox-gl               ←── (Remove — not used in main app)
```

## Appendix C — Proposed Project Structure

```
ac_maps/
├── config/
│   ├── branch_definitions.json      # Single source of truth for all business config
│   ├── locations.config.ts          # Per-location UI/data configuration
│   ├── colors.ts                    # All territory/area color mappings
│   └── map-defaults.ts              # Shared map options
├── pipeline/
│   ├── __init__.py
│   ├── utils.py                     # Shared ZIP cleaning, file loading, validation
│   ├── constants.py                 # Column names, sheet names
│   ├── phoenix_analysis.py          # Modularized with main() entry point
│   ├── tucson_analysis.py           # Modularized with main() entry point
│   └── tests/
│       ├── test_zip_assignment.py
│       └── test_territory_calc.py
├── phoenix_territory_map/
│   └── nextjs_space/
│       ├── components/
│       │   ├── territory-map.tsx     # Slim router using ViewRegistry
│       │   ├── view-registry.ts      # ViewMode → Component mapping
│       │   ├── view-selector.tsx     # Config-driven view buttons
│       │   ├── filter-panel.tsx      # Area/density filters
│       │   ├── miami-filter-bar.tsx  # Extracted from 7 copies
│       │   ├── map-container.tsx     # Shared map chrome
│       │   ├── loading-state.tsx     # Shared loading indicator
│       │   ├── empty-state.tsx       # Shared empty state
│       │   └── views/               # Individual view components
│       ├── contexts/
│       │   ├── territory-context.tsx # Location + territory data
│       │   └── filter-context.tsx    # Filters + density mode
│       └── lib/
│           ├── colors.ts            # Imported from config/
│           ├── map-config.ts        # Imported from config/
│           └── types.ts             # Expanded type definitions
├── scripts/
│   ├── Makefile                     # End-to-end pipeline runner
│   └── README.md                    # Pipeline documentation
├── requirements.txt                  # Python dependencies
└── ...
```

---

*End of Report*
