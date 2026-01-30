
export interface TerritoryData {
  zip: string
  area: string
  accounts: number
}

export type AreaFilter = Record<string, boolean>

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

// ---------------------------------------------------------------------------
// Density Color Configuration Types (bd-h1b)
// ---------------------------------------------------------------------------

export interface ColorThreshold {
  min: number
  max: number
  color: string
}

export interface ThresholdScale {
  thresholds: ColorThreshold[]
}

export interface AccountTypeThresholds {
  residential: ThresholdScale
  commercial?: ThresholdScale  // Optional - some locations may only have residential
}

export interface DensityColorThresholds {
  active: AccountTypeThresholds
  terminated: AccountTypeThresholds
  lifetime: ThresholdScale  // Lifetime is not split by account type
  churn: ThresholdScale     // Churn rate is not split by account type
}

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
  colorThresholds: DensityColorThresholds
}
