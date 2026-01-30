
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BarChart3, TrendingUp } from 'lucide-react'
import { AreaStats } from '@/lib/types'

interface TerritoryStatsProps {
  areaStats: AreaStats
}

export default function TerritoryStats({ areaStats }: TerritoryStatsProps) {
  const totalAccounts = Object.values(areaStats).reduce((sum, area) => sum + (area?.totalAccounts || 0), 0)
  const totalZipCodes = Object.values(areaStats).reduce((sum, area) => sum + (area?.zipCodes || 0), 0)

  const statsData = [
    {
      name: 'APS of Glendale',
      color: '#3B82F6',
      accounts: areaStats?.West?.totalAccounts || 0,
      zipCodes: areaStats?.West?.zipCodes || 0,
    },
    {
      name: 'APS of Scottsdale',
      color: '#10B981', 
      accounts: areaStats?.Central?.totalAccounts || 0,
      zipCodes: areaStats?.Central?.zipCodes || 0,
    },
    {
      name: 'APS of Chandler',
      color: '#F59E0B',
      accounts: areaStats?.East?.totalAccounts || 0,
      zipCodes: areaStats?.East?.zipCodes || 0,
    },
    {
      name: 'APS of Tucson',
      color: '#A855F7',
      accounts: areaStats?.Tucson?.totalAccounts || 0,
      zipCodes: areaStats?.Tucson?.zipCodes || 0,
    }
  ]

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <BarChart3 className="h-5 w-5" />
          Territory Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-6">
          {statsData.map((area) => {
            const accountPercentage = totalAccounts > 0 ? (area.accounts / totalAccounts) * 100 : 0
            const avgAccountsPerZip = area.zipCodes > 0 ? Math.round(area.accounts / area.zipCodes) : 0
            
            return (
              <div key={area.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: area.color }}
                    />
                    <span className="font-medium text-slate-900 text-sm">
                      {area.name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600">
                    {accountPercentage.toFixed(1)}%
                  </span>
                </div>
                
                <Progress 
                  value={accountPercentage} 
                  className="h-2"
                  style={{
                    '--progress-background': area.color
                  } as React.CSSProperties}
                />
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-600">Accounts</p>
                    <p className="font-semibold text-slate-900">
                      {area.accounts.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Zip Codes</p>
                    <p className="font-semibold text-slate-900">
                      {area.zipCodes}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-slate-600">
                    {avgAccountsPerZip} avg accounts per zip
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {totalAccounts.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600">Total Accounts</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {totalZipCodes}
              </p>
              <p className="text-xs text-slate-600">Total Zip Codes</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
