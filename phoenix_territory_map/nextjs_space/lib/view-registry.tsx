/**
 * ViewRegistry — Centralized mapping of view modes to React components.
 *
 * Replaces the massive conditional chain in territory-map.tsx with a clean
 * lookup table. Uses Next.js dynamic imports with SSR disabled for all map
 * components to prevent hydration errors with Google Maps.
 *
 * bd-31v, bd-173
 */

import { ComponentType } from 'react'
import dynamic from 'next/dynamic'
import { MapViewSkeleton } from '../components/loading-skeleton'

// Loading component for all map views
const mapLoadingProps = {
  loading: () => <MapViewSkeleton />,
  ssr: false, // Disable SSR for all map components (Google Maps is client-side only)
}

// Core views (Arizona + shared) — default exports
const GoogleMapView = dynamic(() => import('../components/google-map-view'), mapLoadingProps)
const DensityMapView = dynamic(() => import('../components/density-map-view'), mapLoadingProps)
const MarketSizeMapView = dynamic(() => import('../components/market-size-map-view'), mapLoadingProps)
const RevenueMapView = dynamic(() => import('../components/revenue-map-view'), mapLoadingProps)
const EmployeeMapView = dynamic(() => import('../components/employee-map-view'), mapLoadingProps)
const CommercialDensityMapView = dynamic(() => import('../components/commercial-density-map-view'), mapLoadingProps)

// Core views (Arizona + shared) — named exports
const RoutesMapView = dynamic(() => import('../components/routes-map-view').then(m => ({ default: m.RoutesMapView })), mapLoadingProps)
const CustomerLookup = dynamic(() => import('../components/customer-lookup').then(m => ({ default: m.CustomerLookup })), mapLoadingProps)
const AncillarySalesView = dynamic(() => import('../components/ancillary-sales-view').then(m => ({ default: m.AncillarySalesView })), mapLoadingProps)

// Miami views — named exports
const MiamiTerritoryView = dynamic(() => import('../components/miami-territory-view').then(m => ({ default: m.MiamiTerritoryView })), mapLoadingProps)
const MiamiKMLScenarioView = dynamic(() => import('../components/miami-kml-scenario-view').then(m => ({ default: m.MiamiKMLScenarioView })), mapLoadingProps)
const MiamiTerritoryAssignmentTool = dynamic(() => import('../components/miami-territory-assignment-tool').then(m => ({ default: m.MiamiTerritoryAssignmentTool })), mapLoadingProps)
const MiamiFinalTerritoryView = dynamic(() => import('../components/miami-final-territory-view').then(m => ({ default: m.MiamiFinalTerritoryView })), mapLoadingProps)
const Miami10PctReassignmentView = dynamic(() => import('../components/miami-10pct-reassignment-view').then(m => ({ default: m.Miami10PctReassignmentView })), mapLoadingProps)
const MiamiZipOptimizedView = dynamic(() => import('../components/miami-zip-optimized-view').then(m => ({ default: m.MiamiZipOptimizedView })), mapLoadingProps)
const MiamiZipOptimized2View = dynamic(() => import('../components/miami-zip-optimized-2-view').then(m => ({ default: m.MiamiZipOptimized2View })), mapLoadingProps)
const MiamiRadicalRerouteView = dynamic(() => import('../components/miami-radical-reroute-view').then(m => ({ default: m.MiamiRadicalRerouteView })), mapLoadingProps)
const MiamiCommercialRoutesView = dynamic(() => import('../components/miami-commercial-routes-view').then(m => ({ default: m.MiamiCommercialRoutesView })), mapLoadingProps)
const MiamiFutureCommercialRoutesView = dynamic(() => import('../components/miami-future-commercial-routes-view').then(m => ({ default: m.MiamiFutureCommercialRoutesView })), mapLoadingProps)

// Jacksonville views — named exports
const JacksonvilleRevenueView = dynamic(() => import('../components/jacksonville-revenue-view').then(m => ({ default: m.JacksonvilleRevenueView })), mapLoadingProps)
const JacksonvilleCommercialView = dynamic(() => import('../components/jacksonville-commercial-view').then(m => ({ default: m.JacksonvilleCommercialView })), mapLoadingProps)
const JacksonvilleRoutesView = dynamic(() => import('../components/jacksonville-routes-view').then(m => ({ default: m.JacksonvilleRoutesView })), mapLoadingProps)

