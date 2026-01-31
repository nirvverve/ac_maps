/**
 * Optional geocoding for the upload pipeline.
 *
 * Design principles (from bd-1ok comment):
 * - If CSV includes lat/lng columns, use them directly (preferred)
 * - Only geocode when address is provided without coordinates
 * - Use Google Geocoding API with rate limiting and result caching
 *
 * bd-1ok
 */

/** In-memory geocode cache to avoid duplicate API calls within a session */
const geocodeCache = new Map<string, { lat: number; lng: number } | null>()

/** Rate limit: max 10 requests per second for Google Geocoding */
const BATCH_SIZE = 10
const BATCH_DELAY_MS = 1100

interface GeocodableRecord {
  [key: string]: unknown
}

interface GeocodeResult {
  processedCount: number
  geocodedCount: number
  skippedCount: number
  failedCount: number
  records: GeocodableRecord[]
}

/**
 * Check if a record already has coordinates.
 */
function hasCoordinates(record: GeocodableRecord): boolean {
  const lat = record.lat ?? record.latitude ?? record.Lat ?? record.Latitude
  const lng = record.lng ?? record.longitude ?? record.Lng ?? record.Longitude ?? record.lon ?? record.Lon
  return lat !== null && lat !== undefined && lng !== null && lng !== undefined && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))
}

/**
 * Extract address string from a record for geocoding.
 * Tries common address field patterns.
 */
function extractAddress(record: GeocodableRecord): string | null {
  // Check for full address field
  const fullAddress = record.address ?? record.Address ?? record.full_address ?? record.fullAddress
  if (fullAddress && typeof fullAddress === 'string' && fullAddress.trim()) {
    return fullAddress.trim()
  }

  // Try to build address from parts
  const parts: string[] = []
  const street = record.street ?? record.Street ?? record.address1 ?? record.Address1
  const city = record.city ?? record.City
  const state = record.state ?? record.State
  const zip = record.zip ?? record.zipCode ?? record.zip_code ?? record.ZipCode ?? record.Zip

  if (street && typeof street === 'string') parts.push(street.trim())
  if (city && typeof city === 'string') parts.push(city.trim())
  if (state && typeof state === 'string') parts.push(state.trim())
  if (zip !== null && zip !== undefined) parts.push(String(zip).trim())

  return parts.length >= 2 ? parts.join(', ') : null
}

/**
 * Geocode a single address using Google Geocoding API.
 */
async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  // Check cache first
  const cached = geocodeCache.get(address)
  if (cached !== undefined) return cached

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location
      const result = { lat, lng }
      geocodeCache.set(address, result)
      return result
    }

    geocodeCache.set(address, null)
    return null
  } catch (error) {
    console.warn(`Geocoding failed for "${address}":`, error)
    geocodeCache.set(address, null)
    return null
  }
}

/**
 * Process records and add coordinates where missing.
 *
 * - Records with existing lat/lng are passed through unchanged
 * - Records with addresses but no coordinates are geocoded
 * - Records with neither are passed through unchanged
 */
export async function geocodeRecords(records: GeocodableRecord[]): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return {
      processedCount: records.length,
      geocodedCount: 0,
      skippedCount: records.length,
      failedCount: 0,
      records,
    }
  }

  const result: GeocodeResult = {
    processedCount: records.length,
    geocodedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    records: [...records],
  }

  // Identify records needing geocoding
  const needsGeocoding: { index: number; address: string }[] = []

  for (let i = 0; i < records.length; i++) {
    if (hasCoordinates(records[i])) {
      result.skippedCount++
      continue
    }

    const address = extractAddress(records[i])
    if (!address) {
      result.skippedCount++
      continue
    }

    needsGeocoding.push({ index: i, address })
  }

  // Process in batches with rate limiting
  for (let i = 0; i < needsGeocoding.length; i += BATCH_SIZE) {
    const batch = needsGeocoding.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.all(
      batch.map(({ address }) => geocodeAddress(address, apiKey))
    )

    for (let j = 0; j < batch.length; j++) {
      const coords = batchResults[j]
      if (coords) {
        result.records[batch[j].index] = {
          ...result.records[batch[j].index],
          lat: coords.lat,
          lng: coords.lng,
        }
        result.geocodedCount++
      } else {
        result.failedCount++
      }
    }

    // Rate limit delay between batches
    if (i + BATCH_SIZE < needsGeocoding.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  return result
}

/**
 * Check if any records in the dataset would benefit from geocoding.
 */
export function needsGeocoding(records: GeocodableRecord[]): {
  total: number
  withCoords: number
  withAddress: number
  needsGeocoding: number
} {
  let withCoords = 0
  let withAddress = 0

  for (const record of records) {
    if (hasCoordinates(record)) {
      withCoords++
    } else if (extractAddress(record)) {
      withAddress++
    }
  }

  return {
    total: records.length,
    withCoords,
    withAddress,
    needsGeocoding: withAddress,
  }
}
