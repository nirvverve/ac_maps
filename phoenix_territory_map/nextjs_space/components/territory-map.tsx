
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MapPin, Users, Building2, Filter, BarChart3, Map as MapIcon, Activity, TrendingUp, Route, Search, DollarSign, CheckCircle, RefreshCw } from 'lucide-react'
import { GoogleMapsProvider } from './google-maps-provider'
import GoogleMapView from './google-map-view'
import DensityMapView from './density-map-view'
import MarketSizeMapView from './market-size-map-view'
import RevenueMapView from './revenue-map-view'
import EmployeeMapView from './employee-map-view'
import CommercialDensityMapView from './commercial-density-map-view'
import { RoutesMapView } from './routes-map-view'
import { CustomerLookup } from './customer-lookup'
import { AncillarySalesView } from './ancillary-sales-view'
import { MiamiTerritoryView } from './miami-territory-view'
import { MiamiKMLScenarioView } from './miami-kml-scenario-view'
import { MiamiTerritoryAssignmentTool } from './miami-territory-assignment-tool'
import { MiamiZipScenarioView } from './miami-zip-scenario-view'
import { MiamiFinalTerritoryView } from './miami-final-territory-view'
import { Miami10PctReassignmentView } from './miami-10pct-reassignment-view'
import { MiamiZipOptimizedView } from './miami-zip-optimized-view'
import { MiamiZipOptimized2View } from './miami-zip-optimized-2-view'
import { MiamiRadicalRerouteView } from './miami-radical-reroute-view'
import { MiamiCommercialRoutesView } from './miami-commercial-routes-view'
import { MiamiFutureCommercialRoutesView } from './miami-future-commercial-routes-view'
import { JacksonvilleRevenueView } from './jacksonville-revenue-view'
import { JacksonvilleCommercialView } from './jacksonville-commercial-view'
import { JacksonvilleRoutesView } from './jacksonville-routes-view'
import { LocationCommercialView, LocationRoutesView } from './location-data-views'
import { LocationRevenueAnalysis } from './location-revenue-analysis'
import DensityControls from './density-controls'
import DensityLegend from './density-legend'
import MarketSizeLegend from './market-size-legend'
import MarketSizeStats from './market-size-stats'
import TerritoryLegend from './territory-legend'
import TerritoryStats from './territory-stats'
import { LocationSelector } from './location-selector'
import { TerritoryData, AreaFilter, AreaStats } from '@/lib/types'
import { LoadingState } from './loading-state'
import { EmptyState } from './empty-state'
import { MiamiFilterBar } from './miami-filter-bar'
import { FilterProvider } from '@/contexts/filter-context'
import { TerritoryProvider } from '@/contexts/territory-context'
import { getViewComponent, ViewMode } from '@/lib/view-registry'

type DensityMode = 'active' | 'terminated' | 'both' | 'lifetime'
type Location = 'arizona' | 'miami' | 'dallas' | 'orlando' | 'jacksonville' | 'portCharlotte'

interface TerritoryMapProps {
  location: Location
  onLocationChange: (location: Location) => void
}

