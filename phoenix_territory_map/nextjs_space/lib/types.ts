
export interface TerritoryData {
  zip: string
  area: string
  accounts: number
}

export interface AreaFilter {
  West: boolean
  Central: boolean
  East: boolean
  Tucson: boolean
  Commercial: boolean
}

export interface AreaStat {
  zipCodes: number
  totalAccounts: number
}

export interface AreaStats {
  [territoryKey: string]: AreaStat
}

export interface MapMarkerData extends TerritoryData {
  position: {
    lat: number
    lng: number
  }
}

// ---------------------------------------------------------------------------
// Location Configuration Types (Phase 3 - Config-Driven Architecture)
// ---------------------------------------------------------------------------

export interface MapCenter {
  lat: number
  lng: number
}

export interface Territory {
  key: string
  label: string
  color: string
}

export interface DataEndpoints {
  territory?: string
  density?: string
  marketSize?: string
  revenue?: string
  routes?: string
  customers?: string
  employees?: string
  commercial?: string
  ancillarySales?: string
  scenarios?: string
}

export type ViewModeKey =
  | 'territory'
  | 'density'
  | 'marketSize'
  | 'revenue'
  | 'routes'
  | 'customerLookup'
  | 'employeeLocations'
  | 'commercial'
  | 'ancillarySales'
  | 'scenarios'
  | 'kmlScenario'
  | 'assignmentTool'
  | 'miamiFinal'
  | 'miami10pct'
  | 'miamiZipOptimized'
  | 'miamiZipOptimized2'
  | 'radicalReroute'
  | 'miamiCommercialRoutes'
  | 'miamiFutureCommercialRoutes'
  | 'jaxRevenue'
  | 'jaxCommercial'
  | 'jaxRoutes'
  | 'locRevenue'
  | 'locCommercial'
  | 'locRoutes'

export interface LocationConfig {
  key: string
  label: string
  shortLabel: string
  center: MapCenter
  zoom: number
  territories: Territory[]
  availableViews: ViewModeKey[]
  dataEndpoints: DataEndpoints
  hasActiveTerritoryBreakup: boolean
}