// Location views (Dallas, Orlando, Port Charlotte, Miami variations) — named exports
const LocationRevenueAnalysis = dynamic(() => import('../components/location-revenue-analysis').then(m => ({ default: m.LocationRevenueAnalysis })), mapLoadingProps)
const LocationCommercialView = dynamic(() => import('../components/location-data-views').then(m => ({ default: m.LocationCommercialView })), mapLoadingProps)
const LocationRoutesView = dynamic(() => import('../components/location-data-views').then(m => ({ default: m.LocationRoutesView })), mapLoadingProps)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All supported view modes across all locations */
export type ViewMode =
  // Core Arizona views
  | 'territory'
  | 'density'
  | 'market'
  | 'revenue'
  | 'employees'
  | 'commercial'
  | 'routes'
  | 'lookup'
  | 'ancillarySales'
  // Miami scenarios
  | 'kmlScenario'
  | 'assignmentTool'
  | 'miamiFinal'
  | 'miami10pct'
  | 'miamiZipOptimized'
  | 'miamiZipOptimized2'
  | 'radicalReroute'
  | 'miamiCommercialRoutes'
  | 'miamiFutureCommercialRoutes'
  // Jacksonville views
  | 'jaxRevenue'
  | 'jaxCommercial'
  | 'jaxRoutes'
  // Generic location views (Dallas, Orlando, Port Charlotte, Miami)
  | 'locRevenue'
  | 'locCommercial'
  | 'locRoutes'

// Conditional props interface for views that need location context
export interface ViewComponentProps {
  location?: string
  areaFilter?: any
  onAreaChange?: (area: string) => void
  onResetFilters?: () => void
  [key: string]: any
}

// ---------------------------------------------------------------------------
// View Registry
// ---------------------------------------------------------------------------

/**
 * Central mapping of ViewMode → React Component.
 * All components are lazy-loaded to reduce initial bundle size.
 */
export const VIEW_REGISTRY: Record<ViewMode, ComponentType<any>> = {
  // Core Arizona views
  territory: GoogleMapView,
  density: DensityMapView,
  market: MarketSizeMapView,
  revenue: RevenueMapView,
  employees: EmployeeMapView,
  commercial: CommercialDensityMapView,
  routes: RoutesMapView,
  lookup: CustomerLookup,
  ancillarySales: AncillarySalesView,

  // Miami scenarios (territory-breaking scenarios)
  kmlScenario: MiamiKMLScenarioView,
  assignmentTool: MiamiTerritoryAssignmentTool,
  miamiFinal: MiamiFinalTerritoryView,
  miami10pct: Miami10PctReassignmentView,
  miamiZipOptimized: MiamiZipOptimizedView,
  miamiZipOptimized2: MiamiZipOptimized2View,
  radicalReroute: MiamiRadicalRerouteView,
  miamiCommercialRoutes: MiamiCommercialRoutesView,
  miamiFutureCommercialRoutes: MiamiFutureCommercialRoutesView,

  // Jacksonville-specific views
  jaxRevenue: JacksonvilleRevenueView,
  jaxCommercial: JacksonvilleCommercialView,
  jaxRoutes: JacksonvilleRoutesView,

  // Generic location views (multi-city)
  locRevenue: LocationRevenueAnalysis,
  locCommercial: LocationCommercialView,
  locRoutes: LocationRoutesView,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Look up the component for a view mode.
 * Falls back to GoogleMapView if the view mode is unknown.
 */
export function getViewComponent(viewMode: ViewMode): ComponentType<any> {
  return VIEW_REGISTRY[viewMode] ?? GoogleMapView
}

/**
 * Check if a view mode exists in the registry.
 */
export function isValidViewMode(viewMode: string): viewMode is ViewMode {
  return viewMode in VIEW_REGISTRY
}

/**
 * Get all available view modes.
 */
export function getAllViewModes(): ViewMode[] {
  return Object.keys(VIEW_REGISTRY) as ViewMode[]
}

/**
 * Filter view modes by location availability.
 * Some views are only available for specific locations.
 */
export function getViewModesForLocation(location: string): ViewMode[] {
  const allModes = getAllViewModes()

  switch (location) {
    case 'arizona':
      return allModes.filter(mode =>
        !mode.startsWith('miami') &&
        !mode.startsWith('jax') &&
        !mode.startsWith('loc')
      )

    case 'miami':
      return allModes.filter(mode =>
        mode.startsWith('miami') ||
        mode.startsWith('loc') ||
        ['territory', 'density'].includes(mode)
      )

    case 'jacksonville':
      return allModes.filter(mode =>
        mode.startsWith('jax') ||
        mode.startsWith('loc') ||
        mode === 'density'
      )

    case 'dallas':
    case 'orlando':
    case 'portCharlotte':
      return allModes.filter(mode =>
        mode.startsWith('loc') ||
        mode === 'density'
      )

    default:
      return ['density'] // Fallback: density works everywhere
  }
}