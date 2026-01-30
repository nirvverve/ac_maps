/**
 * Centralized location configuration for all geographic markets.
 *
 * Config-driven architecture: All location-specific behavior is defined here.
 * Adding a new location requires only updating this config + uploading data.
 * No code changes needed for new markets.
 *
 * bd-1n8
 */

import type { LocationConfig, ViewModeKey, DataEndpoints } from '../lib/types'

// ---------------------------------------------------------------------------
// Location Configurations
// ---------------------------------------------------------------------------

export const LOCATIONS: Record<string, LocationConfig> = {
  arizona: {
    key: 'arizona',
    label: 'Phoenix / Tucson, AZ',
    shortLabel: 'Arizona',
    center: { lat: 33.4484, lng: -112.0740 },
    zoom: 9,
    territories: [
      { key: 'West', label: 'Phoenix West', color: '#3B82F6' },      // Blue
      { key: 'Central', label: 'Phoenix Central', color: '#10B981' }, // Green
      { key: 'East', label: 'Phoenix East', color: '#F59E0B' },       // Orange
      { key: 'Tucson', label: 'Tucson', color: '#A855F7' },          // Purple
      { key: 'Commercial', label: 'Commercial', color: '#FBBF24' },   // Amber
    ],
    availableViews: [
      'territory',
      'density',
      'marketSize',
      'revenue',
      'routes',
      'customerLookup',
      'employeeLocations',
      'commercial',
      'ancillarySales',
    ],
    dataEndpoints: {
      territory: '/phoenix-tucson-map-data.json',
      density: '/phoenix-density-data.json',
      marketSize: '/phoenix-market-data.json',
      revenue: '/phoenix-revenue-data.json',
      routes: '/phoenix-routes-data.json',
      customers: '/phoenix-customers-data.json',
      employees: '/phoenix-employees-data.json',
      commercial: '/phoenix-commercial-data.json',
      ancillarySales: '/phoenix-ancillary-data.json',
    },
    hasActiveTerritoryBreakup: true,
  },

  miami: {
    key: 'miami',
    label: 'Miami, FL',
    shortLabel: 'Miami',
    center: { lat: 25.7617, lng: -80.1918 },
    zoom: 10,
    territories: [
      { key: 'North', label: 'Miami North', color: '#3B82F6' },     // Blue
      { key: 'Central', label: 'Miami Central', color: '#10B981' }, // Green
      { key: 'South', label: 'Miami South', color: '#F59E0B' },     // Orange
    ],
    availableViews: [
      'territory',
      'density',
      'revenue',
      'routes',
      'customerLookup',
      'commercial',
      'ancillarySales',
      // Miami-specific scenario views
      'kmlScenario',
      'assignmentTool',
      'miamiFinal',
      'miami10pct',
      'miamiZipOptimized',
      'miamiZipOptimized2',
      'radicalReroute',
      'miamiCommercialRoutes',
      'miamiFutureCommercialRoutes',
    ],
    dataEndpoints: {
      territory: '/miami-territory-data.json',
      density: '/miami-density-data.json',
      revenue: '/miami-revenue-data.json',
      routes: '/miami-routes-data.json',
      customers: '/miami-customers-data.json',
      commercial: '/miami-commercial-data.json',
      ancillarySales: '/miami-ancillary-data.json',
      scenarios: '/miami-scenarios-data.json',
    },
    hasActiveTerritoryBreakup: true,
  },

  dallas: {
    key: 'dallas',
    label: 'Dallas, TX',
    shortLabel: 'Dallas',
    center: { lat: 32.7767, lng: -96.7970 },
    zoom: 10,
    territories: [], // No active territory breakup yet
    availableViews: [
      'density',
      'revenue',
      'routes',
      'customerLookup',
      'commercial',
      'ancillarySales',
    ],
    dataEndpoints: {
      density: '/dallas-density-data.json',
      revenue: '/dallas-revenue-data.json',
      routes: '/dallas-routes-data.json',
      customers: '/dallas-customers-data.json',
      commercial: '/dallas-commercial-data.json',
      ancillarySales: '/dallas-ancillary-data.json',
    },
    hasActiveTerritoryBreakup: false,
  },

  orlando: {
    key: 'orlando',
    label: 'Orlando, FL',
    shortLabel: 'Orlando',
    center: { lat: 28.5383, lng: -81.3792 },
    zoom: 10,
    territories: [], // No active territory breakup yet
    availableViews: [
      'density',
      'revenue',
      'routes',
      'customerLookup',
      'commercial',
      'ancillarySales',
    ],
    dataEndpoints: {
      density: '/orlando-density-data.json',
      revenue: '/orlando-revenue-data.json',
      routes: '/orlando-routes-data.json',
      customers: '/orlando-customers-data.json',
      commercial: '/orlando-commercial-data.json',
      ancillarySales: '/orlando-ancillary-data.json',
    },
    hasActiveTerritoryBreakup: false,
  },

  jacksonville: {
    key: 'jacksonville',
    label: 'Jacksonville, FL',
    shortLabel: 'Jacksonville',
    center: { lat: 30.3322, lng: -81.6557 },
    zoom: 10,
    territories: [], // No active territory breakup yet
    availableViews: [
      'density',
      'revenue',
      'routes',
      'customerLookup',
      'commercial',
      'ancillarySales',
      // Jacksonville-specific views
      'jaxRevenue',
      'jaxCommercial',
      'jaxRoutes',
    ],
    dataEndpoints: {
      density: '/jacksonville-density-data.json',
      revenue: '/jacksonville-revenue-data.json',
      routes: '/jacksonville-routes-data.json',
      customers: '/jacksonville-customers-data.json',
      commercial: '/jacksonville-commercial-data.json',
      ancillarySales: '/jacksonville-ancillary-data.json',
    },
    hasActiveTerritoryBreakup: false,
  },

  portCharlotte: {
    key: 'portCharlotte',
    label: 'Port Charlotte, FL',
    shortLabel: 'Port Charlotte',
    center: { lat: 26.9762, lng: -82.0909 },
    zoom: 11,
    territories: [], // No active territory breakup yet
    availableViews: [
      'density',
      'revenue',
      'routes',
      'customerLookup',
      'commercial',
      'ancillarySales',
    ],
    dataEndpoints: {
      density: '/port-charlotte-density-data.json',
      revenue: '/port-charlotte-revenue-data.json',
      routes: '/port-charlotte-routes-data.json',
      customers: '/port-charlotte-customers-data.json',
      commercial: '/port-charlotte-commercial-data.json',
      ancillarySales: '/port-charlotte-ancillary-data.json',
    },
    hasActiveTerritoryBreakup: false,
  },
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Get configuration for a specific location.
 * Falls back to arizona if location is not found.
 */
export function getLocationConfig(locationKey: string): LocationConfig {
  return LOCATIONS[locationKey] ?? LOCATIONS.arizona
}

/**
 * Get all available location keys.
 */
export function getAllLocationKeys(): string[] {
  return Object.keys(LOCATIONS)
}

/**
 * Get locations that have active territory breakups.
 */
export function getLocationsWithTerritories(): LocationConfig[] {
  return Object.values(LOCATIONS).filter(loc => loc.hasActiveTerritoryBreakup)
}

/**
 * Check if a location supports a specific view mode.
 */
export function locationSupportsView(locationKey: string, viewMode: ViewModeKey): boolean {
  const config = getLocationConfig(locationKey)
  return config.availableViews.includes(viewMode)
}

/**
 * Get available view modes for a specific location.
 */
export function getAvailableViews(locationKey: string): ViewModeKey[] {
  const config = getLocationConfig(locationKey)
  return config.availableViews
}

/**
 * Get data endpoint URL for a location and data type.
 */
export function getDataEndpoint(locationKey: string, dataType: keyof DataEndpoints): string | undefined {
  const config = getLocationConfig(locationKey)
  return config.dataEndpoints[dataType]
}

/**
 * Get territory configuration for a location.
 * Returns empty array if location has no territories.
 */
export function getTerritories(locationKey: string) {
  const config = getLocationConfig(locationKey)
  return config.territories
}

/**
 * Get territory color by key for a location.
 */
export function getTerritoryColor(locationKey: string, territoryKey: string): string | undefined {
  const territories = getTerritories(locationKey)
  return territories.find(t => t.key === territoryKey)?.color
}

// ---------------------------------------------------------------------------
// Default Exports
// ---------------------------------------------------------------------------

export default LOCATIONS