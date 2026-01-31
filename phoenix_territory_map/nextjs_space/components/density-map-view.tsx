
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { GoogleMap, InfoWindowF, PolygonF, MarkerF } from '@react-google-maps/api'
import { Card } from '@/components/ui/card'
import { Building2, MapPin } from 'lucide-react'
import { getAreaDisplayName } from '@/lib/utils'
import { getDensityColor } from '@/config/locations.config'
import { MAP_CONTAINER_STYLE as mapContainerStyle } from '@/lib/map-config'

interface DensityData {
  zipCode: string
  zip?: string  // Jacksonville uses 'zip' instead of 'zipCode'
  area?: string
  city?: string
  activeCount: number
  terminatedCount: number
  totalHistorical: number
  churnRate: number
  avgCustomerLifetimeMonths?: number
  latitude?: number
  longitude?: number
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

interface DensityMapViewProps {
  densityMode: 'active' | 'terminated' | 'both' | 'lifetime'
  areaFilter: {
    West: boolean
    Central: boolean
    East: boolean
    Tucson: boolean
  }
  location: 'arizona' | 'miami' | 'dallas' | 'orlando' | 'jacksonville' | 'portCharlotte'
  accountType?: 'residential' | 'commercial'
}

const getMapCenter = (location: 'arizona' | 'miami' | 'dallas' | 'orlando' | 'jacksonville' | 'portCharlotte') => {
  if (location === 'miami') return { lat: 25.7617, lng: -80.1918 }  // Miami
  if (location === 'dallas') return { lat: 32.7767, lng: -96.7970 }  // Dallas
  if (location === 'orlando') return { lat: 28.5383, lng: -81.3792 }  // Orlando
  if (location === 'jacksonville') return { lat: 30.3322, lng: -81.6557 }  // Jacksonville
  if (location === 'portCharlotte') return { lat: 26.9762, lng: -82.0909 }  // Port Charlotte
  return { lat: 33.4484, lng: -112.0740 }  // Phoenix
}

export default function DensityMapView({ densityMode, areaFilter, location, accountType = 'residential' }: DensityMapViewProps) {
  const [densityData, setDensityData] = useState<DensityData[]>([])
  const [zipBoundaries, setZipBoundaries] = useState<any[]>([])
  const [selectedZip, setSelectedZip] = useState<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>([])
  const [selectedOffice, setSelectedOffice] = useState<OfficeLocation | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  // Load density data based on location and account type
  useEffect(() => {
    let dataFile = '/density-data.json' // Arizona default
    
    if (location === 'miami') {
      dataFile = accountType === 'commercial' 
        ? '/miami-commercial-density-data.json' 
        : '/miami-density-data.json'
    } else if (location === 'dallas') {
      dataFile = accountType === 'commercial'
        ? '/dallas-commercial-density-data.json'
        : '/dallas-density-data.json'
    } else if (location === 'orlando') {
      dataFile = accountType === 'commercial'
        ? '/orlando-commercial-density-data.json'
        : '/orlando-density-data.json'
    } else if (location === 'jacksonville') {
      dataFile = accountType === 'commercial'
        ? '/jacksonville-commercial-density-data.json'
        : '/jacksonville-density-data.json'
    }
    
    fetch(dataFile)
      .then(res => res.json())
      .then(data => setDensityData(data))
      .catch(err => console.error('Error loading density data:', err))
  }, [location, accountType])

  // Load zip boundaries when map is ready
  useEffect(() => {
    if (!mapLoaded || !densityData.length || !mapRef.current) return

    const loadBoundaries = async () => {
      try {
        if (location === 'miami') {
          // For Miami, load boundary polygons (data structure is object with ZIP codes as keys)
          const response = await fetch('/miami-zip-boundaries.json')
          const allBoundaries = await response.json()
          
          const filtered = densityData.map(item => {
            // Miami boundaries are stored as an object with ZIP codes as keys
            const boundary = allBoundaries[item.zipCode]
            
            if (!boundary || !boundary.coordinates) {
              // Fallback to circle marker if no boundary
              return {
                ...item,
                center: { 
                  lat: item.latitude || 25.7617, 
                  lng: item.longitude || -80.1918 
                },
              }
            }
            
            // Create geometry object from boundary data
            const geometry = {
              type: boundary.type,
              coordinates: boundary.coordinates
            }
            
            return {
              ...item,
              geometry: geometry,
              center: calculateCenter(geometry),
            }
          })
          
          setZipBoundaries(filtered)
        } else if (location === 'dallas') {
          // For Dallas, load boundary polygons
          const response = await fetch('/dallas-zip-boundaries.json')
          const allBoundaries = await response.json()
          
          const filtered = densityData.map(item => {
            const boundary = allBoundaries.find(
              (b: any) => b.zipCode === item.zipCode
            )
            
            if (!boundary || !boundary.geometry) {
              // Fallback to circle marker if no boundary
              return {
                ...item,
                center: { 
                  lat: item.latitude || 32.7767, 
                  lng: item.longitude || -96.7970 
                },
              }
            }
            
            return {
              ...item,
              geometry: boundary.geometry,
              center: calculateCenter(boundary.geometry),
            }
          })
          
          setZipBoundaries(filtered)
        } else if (location === 'orlando') {
          // For Orlando, load boundary polygons
          const response = await fetch('/orlando-zip-boundaries.json')
          const allBoundaries = await response.json()
          
          const filtered = densityData.map(item => {
            const boundary = allBoundaries.find(
              (b: any) => b.zipCode === item.zipCode
            )
            
            if (!boundary || !boundary.geometry) {
              // Fallback to circle marker if no boundary
              return {
                ...item,
                center: { 
                  lat: item.latitude || 28.5383, 
                  lng: item.longitude || -81.3792 
                },
              }
            }
            
            return {
              ...item,
              geometry: boundary.geometry,
              center: calculateCenter(boundary.geometry),
            }
          })
          
          setZipBoundaries(filtered)
        } else if (location === 'jacksonville') {
          // For Jacksonville, load boundary polygons (data structure is object with ZIP codes as keys)
          const response = await fetch('/jacksonville-zip-boundaries.json')
          const allBoundaries = await response.json()
          
          const filtered = densityData.map(item => {
            // Jacksonville data uses 'zip' not 'zipCode', normalize it
            const zipCode = item.zip || item.zipCode
            // Jacksonville boundaries are stored as an object with ZIP codes as keys
            const boundary = allBoundaries[zipCode]
            
            if (!boundary || !boundary.coordinates) {
              // Skip rendering if no boundary (no fallback to circles for non-Arizona locations)
              return {
                ...item,
                zipCode: zipCode,
              }
            }
            
            // Create geometry object from boundary data
            const geometry = {
              type: boundary.type,
              coordinates: boundary.coordinates
            }
            
            return {
              ...item,
              zipCode: zipCode,
              geometry: geometry,
              center: calculateCenter(geometry),
            }
          })
          
          setZipBoundaries(filtered)
        } else {
          // For Arizona, load boundary polygons
          const response = await fetch('/az-zip-boundaries.json')
          const allBoundaries = await response.json()
          
          const filtered = densityData
            .filter(item => item.area && areaFilter[item.area as keyof typeof areaFilter])
            .map(item => {
              const boundary = allBoundaries.features?.find(
                (f: any) => f.properties?.ZCTA5CE10 === item.zipCode
              )
              
              if (!boundary) return null
              
              return {
                ...item,
                geometry: boundary.geometry,
                center: calculateCenter(boundary.geometry),
              }
            })
            .filter(Boolean)
          
          setZipBoundaries(filtered)
        }
      } catch (error) {
        console.error('Error loading boundaries:', error)
      }
    }

    loadBoundaries()
  }, [mapLoaded, densityData, areaFilter, location])

  // Load office locations (Arizona only)
  useEffect(() => {
    if (location !== 'arizona') {
      setOfficeLocations([])
      return
    }
    
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
  }, [location])

  const calculateCenter = (geometry: any) => {
    if (!geometry?.coordinates) return { lat: 33.4484, lng: -112.0740 }
    
    const coords = geometry.type === 'Polygon' 
      ? geometry.coordinates[0] 
      : geometry.coordinates[0][0]
    
    const lats = coords.map((c: number[]) => c[1])
    const lngs = coords.map((c: number[]) => c[0])
    
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    }
  }