export default function TerritoryMap({ location, onLocationChange }: TerritoryMapProps) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const [viewMode, setViewMode] = useState<ViewMode>('territory')
  const [densityMode, setDensityMode] = useState<DensityMode>('active')
  const [accountType, setAccountType] = useState<'residential' | 'commercial'>('residential')
  const [territoryData, setTerritoryData] = useState<TerritoryData[]>([])
  const [filteredData, setFilteredData] = useState<TerritoryData[]>([])
  const [areaFilter, setAreaFilter] = useState<AreaFilter>({
    West: true,
    Central: true,
    East: true,
    Tucson: true,
    Commercial: true
  })
  const [miamiAreaFilter, setMiamiAreaFilter] = useState<{
    North: boolean;
    Central: boolean;
    South: boolean;
  }>({
    North: true,
    Central: true,
    South: true
  })
  const [areaStats, setAreaStats] = useState<AreaStats | null>(null)
  const [miamiData, setMiamiData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTerritoryData()
  }, [])

  useEffect(() => {
    if (location === 'miami') {
      loadMiamiData()
    }
  }, [location])

  useEffect(() => {
    if (territoryData?.length) {
      const filtered = territoryData.filter(item => 
        areaFilter?.[item?.area as keyof AreaFilter] === true
      )
      setFilteredData(filtered)
      calculateStats(territoryData)
    }
  }, [territoryData, areaFilter])

  const loadTerritoryData = async () => {
    try {
      setLoading(true)
      console.log('📊 Starting to load territory data...')
      const response = await fetch('/phoenix-tucson-map-data.json')
      console.log('📊 Fetch response received:', response?.status, response?.ok)
      if (!response?.ok) throw new Error('Failed to load territory data')
      
      const data = await response.json()
      console.log('📊 Data loaded successfully:', data?.length, 'records')
      setTerritoryData(data || [])
      console.log('📊 State updated with data')
    } catch (error) {
      console.error('❌ Error loading territory data:', error)
      setError('Failed to load territory data')
    } finally {
      setLoading(false)
      console.log('📊 Loading complete')
    }
  }

  const loadMiamiData = async () => {
    try {
      const response = await fetch('/miami-map-data.json')
      if (!response?.ok) throw new Error('Failed to load Miami data')
      const data = await response.json()
      setMiamiData(data || [])
    } catch (error) {
      console.error('❌ Error loading Miami data:', error)
    }
  }

  const calculateStats = (data: TerritoryData[]) => {
    const stats: AreaStats = {
      West: { zipCodes: 0, totalAccounts: 0 },
      Central: { zipCodes: 0, totalAccounts: 0 },
      East: { zipCodes: 0, totalAccounts: 0 },
      Tucson: { zipCodes: 0, totalAccounts: 0 }
    }

    data?.forEach(item => {
      const area = item?.area as keyof AreaStats
      if (stats?.[area]) {
        stats[area].zipCodes += 1
        stats[area].totalAccounts += item?.accounts || 0
      }
    })

    setAreaStats(stats)
  }

  const toggleAreaFilter = (area: keyof AreaFilter) => {
    setAreaFilter(prev => ({
      ...prev,
      [area]: !prev?.[area]
    }))
  }

  const resetFilters = () => {
    setAreaFilter({
      West: true,
      Central: true,
      East: true,
      Tucson: true,
      Commercial: true
    })
  }

  const toggleMiamiAreaFilter = (area: keyof typeof miamiAreaFilter) => {
    setMiamiAreaFilter(prev => ({
      ...prev,
      [area]: !prev[area]
    }))
  }

  const resetMiamiFilters = () => {
    setMiamiAreaFilter({
      North: true,
      Central: true,
      South: true
    })
  }

  // Memoized callback for routes view territory changes to prevent infinite loops
  const handleRouteAreaChange = useCallback((area: string) => {
    if (area === 'all') {
      setAreaFilter({ West: true, Central: true, East: true, Tucson: true, Commercial: true });
    } else {
      setAreaFilter({ West: false, Central: false, East: false, Tucson: false, Commercial: false, [area]: true });
    }
  }, []);

  if (loading) {
    return <LoadingState message="Loading territory data..." />
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Data"
        description={error}
        icon={MapPin}
        iconClassName="text-red-500"
        action={
          <Button onClick={loadTerritoryData} className="w-full">
            Try Again
          </Button>
        }
      />
    )
  }

  const totalAccounts = areaStats ? 
    Object.values(areaStats).reduce((sum, area) => sum + (area?.totalAccounts || 0), 0) : 0
  const totalZipCodes = filteredData?.length || 0

  return (
    <TerritoryProvider initialLocation={location}>
      <FilterProvider
        value={{
          areaFilter,
          setAreaFilter,
          densityMode,
          setDensityMode,
          accountType,
          setAccountType,
        }}
      >
      <GoogleMapsProvider>
        <div className="space-y-6">
      {/* View Mode Toggle */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/* Residential Account Territory Assignments - Arizona only */}
            {location === 'arizona' && (
              <Button
                onClick={() => setViewMode('territory')}
                variant={viewMode === 'territory' ? 'default' : 'outline'}
                className={`px-5 py-5 text-sm ${
                  viewMode === 'territory' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                    : 'hover:bg-blue-50'
                }`}
              >
                <MapIcon className="mr-2 h-4 w-4" />
                Residential Account Territory Assignments
              </Button>
            )}
            {/* Miami Scenario Buttons - Only show for Miami */}
            {location === 'miami' && (
              <>
                <Button
                  onClick={() => setViewMode('kmlScenario')}
                  variant={viewMode === 'kmlScenario' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'kmlScenario' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' 
                      : 'hover:bg-indigo-50'
                  }`}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Miami Breakup Scenario I - Fixed Boundaries
                </Button>
                <Button
                  onClick={() => setViewMode('territory')}
                  variant={viewMode === 'territory' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'territory' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                      : 'hover:bg-blue-50'
                  }`}
                >
                  <MapIcon className="mr-2 h-4 w-4" />
                  Miami Breakup Scenario II - Zip Codes
                </Button>
                <Button
                  onClick={() => setViewMode('assignmentTool')}
                  variant={viewMode === 'assignmentTool' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'assignmentTool' 
                      ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-lg' 
                      : 'hover:bg-pink-50'
                  }`}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Zip Code Assignment Tool
                </Button>
                <Button
                  onClick={() => setViewMode('miamiFinal')}
                  variant={viewMode === 'miamiFinal' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm font-bold ${
                    viewMode === 'miamiFinal' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg' 
                      : 'hover:bg-emerald-50 border-emerald-300 text-emerald-700'
                  }`}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  FINAL MIAMI TERRITORY MAP
                </Button>
                <Button
                  onClick={() => setViewMode('miami10pct')}
                  variant={viewMode === 'miami10pct' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm font-bold ${
                    viewMode === 'miami10pct' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' 
                      : 'hover:bg-indigo-50 border-indigo-300 text-indigo-700'
                  }`}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  10% REASSIGNMENT
                </Button>
                <Button
                  onClick={() => setViewMode('miamiZipOptimized')}
                  variant={viewMode === 'miamiZipOptimized' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm font-bold ${
                    viewMode === 'miamiZipOptimized' 
                      ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg' 
                      : 'hover:bg-teal-50 border-teal-300 text-teal-700'
                  }`}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  ZIP-OPTIMIZED
                </Button>
                <Button
                  onClick={() => setViewMode('miamiZipOptimized2')}
                  variant={viewMode === 'miamiZipOptimized2' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm font-bold ${
                    viewMode === 'miamiZipOptimized2' 
                      ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg' 
                      : 'hover:bg-cyan-50 border-cyan-300 text-cyan-700'
                  }`}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  ZIP-OPTIMIZED #2
                </Button>
                <Button
                  onClick={() => setViewMode('radicalReroute')}
                  variant={viewMode === 'radicalReroute' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm font-bold ${
                    viewMode === 'radicalReroute' 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg' 
                      : 'hover:bg-purple-50 border-purple-300 text-purple-700'
                  }`}
                >
                  <Users className="mr-2 h-4 w-4" />
                  RADICAL REROUTE
                </Button>
                <Button
                  onClick={() => setViewMode('miamiCommercialRoutes')}
                  variant={viewMode === 'miamiCommercialRoutes' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm font-bold ${
                    viewMode === 'miamiCommercialRoutes' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg' 
                      : 'hover:bg-emerald-50 border-emerald-300 text-emerald-700'
                  }`}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  COMMERCIAL ROUTES
                </Button>
                <Button
                  onClick={() => setViewMode('miamiFutureCommercialRoutes')}
                  variant={viewMode === 'miamiFutureCommercialRoutes' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm font-bold ${
                    viewMode === 'miamiFutureCommercialRoutes' 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg' 
                      : 'hover:bg-amber-50 border-amber-300 text-amber-700'
                  }`}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  FUTURE COMMERCIAL
                </Button>
              </>
            )}
            {/* Density Analysis - All locations */}
            <Button
              onClick={() => setViewMode('density')}
              variant={viewMode === 'density' ? 'default' : 'outline'}
              className={`px-5 py-5 text-sm ${
                viewMode === 'density' 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg' 
                  : 'hover:bg-purple-50'
              }`}
            >
              <Activity className="mr-2 h-4 w-4" />
              Density Analysis
            </Button>
            {/* Market Size - Arizona only */}
            {location === 'arizona' && (
              <Button
                onClick={() => setViewMode('market')}
                variant={viewMode === 'market' ? 'default' : 'outline'}
                className={`px-5 py-5 text-sm ${
                  viewMode === 'market' 
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' 
                    : 'hover:bg-green-50'
                }`}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Market Size
              </Button>
            )}
            {/* Revenue Analysis - Arizona only */}
            {location === 'arizona' && (
              <Button
                onClick={() => setViewMode('revenue')}
                variant={viewMode === 'revenue' ? 'default' : 'outline'}
                className={`px-5 py-5 text-sm ${
                  viewMode === 'revenue' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg' 
                    : 'hover:bg-emerald-50'
                }`}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Revenue Analysis
              </Button>
            )}
            {/* Employee Locations - Arizona only, Level 2 and Admin users */}
            {location === 'arizona' && (userRole === 'LEVEL2' || userRole === 'ADMIN') && (
              <Button
                onClick={() => setViewMode('employees')}
                variant={viewMode === 'employees' ? 'default' : 'outline'}
                className={`px-5 py-5 text-sm ${
                  viewMode === 'employees' 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg' 
                    : 'hover:bg-orange-50'
                }`}
              >
                <Users className="mr-2 h-4 w-4" />
                Employee Locations
              </Button>
            )}
            {/* Commercial Accounts - Arizona only */}
            {location === 'arizona' && (
              <Button
                onClick={() => setViewMode('commercial')}
                variant={viewMode === 'commercial' ? 'default' : 'outline'}
                className={`px-5 py-5 text-sm ${
                  viewMode === 'commercial' 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg' 
                    : 'hover:bg-amber-50'
                }`}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Commercial Accounts
              </Button>
            )}
            {/* Routes by Tech - Arizona only */}
            {location === 'arizona' && (
              <Button
                onClick={() => setViewMode('routes')}
                variant={viewMode === 'routes' ? 'default' : 'outline'}
                className={`px-5 py-5 text-sm ${
                  viewMode === 'routes' 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg' 
                    : 'hover:bg-rose-50'
                }`}
              >
                <Route className="mr-2 h-4 w-4" />
                Routes by Tech
              </Button>
            )}
            {/* Ancillary Sales - Arizona only */}
            {location === 'arizona' && (
              <Button
                onClick={() => setViewMode('ancillarySales')}
                variant={viewMode === 'ancillarySales' ? 'default' : 'outline'}
                className={`px-5 py-5 text-sm ${
                  viewMode === 'ancillarySales' 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg' 
                    : 'hover:bg-amber-50'
                }`}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Ancillary Sales
              </Button>
            )}
            {/* Jacksonville-specific buttons */}
            {location === 'jacksonville' && (
              <>
                <Button
                  onClick={() => setViewMode('jaxRevenue')}
                  variant={viewMode === 'jaxRevenue' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'jaxRevenue' 
                      ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg' 
                      : 'hover:bg-teal-50'
                  }`}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Revenue Analysis
                </Button>
                <Button
                  onClick={() => setViewMode('jaxCommercial')}
                  variant={viewMode === 'jaxCommercial' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'jaxCommercial' 
                      ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg' 
                      : 'hover:bg-violet-50'
                  }`}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Commercial Accounts
                </Button>
                <Button
                  onClick={() => setViewMode('jaxRoutes')}
                  variant={viewMode === 'jaxRoutes' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'jaxRoutes' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' 
                      : 'hover:bg-indigo-50'
                  }`}
                >
                  <Route className="mr-2 h-4 w-4" />
                  Routes by Tech
                </Button>
              </>
            )}
            {/* Dallas-specific buttons */}
            {location === 'dallas' && (
              <>
                <Button
                  onClick={() => setViewMode('locRevenue')}
                  variant={viewMode === 'locRevenue' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'locRevenue' 
                      ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg' 
                      : 'hover:bg-teal-50'
                  }`}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Revenue Analysis
                </Button>
                <Button
                  onClick={() => setViewMode('locCommercial')}
                  variant={viewMode === 'locCommercial' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'locCommercial' 
                      ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg' 
                      : 'hover:bg-violet-50'
                  }`}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Commercial Accounts
                </Button>
                <Button
                  onClick={() => setViewMode('locRoutes')}
                  variant={viewMode === 'locRoutes' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'locRoutes' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' 
                      : 'hover:bg-indigo-50'
                  }`}
                >
                  <Route className="mr-2 h-4 w-4" />
                  Routes by Tech
                </Button>
              </>
            )}
            {/* Orlando-specific buttons */}
            {location === 'orlando' && (
              <>
                <Button
                  onClick={() => setViewMode('locRevenue')}
                  variant={viewMode === 'locRevenue' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'locRevenue' 
                      ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg' 
                      : 'hover:bg-teal-50'
                  }`}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Revenue Analysis
                </Button>
                <Button
                  onClick={() => setViewMode('locRoutes')}
                  variant={viewMode === 'locRoutes' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'locRoutes' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' 
                      : 'hover:bg-indigo-50'
                  }`}
                >
                  <Route className="mr-2 h-4 w-4" />
                  Routes by Tech
                </Button>
              </>
            )}
            {/* Port Charlotte-specific buttons */}
            {location === 'portCharlotte' && (
              <>
                <Button
                  onClick={() => setViewMode('locRevenue')}
                  variant={viewMode === 'locRevenue' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'locRevenue' 
                      ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg' 
                      : 'hover:bg-teal-50'
                  }`}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Revenue Analysis
                </Button>
                <Button
                  onClick={() => setViewMode('locRoutes')}
                  variant={viewMode === 'locRoutes' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'locRoutes' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' 
                      : 'hover:bg-indigo-50'
                  }`}
                >
                  <Route className="mr-2 h-4 w-4" />
                  Routes by Tech
                </Button>
              </>
            )}
            {/* Miami-specific buttons */}
            {location === 'miami' && (
              <>
                <Button
                  onClick={() => setViewMode('locRevenue')}
                  variant={viewMode === 'locRevenue' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'locRevenue' 
                      ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg' 
                      : 'hover:bg-teal-50'
                  }`}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Revenue Analysis
                </Button>
                <Button
                  onClick={() => setViewMode('locCommercial')}
                  variant={viewMode === 'locCommercial' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'locCommercial' 
                      ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg' 
                      : 'hover:bg-violet-50'
                  }`}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Commercial Accounts
                </Button>
                <Button
                  onClick={() => setViewMode('locRoutes')}
                  variant={viewMode === 'locRoutes' ? 'default' : 'outline'}
                  className={`px-5 py-5 text-sm ${
                    viewMode === 'locRoutes' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' 
                      : 'hover:bg-indigo-50'
                  }`}
                >
                  <Route className="mr-2 h-4 w-4" />
                  Routes by Tech
                </Button>
              </>
            )}
            {/* Customer Lookup - Arizona only */}
            {location === 'arizona' && (
              <Button
                onClick={() => setViewMode('lookup')}
                variant={viewMode === 'lookup' ? 'default' : 'outline'}
                className={`px-5 py-5 text-sm ${
                  viewMode === 'lookup' 
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg' 
                    : 'hover:bg-cyan-50'
                }`}
              >
                <Search className="mr-2 h-4 w-4" />
                Customer Lookup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic View Rendering using ViewRegistry */}
      {(() => {
        const ViewComponent = getViewComponent(viewMode)

        // Prepare props based on location and view
        const viewProps = {
          location,
          areaFilter: location === 'miami' ? miamiAreaFilter : areaFilter,
          onAreaChange: location === 'miami' ? toggleMiamiAreaFilter : toggleAreaFilter,
          onResetFilters: location === 'miami' ? resetMiamiFilters : resetFilters,
          territoryData: filteredData,
          miamiData,
          userRole,
          densityMode,
          accountType,
        }

        return <ViewComponent {...viewProps} />
      })()}
                        <span className="text-sm font-medium text-slate-600">Avg per ZIP</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">
                        {miamiData.length > 0 
                          ? Math.round(miamiData.reduce((sum, zip) => sum + (zip.accountCount || 0), 0) / miamiData.length) 
                          : 0}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Account density</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Miami Territory Filters */}
              <MiamiFilterBar
                variant="detailed"
                areaFilter={miamiAreaFilter}
                data={miamiData}
                onToggle={toggleMiamiAreaFilter}
                onReset={resetMiamiFilters}
              />

              {/* Miami Territory Map */}
              <MiamiTerritoryView areaFilter={miamiAreaFilter} />
            </>
          ) : (
            <>
              {/* Summary Stats Card - Arizona */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Building2 className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-slate-600">Total Areas</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">4</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <MapPin className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-slate-600">Zip Codes</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">{totalZipCodes}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Users className="h-5 w-5 text-orange-600 mr-2" />
                        <span className="text-sm font-medium text-slate-600">Total Accounts</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">{totalAccounts}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <BarChart3 className="h-5 w-5 text-purple-600 mr-2" />
                        <span className="text-sm font-medium text-slate-600">Avg per Zip</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">
                        {totalZipCodes > 0 ? Math.round(totalAccounts / totalZipCodes) : 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

          {/* Control Panel */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Territory Filters</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(areaFilter)
                      .filter(([area]) => area !== 'Commercial')
                      .map(([area, isActive]) => (
                      <button
                        key={area}
                        className={`cursor-pointer px-4 py-3 rounded-md border transition-all hover:shadow-md flex flex-col items-start ${
                          area === 'West' && isActive ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-600' :
                          area === 'Central' && isActive ? 'bg-green-500 hover:bg-green-600 text-white border-green-600' :
                          area === 'East' && isActive ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600' :
                          area === 'Tucson' && isActive ? 'bg-purple-500 hover:bg-purple-600 text-white border-purple-600' :
                          'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                        onClick={() => toggleAreaFilter(area as keyof AreaFilter)}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          {area === 'West' && '🟦'} 
                          {area === 'Central' && '🟩'} 
                          {area === 'East' && '🟧'} 
                          {area === 'Tucson' && '🟪'}
                          {area === 'West' && 'APS-Glendale'}
                          {area === 'Central' && 'APS-Scottsdale'}
                          {area === 'East' && 'APS-Chandler'}
                          {area === 'Tucson' && 'APS-Tucson'}
                          <span className="text-xs">({areaStats?.[area as keyof AreaStats]?.zipCodes || 0})</span>
                        </div>
                        <div className={`text-[10px] italic mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                          {area === 'West' && 'Phoenix west metro area'}
                          {area === 'Central' && 'Phoenix central/north metro area'}
                          {area === 'East' && 'Phoenix east metro area'}
                          {area === 'Tucson' && 'Tucson metro area'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="lg:w-auto">
                  <Button 
                    onClick={resetFilters} 
                    variant="outline"
                    className="w-full lg:w-auto"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Map View */}
            <div className="xl:col-span-3">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-0">
                  <GoogleMapView 
                    territoryData={filteredData}
                    areaFilter={areaFilter}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-6">
              <TerritoryLegend />
              {areaStats && <TerritoryStats areaStats={areaStats} />}
            </div>
          </div>
            </>
          )}
        </>
      ) : viewMode === 'kmlScenario' ? (
        <>
          {/* Miami KML Boundary Scenario */}
          {location === 'miami' ? (
            <MiamiKMLScenarioView areaFilter={miamiAreaFilter} />
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <MapPin className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Miami Only</h3>
                <p className="text-slate-600">
                  KML Boundary Scenario is only available for Miami, FL.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : viewMode === 'assignmentTool' ? (
        <>
          {/* Miami Breakup Scenario II - ZIP Codes */}
          {location === 'miami' ? (
            <>
              {/* Miami Area Filters */}
              <MiamiFilterBar
                className="mb-4"
                areaFilter={miamiAreaFilter}
                onToggle={toggleMiamiAreaFilter}
                onReset={resetMiamiFilters}
              />
              <MiamiZipScenarioView areaFilter={miamiAreaFilter} />
            </>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <MapPin className="h-12 w-12 text-pink-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Miami Only</h3>
                <p className="text-slate-600">
                  Miami Breakup Scenario II is only available for Miami, FL.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : viewMode === 'miamiFinal' ? (
        <>
          {/* Final Miami Territory Map */}
          {location === 'miami' ? (
            <>
              {/* Miami Area Filters */}
              <MiamiFilterBar
                className="mb-4"
                areaFilter={miamiAreaFilter}
                onToggle={toggleMiamiAreaFilter}
                onReset={resetMiamiFilters}
              />
              <MiamiFinalTerritoryView areaFilter={miamiAreaFilter} />
            </>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Miami Only</h3>
                <p className="text-slate-600">
                  Final Miami Territory Map is only available for Miami, FL.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : viewMode === 'miami10pct' ? (
        <>
          {/* 10% Reassignment Optimization */}
          {location === 'miami' ? (
            <>
              {/* Miami Area Filters */}
              <MiamiFilterBar
                className="mb-4"
                areaFilter={miamiAreaFilter}
                onToggle={toggleMiamiAreaFilter}
                onReset={resetMiamiFilters}
              />
              <Miami10PctReassignmentView areaFilter={miamiAreaFilter} />
            </>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <RefreshCw className="h-12 w-12 text-indigo-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Miami Only</h3>
                <p className="text-slate-600">
                  10% Reassignment Optimization is only available for Miami, FL.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : viewMode === 'miamiZipOptimized' ? (
        <>
          {/* ZIP-Optimized Scenario */}
          {location === 'miami' ? (
            <>
              {/* Miami Area Filters */}
              <MiamiFilterBar
                className="mb-4"
                areaFilter={miamiAreaFilter}
                onToggle={toggleMiamiAreaFilter}
                onReset={resetMiamiFilters}
              />
              <MiamiZipOptimizedView areaFilter={miamiAreaFilter} />
            </>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <MapPin className="h-12 w-12 text-teal-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Miami Only</h3>
                <p className="text-slate-600">
                  ZIP-Optimized Scenario is only available for Miami, FL.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : viewMode === 'miamiZipOptimized2' ? (
        <>
          {/* ZIP-Optimized #2 Scenario */}
          {location === 'miami' ? (
            <>
              {/* Miami Area Filters */}
              <MiamiFilterBar
                className="mb-4"
                areaFilter={miamiAreaFilter}
                onToggle={toggleMiamiAreaFilter}
                onReset={resetMiamiFilters}
              />
              <MiamiZipOptimized2View areaFilter={miamiAreaFilter} />
            </>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <MapPin className="h-12 w-12 text-cyan-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Miami Only</h3>
                <p className="text-slate-600">
                  ZIP-Optimized #2 Scenario is only available for Miami, FL.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : viewMode === 'radicalReroute' ? (
        <>
          {/* Radical Reroute Scenario */}
          {location === 'miami' ? (
            <>
              {/* Miami Area Filters */}
              <MiamiFilterBar
                className="mb-4"
                areaFilter={miamiAreaFilter}
                onToggle={toggleMiamiAreaFilter}
                onReset={resetMiamiFilters}
              />
              <MiamiRadicalRerouteView areaFilter={miamiAreaFilter} />
            </>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Miami Only</h3>
                <p className="text-slate-600">
                  Radical Reroute Scenario is only available for Miami, FL.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : viewMode === 'miamiCommercialRoutes' ? (
        <>
          {/* Miami Commercial Routes */}
          {location === 'miami' ? (
            <MiamiCommercialRoutesView />
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <Building2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Miami Only</h3>
                <p className="text-slate-600">
                  Commercial Routes is only available for Miami, FL.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : viewMode === 'miamiFutureCommercialRoutes' ? (
        <>
          {/* Miami Future Commercial Routes */}
          {location === 'miami' ? (
            <MiamiFutureCommercialRoutesView />
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <Building2 className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Miami Only</h3>
                <p className="text-slate-600">
                  Future Commercial Routes is only available for Miami, FL.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : viewMode === 'density' ? (
        <>
          {/* Density Mode Controls */}
          <DensityControls
            densityMode={densityMode}
            onDensityModeChange={setDensityMode}
            showLifetime={location === 'miami' || location === 'dallas' || location === 'orlando' || location === 'jacksonville'}
            accountType={accountType}
            onAccountTypeChange={setAccountType}
            showAccountTypeToggle={location === 'miami' || location === 'dallas' || location === 'orlando' || location === 'jacksonville'}
          />

          {/* Area Filters for Density View - Arizona Only */}
          {location === 'arizona' && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <Filter className="h-4 w-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-700">Territory Filters</span>
                    </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(areaFilter).map(([area, isActive]) => (
                      <Badge
                        key={area}
                        variant={isActive ? "default" : "outline"}
                        className={`cursor-pointer px-4 py-2 transition-all hover:shadow-md ${
                          area === 'West' && isActive ? 'bg-blue-500 hover:bg-blue-600' :
                          area === 'Central' && isActive ? 'bg-green-500 hover:bg-green-600' :
                          area === 'East' && isActive ? 'bg-orange-500 hover:bg-orange-600' :
                          area === 'Tucson' && isActive ? 'bg-purple-500 hover:bg-purple-600' :
                          'hover:bg-slate-100'
                        }`}
                        onClick={() => toggleAreaFilter(area as keyof AreaFilter)}
                      >
                        {area === 'West' && '🟦'} 
                        {area === 'Central' && '🟩'} 
                        {area === 'East' && '🟧'} 
                        {area === 'Tucson' && '🟪'} 
                        {area === 'Tucson' ? 'Tucson' : `Phoenix ${area}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="lg:w-auto">
                  <Button 
                    onClick={resetFilters} 
                    variant="outline"
                    className="w-full lg:w-auto"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Density Map View */}
            <div className="xl:col-span-3">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-0">
                  <DensityMapView 
                    densityMode={densityMode}
                    areaFilter={areaFilter}
                    location={location}
                    accountType={accountType}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-6">
              <DensityLegend mode={densityMode} location={location} accountType={accountType} />
            </div>
          </div>
        </>
      ) : viewMode === 'market' ? (
        <>
          {/* Area Filters for Market View */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Territory Filters</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(areaFilter).map(([area, isActive]) => (
                      <Badge
                        key={area}
                        variant={isActive ? "default" : "outline"}
                        className={`cursor-pointer px-4 py-2 transition-all hover:shadow-md ${
                          area === 'West' && isActive ? 'bg-blue-500 hover:bg-blue-600' :
                          area === 'Central' && isActive ? 'bg-green-500 hover:bg-green-600' :
                          area === 'East' && isActive ? 'bg-orange-500 hover:bg-orange-600' :
                          area === 'Tucson' && isActive ? 'bg-purple-500 hover:bg-purple-600' :
                          'hover:bg-slate-100'
                        }`}
                        onClick={() => toggleAreaFilter(area as keyof AreaFilter)}
                      >
                        {area === 'West' && '🟦'} 
                        {area === 'Central' && '🟩'} 
                        {area === 'East' && '🟧'} 
                        {area === 'Tucson' && '🟪'} 
                        {area === 'Tucson' ? 'Tucson' : `Phoenix ${area}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="lg:w-auto">
                  <Button 
                    onClick={resetFilters} 
                    variant="outline"
                    className="w-full lg:w-auto"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Market Size Map View */}
            <div className="xl:col-span-3">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-0">
                  <MarketSizeMapView 
                    areaFilter={areaFilter}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-6">
              <MarketSizeLegend />
              <MarketSizeStats areaFilter={areaFilter} />
            </div>
          </div>
        </>
      ) : viewMode === 'revenue' ? (
        <>
          {/* Revenue Analysis View */}
          <RevenueMapView 
            areaFilter={areaFilter} 
            onToggleArea={toggleAreaFilter}
            onResetFilters={resetFilters}
          />
        </>
      ) : viewMode === 'employees' ? (
        <>
          {/* Employee Locations View */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg h-[800px]">
            <CardContent className="p-0 h-full">
              <EmployeeMapView />
            </CardContent>
          </Card>
        </>
      ) : viewMode === 'commercial' ? (
        <>
          {/* Commercial Accounts View */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Commercial Account Locations</h2>
                <p className="text-slate-600">
                  Visualization of 73 commercial pool accounts across Arizona. Each account is shown as a marker color-coded by its assigned branch. Click any marker to view account details.
                </p>
              </div>
              
              {/* Legend */}
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold text-slate-900 mb-3">Legend</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Account Markers (by Branch Assignment):</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#9333ea', border: '2px solid white'}}></div>
                        <span>APS - Commercial (58.9% of accounts)</span>
                      </div>
                      <div className="text-xs text-slate-600 ml-6 mt-1">
                        Commercial locations within the footprint of APS of Glendale and APS of Scottsdale
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#f97316', border: '2px solid white'}}></div>
                        <span>APS of Chandler (38.4% of accounts)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#ec4899', border: '2px solid white'}}></div>
                        <span>APS of Tucson (2.7% of accounts)</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-sm font-medium text-slate-700 mb-2">Office Locations:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="text-blue-600 text-lg">★</div>
                        <span>APS of Glendale</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-green-600 text-lg">★</div>
                        <span>APS of Scottsdale</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-orange-600 text-lg">★</div>
                        <span>APS of Chandler</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-pink-600 text-lg">★</div>
                        <span>APS of Tucson</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <CommercialDensityMapView areaFilter={{ ...areaFilter, Commercial: true }} />
              
              {/* Commercial Accounts Summary */}
              <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">📊 Commercial Account Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                      <span className="font-semibold text-slate-900">APS - Commercial</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-600">43</p>
                    <p className="text-sm text-slate-600 mt-1">accounts (58.9%)</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                      <span className="font-semibold text-slate-900">APS of Chandler</span>
                    </div>
                    <p className="text-3xl font-bold text-orange-600">28</p>
                    <p className="text-sm text-slate-600 mt-1">accounts (38.4%)</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-3 h-3 rounded-full bg-pink-600"></div>
                      <span className="font-semibold text-slate-900">APS of Tucson</span>
                    </div>
                    <p className="text-3xl font-bold text-pink-600">2</p>
                    <p className="text-sm text-slate-600 mt-1">accounts (2.7%)</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">Total Commercial Accounts:</span> 73 across all branches
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : viewMode === 'routes' ? (
        <>
          <RoutesMapView 
            areaFilter={Object.keys(areaFilter).find(key => areaFilter[key as keyof AreaFilter] === true) || 'all'}
            onAreaChange={handleRouteAreaChange}
          />
        </>
      ) : viewMode === 'lookup' ? (
        <>
          <CustomerLookup />
        </>
      ) : viewMode === 'ancillarySales' ? (
        <>
          <AncillarySalesView />
        </>
      ) : viewMode === 'jaxRevenue' ? (
        <>
          <JacksonvilleRevenueView />
        </>
      ) : viewMode === 'jaxCommercial' ? (
        <>
          <JacksonvilleCommercialView />
        </>
      ) : viewMode === 'jaxRoutes' ? (
        <>
          <JacksonvilleRoutesView />
        </>
      ) : viewMode === 'locRevenue' ? (
        <>
          <LocationRevenueAnalysis location={location} />
        </>
      ) : viewMode === 'locCommercial' ? (
        <>
          <LocationCommercialView location={location} />
        </>
      ) : viewMode === 'locRoutes' ? (
        <>
          <LocationRoutesView location={location} />
        </>
      ) : null}
        </div>
      </GoogleMapsProvider>
    </FilterProvider>
    </TerritoryProvider>
  )
}
