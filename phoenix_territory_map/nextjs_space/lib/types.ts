
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
  West: AreaStat
  Central: AreaStat
  East: AreaStat
  Tucson: AreaStat
}

export interface MapMarkerData extends TerritoryData {
  position: {
    lat: number
    lng: number
  }
}
