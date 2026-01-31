/**
 * TerritoryContext — Centralized location and territory data management.
 *
 * Provides current location, territory data, loading states, and location
 * config to the entire component tree. Eliminates prop drilling and creates
 * a single source of truth for location-specific data.
 *
 * bd-tj5
 */

'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { TerritoryData, AreaStats } from '@/lib/types'
import { LocationKey, LOCATION_MAP_CONFIG, getMapCenter, getMapZoom } from '@/lib/map-config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocationConfig {
  name: string
  center: { lat: number; lng: number }
  zoom: number
  key: LocationKey
}

export interface TerritoryContextValue {
  // Current location
  location: LocationKey
  setLocation: (location: LocationKey) => void

  // Location configuration
  locationConfig: LocationConfig

  // Territory data
  territoryData: TerritoryData[]
  miamiData: any[] // Miami-specific data format
  areaStats: AreaStats | null

  // Loading states
  loading: boolean
  error: string | null

  // Data management
  loadTerritoryData: () => Promise<void>
  loadMiamiData: () => Promise<void>
  refreshData: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TerritoryContext = createContext<TerritoryContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface TerritoryProviderProps {
  initialLocation?: LocationKey
  children: ReactNode
}

export function TerritoryProvider({
  initialLocation = 'arizona',
  children,
}: TerritoryProviderProps) {
  // Location state
  const [location, setLocation] = useState<LocationKey>(initialLocation)

  // Data state
  const [territoryData, setTerritoryData] = useState<TerritoryData[]>([])
  const [miamiData, setMiamiData] = useState<any[]>([])
  const [areaStats, setAreaStats] = useState<AreaStats | null>(null)

  // Loading state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Derived location config
  const locationConfig: LocationConfig = {
    ...LOCATION_MAP_CONFIG[location],
    key: location,
  }

  // ---------------------------------------------------------------------------
  // Data loading functions
  // ---------------------------------------------------------------------------

  const loadTerritoryData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load territory data based on current location
      const dataFile = getDataFileForLocation(location)
      const response = await fetch(dataFile)

      if (!response.ok) {
        throw new Error(`Failed to load territory data for ${location}`)
      }

      const data = await response.json()
      setTerritoryData(data || [])

      // Calculate stats for the loaded data
      if (data?.length) {
        calculateStats(data)
      }

    } catch (error) {
      console.error('Error loading territory data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load territory data')
      setTerritoryData([])
      setAreaStats(null)
    } finally {
      setLoading(false)
    }
  }, [location])

  const loadMiamiData = useCallback(async () => {
    try {
      const response = await fetch('/miami-map-data.json')
      if (!response.ok) {
        throw new Error('Failed to load Miami data')
      }
      const data = await response.json()
      setMiamiData(data || [])
    } catch (error) {
      console.error('Error loading Miami data:', error)
      setMiamiData([])
    }
  }, [])

  const refreshData = useCallback(async () => {
    await Promise.all([
      loadTerritoryData(),
      location === 'miami' ? loadMiamiData() : Promise.resolve(),
    ])
  }, [loadTerritoryData, loadMiamiData, location])

  // ---------------------------------------------------------------------------
  // Stats calculation
  // ---------------------------------------------------------------------------

  const calculateStats = useCallback((data: TerritoryData[]) => {
    const stats: AreaStats = {
      West: { zipCodes: 0, totalAccounts: 0 },
      Central: { zipCodes: 0, totalAccounts: 0 },
      East: { zipCodes: 0, totalAccounts: 0 },
      Tucson: { zipCodes: 0, totalAccounts: 0 }
    }

    data?.forEach(item => {
      const area = item?.area as keyof AreaStats
      if (stats[area]) {
        stats[area].zipCodes += 1
        stats[area].totalAccounts += item?.accounts || 0
      }
    })

    setAreaStats(stats)
  }, [])

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Load data when location changes
  useEffect(() => {
    loadTerritoryData()
  }, [loadTerritoryData])

  // Sync internal location state if parent prop changes
  useEffect(() => {
    setLocation(initialLocation)
  }, [initialLocation])

  // Load Miami data when location is Miami
  useEffect(() => {
    if (location === 'miami') {
      loadMiamiData()
    }
  }, [location, loadMiamiData])

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const value: TerritoryContextValue = {
    location,
    setLocation,
    locationConfig,
    territoryData,
    miamiData,
    areaStats,
    loading,
    error,
    loadTerritoryData,
    loadMiamiData,
    refreshData,
  }

  return (
    <TerritoryContext.Provider value={value}>
      {children}
    </TerritoryContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTerritoryContext() {
  const context = useContext(TerritoryContext)
  if (!context) {
    throw new Error('useTerritoryContext must be used within TerritoryProvider')
  }
  return context
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Get the appropriate data file for a location.
 * Maps location keys to their corresponding JSON data files.
 */
function getDataFileForLocation(location: LocationKey): string {
  switch (location) {
    case 'arizona':
      return '/phoenix-tucson-map-data.json'
    case 'miami':
      return '/miami-territory-data.json'
    case 'dallas':
      return '/dallas-territory-data.json'
    case 'orlando':
      return '/orlando-territory-data.json'
    case 'jacksonville':
      return '/jacksonville-territory-data.json'
    case 'portCharlotte':
      return '/port-charlotte-territory-data.json'
    default:
      return '/phoenix-tucson-map-data.json'
  }
}
