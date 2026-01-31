import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { rateLimitGuard, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

interface ZipCodeRequest {
  zip: number
  area: string
}

interface ZipBoundary {
  zipCode: number
  area: string
  paths: google.maps.LatLngLiteral[]
  center: google.maps.LatLngLiteral
}

// Cache the GeoJSON data to avoid reading file repeatedly
let cachedGeoJSON: any = null

async function loadGeoJSON() {
  if (!cachedGeoJSON) {
    const filePath = join(process.cwd(), 'public', 'az-zip-boundaries.json')
    const fileContent = await readFile(filePath, 'utf-8')
    cachedGeoJSON = JSON.parse(fileContent)
  }
  return cachedGeoJSON
}

function extractCoordinates(geometry: any): number[][][] {
  if (!geometry) return []
  
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates[0]]
  } else if (geometry.type === 'MultiPolygon') {
    // For multipolygons, return all outer rings
    return geometry.coordinates.map((poly: any) => poly[0])
  }
  
  return []
}

function calculateCenter(coordinates: number[][]): google.maps.LatLngLiteral {
  let sumLat = 0
  let sumLng = 0
  let count = 0
  
  for (const coord of coordinates) {
    sumLng += coord[0]
    sumLat += coord[1]
    count++
  }
  
  return {
    lat: sumLat / count,
    lng: sumLng / count
  }
}

export async function POST(request: NextRequest) {
  // Rate limit check (bd-4gs)
  const rateLimited = rateLimitGuard('zip-boundaries', request, RATE_LIMIT_CONFIGS.zipBoundaries)
  if (rateLimited) return rateLimited

  try {
    const body = await request.json()
    const zipCodes: ZipCodeRequest[] = body.zipCodes || []

    if (!zipCodes.length) {
      return NextResponse.json({ error: 'No zip codes provided' }, { status: 400 })
    }

    // Load the GeoJSON file with all Arizona zip code boundaries
    const geoJSON = await loadGeoJSON()
    
    // Create a map of zip codes to areas for quick lookup
    const zipToArea = new Map(zipCodes.map(({ zip, area }) => [zip.toString(), area]))
    
    // Extract boundaries from GeoJSON
    const boundaries: ZipBoundary[] = []
    
    for (const feature of geoJSON.features) {
      const zipCode = feature.properties?.ZCTA5CE10 || feature.properties?.GEOID10 || feature.properties?.ZCTA
      
      if (!zipCode) continue
      
      const area = zipToArea.get(zipCode.toString())
      if (!area) continue
      
      const coordinateSets = extractCoordinates(feature.geometry)
      
      for (const coordinates of coordinateSets) {
        if (coordinates.length > 0) {
          // Convert to Google Maps LatLngLiteral format
          const paths: google.maps.LatLngLiteral[] = coordinates.map(coord => ({
            lat: coord[1],
            lng: coord[0]
          }))
          
          const center = calculateCenter(coordinates)
          
          boundaries.push({
            zipCode: parseInt(zipCode),
            area,
            paths,
            center
          })
        }
      }
    }
    
    // For any zip codes not found in GeoJSON, try Google Geocoding as fallback
    // With rate limiting to avoid overloading the API
    const foundZips = new Set(boundaries.map(b => b.zipCode))
    const missingZips = zipCodes.filter(({ zip }) => !foundZips.has(parseInt(String(zip))))
    
    if (missingZips.length > 0) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      
      // Rate limiting: process in batches with delays
      const batchSize = 10
      const delayBetweenBatches = 1000 // 1 second
      
      for (let i = 0; i < missingZips.length; i += batchSize) {
        const batch = missingZips.slice(i, i + batchSize)
        
        await Promise.all(
          batch.map(async ({ zip, area }) => {
            try {
              if (!apiKey) return
              
              const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${apiKey}`
              const geocodeResponse = await fetch(geocodeUrl)
              const geocodeData = await geocodeResponse.json()

              if (geocodeData.status === 'OK' && geocodeData.results?.[0]) {
                const result = geocodeData.results[0]
                const location = result.geometry.location
                const bounds = result.geometry.bounds

                if (bounds) {
                  const paths: google.maps.LatLngLiteral[] = [
                    { lat: bounds.northeast.lat, lng: bounds.northeast.lng },
                    { lat: bounds.northeast.lat, lng: bounds.southwest.lng },
                    { lat: bounds.southwest.lat, lng: bounds.southwest.lng },
                    { lat: bounds.southwest.lat, lng: bounds.northeast.lng },
                  ]

                  boundaries.push({
                    zipCode: zip,
                    area,
                    paths,
                    center: location
                  })
                }
              }
            } catch (error) {
              console.error(`Error fetching fallback boundary for zip ${zip}:`, error)
            }
          })
        )
        
        // Add delay between batches (except for the last batch)
        if (i + batchSize < missingZips.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
        }
      }
    }

    return NextResponse.json({ boundaries })
  } catch (error) {
    console.error('Error in zip-boundaries API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
