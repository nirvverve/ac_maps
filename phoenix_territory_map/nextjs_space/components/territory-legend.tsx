
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Info } from 'lucide-react'

export default function TerritoryLegend() {
  const areas = [
    {
      name: 'APS of Glendale',
      color: '#3B82F6',
      description: 'Western Phoenix metropolitan area',
      accounts: 483
    },
    {
      name: 'APS of Scottsdale', 
      color: '#10B981',
      description: 'Central Phoenix metropolitan core',
      accounts: 598
    },
    {
      name: 'APS of Chandler',
      color: '#F59E0B', 
      description: 'Eastern Phoenix + San Tan Valley area',
      accounts: 554
    },
    {
      name: 'APS of Tucson',
      color: '#A855F7',
      description: 'Tucson metropolitan area',
      accounts: 64
    }
  ]

  const total = areas.reduce((sum, area) => sum + area.accounts, 0)

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <MapPin className="h-5 w-5" />
          Territory Legend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {areas.map((area) => (
            <div key={area.name} className="flex items-start gap-3">
              <div 
                className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0"
                style={{ backgroundColor: area.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-medium text-slate-900 text-sm">
                    {area.name}
                  </h4>
                  <span className="text-xs font-medium text-slate-600">
                    {((area.accounts / total) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {area.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Click on map markers to view detailed zip code information and account counts.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
