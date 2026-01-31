/**
 * GET /api/data/[location]/[dataType] - Authenticated JSON data serving
 *
 * Replaces interim middleware protection with proper API route.
 * Serves location-based data from DataStore with fallback to static files
 * during migration. Requires authentication but not admin access.
 *
 * bd-3jq
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDataStore } from '@/lib/datastore'
import { promises as fs } from 'fs'
import { join } from 'path'

// Supported locations from the config-driven system
const SUPPORTED_LOCATIONS = [
  'arizona',
  'miami',
  'dallas',
  'jacksonville',
  'orlando',
  'portCharlotte'
] as const

// Common data types found in the system
const COMMON_DATA_TYPES = [
  'territory-data',
  'density-data',
  'commercial-accounts',
  'commercial-density-data',
  'route-assignments',
  'zip-boundaries',
  'zip-revenue-data',
  'customer-lookup',
  'employee-locations',
  'ancillary-sales-data',
  'market-size-data'
] as const

type Location = typeof SUPPORTED_LOCATIONS[number]
type DataType = typeof COMMON_DATA_TYPES[number] | string // Allow flexibility for new types

interface RouteParams {
  location: string
  dataType: string
}

/**
 * Normalize location name to match both URL params and file patterns
 */
function normalizeLocation(location: string): string {
  // Handle URL-safe encoding (portCharlotte -> port-charlotte in URLs)
  const normalized = location.toLowerCase()

  // Map common variations
  const locationMap: Record<string, string> = {
    'portcharlotte': 'portcharlotte',
    'port-charlotte': 'portcharlotte',
    // Add other mappings as needed
  }

  return locationMap[normalized] || normalized
}

/**
 * Try to read data from DataStore
 */
async function readFromDataStore(location: string, dataType: string): Promise<unknown | null> {
  try {
    const store = await getDataStore()
    const key = `${location}/${dataType}.json`
    return await store.read(key)
  } catch (error) {
    console.warn('DataStore read failed:', error)
    return null
  }
}

/**
 * Fallback to static file in public directory
 */
async function readFromPublicFile(location: string, dataType: string): Promise<unknown | null> {
  try {
    const publicDir = join(process.cwd(), 'public')

    // Try multiple file naming patterns found in public directory
    const possiblePaths = [
      `${location}-${dataType}.json`,           // miami-density-data.json
      `${dataType}.json`,                       // density-data.json (for arizona)
      `${location}-${dataType.replace('-data', '')}.json`, // legacy patterns
    ]

    for (const fileName of possiblePaths) {
      const filePath = join(publicDir, fileName)
      try {
        const content = await fs.readFile(filePath, 'utf8')
        return JSON.parse(content)
      } catch (error) {
        // Continue to next pattern
        continue
      }
    }

    return null
  } catch (error) {
    console.warn('Static file read failed:', error)
    return null
  }
}

/**
 * Generate cache headers based on data type
 */
function getCacheHeaders(dataType: string): Record<string, string> {
  // Different cache strategies for different data types
  const cacheStrategies = {
    'zip-boundaries': 'public, max-age=86400, stale-while-revalidate=86400', // 24 hours (rarely changes)
    'territory-data': 'public, max-age=3600, stale-while-revalidate=1800',   // 1 hour (business logic)
    'density-data': 'public, max-age=3600, stale-while-revalidate=1800',     // 1 hour (analytics)
    'route-assignments': 'public, max-age=1800, stale-while-revalidate=900', // 30 min (operational)
    'commercial-accounts': 'private, max-age=1800, stale-while-revalidate=900' // 30 min (sensitive)
  }

  const cacheControl = cacheStrategies[dataType as keyof typeof cacheStrategies] ||
                      'public, max-age=1800, stale-while-revalidate=900' // Default 30 min

  return {
    'Cache-Control': cacheControl,
    'Content-Type': 'application/json',
    'X-Data-Source': 'api-route' // Help distinguish from static files
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    // 1. Authentication check - requires session but not admin role
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. Extract and validate route parameters
    const { location, dataType } = params

    if (!location || !dataType) {
      return NextResponse.json(
        { error: 'Location and dataType parameters are required' },
        { status: 400 }
      )
    }

    // 3. Normalize location and validate
    const normalizedLocation = normalizeLocation(location)

    if (!SUPPORTED_LOCATIONS.includes(normalizedLocation as Location)) {
      return NextResponse.json(
        {
          error: 'Unsupported location',
          supportedLocations: SUPPORTED_LOCATIONS
        },
        { status: 400 }
      )
    }

    // 4. Try to read from DataStore first
    let data = await readFromDataStore(normalizedLocation, dataType)
    let dataSource = 'datastore'

    // 5. Fallback to static file if not found in DataStore
    if (data === null) {
      data = await readFromPublicFile(normalizedLocation, dataType)
      dataSource = 'static-fallback'
    }

    // 6. Return 404 if no data found
    if (data === null) {
      return NextResponse.json(
        {
          error: 'Data not found',
          location: normalizedLocation,
          dataType,
          hint: 'Check if the location and dataType combination is valid'
        },
        { status: 404 }
      )
    }

    // 7. Return data with appropriate cache headers
    const headers = {
      ...getCacheHeaders(dataType),
      'X-Data-Source-Type': dataSource
    }

    return NextResponse.json(data, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Data API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}