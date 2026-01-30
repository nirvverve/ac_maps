/**
 * Centralized Google Maps configuration.
 *
 * Single source of truth for map centers, zoom levels, container styles, and
 * Google Maps style presets used across all map view components.
 *
 * bd-29w
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LocationKey =
  | 'arizona'
  | 'miami'
  | 'dallas'
  | 'orlando'
  | 'jacksonville'
  | 'portCharlotte'

export interface MapCenter {
  lat: number
  lng: number
}

export interface LocationMapConfig {
  name: string
  center: MapCenter
  zoom: number
}

// ---------------------------------------------------------------------------
// Map centers per location
// ---------------------------------------------------------------------------

export const MAP_CENTERS: Record<LocationKey, MapCenter> = {
  arizona:        { lat: 33.4484, lng: -112.0740 },
  miami:          { lat: 25.7617, lng: -80.1918 },
  dallas:         { lat: 32.7767, lng: -96.7970 },
  orlando:        { lat: 28.5383, lng: -81.3792 },
  jacksonville:   { lat: 30.3322, lng: -81.6557 },
  portCharlotte:  { lat: 26.9762, lng: -82.0909 },
}

// ---------------------------------------------------------------------------
// Default zoom levels per location
// ---------------------------------------------------------------------------

export const MAP_ZOOM: Record<LocationKey, number> = {
  arizona:        9,
  miami:          10,
  dallas:         10,
  orlando:        10,
  jacksonville:   10,
  portCharlotte:  11,
}

/**
 * Convenience lookup: center + zoom bundled per location.
 * Mirrors the LOCATION_CONFIG in location-revenue-analysis.tsx.
 */
export const LOCATION_MAP_CONFIG: Record<LocationKey, LocationMapConfig> = {
  arizona:        { name: 'Phoenix / Tucson, AZ', center: MAP_CENTERS.arizona,       zoom: MAP_ZOOM.arizona },
  miami:          { name: 'Miami',                center: MAP_CENTERS.miami,          zoom: MAP_ZOOM.miami },
  dallas:         { name: 'Dallas',               center: MAP_CENTERS.dallas,         zoom: MAP_ZOOM.dallas },
  orlando:        { name: 'Orlando',              center: MAP_CENTERS.orlando,        zoom: MAP_ZOOM.orlando },
  jacksonville:   { name: 'Jacksonville',         center: MAP_CENTERS.jacksonville,   zoom: MAP_ZOOM.jacksonville },
  portCharlotte:  { name: 'Port Charlotte',       center: MAP_CENTERS.portCharlotte,  zoom: MAP_ZOOM.portCharlotte },
}

// ---------------------------------------------------------------------------
// Map container styles
// ---------------------------------------------------------------------------

export const MAP_CONTAINER_STYLE = {
  width: '100%' as const,
  height: '600px' as const,
}

export const MAP_CONTAINER_STYLE_TALL = {
  width: '100%' as const,
  height: '700px' as const,
}

export const MAP_CONTAINER_STYLE_XL = {
  width: '100%' as const,
  height: '800px' as const,
}

// ---------------------------------------------------------------------------
// Google Maps style presets
// ---------------------------------------------------------------------------

/** Minimal: hide POIs only. Used by Miami views. */
export const MAP_STYLE_MINIMAL: google.maps.MapTypeStyle[] = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
]

/** Territory view: hide admin, POIs, road icons, transit for a clean polygon overlay. */
export const MAP_STYLE_TERRITORY: google.maps.MapTypeStyle[] = [
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
]

/** Revenue/analytical: subdued basemap for data overlays. */
export const MAP_STYLE_ANALYTICAL: google.maps.MapTypeStyle[] = [
  {
    featureType: 'all',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7c93a3' }, { lightness: '-10' }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ lightness: '0' }, { saturation: '0' }, { color: '#f5f5f2' }, { gamma: '1' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c9c9c9' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#C6E2FF' }],
  },
]

// ---------------------------------------------------------------------------
// Common Google Maps options
// ---------------------------------------------------------------------------

/** Standard control set for territory views. */
export const MAP_OPTIONS_TERRITORY: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
  styles: MAP_STYLE_TERRITORY,
}

/** Minimal controls for Miami / scenario views. */
export const MAP_OPTIONS_MINIMAL: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: MAP_STYLE_MINIMAL,
}

/** Analytical/revenue map options. */
export const MAP_OPTIONS_ANALYTICAL: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  styles: MAP_STYLE_ANALYTICAL,
}

// ---------------------------------------------------------------------------
// Area filter defaults
// ---------------------------------------------------------------------------

export interface ArizonaAreaFilter {
  West: boolean
  Central: boolean
  East: boolean
  Tucson: boolean
  Commercial: boolean
}

export interface MiamiAreaFilter {
  North: boolean
  Central: boolean
  South: boolean
}

export const DEFAULT_AZ_AREA_FILTER: ArizonaAreaFilter = {
  West: true,
  Central: true,
  East: true,
  Tucson: true,
  Commercial: true,
}

export const DEFAULT_MIAMI_AREA_FILTER: MiamiAreaFilter = {
  North: true,
  Central: true,
  South: true,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get map center for a location key. Falls back to Arizona. */
export function getMapCenter(location: string): MapCenter {
  return MAP_CENTERS[location as LocationKey] ?? MAP_CENTERS.arizona
}

/** Get default zoom for a location key. Falls back to 9. */
export function getMapZoom(location: string): number {
  return MAP_ZOOM[location as LocationKey] ?? 9
}
