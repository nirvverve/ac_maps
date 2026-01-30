/**
 * Location-aware data fetching hooks using TanStack Query.
 *
 * Builds on the config-driven architecture from bd-1n8 and bd-26i.
 * Provides automatic caching, loading states, and error handling
 * with location-specific cache keys.
 *
 * bd-12u
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { getDataEndpoint } from '@/config/locations.config'
import type { LocationKey } from '@/lib/map-config'
import type { TerritoryData, DataEndpoints } from '@/lib/types'

// ---------------------------------------------------------------------------
// Query Keys Factory
// ---------------------------------------------------------------------------

export const dataQueryKeys = {
  all: ['locationData'] as const,
  location: (location: LocationKey) => [...dataQueryKeys.all, location] as const,
  territory: (location: LocationKey) => [...dataQueryKeys.location(location), 'territory'] as const,
  density: (location: LocationKey) => [...dataQueryKeys.location(location), 'density'] as const,
  revenue: (location: LocationKey) => [...dataQueryKeys.location(location), 'revenue'] as const,
  routes: (location: LocationKey) => [...dataQueryKeys.location(location), 'routes'] as const,
  customers: (location: LocationKey) => [...dataQueryKeys.location(location), 'customers'] as const,
  employees: (location: LocationKey) => [...dataQueryKeys.location(location), 'employees'] as const,
  commercial: (location: LocationKey) => [...dataQueryKeys.location(location), 'commercial'] as const,
  ancillarySales: (location: LocationKey) => [...dataQueryKeys.location(location), 'ancillarySales'] as const,
}

// ---------------------------------------------------------------------------
// Data Fetcher Function
// ---------------------------------------------------------------------------

async function fetchLocationData<T = any>(
  location: LocationKey,
  dataType: keyof DataEndpoints
): Promise<T> {
  const endpoint = getDataEndpoint(location, dataType)

  if (!endpoint) {
    throw new Error(`No ${dataType} endpoint configured for location: ${location}`)
  }

  const response = await fetch(endpoint)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${dataType} data for ${location}: ${response.status}`)
  }

  return response.json()
}

// ---------------------------------------------------------------------------
// Data Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch territory data for a location with automatic caching.
 */
export function useTerritoryData(location: LocationKey) {
  return useQuery({
    queryKey: dataQueryKeys.territory(location),
    queryFn: () => fetchLocationData<TerritoryData[]>(location, 'territory'),
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    enabled: !!location, // Only fetch if location is provided
  })
}

/**
 * Fetch density data for a location.
 */
export function useDensityData(location: LocationKey) {
  return useQuery({
    queryKey: dataQueryKeys.density(location),
    queryFn: () => fetchLocationData(location, 'density'),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!location,
  })
}

/**
 * Fetch revenue data for a location.
 */
export function useRevenueData(location: LocationKey) {
  return useQuery({
    queryKey: dataQueryKeys.revenue(location),
    queryFn: () => fetchLocationData(location, 'revenue'),
    staleTime: 1000 * 60 * 10, // Revenue data stays fresh longer
    gcTime: 1000 * 60 * 60, // Cache revenue data for 1 hour
    enabled: !!location,
  })
}

/**
 * Fetch routes data for a location.
 */
export function useRoutesData(location: LocationKey) {
  return useQuery({
    queryKey: dataQueryKeys.routes(location),
    queryFn: () => fetchLocationData(location, 'routes'),
    staleTime: 1000 * 60 * 15, // Routes change less frequently
    gcTime: 1000 * 60 * 60,
    enabled: !!location,
  })
}

/**
 * Fetch customer data for a location.
 */
export function useCustomerData(location: LocationKey) {
  return useQuery({
    queryKey: dataQueryKeys.customers(location),
    queryFn: () => fetchLocationData(location, 'customers'),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!location,
  })
}

/**
 * Fetch employee data for a location.
 */
export function useEmployeeData(location: LocationKey) {
  return useQuery({
    queryKey: dataQueryKeys.employees(location),
    queryFn: () => fetchLocationData(location, 'employees'),
    staleTime: 1000 * 60 * 30, // Employee data changes less frequently
    gcTime: 1000 * 60 * 120, // Cache for 2 hours
    enabled: !!location,
  })
}

/**
 * Fetch commercial data for a location.
 */
export function useCommercialData(location: LocationKey) {
  return useQuery({
    queryKey: dataQueryKeys.commercial(location),
    queryFn: () => fetchLocationData(location, 'commercial'),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    enabled: !!location,
  })
}

/**
 * Fetch ancillary sales data for a location.
 */
export function useAncillarySalesData(location: LocationKey) {
  return useQuery({
    queryKey: dataQueryKeys.ancillarySales(location),
    queryFn: () => fetchLocationData(location, 'ancillarySales'),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    enabled: !!location,
  })
}

// ---------------------------------------------------------------------------
// Compound Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all essential data for a location in parallel.
 * Returns loading state that's true until ALL queries complete.
 */
export function useLocationEssentials(location: LocationKey) {
  const territory = useTerritoryData(location)
  const density = useDensityData(location)
  const revenue = useRevenueData(location)

  return {
    territory: territory.data ?? [],
    density: density.data ?? [],
    revenue: revenue.data ?? [],
    isLoading: territory.isLoading || density.isLoading || revenue.isLoading,
    error: territory.error || density.error || revenue.error,
    refetchAll: () => {
      territory.refetch()
      density.refetch()
      revenue.refetch()
    }
  }
}

/**
 * Hook for conditional data fetching based on location features.
 * Only fetches data if the location supports the specific feature.
 */
export function useConditionalLocationData(location: LocationKey, dataType: keyof DataEndpoints) {
  const endpoint = getDataEndpoint(location, dataType)
  const hasEndpoint = !!endpoint

  return useQuery({
    queryKey: [...dataQueryKeys.location(location), dataType],
    queryFn: () => fetchLocationData(location, dataType),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: hasEndpoint && !!location,
  })
}