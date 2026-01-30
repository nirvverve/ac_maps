
'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { GoogleMap, MarkerF, InfoWindowF, PolygonF } from '@react-google-maps/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Users, Building2, Search, X } from 'lucide-react'
import { TerritoryData, AreaFilter } from '@/lib/types'
import { getAreaDisplayName } from '@/lib/utils'

interface GoogleMapViewProps {
  territoryData: TerritoryData[]
  areaFilter: AreaFilter
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
}

const center = {
  lat: 33.4484,
  lng: -112.0740,
}

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'administrative',
      elementType: 'geometry',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'poi',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit',
      stylers: [{ visibility: 'off' }],
    },
  ],
}

interface ZipBoundary {
  zipCode: number
  area: string
  paths: google.maps.LatLngLiteral[]
  center: google.maps.LatLngLiteral
}

interface OfficeLocation {
  zipCode: string
  area: string
  category: string
  label: string
  fullName?: string
  lat: number
  lng: number
}

export default function GoogleMapView({ territoryData, areaFilter }: GoogleMapViewProps) {
  const [selectedMarker, setSelectedMarker] = useState<TerritoryData | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [zipBoundaries, setZipBoundaries] = useState<ZipBoundary[]>([])
  const [loadingBoundaries, setLoadingBoundaries] = useState(true)
  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>([])
  const [selectedOffice, setSelectedOffice] = useState<OfficeLocation | null>(null)
  const [zipSearchInput, setZipSearchInput] = useState('')
  const [highlightedZip, setHighlightedZip] = useState<string | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  // Load zip code boundaries when map and data are ready
  useEffect(() => {
    if (!mapLoaded || !territoryData?.length || !mapRef.current) return

    const loadZipBoundaries = async () => {
      setLoadingBoundaries(true)
      const boundaries: ZipBoundary[] = []
      
      try {
        // Load zip code boundaries from our API
        const response = await fetch('/api/zip-boundaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zipCodes: territoryData.map(item => ({
              zip: item.zip,
              area: item.area
            }))
          })
        })

        if (response.ok) {
          const data = await response.json()
          setZipBoundaries(data.boundaries || [])
        }
      } catch (error) {
        console.error('Error loading zip boundaries:', error)
      } finally {
        setLoadingBoundaries(false)
      }
    }

    loadZipBoundaries()
  }, [mapLoaded, territoryData])

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

  // Generate approximate coordinates for zip codes (for demonstration)
  const zipCodeCoordinates = useMemo(() => {
    const coords: Record<string | number, { lat: number; lng: number }> = {}
    
    // If we have boundaries, use their centers
    if (zipBoundaries?.length > 0) {
      zipBoundaries.forEach(boundary => {
        coords[boundary.zipCode] = boundary.center
      })
      return coords
    }
    
    // Otherwise generate approximate coordinates
    const baseLatMin = 33.2
    const baseLatMax = 33.7
    const baseLngMin = -112.4
    const baseLngMax = -111.6

    territoryData?.forEach((item) => {
      if (item?.zip) {
        const zipStr = item.zip.toString()
        const hash = zipStr.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0)
          return a & a
        }, 0)
        
        const normalizedHash = Math.abs(hash) / 2147483647
        const lat = baseLatMin + (baseLatMax - baseLatMin) * (normalizedHash % 1)
        const lng = baseLngMin + (baseLngMax - baseLngMin) * ((normalizedHash * 1.618) % 1)
        
        coords[item.zip] = { lat, lng }
      }
    })
    
    return coords
  }, [territoryData, zipBoundaries])

  const getPolygonOptions = (area: string, isHighlighted: boolean = false) => {
    const colorMap = {
      West: { fill: '#3B82F6', stroke: '#2563EB' },     // Blue
      Central: { fill: '#10B981', stroke: '#059669' },  // Green  
      East: { fill: '#F59E0B', stroke: '#D97706' },     // Orange
      Tucson: { fill: '#A855F7', stroke: '#9333EA' },   // Purple
    }
    
    const colors = colorMap[area as keyof typeof colorMap] || { fill: '#6B7280', stroke: '#4B5563' }
    
    return {
      fillColor: colors.fill,
      fillOpacity: isHighlighted ? 0.6 : 0.35,
      strokeColor: isHighlighted ? '#DC2626' : colors.stroke,
      strokeOpacity: isHighlighted ? 1 : 0.8,
      strokeWeight: isHighlighted ? 4 : 2,
      clickable: true,
      draggable: false,
      editable: false,
      geodesic: false,
      zIndex: isHighlighted ? 100 : 1
    }
  }

  const getMarkerIcon = (area: string) => {
    const colors = {
      West: '#3B82F6',    // Blue
      Central: '#10B981', // Green  
      East: '#F59E0B',    // Orange
      Tucson: '#A855F7',  // Purple
    }
    
    return {
      path: google?.maps?.SymbolPath?.CIRCLE || 0,
      scale: 8,
      fillColor: colors[area as keyof typeof colors] || '#6B7280',
      fillOpacity: 0.9,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
    }
  }

  const onMarkerClick = useCallback((marker: TerritoryData) => {
    setSelectedMarker(marker)
  }, [])

  const onInfoWindowClose = useCallback(() => {
    setSelectedMarker(null)
  }, [])

  const handleZipSearch = useCallback(() => {
    const trimmedZip = zipSearchInput.trim()
    if (!trimmedZip || !mapRef.current) return

    // Find the ZIP code in territory data
    const foundZip = territoryData.find(item => item.zip === trimmedZip)
    
    if (foundZip) {
      const coords = zipCodeCoordinates[trimmedZip]
      if (coords) {
        // Center and zoom to the ZIP code
        mapRef.current.panTo(coords)
        mapRef.current.setZoom(13)
        
        // Highlight the ZIP
        setHighlightedZip(trimmedZip)
        
        // Open info window for the ZIP
        setSelectedMarker(foundZip)
      }
    } else {
      alert(`ZIP code ${trimmedZip} not found in territory data.`)
    }
  }, [zipSearchInput, territoryData, zipCodeCoordinates])

  const handleClearSearch = useCallback(() => {
    setZipSearchInput('')
    setHighlightedZip(null)
    setSelectedMarker(null)
    if (mapRef.current) {
      mapRef.current.panTo(center)
      mapRef.current.setZoom(10)
    }
  }, [])

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleZipSearch()
    }
  }, [handleZipSearch])

  return (
    <div className="relative">
      {/* ZIP Code Search */}
      <Card className="mb-4 bg-white/90 backdrop-blur-sm border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4" />
              <span>Search ZIP Code:</span>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <Input
                type="text"
                placeholder="Enter 5-digit ZIP code..."
                value={zipSearchInput}
                onChange={(e) => setZipSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="max-w-xs"
                maxLength={5}
              />
              <Button 
                onClick={handleZipSearch}
                size="sm"
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
              {(zipSearchInput || highlightedZip) && (
                <Button 
                  onClick={handleClearSearch}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
            {highlightedZip && (
              <div className="text-sm text-slate-600 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
                Viewing: <span className="font-semibold text-blue-700">ZIP {highlightedZip}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={8}
        options={options}
        onLoad={(map) => {
          mapRef.current = map
          setMapLoaded(true)
        }}
      >
        {/* Render zip code boundary polygons */}
        {mapLoaded && zipBoundaries?.map((boundary) => {
          // Check if this area should be shown based on filter
          const shouldShow = areaFilter[boundary.area as keyof AreaFilter]
          if (!shouldShow || !boundary.paths?.length) return null
          
          const isHighlighted = highlightedZip === boundary.zipCode.toString()
          
          return (
            <PolygonF
              key={`polygon-${boundary.zipCode}`}
              paths={boundary.paths}
              options={getPolygonOptions(boundary.area, isHighlighted)}
              onClick={() => {
                const territoryItem = territoryData.find(t => parseInt(t.zip) === boundary.zipCode)
                if (territoryItem) {
                  onMarkerClick(territoryItem)
                }
              }}
            />
          )
        })}

        {/* Render zip code markers */}
        {mapLoaded && territoryData?.map((item) => {
          const coords = zipCodeCoordinates?.[item?.zip]
          if (!coords || !item?.zip) return null
          
          return (
            <MarkerF
              key={`marker-${item.zip}`}
              position={coords}
              icon={getMarkerIcon(item?.area || '')}
              onClick={() => onMarkerClick(item)}
              title={`ZIP ${item.zip} - ${item?.area || ''} Area`}
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

        {selectedMarker && zipCodeCoordinates?.[selectedMarker?.zip] && (
          <InfoWindowF
            position={zipCodeCoordinates[selectedMarker.zip]}
            onCloseClick={onInfoWindowClose}
          >
            <div className="p-3 min-w-0 max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: 
                      selectedMarker?.area === 'West' ? '#3B82F6' :
                      selectedMarker?.area === 'Central' ? '#10B981' :
                      selectedMarker?.area === 'East' ? '#F59E0B' :
                      selectedMarker?.area === 'Tucson' ? '#A855F7' : '#6B7280'
                  }}
                ></div>
                <h3 className="font-semibold text-slate-900">
                  ZIP {selectedMarker?.zip || 'N/A'}
                </h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-600">
                    {selectedMarker?.area ? getAreaDisplayName(selectedMarker.area) : 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-600">
                    {selectedMarker?.accounts || 0} Active Accounts
                  </span>
                </div>
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
                    {selectedOffice.fullName || getAreaDisplayName(selectedOffice.area)}
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
      
      {(loadingBoundaries || !mapLoaded) && (
        <div className="absolute inset-0 bg-slate-100/90 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">
              {!mapLoaded ? 'Initializing map...' : 'Loading territory boundaries...'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
