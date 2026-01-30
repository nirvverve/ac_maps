/**
 * Centralized territory color definitions.
 *
 * Single source of truth for fill, stroke, and highlight colors used by
 * Google Maps polygons, markers, legend chips, and stat cards across all
 * locations (Arizona + Miami). Derived from config/branch_definitions.json.
 *
 * bd-2hn
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TerritoryColors {
  fill: string
  stroke: string
}

export interface HighlightStyle {
  strokeColor: string
  fillOpacity: number
  strokeOpacity: number
  strokeWeight: number
  zIndex: number
}

// ---------------------------------------------------------------------------
// Arizona territory colors (West / Central / East / Tucson)
// ---------------------------------------------------------------------------

export const AZ_TERRITORY_COLORS: Record<string, TerritoryColors> = {
  West:    { fill: '#3B82F6', stroke: '#2563EB' },  // Blue
  Central: { fill: '#10B981', stroke: '#059669' },  // Green
  East:    { fill: '#F59E0B', stroke: '#D97706' },  // Orange
  Tucson:  { fill: '#A855F7', stroke: '#9333EA' },  // Purple
}

// ---------------------------------------------------------------------------
// Miami territory colors (North / Central / South)
// ---------------------------------------------------------------------------

export const MIAMI_TERRITORY_COLORS: Record<string, TerritoryColors> = {
  North:   { fill: '#3B82F6', stroke: '#2563EB' },  // Blue
  Central: { fill: '#10B981', stroke: '#059669' },  // Green
  South:   { fill: '#F59E0B', stroke: '#D97706' },  // Orange
}

// ---------------------------------------------------------------------------
// Shared defaults
// ---------------------------------------------------------------------------

export const DEFAULT_COLORS: TerritoryColors = {
  fill: '#6B7280',
  stroke: '#4B5563',
}

export const HIGHLIGHT: HighlightStyle = {
  strokeColor: '#DC2626',
  fillOpacity: 0.6,
  strokeOpacity: 1,
  strokeWeight: 4,
  zIndex: 100,
}

export const NORMAL_FILL_OPACITY  = 0.35
export const NORMAL_STROKE_OPACITY = 0.8
export const NORMAL_STROKE_WEIGHT  = 2
export const NORMAL_ZINDEX         = 1

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Look up territory colors by area key across all locations.
 * Falls back to DEFAULT_COLORS when the area is unknown.
 */
export function getTerritoryColors(area: string): TerritoryColors {
  return (
    AZ_TERRITORY_COLORS[area] ??
    MIAMI_TERRITORY_COLORS[area] ??
    DEFAULT_COLORS
  )
}

/**
 * Return the fill color for a territory area.
 * Convenience wrapper used by legend chips and stat cards.
 */
export function getTerritoryFillColor(area: string): string {
  return getTerritoryColors(area).fill
}

/**
 * Build Google Maps PolygonOptions for a territory polygon.
 */
export function getPolygonOptions(
  area: string,
  isHighlighted: boolean = false,
): google.maps.PolygonOptions {
  const colors = getTerritoryColors(area)

  return {
    fillColor: colors.fill,
    fillOpacity: isHighlighted ? HIGHLIGHT.fillOpacity : NORMAL_FILL_OPACITY,
    strokeColor: isHighlighted ? HIGHLIGHT.strokeColor : colors.stroke,
    strokeOpacity: isHighlighted ? HIGHLIGHT.strokeOpacity : NORMAL_STROKE_OPACITY,
    strokeWeight: isHighlighted ? HIGHLIGHT.strokeWeight : NORMAL_STROKE_WEIGHT,
    clickable: true,
    draggable: false,
    editable: false,
    geodesic: false,
    zIndex: isHighlighted ? HIGHLIGHT.zIndex : NORMAL_ZINDEX,
  }
}

/**
 * Build a Google Maps marker Symbol for a territory.
 */
export function getMarkerSymbol(
  area: string,
  googleMaps?: typeof google.maps,
): google.maps.Symbol {
  return {
    path: googleMaps?.SymbolPath?.CIRCLE ?? 0,
    scale: 8,
    fillColor: getTerritoryFillColor(area),
    fillOpacity: 0.9,
    strokeWeight: 2,
    strokeColor: '#FFFFFF',
  }
}
