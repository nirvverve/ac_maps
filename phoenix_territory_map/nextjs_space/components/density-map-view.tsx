
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { GoogleMap, InfoWindowF, PolygonF, MarkerF } from '@react-google-maps/api'
import { Card } from '@/components/ui/card'
import { Building2, MapPin } from 'lucide-react'
import { getAreaDisplayName } from '@/lib/utils'

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

const mapContainerStyle = {
  width: '100%',
  height: '600px',
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
    if (densityMode === 'active') {
      const count = item.activeCount
      
      // Miami Commercial scale (max 17 accounts)
      if (location === 'miami' && accountType === 'commercial') {
        if (count === 0) return '#f0fdf4'
        if (count <= 2) return '#d1fae5'
        if (count <= 4) return '#a7f3d0'
        if (count <= 6) return '#6ee7b7'
        if (count <= 9) return '#34d399'
        if (count <= 12) return '#10b981'
        if (count <= 15) return '#059669'
        if (count <= 18) return '#047857'
        return '#065f46'  // 18+
      }
      
      // Miami Residential scale (max 124 accounts)
      if (location === 'miami') {
        if (count === 0) return '#f0fdf4'
        if (count <= 10) return '#d1fae5'
        if (count <= 20) return '#a7f3d0'
        if (count <= 35) return '#6ee7b7'
        if (count <= 50) return '#34d399'
        if (count <= 75) return '#10b981'
        if (count <= 100) return '#059669'
        if (count <= 125) return '#047857'
        return '#065f46'  // 125+
      }
      
      // Dallas Commercial scale (max 2 accounts) - very granular
      if (location === 'dallas' && accountType === 'commercial') {
        if (count === 0) return '#f0fdf4'
        if (count === 1) return '#6ee7b7'
        return '#10b981'  // 2+
      }
      
      // Dallas Residential scale (max 50 accounts) - similar to Arizona
      if (location === 'dallas') {
        if (count === 0) return '#f0fdf4'
        if (count <= 5) return '#d1fae5'
        if (count <= 10) return '#a7f3d0'
        if (count <= 20) return '#6ee7b7'
        if (count <= 30) return '#34d399'
        if (count <= 40) return '#10b981'
        if (count <= 50) return '#059669'
        return '#047857'  // 50+
      }
      
      // Orlando Commercial scale (max 9 accounts) - granular
      if (location === 'orlando' && accountType === 'commercial') {
        if (count === 0) return '#f0fdf4'
        if (count <= 2) return '#d1fae5'
        if (count <= 4) return '#6ee7b7'
        if (count <= 6) return '#34d399'
        if (count <= 9) return '#10b981'
        return '#059669'  // 9+
      }
      
      // Orlando Residential scale (max 93 accounts) - 8 categories
      if (location === 'orlando') {
        if (count === 0) return '#f0fdf4'
        if (count <= 10) return '#d1fae5'
        if (count <= 20) return '#a7f3d0'
        if (count <= 35) return '#6ee7b7'
        if (count <= 50) return '#34d399'
        if (count <= 70) return '#10b981'
        if (count <= 90) return '#059669'
        return '#047857'  // 90+
      }
      
      // Jacksonville Commercial scale (max 2 accounts) - minimal
      if (location === 'jacksonville' && accountType === 'commercial') {
        if (count === 0) return '#f0fdf4'
        if (count === 1) return '#6ee7b7'
        return '#10b981'  // 2+
      }
      
      // Jacksonville Residential scale (max 130 accounts) - 8 categories
      if (location === 'jacksonville') {
        if (count === 0) return '#f0fdf4'
        if (count <= 10) return '#d1fae5'
        if (count <= 25) return '#a7f3d0'
        if (count <= 40) return '#6ee7b7'
        if (count <= 60) return '#34d399'
        if (count <= 80) return '#10b981'
        if (count <= 110) return '#059669'
        return '#047857'  // 110+
      }
      
      // Arizona scale (original)
      if (count === 0) return '#f0fdf4'
      if (count <= 5) return '#d1fae5'
      if (count <= 15) return '#86efac'
      if (count <= 30) return '#22c55e'
      if (count <= 50) return '#16a34a'
      return '#15803d'
    } else if (densityMode === 'terminated') {
      const count = item.terminatedCount
      
      // Miami Commercial scale (max 23 accounts)
      if (location === 'miami' && accountType === 'commercial') {
        if (count === 0) return '#fef2f2'
        if (count <= 3) return '#fecaca'
        if (count <= 6) return '#fca5a5'
        if (count <= 9) return '#f87171'
        if (count <= 12) return '#ef4444'
        if (count <= 15) return '#dc2626'
        if (count <= 18) return '#b91c1c'
        if (count <= 21) return '#991b1b'
        return '#7f1d1d'  // 21+
      }
      
      // Miami Residential scale
      if (location === 'miami') {
        if (count === 0) return '#fef2f2'
        if (count <= 15) return '#fecaca'
        if (count <= 30) return '#fca5a5'
        if (count <= 50) return '#f87171'
        if (count <= 75) return '#ef4444'
        if (count <= 100) return '#dc2626'
        if (count <= 150) return '#b91c1c'
        if (count <= 200) return '#991b1b'
        return '#7f1d1d'  // 200+
      }
      
      // Dallas Commercial scale (max ~10 terminated) - very granular
      if (location === 'dallas' && accountType === 'commercial') {
        if (count === 0) return '#fef2f2'
        if (count <= 2) return '#fecaca'
        if (count <= 4) return '#fca5a5'
        if (count <= 6) return '#f87171'
        if (count <= 8) return '#ef4444'
        return '#dc2626'  // 8+
      }
      
      // Dallas Residential scale (assume similar to other markets)
      if (location === 'dallas') {
        if (count === 0) return '#fef2f2'
        if (count <= 20) return '#fecaca'
        if (count <= 40) return '#fca5a5'
        if (count <= 60) return '#f87171'
        if (count <= 80) return '#ef4444'
        if (count <= 100) return '#dc2626'
        if (count <= 150) return '#b91c1c'
        return '#991b1b'  // 150+
      }
      
      // Orlando Commercial scale (max ~50 terminated) - granular
      if (location === 'orlando' && accountType === 'commercial') {
        if (count === 0) return '#fef2f2'
        if (count <= 5) return '#fecaca'
        if (count <= 10) return '#fca5a5'
        if (count <= 15) return '#f87171'
        if (count <= 20) return '#ef4444'
        if (count <= 30) return '#dc2626'
        return '#b91c1c'  // 30+
      }
      
      // Orlando Residential scale (max ~100 terminated) - 7 categories
      if (location === 'orlando') {
        if (count === 0) return '#fef2f2'
        if (count <= 10) return '#fecaca'
        if (count <= 20) return '#fca5a5'
        if (count <= 30) return '#f87171'
        if (count <= 50) return '#ef4444'
        if (count <= 75) return '#dc2626'
        if (count <= 100) return '#b91c1c'
        return '#991b1b'  // 100+
      }
      
      // Jacksonville Commercial scale - NO terminated accounts
      if (location === 'jacksonville' && accountType === 'commercial') {
        return '#fef2f2'  // Always lightest (0 terminated)
      }
      
      // Jacksonville Residential scale (max ~50 terminated) - 6 categories
      if (location === 'jacksonville') {
        if (count === 0) return '#fef2f2'
        if (count <= 5) return '#fecaca'
        if (count <= 10) return '#fca5a5'
        if (count <= 20) return '#f87171'
        if (count <= 30) return '#ef4444'
        if (count <= 50) return '#dc2626'
        return '#b91c1c'  // 50+
      }
      
      // Arizona scale (original)
      if (count === 0) return '#fef2f2'
      if (count <= 20) return '#fecaca'
      if (count <= 50) return '#fca5a5'
      if (count <= 100) return '#f87171'
      if (count <= 200) return '#dc2626'
      return '#991b1b'
    } else if (densityMode === 'lifetime') {
      // Customer Lifetime in months - higher is better (green)
      const lifetime = item.avgCustomerLifetimeMonths || 0
      if (lifetime === 0) return '#fef2f2'
      if (lifetime < 12) return '#fbbf24'  // Less than 1 year - yellow
      if (lifetime < 24) return '#a3e635'  // 1-2 years - lime
      if (lifetime < 36) return '#86efac'  // 2-3 years - light green
      if (lifetime < 60) return '#22c55e'  // 3-5 years - green
      if (lifetime < 120) return '#16a34a' // 5-10 years - dark green
      return '#15803d'                      // 10+ years - darkest green
    } else {
      // Churn rate
      const rate = item.churnRate
      if (rate === 0) return '#f0fdf4'
      if (rate <= 50) return '#d1fae5'
      if (rate <= 70) return '#fef3c7'
      if (rate <= 85) return '#fbbf24'
      if (rate <= 95) return '#f97316'
      return '#991b1b'
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
