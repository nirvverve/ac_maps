# Code Review Report V3: Next.js Territory Map Application

**Review Date:** January 29, 2026
**Reviewer:** Gemini CLI
**Scope:** Review of the Next.js application located in `/data/projects/ac_maps/phoenix_territory_map/nextjs_space/`.

---

## 1. Executive Summary

The application is a complex Next.js 14 project serving as a dashboard for territory management across multiple US locations (Arizona, Miami, Jacksonville, etc.). It heavily utilizes Google Maps for visualization.

**Strengths:**
*   **Modern Stack:** Uses Next.js 14 (App Router), React 18, TypeScript, and Tailwind CSS.
*   **Functionality:** Implements a wide range of analytical views (density, revenue, routes, commercial accounts) and scenarios.
*   **UI/UX:** Uses Shadcn UI/Radix primitives for a polished look.

**Critical Weaknesses:**
*   **Monolithic Architecture:** A single "God Component" (`territory-map.tsx`) controls virtually all application state and routing, creating a massive maintenance bottleneck.
*   **Code Duplication:** Extensive copy-pasting of logic and UI elements across components, especially for handling different geographic locations.
*   **Bundle Size:** Eager importing of dozens of heavy map components and visualization libraries (Chart.js, Recharts, Plotly) likely impacts initial load performance.

---

## 2. Architectural Analysis

### 2.1 The "God Component": `territory-map.tsx`
This file (approx. 1600+ lines based on previous context, though the read was truncated) is the primary anti-pattern in the codebase.

*   **Responsibility Overload:** It manages:
    *   Global application state (View Mode, Density Mode, Filters).
    *   Data fetching for multiple regions (Arizona, Miami).
    *   Conditional rendering for 20+ different sub-views.
    *   UI controls for every possible dashboard configuration.
*   **Fragility:** Adding a new location or view requires modifying this single file in multiple places (state, JSX, imports), increasing the risk of regression.

**Recommendation:**
*   **Refactor into a Layout/Page Pattern:** Move the state management up to a Context (`TerritoryContext`) or URL search parameters.
*   **Dynamic Component Loading:** Use `React.lazy` and `Suspense` to load view components only when requested.
*   **Composition:** Break the UI into smaller, focused components (e.g., `<ViewSelector />`, `<FilterPanel />`, `<MapContainer />`).

### 2.2 Data Fetching & State
*   **Client-Side Fetching:** Data is fetched via `useEffect` and `fetch` calls directly in components.
*   **No Caching:** There is no evidence of a caching layer (like TanStack Query or SWR) being effectively used for map data, meaning switching views likely re-fetches large JSON files.
*   **Hardcoded Data Paths:** Paths like `/phoenix-tucson-map-data.json` are hardcoded.

**Recommendation:**
*   Implement **TanStack Query** (already in `package.json` as `@tanstack/react-query`) to handle caching, loading states, and background updates.

---

## 3. Code Quality & Patterns

### 3.1 Hardcoded Business Logic
The application is riddled with hardcoded location-specific logic:
```typescript
{location === 'miami' && ( ... )}
{location === 'arizona' && ( ... )}
```
This "if/else" sprawl makes the codebase resistant to scaling.

**Recommendation:**
*   Adopt a **Configuration-Driven Design**. Define a `locations.config.ts` that specifies available views, data endpoints, and UI options for each region. The UI should render based on this config, not hardcoded checks.

### 3.2 Component "Prop Drilling"
It appears that `areaFilter` and other state objects are passed down through multiple layers of components.

**Recommendation:**
*   Use a React Context (`FilterContext`) to share filter state across the component tree without prop drilling.

### 3.3 Dependency Bloat
`package.json` reveals a "kitchen sink" approach to libraries:
*   **Visualization:** `chart.js`, `react-chartjs-2`, `recharts`, `plotly.js`, `react-plotly.js`.
    *   *Issue:* Three different charting libraries increase bundle size significantly.
    *   *Fix:* Standardize on **one** library (Recharts is recommended for React).
*   **Maps:** `mapbox-gl` is listed but `@react-google-maps/api` seems to be the primary driver.
    *   *Fix:* Remove unused map libraries.
*   **CSV Parsing:** `csv`, `csv-parse`, `csv-parser`.
    *   *Fix:* Standardize on one parser.

---

## 4. Prioritized Action Plan

### Phase 1: Cleanup & Performance (Immediate)
1.  **Audit Dependencies:** Remove `mapbox-gl`, `chart.js`/`plotly.js` (if Recharts can cover usage), and duplicate CSV parsers.
2.  **Lazy Loading:** Implement `next/dynamic` or `React.lazy` for the heavy map view components in `territory-map.tsx`.

### Phase 2: Refactoring (Medium Term)
3.  **Dismantle `territory-map.tsx`:**
    *   Extract the "View Selector" logic into its own component.
    *   Extract the "Filter Panel" logic.
    *   Create a `ViewRegistry` to map `viewMode` strings to components dynamically.
4.  **Config-Driven Locations:** Create a configuration file to define location properties, removing the `location === 'miami'` conditionals.

### Phase 3: Architecture (Long Term)
5.  **State Management:** Move global state to URL parameters (e.g., `?location=miami&view=density`) to enable shareable links and deep linking, removing the need for complex `useState` management for navigation.
6.  **Data Layer:** Fully integrate TanStack Query for robust data fetching.

---

*End of Report*
