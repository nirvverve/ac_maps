/**
 * TanStack Query Provider setup for location-aware data fetching.
 *
 * Provides QueryClient with optimal configuration for our map application.
 * Includes error handling, retry logic, and performance optimizations.
 *
 * bd-12u
 */

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient instance with our app-specific configuration
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Default stale time for all queries
            staleTime: 1000 * 60 * 5, // 5 minutes

            // Cache time (how long to keep data in cache when unused)
            gcTime: 1000 * 60 * 30, // 30 minutes

            // Retry configuration for failed requests
            retry: (failureCount, error) => {
              // Don't retry on 404s (data not available for location)
              if (error instanceof Error && error.message.includes('404')) {
                return false
              }
              // Retry up to 3 times for other errors
              return failureCount < 3
            },

            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

            // Refetch behavior
            refetchOnWindowFocus: false, // Don't refetch when window regains focus
            refetchOnMount: true, // Refetch when component mounts if data is stale
            refetchOnReconnect: true, // Refetch when internet connection is restored
          },
          mutations: {
            // Default retry for mutations (uploads, etc.)
            retry: 1,
            retryDelay: 2000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show dev tools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
          position="bottom"
        />
      )}
    </QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Cache Management Utilities
// ---------------------------------------------------------------------------

/**
 * Invalidate all data for a specific location.
 * Useful when location data is updated or uploaded.
 */
export function invalidateLocationData(queryClient: QueryClient, location: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      return Array.isArray(query.queryKey) &&
             query.queryKey.includes('locationData') &&
             query.queryKey.includes(location)
    }
  })
}

/**
 * Prefetch essential data for a location.
 * Useful for preloading data when user is likely to navigate to a location.
 */
export async function prefetchLocationEssentials(
  queryClient: QueryClient,
  location: string
) {
  const queries = [
    'territory',
    'density',
    'revenue'
  ]

  await Promise.allSettled(
    queries.map(async (dataType) => {
      return queryClient.prefetchQuery({
        queryKey: ['locationData', location, dataType],
        queryFn: async () => {
          // Import getDataEndpoint dynamically to avoid circular imports
          const { getDataEndpoint } = await import('@/config/locations.config')
          const endpoint = getDataEndpoint(location, dataType as any)

          if (!endpoint) return null

          const response = await fetch(endpoint)
          if (!response.ok) throw new Error(`Failed to fetch ${dataType}`)

          return response.json()
        },
        staleTime: 1000 * 60 * 5,
      })
    })
  )
}

/**
 * Clear all cached data.
 * Useful for testing or when major data updates occur.
 */
export function clearAllCache(queryClient: QueryClient) {
  queryClient.clear()
}