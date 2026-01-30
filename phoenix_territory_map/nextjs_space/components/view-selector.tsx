/**
 * ViewSelector — Configurable view mode button bar.
 *
 * Extracts the massive button list from territory-map.tsx into a clean,
 * config-driven component. Supports location filtering, custom styling,
 * icons, and role-based access control.
 *
 * bd-37s
 */

import { Button } from '@/components/ui/button'
import {
  MapIcon,
  MapPin,
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  Route,
  Search,
  DollarSign,
  Activity
} from 'lucide-react'
import { ViewMode } from '@/lib/view-registry'
import { getLocationConfig, getAvailableViews } from '@/config/locations.config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ViewConfig {
  id: ViewMode
  label: string
  icon: React.ComponentType<{ className?: string }>
  colorScheme: {
    bg: string
    bgHover: string
    text: string
    hoverBg: string
  }
  locations: string[] // Which locations this view is available for
  roles?: string[] // Which user roles can access this view (optional)
  description?: string // Tooltip or extended description
}

export interface ViewSelectorProps {
  location: string
  viewMode: ViewMode
  onViewModeChange: (viewMode: ViewMode) => void
  userRole?: string
  className?: string
}

// ---------------------------------------------------------------------------
// View Configuration Mapping (location-agnostic)
// ---------------------------------------------------------------------------

interface ViewDisplayInfo {
  label: string
  icon: React.ComponentType<{ className?: string }>
  colorScheme: {
    bg: string
    bgHover: string
    text: string
    hoverBg: string
  }
  roles?: string[]
}

