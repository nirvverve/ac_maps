
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTerritoryData, useCustomerData } from '@/hooks/use-location-data'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Users, Building2, Map as MapIcon, Activity, TrendingUp, Route, Search, DollarSign, CheckCircle, RefreshCw } from 'lucide-react'
import { GoogleMapsProvider } from './google-maps-provider'
import { TerritoryData } from '@/lib/types'
import { LoadingState } from './loading-state'
import { EmptyState } from './empty-state'
import { FilterProvider } from '@/contexts/filter-context'
import { TerritoryProvider } from '@/contexts/territory-context'
import { getViewComponent, ViewMode } from '@/lib/view-registry'
import { getLocationConfig } from '@/config/locations.config'
import { LocationKey } from '@/lib/map-config'

type DensityMode = 'active' | 'terminated' | 'both' | 'lifetime'

interface TerritoryMapProps {
  location: LocationKey
  onLocationChange: (location: LocationKey) => void
}

export default function TerritoryMap({ location, onLocationChange }: TerritoryMapProps) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const [viewMode, setViewMode] = useState<ViewMode>('territory')
  const [densityMode, setDensityMode] = useState<DensityMode>('active')
  const [accountType, setAccountType] = useState<'residential' | 'commercial'>('residential')

  // TanStack Query data hooks (replaces manual fetch)
  const {
    data: territoryData = [],
    isLoading: territoryLoading,
    error: territoryError,
    refetch: refetchTerritory
  } = useTerritoryData(location)

  const {
    data: miamiData = [],
    isLoading: customerLoading,
    error: customerError,
    refetch: refetchCustomer
  } = useCustomerData(location)

  const [filteredData, setFilteredData] = useState<TerritoryData[]>([])

  // Dynamic area filter based on location config
  const getInitialAreaFilter = (currentLocation: LocationKey) => {
    const config = getLocationConfig(currentLocation)
    const filter: Record<string, boolean> = {}
    config.territories.forEach(territory => {
      filter[territory.key] = true
    })
    return filter
  }
  const [areaFilter, setAreaFilter] = useState<Record<string, boolean>>(() => getInitialAreaFilter(location))

  // Computed loading and error states
  const loading = territoryLoading || customerLoading
  const error = territoryError?.message || customerError?.message || null

  useEffect(() => {
    // Reset area filter when location changes
    setAreaFilter(getInitialAreaFilter(location))
  }, [location])

  useEffect(() => {
    if (territoryData?.length) {
      const filtered = territoryData.filter(item =>
        areaFilter?.[item?.area] === true
      )
      setFilteredData(filtered)
    }
  }, [territoryData, areaFilter, location])

  const toggleAreaFilter = (area: string) => {
    setAreaFilter(prev => ({
      ...prev,
      [area]: !prev?.[area]
    }))
  }

  const resetFilters = () => {
    setAreaFilter(getInitialAreaFilter(location))
  }

  // Legacy Miami filter functions now use unified area filter
  const toggleMiamiAreaFilter = (area: string) => {
    toggleAreaFilter(area)
  }

  const resetMiamiFilters = () => {
    resetFilters()
  }

  // Memoized callback for routes view territory changes to prevent infinite loops
  const handleRouteAreaChange = useCallback((area: string) => {
    const config = getLocationConfig(location)
    if (area === 'all') {
      const allTrueFilter: Record<string, boolean> = {}
      config.territories.forEach(territory => {
        allTrueFilter[territory.key] = true
      })
      setAreaFilter(allTrueFilter)
    } else {
      const singleAreaFilter: Record<string, boolean> = {}
      config.territories.forEach(territory => {
        singleAreaFilter[territory.key] = territory.key === area
      })
      setAreaFilter(singleAreaFilter)
    }
  }, [location]);

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
          <Button onClick={() => { refetchTerritory(); refetchCustomer(); }} className="w-full">
            Try Again
          </Button>
        }
      />
    )
  }

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
                onClick={() => setViewMode('marketSize')}
                variant={viewMode === 'marketSize' ? 'default' : 'outline'}
                className={`px-5 py-5 text-sm ${
                  viewMode === 'marketSize' 
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
                onClick={() => setViewMode('customerLookup')}
                variant={viewMode === 'customerLookup' ? 'default' : 'outline'}
                className={`px-5 py-5 text-sm ${
                  viewMode === 'customerLookup' 
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
        const isRoutesView = viewMode === 'routes'
        const activeAreas = Object.entries(areaFilter).filter(([, isActive]) => isActive)
        const routeAreaFilter = activeAreas.length === 1 ? activeAreas[0][0] : 'all'

        // Prepare props based on location and view
        const viewProps = {
          location,
          areaFilter: isRoutesView ? routeAreaFilter : areaFilter,
          onAreaChange: isRoutesView
            ? handleRouteAreaChange
            : (location === 'miami' ? toggleMiamiAreaFilter : toggleAreaFilter),
          onResetFilters: location === 'miami' ? resetMiamiFilters : resetFilters,
          onToggleArea: toggleAreaFilter,
          territoryData: filteredData,
          miamiData,
          userRole,
          densityMode,
          accountType,
        }

        return <ViewComponent {...viewProps} />
      })()}
        </div>
      </GoogleMapsProvider>
    </FilterProvider>
    </TerritoryProvider>
  )
}
