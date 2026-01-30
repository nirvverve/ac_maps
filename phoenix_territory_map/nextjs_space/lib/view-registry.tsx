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

// Loading wrapper for all map views (Next.js requires object literal options)
const withMapLoading = (loader: () => Promise<any>) =>
  dynamic(loader, {
    loading: () => <MapViewSkeleton />,
    ssr: false, // Disable SSR for all map components (Google Maps is client-side only)
  })

// Core views (Arizona + shared) — default exports
const GoogleMapView = withMapLoading(() => import('../components/google-map-view'))
const DensityMapView = withMapLoading(() => import('../components/density-map-view'))
const MarketSizeMapView = withMapLoading(() => import('../components/market-size-map-view'))
const RevenueMapView = withMapLoading(() => import('../components/revenue-map-view'))
const EmployeeMapView = withMapLoading(() => import('../components/employee-map-view'))
const CommercialDensityMapView = withMapLoading(() => import('../components/commercial-density-map-view'))

// Core views (Arizona + shared) — named exports
const RoutesMapView = withMapLoading(() => import('../components/routes-map-view').then(m => ({ default: m.RoutesMapView })))
const CustomerLookup = withMapLoading(() => import('../components/customer-lookup').then(m => ({ default: m.CustomerLookup })))
const AncillarySalesView = withMapLoading(() => import('../components/ancillary-sales-view').then(m => ({ default: m.AncillarySalesView })))

// Miami views — named exports
const MiamiTerritoryView = withMapLoading(() => import('../components/miami-territory-view').then(m => ({ default: m.MiamiTerritoryView })))
const MiamiKMLScenarioView = withMapLoading(() => import('../components/miami-kml-scenario-view').then(m => ({ default: m.MiamiKMLScenarioView })))
const MiamiTerritoryAssignmentTool = withMapLoading(() => import('../components/miami-territory-assignment-tool').then(m => ({ default: m.MiamiTerritoryAssignmentTool })))
const MiamiFinalTerritoryView = withMapLoading(() => import('../components/miami-final-territory-view').then(m => ({ default: m.MiamiFinalTerritoryView })))
const Miami10PctReassignmentView = withMapLoading(() => import('../components/miami-10pct-reassignment-view').then(m => ({ default: m.Miami10PctReassignmentView })))
const MiamiZipOptimizedView = withMapLoading(() => import('../components/miami-zip-optimized-view').then(m => ({ default: m.MiamiZipOptimizedView })))
const MiamiZipOptimized2View = withMapLoading(() => import('../components/miami-zip-optimized-2-view').then(m => ({ default: m.MiamiZipOptimized2View })))
const MiamiRadicalRerouteView = withMapLoading(() => import('../components/miami-radical-reroute-view').then(m => ({ default: m.MiamiRadicalRerouteView })))
const MiamiCommercialRoutesView = withMapLoading(() => import('../components/miami-commercial-routes-view').then(m => ({ default: m.MiamiCommercialRoutesView })))
const MiamiFutureCommercialRoutesView = withMapLoading(() => import('../components/miami-future-commercial-routes-view').then(m => ({ default: m.MiamiFutureCommercialRoutesView })))

// Jacksonville views — named exports
const JacksonvilleRevenueView = withMapLoading(() => import('../components/jacksonville-revenue-view').then(m => ({ default: m.JacksonvilleRevenueView })))
const JacksonvilleCommercialView = withMapLoading(() => import('../components/jacksonville-commercial-view').then(m => ({ default: m.JacksonvilleCommercialView })))
const JacksonvilleRoutesView = withMapLoading(() => import('../components/jacksonville-routes-view').then(m => ({ default: m.JacksonvilleRoutesView })))

// Location views (Dallas, Orlando, Port Charlotte, Miami variations) — named exports
const LocationRevenueAnalysis = withMapLoading(() => import('../components/location-revenue-analysis').then(m => ({ default: m.LocationRevenueAnalysis })))
const LocationCommercialView = withMapLoading(() => import('../components/location-data-views').then(m => ({ default: m.LocationCommercialView })))
const LocationRoutesView = withMapLoading(() => import('../components/location-data-views').then(m => ({ default: m.LocationRoutesView })))

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
