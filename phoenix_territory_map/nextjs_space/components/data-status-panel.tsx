/**
 * Data Status Panel — Demo of TanStack Query + Config-Driven Architecture.
 *
 * Shows real-time data loading status for all available endpoints for a location.
 * Demonstrates the integration between bd-1n8 config system and bd-12u TanStack Query.
 *
 * bd-12u demo component
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, XCircle, Clock, Database } from 'lucide-react'
import { getLocationConfig } from '@/config/locations.config'
import {
  useTerritoryData,
  useDensityData,
  useRevenueData,
  useRoutesData,
  useCustomerData,
  useCommercialData,
  useAncillarySalesData
} from '@/hooks/use-location-data'
import type { LocationKey } from '@/lib/map-config'
import type { DataEndpoints } from '@/lib/types'

interface DataStatusPanelProps {
  location: LocationKey
  className?: string
}

export function DataStatusPanel({ location, className }: DataStatusPanelProps) {
  const config = getLocationConfig(location)

  // Use all our data hooks to show comprehensive status
  const territory = useTerritoryData(location)
  const density = useDensityData(location)
  const revenue = useRevenueData(location)
  const routes = useRoutesData(location)
  const customers = useCustomerData(location)
  const commercial = useCommercialData(location)
  const ancillary = useAncillarySalesData(location)

  const dataHooks = [
    { key: 'territory', label: 'Territory Data', hook: territory },
    { key: 'density', label: 'Density Analysis', hook: density },
    { key: 'revenue', label: 'Revenue Data', hook: revenue },
    { key: 'routes', label: 'Routes Data', hook: routes },
    { key: 'customers', label: 'Customer Data', hook: customers },
    { key: 'commercial', label: 'Commercial Data', hook: commercial },
    { key: 'ancillarySales', label: 'Ancillary Sales', hook: ancillary },
  ]

  const hasEndpoint = (key: keyof DataEndpoints) => Boolean(config.dataEndpoints[key])

  // Filter to only show data types that are available for this location
  const relevantData = dataHooks.filter(item =>
    hasEndpoint(item.key as keyof DataEndpoints)
  )

  const refetchAll = () => {
    relevantData.forEach(item => item.hook.refetch())
  }

  const getStatusIcon = (isLoading: boolean, error: any, data: any) => {
    if (isLoading) return <Clock className="h-4 w-4 text-yellow-500" />
    if (error) return <XCircle className="h-4 w-4 text-red-500" />
    if (data) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <Database className="h-4 w-4 text-gray-500" />
  }

  const getStatusColor = (isLoading: boolean, error: any, data: any) => {
    if (isLoading) return "yellow"
    if (error) return "red"
    if (data) return "green"
    return "gray"
  }

  const getStatusText = (isLoading: boolean, error: any, data: any) => {
    if (isLoading) return "Loading..."
    if (error) return "Error"
    if (data) {
      const count = Array.isArray(data) ? data.length : Object.keys(data).length
      return `${count} items`
    }
    return "No data"
  }

  return (
    <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {config.shortLabel} Data Status
          </CardTitle>
          <Button
            onClick={refetchAll}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {relevantData.map(item => {
            const { isLoading, error, data } = item.hook
            const statusColor = getStatusColor(isLoading, error, data)

            return (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(isLoading, error, data)}
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <Badge variant={statusColor === 'green' ? 'default' : 'outline'}>
                  {getStatusText(isLoading, error, data)}
                </Badge>
              </div>
            )
          })}

          {/* Location Configuration Summary */}
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600 space-y-1">
              <div>📍 Center: {config.center.lat.toFixed(4)}, {config.center.lng.toFixed(4)}</div>
              <div>🔍 Zoom: {config.zoom}</div>
              <div>🎯 Territories: {config.territories.length}</div>
              <div>👀 Available Views: {config.availableViews.length}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
