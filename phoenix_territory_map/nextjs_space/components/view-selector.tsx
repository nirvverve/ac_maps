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
// View Configuration
// ---------------------------------------------------------------------------

const VIEW_CONFIGS: ViewConfig[] = [
  // Core Arizona views
  {
    id: 'territory',
    label: 'Residential Account Territory Assignments',
    icon: MapIcon,
    colorScheme: { bg: 'bg-blue-600', bgHover: 'hover:bg-blue-700', text: 'text-white', hoverBg: 'hover:bg-blue-50' },
    locations: ['arizona', 'miami'],
  },
  {
    id: 'density',
    label: 'Account Density Analysis',
    icon: BarChart3,
    colorScheme: { bg: 'bg-purple-600', bgHover: 'hover:bg-purple-700', text: 'text-white', hoverBg: 'hover:bg-purple-50' },
    locations: ['arizona', 'miami', 'dallas', 'orlando', 'jacksonville', 'portCharlotte'],
  },
  {
    id: 'market',
    label: 'Market Size Analysis',
    icon: TrendingUp,
    colorScheme: { bg: 'bg-green-600', bgHover: 'hover:bg-green-700', text: 'text-white', hoverBg: 'hover:bg-green-50' },
    locations: ['arizona'],
  },
  {
    id: 'revenue',
    label: 'Revenue Analysis',
    icon: DollarSign,
    colorScheme: { bg: 'bg-emerald-600', bgHover: 'hover:bg-emerald-700', text: 'text-white', hoverBg: 'hover:bg-emerald-50' },
    locations: ['arizona'],
  },
  {
    id: 'employees',
    label: 'Employee Locations',
    icon: Users,
    colorScheme: { bg: 'bg-orange-600', bgHover: 'hover:bg-orange-700', text: 'text-white', hoverBg: 'hover:bg-orange-50' },
    locations: ['arizona'],
    roles: ['LEVEL2', 'ADMIN'], // Only Level 2 and Admin users
  },
  {
    id: 'commercial',
    label: 'Commercial Accounts',
    icon: Building2,
    colorScheme: { bg: 'bg-amber-600', bgHover: 'hover:bg-amber-700', text: 'text-white', hoverBg: 'hover:bg-amber-50' },
    locations: ['arizona'],
  },
  {
    id: 'routes',
    label: 'Routes by Tech',
    icon: Route,
    colorScheme: { bg: 'bg-rose-600', bgHover: 'hover:bg-rose-700', text: 'text-white', hoverBg: 'hover:bg-rose-50' },
    locations: ['arizona'],
  },
  {
    id: 'ancillarySales',
    label: 'Ancillary Sales',
    icon: Activity,
    colorScheme: { bg: 'bg-amber-600', bgHover: 'hover:bg-amber-700', text: 'text-white', hoverBg: 'hover:bg-amber-50' },
    locations: ['arizona'],
  },
  {
    id: 'lookup',
    label: 'Customer Lookup',
    icon: Search,
    colorScheme: { bg: 'bg-cyan-600', bgHover: 'hover:bg-cyan-700', text: 'text-white', hoverBg: 'hover:bg-cyan-50' },
    locations: ['arizona'],
  },

  // Miami scenario views
  {
    id: 'kmlScenario',
    label: 'Miami Breakup Scenario I - Fixed Boundaries',
    icon: MapPin,
    colorScheme: { bg: 'bg-indigo-600', bgHover: 'hover:bg-indigo-700', text: 'text-white', hoverBg: 'hover:bg-indigo-50' },
    locations: ['miami'],
  },
  {
    id: 'assignmentTool',
    label: 'Zip Code Assignment Tool',
    icon: MapPin,
    colorScheme: { bg: 'bg-pink-600', bgHover: 'hover:bg-pink-700', text: 'text-white', hoverBg: 'hover:bg-pink-50' },
    locations: ['miami'],
  },
  {
    id: 'miamiFinal',
    label: 'FINAL MIAMI TERRITORY MAP',
    icon: MapPin,
    colorScheme: { bg: 'bg-emerald-600', bgHover: 'hover:bg-emerald-700', text: 'text-white', hoverBg: 'hover:bg-emerald-50' },
    locations: ['miami'],
  },
  {
    id: 'miami10pct',
    label: '10% REASSIGNMENT',
    icon: MapPin,
    colorScheme: { bg: 'bg-indigo-600', bgHover: 'hover:bg-indigo-700', text: 'text-white', hoverBg: 'hover:bg-indigo-50' },
    locations: ['miami'],
  },
  {
    id: 'miamiZipOptimized',
    label: 'ZIP-OPTIMIZED',
    icon: MapPin,
    colorScheme: { bg: 'bg-teal-600', bgHover: 'hover:bg-teal-700', text: 'text-white', hoverBg: 'hover:bg-teal-50' },
    locations: ['miami'],
  },
  {
    id: 'miamiZipOptimized2',
    label: 'ZIP-OPTIMIZED #2',
    icon: MapPin,
    colorScheme: { bg: 'bg-cyan-600', bgHover: 'hover:bg-cyan-700', text: 'text-white', hoverBg: 'hover:bg-cyan-50' },
    locations: ['miami'],
  },
  {
    id: 'radicalReroute',
    label: 'RADICAL REROUTE',
    icon: MapPin,
    colorScheme: { bg: 'bg-purple-600', bgHover: 'hover:bg-purple-700', text: 'text-white', hoverBg: 'hover:bg-purple-50' },
    locations: ['miami'],
  },
  {
    id: 'miamiCommercialRoutes',
    label: 'COMMERCIAL ROUTES',
    icon: Route,
    colorScheme: { bg: 'bg-emerald-600', bgHover: 'hover:bg-emerald-700', text: 'text-white', hoverBg: 'hover:bg-emerald-50' },
    locations: ['miami'],
  },
  {
    id: 'miamiFutureCommercialRoutes',
    label: 'FUTURE COMMERCIAL ROUTES',
    icon: Route,
    colorScheme: { bg: 'bg-amber-600', bgHover: 'hover:bg-amber-700', text: 'text-white', hoverBg: 'hover:bg-amber-50' },
    locations: ['miami'],
  },

  // Jacksonville views
  {
    id: 'jaxRevenue',
    label: 'Revenue Analysis',
    icon: DollarSign,
    colorScheme: { bg: 'bg-teal-600', bgHover: 'hover:bg-teal-700', text: 'text-white', hoverBg: 'hover:bg-teal-50' },
    locations: ['jacksonville'],
  },
  {
    id: 'jaxCommercial',
    label: 'Commercial Accounts',
    icon: Building2,
    colorScheme: { bg: 'bg-violet-600', bgHover: 'hover:bg-violet-700', text: 'text-white', hoverBg: 'hover:bg-violet-50' },
    locations: ['jacksonville'],
  },
  {
    id: 'jaxRoutes',
    label: 'Routes by Tech',
    icon: Route,
    colorScheme: { bg: 'bg-indigo-600', bgHover: 'hover:bg-indigo-700', text: 'text-white', hoverBg: 'hover:bg-indigo-50' },
    locations: ['jacksonville'],
  },

  // Generic location views
  {
    id: 'locRevenue',
    label: 'Revenue Analysis',
    icon: DollarSign,
    colorScheme: { bg: 'bg-teal-600', bgHover: 'hover:bg-teal-700', text: 'text-white', hoverBg: 'hover:bg-teal-50' },
    locations: ['dallas', 'orlando', 'portCharlotte', 'miami'],
  },
  {
    id: 'locCommercial',
    label: 'Commercial Accounts',
    icon: Building2,
    colorScheme: { bg: 'bg-violet-600', bgHover: 'hover:bg-violet-700', text: 'text-white', hoverBg: 'hover:bg-violet-50' },
    locations: ['dallas', 'miami'],
  },
  {
    id: 'locRoutes',
    label: 'Routes by Tech',
    icon: Route,
    colorScheme: { bg: 'bg-indigo-600', bgHover: 'hover:bg-indigo-700', text: 'text-white', hoverBg: 'hover:bg-indigo-50' },
    locations: ['dallas', 'orlando', 'portCharlotte', 'miami'],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ViewSelector({ location, viewMode, onViewModeChange, userRole, className = '' }: ViewSelectorProps) {
  // Filter views by location and role
  const availableViews = VIEW_CONFIGS.filter(view => {
    const locationMatch = view.locations.includes(location)
    const roleMatch = !view.roles || !userRole || view.roles.includes(userRole)
    return locationMatch && roleMatch
  })

  if (availableViews.length === 0) {
    return null // No views available for this location/role
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {availableViews.map(view => {
        const isActive = viewMode === view.id
        const IconComponent = view.icon

        return (
          <Button
            key={view.id}
            onClick={() => onViewModeChange(view.id)}
            variant={isActive ? 'default' : 'outline'}
            className={`px-5 py-5 text-sm ${view.label.includes('FINAL') || view.label.includes('10%') || view.label.includes('ZIP-OPTIMIZED') || view.label.includes('RADICAL') || view.label.includes('COMMERCIAL') || view.label.includes('FUTURE') ? 'font-bold' : ''} ${
              isActive
                ? `${view.colorScheme.bg} ${view.colorScheme.bgHover} ${view.colorScheme.text} shadow-lg`
                : `${view.colorScheme.hoverBg} ${view.label.includes('FINAL') || view.label.includes('10%') || view.label.includes('ZIP-OPTIMIZED') || view.label.includes('RADICAL') || view.label.includes('COMMERCIAL') || view.label.includes('FUTURE') ? `border-${view.colorScheme.bg.replace('bg-', '')}-300 text-${view.colorScheme.bg.replace('bg-', '')}-700` : ''}`
            }`}
            title={view.description}
          >
            <IconComponent className="mr-2 h-4 w-4" />
            {view.label}
          </Button>
        )
      })}
    </div>
  )
}