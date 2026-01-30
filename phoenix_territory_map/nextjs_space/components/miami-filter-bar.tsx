'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

type MiamiTerritory = 'North' | 'Central' | 'South'

interface MiamiZipData {
  territory?: string
  accountCount?: number
}

interface MiamiFilterBarProps {
  areaFilter: Record<MiamiTerritory, boolean>
  onToggle: (territory: MiamiTerritory) => void
  onReset: () => void
  variant?: 'detailed' | 'compact'
  data?: MiamiZipData[]
  className?: string
}

const territoryMeta: Record<MiamiTerritory, { emoji: string; color: string }> = {
  North: { emoji: '🟦', color: '#3B82F6' },
  Central: { emoji: '🟩', color: '#10B981' },
  South: { emoji: '🟧', color: '#F59E0B' },
}

export function MiamiFilterBar({
  areaFilter,
  onToggle,
  onReset,
  variant = 'compact',
  data = [],
  className,
}: MiamiFilterBarProps) {
  const territories = Object.keys(areaFilter) as MiamiTerritory[]

  const territoryStats = territories.map((territory) => {
    const territoryData = data.filter((z) => z.territory === territory)
    const accountCount = territoryData.reduce((sum, z) => sum + (z.accountCount || 0), 0)
    return {
      territory,
      zipCount: territoryData.length,
      accountCount,
    }
  })

  if (variant === 'detailed') {
    return (
      <Card className={cn('bg-white/80 backdrop-blur-sm border-0 shadow-lg', className)}>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Territory Filters</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {territoryStats.map(({ territory, zipCount, accountCount }) => {
                  const isActive = areaFilter[territory]
                  const color = territoryMeta[territory].color
                  return (
                    <button
                      key={territory}
                      className={cn(
                        'cursor-pointer px-4 py-3 rounded-md border transition-all hover:shadow-md flex flex-col items-start',
                        isActive
                          ? 'text-white border-transparent'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      )}
                      style={{
                        backgroundColor: isActive ? color : undefined,
                        borderColor: isActive ? color : undefined,
                      }}
                      onClick={() => onToggle(territory)}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        {territoryMeta[territory].emoji}
                        APS Miami - {territory}
                        <span className="text-xs">({zipCount})</span>
                      </div>
                      <div className={cn('text-[10px] italic mt-0.5', isActive ? 'text-white/80' : 'text-slate-500')}>
                        {accountCount} accounts
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="lg:w-auto">
              <Button onClick={onReset} variant="outline" className="w-full lg:w-auto">
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('bg-white/80 backdrop-blur-sm border-0 shadow-lg', className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Territory Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {territories.map((area) => (
              <Badge
                key={area}
                variant={areaFilter[area] ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer px-4 py-2 transition-all hover:shadow-md',
                  area === 'North' && areaFilter[area] ? 'bg-blue-500 hover:bg-blue-600' : '',
                  area === 'Central' && areaFilter[area] ? 'bg-green-500 hover:bg-green-600' : '',
                  area === 'South' && areaFilter[area] ? 'bg-amber-500 hover:bg-amber-600' : '',
                  !areaFilter[area] ? 'hover:bg-slate-100' : ''
                )}
                onClick={() => onToggle(area)}
              >
                APS Miami - {area}
              </Badge>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onReset} className="text-xs">
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
