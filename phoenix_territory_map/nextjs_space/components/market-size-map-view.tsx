
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { GoogleMap, InfoWindowF, PolygonF, MarkerF } from '@react-google-maps/api'
import { Card } from '@/components/ui/card'
import { Building2, MapPin } from 'lucide-react'
import { getAreaDisplayName } from '@/lib/utils'

interface MarketSizeData {
  zipCode: string
  permittedPools: number
}

interface OfficeLocation {
  zipCode: string
  area: string
  category: string
  label: string
  lat: number
  lng: number
}

interface MarketSizeMapViewProps {
  areaFilter: {
    West: boolean
    Central: boolean
    East: boolean
    Tucson: boolean
  }
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
}

const center = {
  lat: 33.4484,
  lng: -112.0740,
}

export default function MarketSizeMapView({ areaFilter }: MarketSizeMapViewProps) {
  const [marketData, setMarketData] = useState<MarketSizeData[]>([])
  const [zipBoundaries, setZipBoundaries] = useState<any[]>([])
  const [territoryData, setTerritoryData] = useState<any[]>([])
  const [selectedZip, setSelectedZip] = useState<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>([])
  const [selectedOffice, setSelectedOffice] = useState<OfficeLocation | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  // Load market size data
  useEffect(() => {
    const loadMarketData = async () => {
      try {
        const response = await fetch('/market-size-data.json')
        if (!response.ok) throw new Error('Failed to load market data')
        const data = await response.json()
        setMarketData(data || [])
      } catch (error) {
        console.error('Error loading market data:', error)
      }
    }
    loadMarketData()
  }, [])

  // Load territory data (to filter by area)
  useEffect(() => {
    const loadTerritoryData = async () => {
      try {
        const response = await fetch('/phoenix-tucson-map-data.json')
        if (!response.ok) throw new Error('Failed to load territory data')
        const data = await response.json()
        console.log('Territory data loaded:', data?.length, 'records')
        setTerritoryData(data || [])
      } catch (error) {
        console.error('Error loading territory data:', error)
      }
    }
    loadTerritoryData()
  }, [])

  // Load zip boundaries
  useEffect(() => {
    const loadZipBoundaries = async () => {
      try {
        const response = await fetch('/az-zip-boundaries.json')
        if (!response.ok) throw new Error('Failed to load zip boundaries')
        const data = await response.json()
        setZipBoundaries(data?.features || [])
      } catch (error) {
        console.error('Error loading zip boundaries:', error)
      }
    }
    loadZipBoundaries()
  }, [])

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMapLoaded(true)
  }, [])

  // Load office locations
  useEffect(() => {
    const loadOfficeLocations = async () => {
      try {
        const response = await fetch('/office-locations.json')
        if (response.ok) {
          const data = await response.json()
          setOfficeLocations(data)
        }
      } catch (error) {
        console.error('Error loading office locations:', error)
      }
    }
    loadOfficeLocations()
  }, [])

  // Get color based on permitted pools count
  const getMarketSizeColor = (permittedPools: number): string => {
    if (permittedPools >= 6000) return '#1a237e' // Very dark blue
    if (permittedPools >= 4000) return '#283593' // Dark blue
    if (permittedPools >= 3000) return '#3949ab' // Medium-dark blue
    if (permittedPools >= 2000) return '#5e35b1' // Purple-blue
    if (permittedPools >= 1500) return '#7e57c2' // Medium purple
    if (permittedPools >= 1000) return '#9575cd' // Light purple
    if (permittedPools >= 500) return '#b39ddb' // Very light purple
    if (permittedPools >= 250) return '#d1c4e9' // Pale purple
    return '#e8eaf6' // Very pale purple
  }

  // Create a map of zip codes to areas for filtering
  const zipToArea = territoryData.reduce((acc, item) => {
    acc[item.zip] = item.area
    return acc
  }, {} as Record<string, string>)

  // Filter zip boundaries based on area filter and market data
  const filteredBoundaries = zipBoundaries.filter(feature => {
    const zipCode = feature?.properties?.ZCTA5CE10
    if (!zipCode) return false
    
    // Check if this zip has market data
    const marketInfo = marketData.find(d => d.zipCode === zipCode)
    if (!marketInfo) return false
    
    // Check if this zip's area is enabled in filter
    const area = zipToArea[zipCode]
    if (area && areaFilter[area as keyof typeof areaFilter] === false) {
      return false
    }
    
    return true
  })

  // Debug logging
  useEffect(() => {
    console.log('Market Size View Debug:', {
      zipBoundariesCount: zipBoundaries.length,
      marketDataCount: marketData.length,
      territoryDataCount: territoryData.length,
      filteredBoundariesCount: filteredBoundaries.length,
      sampleMarketZips: marketData.slice(0, 5).map(d => d.zipCode),
      sampleBoundaryZips: zipBoundaries.slice(0, 5).map(f => f?.properties?.ZCTA5CE10)
    })
  }, [zipBoundaries, marketData, territoryData, filteredBoundaries])

  const handleZipClick = (zipCode: string) => {
    const marketInfo = marketData.find(d => d.zipCode === zipCode)
    const territoryInfo = territoryData.find(t => t.zip === zipCode)
    
    if (marketInfo) {
      const boundary = zipBoundaries.find(f => f?.properties?.ZCTA5CE10 === zipCode)
      if (boundary?.geometry?.coordinates) {
        // Calculate center of polygon for info window
        const coords = boundary.geometry.coordinates[0]
        const latSum = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0)
        const lngSum = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0)
        const center = {
          lat: latSum / coords.length,
          lng: lngSum / coords.length
        }
        
        setSelectedZip({
          zipCode,
          position: center,
          marketInfo,
          territoryInfo
        })
      }
    }
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={9}
        onLoad={onMapLoad}
        options={{
          styles: [
            {
              featureType: 'all',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }]
            }
          ],
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
        }}
      >
        {/* Render zip code polygons with market size colors */}
        {filteredBoundaries.map((feature, index) => {
          const zipCode = feature?.properties?.ZCTA5CE10
          const marketInfo = marketData.find(d => d.zipCode === zipCode)
          
          if (!marketInfo || !feature?.geometry?.coordinates) return null

          const paths = feature.geometry.coordinates[0].map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0]
          }))

          const fillColor = getMarketSizeColor(marketInfo.permittedPools)

          return (
            <PolygonF
              key={`${zipCode}-${index}`}
              paths={paths}
              options={{
                fillColor,
                fillOpacity: 0.6,
                strokeColor: '#1e293b',
                strokeOpacity: 0.8,
                strokeWeight: 1,
                clickable: true,
              }}
              onClick={() => handleZipClick(zipCode)}
            />
          )
        })}

        {/* Render office location markers */}
        {officeLocations
          .filter(office => {
            // Filter based on area visibility
            return areaFilter[office.area as keyof typeof areaFilter] !== false
          })
          .map((office) => {
            const isNextYear = office.category === 'NEXT YEAR'
            // Star SVG path (5-pointed star)
            const starPath = 'M 0,-24 L 6,-8 L 24,-8 L 10,4 L 16,20 L 0,8 L -16,20 L -10,4 L -24,-8 L -6,-8 Z'
            
            return (
              <MarkerF
                key={`office-${office.zipCode}-${office.category}`}
                position={{ lat: office.lat, lng: office.lng }}
                icon={{
                  path: starPath,
                  fillColor: isNextYear ? '#DC2626' : '#F97316',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                  scale: isNextYear ? 0.7 : 0.6,
                  anchor: new google.maps.Point(0, 0),
                }}
                onClick={() => setSelectedOffice(office)}
                title={office.label}
                zIndex={1000}
              />
            )
          })}

        {/* Info Window */}
        {selectedZip && (
          <InfoWindowF
            position={selectedZip.position}
            onCloseClick={() => setSelectedZip(null)}
          >
            <div className="p-2 min-w-[200px]">
              <h3 className="font-bold text-lg mb-2">Zip Code {selectedZip.zipCode}</h3>
              {selectedZip.territoryInfo && (
                <p className="text-sm text-slate-600 mb-2">
                  Area: <span className="font-semibold">{getAreaDisplayName(selectedZip.territoryInfo.area)}</span>
                </p>
              )}
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-semibold text-blue-700">Permitted Pools:</span>{' '}
                  {selectedZip.marketInfo.permittedPools.toLocaleString()}
                </p>
                {selectedZip.territoryInfo && (
                  <p className="text-sm text-slate-500">
                    Current Accounts: {selectedZip.territoryInfo.accounts}
                  </p>
                )}
                {selectedZip.territoryInfo && selectedZip.marketInfo.permittedPools > 0 && (
                  <p className="text-sm text-slate-500">
                    Market Penetration: {((selectedZip.territoryInfo.accounts / selectedZip.marketInfo.permittedPools) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </InfoWindowF>
        )}

        {/* Office location info window */}
        {selectedOffice && (
          <InfoWindowF
            position={{ lat: selectedOffice.lat, lng: selectedOffice.lng }}
            onCloseClick={() => setSelectedOffice(null)}
          >
            <div className="p-3 min-w-0 max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: selectedOffice.category === 'NEXT YEAR' ? '#DC2626' : '#F97316'
                  }}
                ></div>
                <h3 className="font-semibold text-slate-900">
                  {selectedOffice.label}
                </h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-600">
                    {selectedOffice.area} Territory
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-600">
                    ZIP {selectedOffice.zipCode}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    selectedOffice.category === 'NEXT YEAR' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {selectedOffice.category}
                  </span>
                </div>
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-slate-600">Rendering map...</p>
          </div>
        </div>
      )}
    </div>
  )
}
