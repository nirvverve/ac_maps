
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTerritoryData, useCustomerData } from '@/hooks/use-location-data'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { GoogleMapsProvider } from './google-maps-provider'
import { TerritoryData } from '@/lib/types'
import { LoadingState } from './loading-state'
import { EmptyState } from './empty-state'
import { FilterProvider } from '@/contexts/filter-context'
import { TerritoryProvider } from '@/contexts/territory-context'
import { getViewComponent, ViewMode, isValidViewMode } from '@/lib/view-registry'
import { getLocationConfig } from '@/config/locations.config'
import { LocationKey } from '@/lib/map-config'
import { ViewSelector } from '@/components/view-selector'

type DensityMode = 'active' | 'terminated' | 'both' | 'lifetime'

interface TerritoryMapProps {
  location: LocationKey
  onLocationChange: (location: LocationKey) => void
}

export default function TerritoryMap({ location, onLocationChange }: TerritoryMapProps) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role

  // URL state management for viewMode
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Get initial view mode from URL or default to first available view
  const getInitialViewMode = (): ViewMode => {
    const urlView = searchParams.get('view')
    const availableViews = getLocationConfig(location).availableViews as ViewMode[]

    if (urlView && isValidViewMode(urlView) && availableViews.includes(urlView)) {
      return urlView
    }

    return availableViews[0] ?? 'territory'
  }

  const [viewModeState, setViewModeState] = useState<ViewMode>(getInitialViewMode)
  const [densityMode, setDensityMode] = useState<DensityMode>('active')
  const [accountType, setAccountType] = useState<'residential' | 'commercial'>('residential')

  // URL sync function for viewMode
  const updateViewModeURL = useCallback((newViewMode: ViewMode) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    current.set('view', newViewMode)
    const search = current.toString()
    const query = search ? `?${search}` : ''
    router.replace(`${pathname}${query}`, { scroll: false })
  }, [searchParams, router, pathname])

  // Combined viewMode setter that updates both state and URL
  const setViewMode = useCallback((newViewMode: ViewMode) => {
    setViewModeState(newViewMode)
    updateViewModeURL(newViewMode)
  }, [updateViewModeURL])

  // Sync with URL params on mount and when searchParams change
  useEffect(() => {
    const urlViewMode = getInitialViewMode()
    if (urlViewMode !== viewModeState) {
      setViewModeState(urlViewMode)
      updateViewModeURL(urlViewMode)
    }
  }, [searchParams, location, updateViewModeURL, viewModeState])

  // Use viewModeState as viewMode for the rest of the component
  const viewMode = viewModeState

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
          <ViewSelector
            location={location}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            userRole={userRole}
            className="justify-center"
          />
        </CardContent>
      </Card>

      {/* Dynamic View Rendering using ViewRegistry */}
      {(() => {
        const ViewComponent = getViewComponent(viewMode)
        const isRoutesView = viewMode === 'routes'
        const isScenarioView = viewMode === 'scenarios'
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
          territoryData: isScenarioView ? territoryData : filteredData,
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
