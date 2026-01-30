
'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { TrendingUp, Target, BarChart3, Percent } from 'lucide-react'

interface MarketSizeStatsProps {
  areaFilter: {
    West: boolean
    Central: boolean
    East: boolean
    Tucson: boolean
  }
}

interface MarketData {
  zipCode: string
  permittedPools: number
}

interface TerritoryData {
  zip: string
  area: string
  accounts: number
}

interface AreaMarketStats {
  area: string
  totalPermittedPools: number
  currentAccounts: number
  penetrationRate: number
  zipCodes: number
}

export default function MarketSizeStats({ areaFilter }: MarketSizeStatsProps) {
  const [stats, setStats] = useState<AreaMarketStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load market data
        const marketResponse = await fetch('/market-size-data.json')
        const marketData: MarketData[] = await marketResponse.json()

        // Load territory data
        const territoryResponse = await fetch('/phoenix-tucson-map-data.json')
        const territoryData: TerritoryData[] = await territoryResponse.json()

        // Calculate stats by area
        const areaStats: Record<string, AreaMarketStats> = {}

        territoryData.forEach(territory => {
          const area = territory.area
          const marketInfo = marketData.find(m => m.zipCode === territory.zip)

          if (!areaStats[area]) {
            areaStats[area] = {
              area,
              totalPermittedPools: 0,
              currentAccounts: 0,
              penetrationRate: 0,
              zipCodes: 0
            }
          }

          areaStats[area].zipCodes++
          areaStats[area].currentAccounts += territory.accounts || 0
          if (marketInfo) {
            areaStats[area].totalPermittedPools += marketInfo.permittedPools
          }
        })

        // Calculate penetration rates
        Object.values(areaStats).forEach(stat => {
          if (stat.totalPermittedPools > 0) {
            stat.penetrationRate = (stat.currentAccounts / stat.totalPermittedPools) * 100
          }
        })

        // Convert to array and filter
        const statsArray = Object.values(areaStats)
          .filter(stat => areaFilter[stat.area as keyof typeof areaFilter])
          .sort((a, b) => b.totalPermittedPools - a.totalPermittedPools)

        setStats(statsArray)
        setLoading(false)
      } catch (error) {
        console.error('Error loading market stats:', error)
        setLoading(false)
      }
    }

    loadStats()
  }, [areaFilter])

  if (loading) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        </CardContent>
      </Card>
    )
  }

  const totalMarket = stats.reduce((sum, s) => sum + s.totalPermittedPools, 0)
  const totalAccounts = stats.reduce((sum, s) => sum + s.currentAccounts, 0)
  const overallPenetration = totalMarket > 0 ? (totalAccounts / totalMarket) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Market Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Market:</span>
              <span className="text-lg font-bold text-blue-700">
                {totalMarket.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Current Accounts:</span>
              <span className="text-lg font-bold text-green-700">
                {totalAccounts.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Penetration:</span>
              <span className="text-lg font-bold text-purple-700">
                {overallPenetration.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Area Breakdown */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Area Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.map(stat => {
            const areaColor = 
              stat.area === 'West' ? 'text-blue-600' :
              stat.area === 'Central' ? 'text-green-600' :
              stat.area === 'East' ? 'text-orange-600' :
              'text-purple-600'

            return (
              <div key={stat.area} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-semibold ${areaColor}`}>
                    {stat.area === 'Tucson' ? 'Tucson' : `Phoenix ${stat.area}`}
                  </span>
                  <span className="text-xs text-slate-500">
                    {stat.zipCodes} zip codes
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Market Size:</span>
                    <span className="font-medium">{stat.totalPermittedPools.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Accounts:</span>
                    <span className="font-medium">{stat.currentAccounts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Penetration:</span>
                    <span className="font-semibold text-purple-600">
                      {stat.penetrationRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
