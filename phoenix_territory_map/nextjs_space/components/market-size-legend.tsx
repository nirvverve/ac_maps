
'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'

export default function MarketSizeLegend() {
  const legendItems = [
    { color: '#1a237e', label: '6,000+ pools', range: 'Very High' },
    { color: '#283593', label: '4,000 - 5,999', range: 'High' },
    { color: '#3949ab', label: '3,000 - 3,999', range: 'Medium-High' },
    { color: '#5e35b1', label: '2,000 - 2,999', range: 'Medium' },
    { color: '#7e57c2', label: '1,500 - 1,999', range: 'Medium-Low' },
    { color: '#9575cd', label: '1,000 - 1,499', range: 'Low-Medium' },
    { color: '#b39ddb', label: '500 - 999', range: 'Low' },
    { color: '#d1c4e9', label: '250 - 499', range: 'Very Low' },
    { color: '#e8eaf6', label: '< 250', range: 'Minimal' },
  ]

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Market Size Legend
        </CardTitle>
        <p className="text-xs text-slate-600 mt-1">
          Permitted pools per zip code
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div
              className="w-8 h-6 rounded border border-slate-300 flex-shrink-0"
              style={{ backgroundColor: item.color, opacity: 0.7 }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 leading-tight">
                {item.label}
              </p>
              <p className="text-xs text-slate-500">
                {item.range}
              </p>
            </div>
          </div>
        ))}
        
        <div className="mt-4 pt-3 border-t border-slate-200">
          <Badge variant="outline" className="w-full justify-center text-xs">
            Click any zip code for details
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
