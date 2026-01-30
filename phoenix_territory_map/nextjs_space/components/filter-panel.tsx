/**
 * FilterPanel — Reusable area filter component.
 *
 * Extracts the duplicated area filter UI from territory-map.tsx into a
 * clean, reusable component. Handles Arizona territories, Miami areas,
 * and generic location filtering with proper territory colors.
 *
 * bd-6z6
 */

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AreaFilterConfig {
  [key: string]: boolean
}

export interface FilterConfig {
  key: string
  label: string
  emoji: string
  activeColor: string
  hoverColor: string
}

export interface FilterPanelProps {
  title?: string
  filters: AreaFilterConfig
  onToggleFilter: (area: string) => void
  onResetFilters: () => void
  filterConfigs?: FilterConfig[]
  className?: string
  hideCard?: boolean // For cases where the component is already inside a card
}

// ---------------------------------------------------------------------------
// Default Filter Configurations
// ---------------------------------------------------------------------------

// Arizona territories with Phoenix branding and colors matching the map
export const ARIZONA_FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'West',
    label: 'Phoenix West',
    emoji: '🟦',
    activeColor: 'bg-blue-500 hover:bg-blue-600',
    hoverColor: 'hover:bg-blue-50',
  },
  {
    key: 'Central',
    label: 'Phoenix Central',
    emoji: '🟩',
    activeColor: 'bg-green-500 hover:bg-green-600',
    hoverColor: 'hover:bg-green-50',
  },
  {
    key: 'East',
    label: 'Phoenix East',
    emoji: '🟧',
    activeColor: 'bg-orange-500 hover:bg-orange-600',
    hoverColor: 'hover:bg-orange-50',
  },
  {
    key: 'Tucson',
    label: 'Tucson',
    emoji: '🟪',
    activeColor: 'bg-purple-500 hover:bg-purple-600',
    hoverColor: 'hover:bg-purple-50',
  },
  {
    key: 'Commercial',
    label: 'Commercial',
    emoji: '🏢',
    activeColor: 'bg-amber-500 hover:bg-amber-600',
    hoverColor: 'hover:bg-amber-50',
  },
]

// Miami areas with territory-specific colors
export const MIAMI_FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'North',
    label: 'Miami North',
    emoji: '🟦',
    activeColor: 'bg-blue-500 hover:bg-blue-600',
    hoverColor: 'hover:bg-blue-50',
  },
  {
    key: 'Central',
    label: 'Miami Central',
    emoji: '🟩',
    activeColor: 'bg-green-500 hover:bg-green-600',
    hoverColor: 'hover:bg-green-50',
  },
  {
    key: 'South',
    label: 'Miami South',
    emoji: '🟧',
    activeColor: 'bg-orange-500 hover:bg-orange-600',
    hoverColor: 'hover:bg-orange-50',
  },
]

// Generic areas (fallback for other locations)
export const GENERIC_FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'all',
    label: 'All Areas',
    emoji: '🗺️',
    activeColor: 'bg-slate-500 hover:bg-slate-600',
    hoverColor: 'hover:bg-slate-50',
  },
]

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Get appropriate filter configs based on location.
 */
export function getFilterConfigs(location: string): FilterConfig[] {
  switch (location) {
    case 'arizona':
      return ARIZONA_FILTER_CONFIGS
    case 'miami':
      return MIAMI_FILTER_CONFIGS
    default:
      return GENERIC_FILTER_CONFIGS
  }
}

/**
 * Find filter config for a specific area key.
 */
export function findFilterConfig(area: string, configs: FilterConfig[]): FilterConfig | undefined {
  return configs.find(config => config.key === area)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FilterPanel({
  title = 'Territory Filters',
  filters,
  onToggleFilter,
  onResetFilters,
  filterConfigs,
  className = '',
  hideCard = false,
}: FilterPanelProps) {
  // Use provided configs or default to generic
  const configs = filterConfigs || GENERIC_FILTER_CONFIGS

  // Filter out configs that don't exist in the current filters object
  const availableConfigs = configs.filter(config => config.key in filters)

  if (availableConfigs.length === 0) {
    return null // No filters to show
  }

  const content = (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">{title}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {availableConfigs.map(config => {
            const isActive = filters[config.key]

            return (
              <Badge
                key={config.key}
                variant={isActive ? 'default' : 'outline'}
                className={`cursor-pointer px-4 py-2 transition-all hover:shadow-md ${
                  isActive ? config.activeColor : config.hoverColor
                }`}
                onClick={() => onToggleFilter(config.key)}
              >
                {config.emoji} {config.label}
              </Badge>
            )
          })}
        </div>
      </div>
      <div className="lg:w-auto">
        <Button
          onClick={onResetFilters}
          variant="outline"
          className="w-full lg:w-auto"
        >
          Reset Filters
        </Button>
      </div>
    </div>
  )

  if (hideCard) {
    return <div className={className}>{content}</div>
  }

  return (
    <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg ${className}`}>
      <CardContent className="p-6">
        {content}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Preset Components
// ---------------------------------------------------------------------------

/**
 * Arizona-specific filter panel with pre-configured territory colors.
 */
export function ArizonaFilterPanel({
  filters,
  onToggleFilter,
  onResetFilters,
  className
}: Omit<FilterPanelProps, 'filterConfigs'>) {
  return (
    <FilterPanel
      title="Arizona Territory Filters"
      filters={filters}
      onToggleFilter={onToggleFilter}
      onResetFilters={onResetFilters}
      filterConfigs={ARIZONA_FILTER_CONFIGS}
      className={className}
    />
  )
}

/**
 * Miami-specific filter panel with pre-configured area colors.
 */
export function MiamiFilterPanel({
  filters,
  onToggleFilter,
  onResetFilters,
  className
}: Omit<FilterPanelProps, 'filterConfigs'>) {
  return (
    <FilterPanel
      title="Miami Area Filters"
      filters={filters}
      onToggleFilter={onToggleFilter}
      onResetFilters={onResetFilters}
      filterConfigs={MIAMI_FILTER_CONFIGS}
      className={className}
    />
  )
}