  const getColor = (item: DensityData): string => {
    // Use config-driven color lookup (bd-h1b: replaces 213-line if/else chain)
    if (densityMode === 'active') {
      return getDensityColor(location, 'active', item.activeCount, accountType)
    } else if (densityMode === 'terminated') {
      return getDensityColor(location, 'terminated', item.terminatedCount, accountType)
    } else if (densityMode === 'lifetime') {
      return getDensityColor(location, 'lifetime', item.avgCustomerLifetimeMonths || 0)
    } else {
      // Churn rate
      return getDensityColor(location, 'churn', item.churnRate)
    }
  }

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMapLoaded(true)
  }, [])

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={getMapCenter(location)}
      zoom={9}
      onLoad={onLoad}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: true,
      }}
    >
      {/* Render polygons for both Arizona and Miami */}
      {zipBoundaries.map((item: any) => {
        // If geometry exists, render as polygon
        if (item?.geometry) {
          const paths = convertGeometryToPaths(item.geometry)
          const color = getColor(item)

          // Miami/Dallas/Orlando/Jacksonville-specific boundary styling (darker, more prominent)
          const strokeOptions = (location === 'miami' || location === 'dallas' || location === 'orlando' || location === 'jacksonville')
            ? {
                strokeColor: '#1e293b',    // Dark slate
                strokeOpacity: 0.85,       // More opaque
                strokeWeight: 2,           // Thicker
              }
            : {
                strokeColor: '#64748b',    // Medium slate
                strokeOpacity: 0.5,        // Semi-transparent
                strokeWeight: 1,           // Thin
              }

          return (
            <PolygonF
              key={item.zipCode}
              paths={paths}
              options={{
                fillColor: color,
                fillOpacity: 0.7,
                ...strokeOptions,
                clickable: true,
              }}
              onClick={() => setSelectedZip(item)}
            />
          )
        }
        
        // Fallback: render as circle marker if no geometry (Arizona only)
        // For other locations, skip rendering if no boundary data
        if (location === 'arizona' && item?.center) {
          const color = getColor(item)
          const radius = Math.sqrt(item.totalHistorical) * 150

          return (
            <MarkerF
              key={item.zipCode}
              position={item.center}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 0.7,
                strokeColor: '#64748b',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                scale: Math.max(radius / 10, 8),
              }}
              onClick={() => setSelectedZip(item)}
            />
          )
        }
        
        return null
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

      {selectedZip && (
        <InfoWindowF
          position={selectedZip.center}
          onCloseClick={() => setSelectedZip(null)}
        >
          <div style={{ minWidth: '250px', padding: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                ZIP {selectedZip.zipCode}
              </h3>
              {location === 'arizona' && selectedZip.area && (
                <span style={{
                  background: getAreaColor(selectedZip.area),
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  {getAreaDisplayName(selectedZip.area)}
                </span>
              )}
              {location === 'miami' && selectedZip.city && (
                <span style={{
                  background: '#0891b2',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  {selectedZip.city}
                </span>
              )}
            </div>
            
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#059669', fontWeight: '600', fontSize: '20px' }}>
                  {selectedZip.activeCount}
                </span>
                <span style={{ color: '#6b7280', fontSize: '14px', marginLeft: '4px' }}>
                  Active Accounts
                </span>
              </div>
              <div>
                <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '20px' }}>
                  {selectedZip.terminatedCount}
                </span>
                <span style={{ color: '#6b7280', fontSize: '14px', marginLeft: '4px' }}>
                  Terminated
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '2px' }}>Total Historical</div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>{selectedZip.totalHistorical}</div>
              </div>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '2px' }}>Churn Rate</div>
                <div style={{
                  fontWeight: '600',
                  fontSize: '16px',
                  color: selectedZip.churnRate > 85 ? '#dc2626' : selectedZip.churnRate > 75 ? '#f97316' : '#059669',
                }}>
                  {selectedZip.churnRate}%
                </div>
              </div>
              {selectedZip.avgCustomerLifetimeMonths !== undefined && (
                <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                  <div style={{ color: '#6b7280', marginBottom: '2px' }}>Avg Customer Lifetime</div>
                  <div style={{ fontWeight: '600', fontSize: '16px', color: '#059669' }}>
                    {selectedZip.avgCustomerLifetimeMonths.toFixed(1)} months
                    <span style={{ color: '#6b7280', fontSize: '13px', marginLeft: '4px' }}>
                      ({(selectedZip.avgCustomerLifetimeMonths / 12).toFixed(1)} years)
                    </span>
                  </div>
                </div>
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
          <div style={{ minWidth: '200px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div 
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: selectedOffice.category === 'NEXT YEAR' ? '#DC2626' : '#F97316'
                }}
              ></div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                {selectedOffice.label}
              </h3>
            </div>
            
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
              <div style={{ marginBottom: '4px' }}>
                {selectedOffice.fullName || getAreaDisplayName(selectedOffice.area)}
              </div>
              <div style={{ marginBottom: '8px' }}>
                ZIP {selectedOffice.zipCode}
              </div>
            </div>
            
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: selectedOffice.category === 'NEXT YEAR' ? '#FEE2E2' : '#FFEDD5',
                color: selectedOffice.category === 'NEXT YEAR' ? '#B91C1C' : '#C2410C'
              }}>
                {selectedOffice.category}
              </span>
            </div>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  )
}

function convertGeometryToPaths(geometry: any) {
  if (!geometry?.coordinates) return []
  
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring: number[][]) =>
      ring.map(([lng, lat]: number[]) => ({ lat, lng }))
    )
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon: number[][][]) =>
      polygon.map((ring: number[][]) =>
        ring.map(([lng, lat]: number[]) => ({ lat, lng }))
      )
    )
  }
  
  return []
}

function getAreaColor(area: string): string {
  const colors: Record<string, string> = {
    West: '#3b82f6',
    Central: '#10b981',
    East: '#f97316',
    Tucson: '#a855f7',
  }
  return colors[area] || '#6b7280'
}