// Static mapping of view IDs to their display properties
const VIEW_DISPLAY_MAP: Record<string, ViewDisplayInfo> = {
  // Core Views
  territory: {
    label: 'Residential Account Territory Assignments',
    icon: MapIcon,
    colorScheme: { bg: 'bg-blue-600', bgHover: 'hover:bg-blue-700', text: 'text-white', hoverBg: 'hover:bg-blue-50' },
  },
  density: {
    label: 'Account Density Analysis',
    icon: BarChart3,
    colorScheme: { bg: 'bg-purple-600', bgHover: 'hover:bg-purple-700', text: 'text-white', hoverBg: 'hover:bg-purple-50' },
  },
  marketSize: {
    label: 'Market Size Analysis',
    icon: TrendingUp,
    colorScheme: { bg: 'bg-green-600', bgHover: 'hover:bg-green-700', text: 'text-white', hoverBg: 'hover:bg-green-50' },
  },
  revenue: {
    label: 'Revenue Analysis',
    icon: DollarSign,
    colorScheme: { bg: 'bg-emerald-600', bgHover: 'hover:bg-emerald-700', text: 'text-white', hoverBg: 'hover:bg-emerald-50' },
  },
  routes: {
    label: 'Routes by Tech',
    icon: Route,
    colorScheme: { bg: 'bg-rose-600', bgHover: 'hover:bg-rose-700', text: 'text-white', hoverBg: 'hover:bg-rose-50' },
  },
  customerLookup: {
    label: 'Customer Lookup',
    icon: Search,
    colorScheme: { bg: 'bg-cyan-600', bgHover: 'hover:bg-cyan-700', text: 'text-white', hoverBg: 'hover:bg-cyan-50' },
  },
  employeeLocations: {
    label: 'Employee Locations',
    icon: Users,
    colorScheme: { bg: 'bg-orange-600', bgHover: 'hover:bg-orange-700', text: 'text-white', hoverBg: 'hover:bg-orange-50' },
    roles: ['LEVEL2', 'ADMIN'],
  },
  commercial: {
    label: 'Commercial Accounts',
    icon: Building2,
    colorScheme: { bg: 'bg-amber-600', bgHover: 'hover:bg-amber-700', text: 'text-white', hoverBg: 'hover:bg-amber-50' },
  },
  ancillarySales: {
    label: 'Ancillary Sales',
    icon: Activity,
    colorScheme: { bg: 'bg-amber-600', bgHover: 'hover:bg-amber-700', text: 'text-white', hoverBg: 'hover:bg-amber-50' },
  },

  // Miami-specific scenario views
  kmlScenario: {
    label: 'Miami Breakup Scenario I - Fixed Boundaries',
    icon: MapPin,
    colorScheme: { bg: 'bg-indigo-600', bgHover: 'hover:bg-indigo-700', text: 'text-white', hoverBg: 'hover:bg-indigo-50' },
  },
  assignmentTool: {
    label: 'Zip Code Assignment Tool',
    icon: MapPin,
    colorScheme: { bg: 'bg-pink-600', bgHover: 'hover:bg-pink-700', text: 'text-white', hoverBg: 'hover:bg-pink-50' },
  },
  miamiFinal: {
    label: 'FINAL MIAMI TERRITORY MAP',
    icon: MapPin,
    colorScheme: { bg: 'bg-emerald-600', bgHover: 'hover:bg-emerald-700', text: 'text-white', hoverBg: 'hover:bg-emerald-50' },
  },
  miami10pct: {
    label: '10% REASSIGNMENT',
    icon: MapPin,
    colorScheme: { bg: 'bg-indigo-600', bgHover: 'hover:bg-indigo-700', text: 'text-white', hoverBg: 'hover:bg-indigo-50' },
  },
  miamiZipOptimized: {
    label: 'ZIP-OPTIMIZED',
    icon: MapPin,
    colorScheme: { bg: 'bg-teal-600', bgHover: 'hover:bg-teal-700', text: 'text-white', hoverBg: 'hover:bg-teal-50' },
  },
  miamiZipOptimized2: {
    label: 'ZIP-OPTIMIZED #2',
    icon: MapPin,
    colorScheme: { bg: 'bg-cyan-600', bgHover: 'hover:bg-cyan-700', text: 'text-white', hoverBg: 'hover:bg-cyan-50' },
  },
  radicalReroute: {
    label: 'RADICAL REROUTE',
    icon: MapPin,
    colorScheme: { bg: 'bg-purple-600', bgHover: 'hover:bg-purple-700', text: 'text-white', hoverBg: 'hover:bg-purple-50' },
  },
  miamiCommercialRoutes: {
    label: 'COMMERCIAL ROUTES',
    icon: Route,
    colorScheme: { bg: 'bg-emerald-600', bgHover: 'hover:bg-emerald-700', text: 'text-white', hoverBg: 'hover:bg-emerald-50' },
  },
  miamiFutureCommercialRoutes: {
    label: 'FUTURE COMMERCIAL ROUTES',
    icon: Route,
    colorScheme: { bg: 'bg-amber-600', bgHover: 'hover:bg-amber-700', text: 'text-white', hoverBg: 'hover:bg-amber-50' },
  },

  // Jacksonville-specific views
  jaxRevenue: {
    label: 'Revenue Analysis',
    icon: DollarSign,
    colorScheme: { bg: 'bg-teal-600', bgHover: 'hover:bg-teal-700', text: 'text-white', hoverBg: 'hover:bg-teal-50' },
  },
  jaxCommercial: {
    label: 'Commercial Accounts',
    icon: Building2,
    colorScheme: { bg: 'bg-violet-600', bgHover: 'hover:bg-violet-700', text: 'text-white', hoverBg: 'hover:bg-violet-50' },
  },
  jaxRoutes: {
    label: 'Routes by Tech',
    icon: Route,
    colorScheme: { bg: 'bg-indigo-600', bgHover: 'hover:bg-indigo-700', text: 'text-white', hoverBg: 'hover:bg-indigo-50' },
  },

  // Generic fallbacks for other location views
  locRevenue: {
    label: 'Revenue Analysis',
    icon: DollarSign,
    colorScheme: { bg: 'bg-teal-600', bgHover: 'hover:bg-teal-700', text: 'text-white', hoverBg: 'hover:bg-teal-50' },
  },
  locCommercial: {
    label: 'Commercial Accounts',
    icon: Building2,
    colorScheme: { bg: 'bg-violet-600', bgHover: 'hover:bg-violet-700', text: 'text-white', hoverBg: 'hover:bg-violet-50' },
  },
  locRoutes: {
    label: 'Routes by Tech',
    icon: Route,
    colorScheme: { bg: 'bg-indigo-600', bgHover: 'hover:bg-indigo-700', text: 'text-white', hoverBg: 'hover:bg-indigo-50' },
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ViewSelector({ location, viewMode, onViewModeChange, userRole, className = '' }: ViewSelectorProps) {
  // Get available views from location config
  const locationViews = getAvailableViews(location)

  // Filter by role access
  const availableViews = locationViews
    .map(viewKey => ({ viewKey, displayInfo: VIEW_DISPLAY_MAP[viewKey] }))
    .filter(({ displayInfo }) => {
      if (!displayInfo) return false
      const roleMatch = !displayInfo.roles || !userRole || displayInfo.roles.includes(userRole)
      return roleMatch
    })

  if (availableViews.length === 0) {
    return null // No views available for this location/role
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {availableViews.map(({ viewKey, displayInfo }) => {
        const isActive = viewMode === viewKey
        const IconComponent = displayInfo.icon
        const label = displayInfo.label
        const isBold = label.includes('FINAL') || label.includes('10%') || label.includes('ZIP-OPTIMIZED') ||
                     label.includes('RADICAL') || label.includes('COMMERCIAL') || label.includes('FUTURE')

        return (
          <Button
            key={viewKey}
            onClick={() => onViewModeChange(viewKey as ViewMode)}
            variant={isActive ? 'default' : 'outline'}
            className={`px-5 py-5 text-sm ${isBold ? 'font-bold' : ''} ${
              isActive
                ? `${displayInfo.colorScheme.bg} ${displayInfo.colorScheme.bgHover} ${displayInfo.colorScheme.text} shadow-lg`
                : `${displayInfo.colorScheme.hoverBg} ${isBold ? `border-emerald-300 text-emerald-700` : ''}`
            }`}
          >
            <IconComponent className="mr-2 h-4 w-4" />
            {label}
          </Button>
        )
      })}
    </div>
  )
}