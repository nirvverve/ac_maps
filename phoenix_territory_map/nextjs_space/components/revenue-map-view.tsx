'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { GoogleMap, InfoWindowF, PolygonF, MarkerF } from '@react-google-maps/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DollarSign, TrendingUp, Users, Filter, MapPin, Building2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { AreaFilter } from '@/lib/types'

interface RevenueData {
  ZIP: string
  Territory: string
  Avg_Monthly_Price: number
  Total_Monthly_Revenue: number
  Account_Count: number
  Avg_Yearly_Price: number
  Total_Yearly_Revenue: number
}

interface CustomerAccount {
  customerNumber: string
  customerName: string
  address: string
  zipCode: string
  city: string
  territory: string
  newTerritory?: string
  technician: string
  route: string
  daysOfService: string
  monthlyPrice?: number
  yearlyPrice?: number
}

interface RevenueMapViewProps {
  areaFilter: AreaFilter
  onToggleArea: (area: keyof AreaFilter) => void
  onResetFilters: () => void
}

const mapContainerStyle = {
  width: '100%',
  height: '800px'
}

const center = {
  lat: 33.4484,
  lng: -111.9269
}

const mapOptions = {
  styles: [
    {
      featureType: 'all',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#7c93a3' }, { lightness: '-10' }]
    },
    {
      featureType: 'administrative.province',
      elementType: 'geometry.stroke',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'landscape',
      elementType: 'geometry',
      stylers: [{ lightness: '0' }, { saturation: '0' }, { color: '#f5f5f2' }, { gamma: '1' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.fill',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#c9c9c9' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#C6E2FF' }]
    }
  ],
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true
}

export default function RevenueMapView({ areaFilter, onToggleArea, onResetFilters }: RevenueMapViewProps) {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [boundaries, setBoundaries] = useState<any[]>([])
  const [selectedZip, setSelectedZip] = useState<RevenueData | null>(null)
  const [selectedZipPosition, setSelectedZipPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([])
  const [selectedZipAccounts, setSelectedZipAccounts] = useState<CustomerAccount[]>([])
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none')

  // Load revenue data
  useEffect(() => {
    fetch('/zip-revenue-data.json')
      .then(res => res.json())
      .then(data => {
        setRevenueData(data)
      })
      .catch(err => console.error('Error loading revenue data:', err))
  }, [])

  // Load ZIP boundaries
  useEffect(() => {
    fetch('/az-zip-boundaries.json')
      .then(res => res.json())
      .then(data => {
        if (data.features) {
          setBoundaries(data.features)
        }
      })
      .catch(err => console.error('Error loading boundaries:', err))
  }, [])

  // Load customer accounts
  useEffect(() => {
    fetch('/route-assignments.json')
      .then(res => res.json())
      .then(data => {
        setCustomerAccounts(data)
      })
      .catch(err => console.error('Error loading customer accounts:', err))
  }, [])

  // Filter data based on area filter
  const filteredData = useMemo(() => {
    return revenueData.filter(item => {
      const territory = item.Territory
      if (territory === 'APS of Glendale' && !areaFilter.West) return false
      if (territory === 'APS of Scottsdale' && !areaFilter.Central) return false
      if (territory === 'APS of Chandler' && !areaFilter.East) return false
      if (territory === 'APS of Tucson' && !areaFilter.Tucson) return false
      return true
    })
  }, [revenueData, areaFilter])

  // Get color based on average monthly price
  const getRevenueColor = useCallback((avgMonthly: number): string => {
    // Color scale from low to high revenue
    if (avgMonthly >= 200) return '#047857' // Dark green - highest
    if (avgMonthly >= 180) return '#059669' // Green
    if (avgMonthly >= 170) return '#10b981' // Medium green
    if (avgMonthly >= 165) return '#34d399' // Light green
    if (avgMonthly >= 160) return '#fbbf24' // Yellow/amber
    if (avgMonthly >= 155) return '#f59e0b' // Orange
    return '#dc2626' // Red - lowest
  }, [])

  const getTerritoryColor = useCallback((territory: string): string => {
    switch (territory) {
      case 'APS of Glendale': return '#3b82f6' // Blue
      case 'APS of Scottsdale': return '#10b981' // Green
      case 'APS of Chandler': return '#f97316' // Orange
      case 'APS of Tucson': return '#ec4899' // Pink
      default: return '#6b7280' // Gray
    }
  }, [])

  // Helper function to convert geometry to paths (must be defined before use)
  const convertGeometryToPaths = (geometry: any) => {
    if (geometry.type === 'Polygon') {
      return geometry.coordinates.map((ring: any[]) =>
        ring.map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }))
      )
    } else if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.flatMap((polygon: any[]) =>
        polygon.map((ring: any[]) =>
          ring.map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }))
        )
      )
    }
    return []
  }

  // Create polygons for ZIP codes with revenue data
  const revenuePolygons = useMemo(() => {
    const polygons: any[] = []

    filteredData.forEach(zipData => {
      const boundary = boundaries.find(b => 
        b.properties?.ZCTA5CE20 === zipData.ZIP ||
        b.properties?.ZCTA5CE10 === zipData.ZIP ||
        b.properties?.ZIP === zipData.ZIP ||
        b.properties?.GEOID20 === zipData.ZIP ||
        b.properties?.GEOID10 === zipData.ZIP
      )

      if (boundary && boundary.geometry) {
        const paths = convertGeometryToPaths(boundary.geometry)
        const color = getRevenueColor(zipData.Avg_Monthly_Price)
        
        polygons.push({
          paths,
          zipData,
          options: {
            fillColor: color,
            fillOpacity: 0.5,
            strokeColor: '#1e293b',
            strokeOpacity: 0.8,
            strokeWeight: 1.5,
            clickable: true
          }
        })
      }
    })

    return polygons
  }, [filteredData, boundaries, getRevenueColor])

  const handlePolygonClick = useCallback((zipData: RevenueData, paths: any) => {
    // Calculate center of polygon for info window
    const flatPaths = Array.isArray(paths[0]) ? paths.flat() : paths
    const center = flatPaths.reduce(
      (acc: any, coord: any) => ({
        lat: acc.lat + coord.lat / flatPaths.length,
        lng: acc.lng + coord.lng / flatPaths.length
      }),
      { lat: 0, lng: 0 }
    )
    
    setSelectedZip(zipData)
    setSelectedZipPosition(center)

    // Filter accounts for this ZIP code
    const accountsInZip = customerAccounts.filter(account => account.zipCode === zipData.ZIP)
    setSelectedZipAccounts(accountsInZip)
    
    // Reset sort order when new ZIP is selected
    setSortOrder('none')
  }, [customerAccounts])

  // Sort accounts based on monthly price
  const sortedAccounts = useMemo(() => {
    if (sortOrder === 'none') return selectedZipAccounts

    return [...selectedZipAccounts].sort((a, b) => {
      const priceA = a.monthlyPrice || 0
      const priceB = b.monthlyPrice || 0
      
      return sortOrder === 'asc' ? priceA - priceB : priceB - priceA
    })
  }, [selectedZipAccounts, sortOrder])

  const handleToggleSort = () => {
    setSortOrder(prev => {
      if (prev === 'none') return 'asc'
      if (prev === 'asc') return 'desc'
      return 'none'
    })
  }

  const getSortIcon = () => {
    if (sortOrder === 'asc') return <ArrowUp className="h-4 w-4" />
    if (sortOrder === 'desc') return <ArrowDown className="h-4 w-4" />
    return <ArrowUpDown className="h-4 w-4" />
  }

  // Calculate territory statistics
  const territoryStats = useMemo(() => {
    const stats: Record<string, { accounts: number; revenue: number; avgPrice: number }> = {}
    
    filteredData.forEach(item => {
      if (!stats[item.Territory]) {
        stats[item.Territory] = { accounts: 0, revenue: 0, avgPrice: 0 }
      }
      stats[item.Territory].accounts += item.Account_Count
      stats[item.Territory].revenue += item.Total_Monthly_Revenue
    })

    Object.keys(stats).forEach(territory => {
      stats[territory].avgPrice = stats[territory].revenue / stats[territory].accounts
    })

    return stats
  }, [filteredData])

  return (
    <div className="space-y-6">
      {/* Territory Filter Controls */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <span className="font-medium text-slate-900">Filter by Territory:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={areaFilter.West ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleArea('West')}
                className={areaFilter.West ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span>APS of Glendale</span>
                </div>
              </Button>
              <Button
                variant={areaFilter.Central ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleArea('Central')}
                className={areaFilter.Central ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span>APS of Scottsdale</span>
                </div>
              </Button>
              <Button
                variant={areaFilter.East ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleArea('East')}
                className={areaFilter.East ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                  <span>APS of Chandler</span>
                </div>
              </Button>
              <Button
                variant={areaFilter.Tucson ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleArea('Tucson')}
                className={areaFilter.Tucson ? 'bg-pink-600 hover:bg-pink-700' : ''}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-600"></div>
                  <span>APS of Tucson</span>
                </div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onResetFilters}
                className="ml-2"
              >
                Show All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend and Statistics */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Revenue Scale Legend */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Average Monthly Revenue per ZIP Code
              </h3>
              <div className="grid grid-cols-7 gap-2 text-sm">
                <div className="flex flex-col items-center">
                  <div className="w-full h-8 rounded" style={{ backgroundColor: '#dc2626' }}></div>
                  <span className="mt-1 text-xs text-slate-600">&lt; $155</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full h-8 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                  <span className="mt-1 text-xs text-slate-600">$155-160</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full h-8 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
                  <span className="mt-1 text-xs text-slate-600">$160-165</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full h-8 rounded" style={{ backgroundColor: '#34d399' }}></div>
                  <span className="mt-1 text-xs text-slate-600">$165-170</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full h-8 rounded" style={{ backgroundColor: '#10b981' }}></div>
                  <span className="mt-1 text-xs text-slate-600">$170-180</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full h-8 rounded" style={{ backgroundColor: '#059669' }}></div>
                  <span className="mt-1 text-xs text-slate-600">$180-200</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full h-8 rounded" style={{ backgroundColor: '#047857' }}></div>
                  <span className="mt-1 text-xs text-slate-600">&gt; $200</span>
                </div>
              </div>
            </div>

            {/* Territory Statistics */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Revenue by Territory
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(territoryStats).map(([territory, stats]) => (
                  <div key={territory} className="bg-slate-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getTerritoryColor(territory) }}
                      ></div>
                      <span className="font-medium text-slate-900 text-sm">{territory}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-slate-500" />
                        <span className="text-slate-600">{stats.accounts} accounts</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900">
                        ${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                      </div>
                      <div className="text-xs text-slate-600">
                        Avg: ${stats.avgPrice.toFixed(2)}/account
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-0">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={9}
            options={mapOptions}
          >
            {/* Revenue Polygons */}
            {revenuePolygons.map((polygon, index) => (
              <PolygonF
                key={`revenue-${index}`}
                paths={polygon.paths}
                options={polygon.options}
                onClick={() => handlePolygonClick(polygon.zipData, polygon.paths)}
              />
            ))}

            {/* Info Window */}
            {selectedZip && selectedZipPosition && (
              <InfoWindowF
                position={selectedZipPosition}
                onCloseClick={() => setSelectedZip(null)}
              >
                <div className="p-2">
                  <h3 className="font-bold text-lg mb-2">ZIP Code {selectedZip.ZIP}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getTerritoryColor(selectedZip.Territory) }}
                      ></div>
                      <span className="font-medium">{selectedZip.Territory}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="font-semibold">Accounts: {selectedZip.Account_Count}</div>
                      <div className="text-slate-600">Avg Monthly: ${selectedZip.Avg_Monthly_Price.toFixed(2)}</div>
                      <div className="text-slate-600">Total Monthly: ${selectedZip.Total_Monthly_Revenue.toFixed(2)}</div>
                      <div className="text-slate-600">Total Yearly: ${selectedZip.Total_Yearly_Revenue.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        </CardContent>
      </Card>

      {/* Accounts Table for Selected ZIP */}
      {selectedZip && selectedZipAccounts.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Accounts in ZIP Code {selectedZip.ZIP} - {selectedZip.Territory}
                <span className="text-sm font-normal text-slate-600 ml-2">
                  ({selectedZipAccounts.length} account{selectedZipAccounts.length !== 1 ? 's' : ''})
                </span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleSort}
                className="flex items-center gap-2"
              >
                {getSortIcon()}
                <span>
                  {sortOrder === 'none' && 'Sort by Price'}
                  {sortOrder === 'asc' && 'Price: Low to High'}
                  {sortOrder === 'desc' && 'Price: High to Low'}
                </span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Address</TableHead>
                      <TableHead className="font-semibold">City</TableHead>
                      <TableHead className="font-semibold">Territory</TableHead>
                      <TableHead className="font-semibold">Technician</TableHead>
                      <TableHead className="font-semibold">Service Days</TableHead>
                      <TableHead className="font-semibold text-right">Monthly Price</TableHead>
                      <TableHead className="font-semibold text-right">Yearly Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAccounts.map((account) => (
                      <TableRow key={account.customerNumber} className="hover:bg-slate-50">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{account.customerName}</span>
                            <span className="text-xs text-slate-500">{account.customerNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>{account.address}</TableCell>
                        <TableCell>{account.city}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: getTerritoryColor(account.newTerritory || account.territory) }}
                            ></div>
                            <span className="text-sm">{account.newTerritory || account.territory}</span>
                          </div>
                        </TableCell>
                        <TableCell>{account.technician}</TableCell>
                        <TableCell>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {account.daysOfService}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {account.monthlyPrice && account.monthlyPrice > 0 
                            ? `$${account.monthlyPrice.toFixed(2)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {account.yearlyPrice && account.yearlyPrice > 0 
                            ? `$${account.yearlyPrice.toFixed(2)}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
