
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { GoogleMap, InfoWindowF, PolygonF, MarkerF } from '@react-google-maps/api'
import { Card } from '@/components/ui/card'
import { Building2, MapPin } from 'lucide-react'
import { getAreaDisplayName } from '@/lib/utils'

interface CommercialAccount {
  customerNumber: string
  accountName: string
  existingTerritory: string
  newTerritory: string
  address: string
  city: string
  state: string
  zip: string
  daysOfService: string
  latitude: number
  longitude: number
  closestOffice: string
  distanceToClosest: number
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

interface TerritoryAssignment {
  zip: string
  area: string
  accounts: number
}

interface CommercialDensityMapViewProps {
  areaFilter: {
    West: boolean
    Central: boolean
    East: boolean
    Tucson: boolean
    Commercial: boolean
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

export default function CommercialDensityMapView({ areaFilter }: CommercialDensityMapViewProps) {
  const [commercialAccounts, setCommercialAccounts] = useState<CommercialAccount[]>([])
  const [territoryBoundaries, setTerritoryBoundaries] = useState<any[]>([])
  const [territoryAssignments, setTerritoryAssignments] = useState<TerritoryAssignment[]>([])
  const [selectedAccount, setSelectedAccount] = useState<CommercialAccount | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>([])
  const [selectedOffice, setSelectedOffice] = useState<OfficeLocation | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  // Load commercial accounts and territory assignments
  useEffect(() => {
    Promise.all([
      fetch('/commercial-accounts.json').then(res => res.json()),
      fetch('/phoenix-tucson-map-data.json').then(res => res.json())
    ])
      .then(([accountsData, territoryData]) => {
        setCommercialAccounts(accountsData)
        setTerritoryAssignments(territoryData)
      })
      .catch(err => console.error('Error loading data:', err))
  }, [])

  // Load territory boundaries when map is ready
  useEffect(() => {
    if (!mapLoaded || !territoryAssignments.length || !mapRef.current) return

    const loadBoundaries = async () => {
      try {
        const response = await fetch('/az-zip-boundaries.json')
        const allBoundaries = await response.json()

        // Create territory boundaries by grouping zips by area
        const territoriesMap = new Map<string, any[]>()
        
        territoryAssignments.forEach(assignment => {
          if (!territoriesMap.has(assignment.area)) {
            territoriesMap.set(assignment.area, [])
          }
          
          const boundary = allBoundaries.features?.find(
            (f: any) => f.properties?.ZCTA5CE10 === assignment.zip
          )
          
          if (boundary) {
            territoriesMap.get(assignment.area)?.push({
              zip: assignment.zip,
              geometry: boundary.geometry
            })
          }
        })

        // Convert to array for rendering
        const territories: any[] = []
        territoriesMap.forEach((zips, area) => {
          territories.push({
            area,
            zips,
            show: areaFilter[area as keyof typeof areaFilter] !== false
          })
        })
        
        setTerritoryBoundaries(territories)
      } catch (error) {
        console.error('Error loading boundaries:', error)
      }
    }

    loadBoundaries()
  }, [mapLoaded, territoryAssignments, areaFilter])

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

  const getTerritoryColor = (territory: string): string => {
    const colors: Record<string, string> = {
      West: '#3b82f6',
      Central: '#10b981',
      East: '#f97316',
      Tucson: '#ec4899',
      Commercial: '#9333ea',
    }
    return colors[territory] || '#6b7280'
  }

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMapLoaded(true)
  }, [])

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
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
      {/* Render territory boundaries first (underneath) - unified appearance */}
      {territoryBoundaries
        .filter(territory => territory.show)
        .map((territory) => {
          const borderColor = getTerritoryColor(territory.area)
          
          return territory.zips.map((zipData: any) => {
            if (!zipData?.geometry) return null

            const paths = convertGeometryToPaths(zipData.geometry)

            return (
              <PolygonF
                key={`territory-${territory.area}-${zipData.zip}`}
                paths={paths}
                options={{
                  fillColor: borderColor,
                  fillOpacity: 0.15,
                  strokeColor: borderColor,
                  strokeOpacity: 0.15,
                  strokeWeight: 0.5,
                  clickable: false,
                  zIndex: 1,
                }}
              />
            )
          })
        })}

      {/* Render commercial account markers */}
      {commercialAccounts
        .filter(account => {
          // Filter by area if applicable
          if (!areaFilter.Commercial) return false
          return true
        })
        .map((account) => {
          // Color based on closest office
          const markerColor = getTerritoryColor(account.closestOffice)
          
          return (
            <MarkerF
              key={account.customerNumber}
              position={{ lat: account.latitude, lng: account.longitude }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: markerColor,
                fillOpacity: 0.9,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                scale: 7,
              }}
              onClick={() => setSelectedAccount(account)}
              title={account.accountName}
              zIndex={100}
            />
          )
        })}

      {/* Render office location markers */}
      {officeLocations
        .filter(office => {
          // Show all NEXT YEAR offices including Tucson
          return office.category === 'NEXT YEAR'
        })
        .map((office) => {
          // Star SVG path (5-pointed star)
          const starPath = 'M 0,-24 L 6,-8 L 24,-8 L 10,4 L 16,20 L 0,8 L -16,20 L -10,4 L -24,-8 L -6,-8 Z'
          
          // Color based on area
          const officeColor = office.area === 'Tucson' ? '#ec4899' :
                             office.area === 'West' ? '#3b82f6' :
                             office.area === 'Central' ? '#10b981' :
                             office.area === 'East' ? '#f97316' : '#DC2626'
          
          return (
            <MarkerF
              key={`office-${office.zipCode}-${office.category}`}
              position={{ lat: office.lat, lng: office.lng }}
              icon={{
                path: starPath,
                fillColor: officeColor,
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                scale: 0.7,
                anchor: new google.maps.Point(0, 0),
              }}
              onClick={() => setSelectedOffice(office)}
              title={office.label}
              zIndex={1000}
            />
          )
        })}

      {selectedAccount && (
        <InfoWindowF
          position={{ lat: selectedAccount.latitude, lng: selectedAccount.longitude }}
          onCloseClick={() => setSelectedAccount(null)}
        >
          <div style={{ minWidth: '300px', maxWidth: '400px', padding: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                {selectedAccount.accountName}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <span style={{
                  background: getTerritoryColor(selectedAccount.closestOffice),
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}>
                  {selectedAccount.closestOffice}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {selectedAccount.distanceToClosest.toFixed(1)} mi
                </span>
              </div>
            </div>
            
            <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                <strong>📍 Address:</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {selectedAccount.address}<br />
                {selectedAccount.city}, {selectedAccount.state} {selectedAccount.zip}
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
              <strong>Customer #:</strong> {selectedAccount.customerNumber}
            </div>
            
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
              <strong>Service Days:</strong><br />
              {selectedAccount.daysOfService}
            </div>
            
            {selectedAccount.existingTerritory && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#9ca3af' }}>
                Previous: {selectedAccount.existingTerritory}
              </div>
            )}
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
                  backgroundColor: '#DC2626'
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
                backgroundColor: '#FEE2E2',
                color: '#B91C1C'
              }}>
                Opening 2026
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
