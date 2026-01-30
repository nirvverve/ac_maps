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
import { getLocationConfig, getTerritories, getTerritoryColor } from '@/config/locations.config'

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
// Dynamic Filter Configuration Helpers
// ---------------------------------------------------------------------------

/**
 * Convert hex color to Tailwind CSS classes
 */
function hexToTailwindClasses(hexColor: string) {
  // Map common hex colors to Tailwind classes
  const colorMap: Record<string, { active: string; hover: string }> = {
    '#3B82F6': { active: 'bg-blue-500 hover:bg-blue-600', hover: 'hover:bg-blue-50' },
    '#10B981': { active: 'bg-green-500 hover:bg-green-600', hover: 'hover:bg-green-50' },
    '#F59E0B': { active: 'bg-orange-500 hover:bg-orange-600', hover: 'hover:bg-orange-50' },
    '#A855F7': { active: 'bg-purple-500 hover:bg-purple-600', hover: 'hover:bg-purple-50' },
    '#FBBF24': { active: 'bg-amber-500 hover:bg-amber-600', hover: 'hover:bg-amber-50' },
    '#EF4444': { active: 'bg-red-500 hover:bg-red-600', hover: 'hover:bg-red-50' },
    '#06B6D4': { active: 'bg-cyan-500 hover:bg-cyan-600', hover: 'hover:bg-cyan-50' },
  }

  return colorMap[hexColor] || { active: 'bg-slate-500 hover:bg-slate-600', hover: 'hover:bg-slate-50' }
}

/**
 * Generate filter configs from location territories
 */
export function generateFilterConfigsFromLocation(locationKey: string): FilterConfig[] {
  const territories = getTerritories(locationKey)

  if (territories.length === 0) {
    return [{
      key: 'all',
      label: 'All Areas',
      emoji: '🗺️',
      activeColor: 'bg-slate-500 hover:bg-slate-600',
      hoverColor: 'hover:bg-slate-50',
    }]
  }

  const emojiList = ['🟦', '🟩', '🟧', '🟪', '🟨', '🟫', '⬛', '⬜']

  return territories.map((territory, index) => {
    const colors = hexToTailwindClasses(territory.color)
    const emoji = territory.key === 'Commercial' ? '🏢' : emojiList[index % emojiList.length]

    return {
      key: territory.key,
      label: territory.label,
      emoji,
      activeColor: colors.active,
      hoverColor: colors.hover,
    }
  })
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Get appropriate filter configs based on location (config-driven).
 */
export function getFilterConfigs(location: string): FilterConfig[] {
  return generateFilterConfigsFromLocation(location)
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
 * Location-specific filter panel with config-driven territory colors.
 */
export function LocationFilterPanel({
  location,
  filters,
  onToggleFilter,
  onResetFilters,
  className
}: Omit<FilterPanelProps, 'filterConfigs'> & { location: string }) {
  const config = getLocationConfig(location)
  const filterConfigs = generateFilterConfigsFromLocation(location)

  return (
    <FilterPanel
      title={`${config.shortLabel} Territory Filters`}
      filters={filters}
      onToggleFilter={onToggleFilter}
      onResetFilters={onResetFilters}
      filterConfigs={filterConfigs}
      className={className}
    />
  )
}

/**
 * Arizona-specific filter panel (legacy compatibility).
 * @deprecated Use LocationFilterPanel with location="arizona" instead
 */
export function ArizonaFilterPanel({
  filters,
  onToggleFilter,
  onResetFilters,
  className
}: Omit<FilterPanelProps, 'filterConfigs'>) {
  return (
    <LocationFilterPanel
      location="arizona"
      filters={filters}
      onToggleFilter={onToggleFilter}
      onResetFilters={onResetFilters}
      className={className}
    />
  )
}

/**
 * Miami-specific filter panel (legacy compatibility).
 * @deprecated Use LocationFilterPanel with location="miami" instead
 */
export function MiamiFilterPanel({
  filters,
  onToggleFilter,
  onResetFilters,
  className
}: Omit<FilterPanelProps, 'filterConfigs'>) {
  return (
    <LocationFilterPanel
      location="miami"
      filters={filters}
      onToggleFilter={onToggleFilter}
      onResetFilters={onResetFilters}
      className={className}
    />
  )
}