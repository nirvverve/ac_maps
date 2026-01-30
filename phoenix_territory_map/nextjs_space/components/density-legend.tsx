
'use client'

import { Card, CardContent } from '@/components/ui/card'

interface DensityLegendProps {
  mode: 'active' | 'terminated' | 'both' | 'lifetime'
  location?: 'arizona' | 'miami' | 'dallas' | 'orlando' | 'jacksonville' | 'portCharlotte'
  accountType?: 'residential' | 'commercial'
}

export default function DensityLegend({ mode, location = 'arizona', accountType = 'residential' }: DensityLegendProps) {
  // Miami Commercial legends (smaller scales for commercial accounts)
  const miamiCommercialLegends = {
    active: [
      { label: '0-2', color: '#f0fdf4', textColor: '#166534' },
      { label: '3-4', color: '#d1fae5', textColor: '#15803d' },
      { label: '5-6', color: '#a7f3d0', textColor: '#047857' },
      { label: '7-9', color: '#6ee7b7', textColor: '#ffffff' },
      { label: '10-12', color: '#34d399', textColor: '#ffffff' },
      { label: '13-15', color: '#10b981', textColor: '#ffffff' },
      { label: '16-18', color: '#059669', textColor: '#ffffff' },
      { label: '18+', color: '#065f46', textColor: '#ffffff' },
    ],
    terminated: [
      { label: '0-3', color: '#fef2f2', textColor: '#991b1b' },
      { label: '4-6', color: '#fecaca', textColor: '#7f1d1d' },
      { label: '7-9', color: '#fca5a5', textColor: '#7f1d1d' },
      { label: '10-12', color: '#f87171', textColor: '#ffffff' },
      { label: '13-15', color: '#ef4444', textColor: '#ffffff' },
      { label: '16-18', color: '#dc2626', textColor: '#ffffff' },
      { label: '19-21', color: '#b91c1c', textColor: '#ffffff' },
      { label: '21+', color: '#991b1b', textColor: '#ffffff' },
    ],
    both: [
      { label: '0-50%', color: '#f0fdf4', textColor: '#166534' },
      { label: '51-70%', color: '#fef3c7', textColor: '#854d0e' },
      { label: '71-85%', color: '#fbbf24', textColor: '#ffffff' },
      { label: '86-95%', color: '#f97316', textColor: '#ffffff' },
      { label: '95-100%', color: '#991b1b', textColor: '#ffffff' },
    ],
    lifetime: [
      { label: '0-12', color: '#fbbf24', textColor: '#ffffff' },
      { label: '13-24', color: '#a3e635', textColor: '#ffffff' },
      { label: '25-36', color: '#86efac', textColor: '#15803d' },
      { label: '37-60', color: '#22c55e', textColor: '#ffffff' },
      { label: '61-120', color: '#16a34a', textColor: '#ffffff' },
      { label: '120+', color: '#15803d', textColor: '#ffffff' },
    ],
  }

  // Miami Residential legends with 8 categories for better granularity
  const miamiResidentialLegends = {
    active: [
      { label: '0-10', color: '#f0fdf4', textColor: '#166534' },
      { label: '11-20', color: '#d1fae5', textColor: '#15803d' },
      { label: '21-35', color: '#a7f3d0', textColor: '#047857' },
      { label: '36-50', color: '#6ee7b7', textColor: '#ffffff' },
      { label: '51-75', color: '#34d399', textColor: '#ffffff' },
      { label: '76-100', color: '#10b981', textColor: '#ffffff' },
      { label: '101-125', color: '#059669', textColor: '#ffffff' },
      { label: '125+', color: '#065f46', textColor: '#ffffff' },
    ],
    terminated: [
      { label: '0-15', color: '#fef2f2', textColor: '#991b1b' },
      { label: '16-30', color: '#fecaca', textColor: '#7f1d1d' },
      { label: '31-50', color: '#fca5a5', textColor: '#7f1d1d' },
      { label: '51-75', color: '#f87171', textColor: '#ffffff' },
      { label: '76-100', color: '#ef4444', textColor: '#ffffff' },
      { label: '101-150', color: '#dc2626', textColor: '#ffffff' },
      { label: '151-200', color: '#b91c1c', textColor: '#ffffff' },
      { label: '200+', color: '#991b1b', textColor: '#ffffff' },
    ],
    both: [
      { label: '0-50%', color: '#f0fdf4', textColor: '#166534' },
      { label: '51-70%', color: '#fef3c7', textColor: '#854d0e' },
      { label: '71-85%', color: '#fbbf24', textColor: '#ffffff' },
      { label: '86-95%', color: '#f97316', textColor: '#ffffff' },
      { label: '95-100%', color: '#991b1b', textColor: '#ffffff' },
    ],
    lifetime: [
      { label: '0-12', color: '#fbbf24', textColor: '#ffffff' },
      { label: '13-24', color: '#a3e635', textColor: '#ffffff' },
      { label: '25-36', color: '#86efac', textColor: '#15803d' },
      { label: '37-60', color: '#22c55e', textColor: '#ffffff' },
      { label: '61-120', color: '#16a34a', textColor: '#ffffff' },
      { label: '120+', color: '#15803d', textColor: '#ffffff' },
    ],
  }

  // Dallas Commercial legends (very small scale - max 2 active)
  const dallasCommercialLegends = {
    active: [
      { label: '0', color: '#f0fdf4', textColor: '#166534' },
      { label: '1', color: '#6ee7b7', textColor: '#ffffff' },
      { label: '2+', color: '#10b981', textColor: '#ffffff' },
    ],
    terminated: [
      { label: '0-2', color: '#fef2f2', textColor: '#991b1b' },
      { label: '3-4', color: '#fecaca', textColor: '#7f1d1d' },
      { label: '5-6', color: '#fca5a5', textColor: '#7f1d1d' },
      { label: '7-8', color: '#f87171', textColor: '#ffffff' },
      { label: '8+', color: '#ef4444', textColor: '#ffffff' },
    ],
    both: [
      { label: '0-50%', color: '#f0fdf4', textColor: '#166534' },
      { label: '51-70%', color: '#fef3c7', textColor: '#854d0e' },
      { label: '71-85%', color: '#fbbf24', textColor: '#ffffff' },
      { label: '86-95%', color: '#f97316', textColor: '#ffffff' },
      { label: '95-100%', color: '#991b1b', textColor: '#ffffff' },
    ],
    lifetime: [
      { label: '0-12', color: '#fbbf24', textColor: '#ffffff' },
      { label: '13-24', color: '#a3e635', textColor: '#ffffff' },
      { label: '25-36', color: '#86efac', textColor: '#15803d' },
      { label: '37-60', color: '#22c55e', textColor: '#ffffff' },
      { label: '61-120', color: '#16a34a', textColor: '#ffffff' },
      { label: '120+', color: '#15803d', textColor: '#ffffff' },
    ],
  }

  // Dallas Residential legends (8 categories for moderate volumes)
  const dallasResidentialLegends = {
    active: [
      { label: '0-5', color: '#f0fdf4', textColor: '#166534' },
      { label: '6-10', color: '#d1fae5', textColor: '#15803d' },
      { label: '11-20', color: '#a7f3d0', textColor: '#047857' },
      { label: '21-30', color: '#6ee7b7', textColor: '#ffffff' },
      { label: '31-40', color: '#34d399', textColor: '#ffffff' },
      { label: '41-50', color: '#10b981', textColor: '#ffffff' },
      { label: '50+', color: '#059669', textColor: '#ffffff' },
    ],
    terminated: [
      { label: '0-20', color: '#fef2f2', textColor: '#991b1b' },
      { label: '21-40', color: '#fecaca', textColor: '#7f1d1d' },
      { label: '41-60', color: '#fca5a5', textColor: '#7f1d1d' },
      { label: '61-80', color: '#f87171', textColor: '#ffffff' },
      { label: '81-100', color: '#ef4444', textColor: '#ffffff' },
      { label: '101-150', color: '#dc2626', textColor: '#ffffff' },
      { label: '150+', color: '#b91c1c', textColor: '#ffffff' },
    ],
    both: [
      { label: '0-50%', color: '#f0fdf4', textColor: '#166534' },
      { label: '51-70%', color: '#fef3c7', textColor: '#854d0e' },
      { label: '71-85%', color: '#fbbf24', textColor: '#ffffff' },
      { label: '86-95%', color: '#f97316', textColor: '#ffffff' },
      { label: '95-100%', color: '#991b1b', textColor: '#ffffff' },
    ],
    lifetime: [
      { label: '0-12', color: '#fbbf24', textColor: '#ffffff' },
      { label: '13-24', color: '#a3e635', textColor: '#ffffff' },
      { label: '25-36', color: '#86efac', textColor: '#15803d' },
      { label: '37-60', color: '#22c55e', textColor: '#ffffff' },
      { label: '61-120', color: '#16a34a', textColor: '#ffffff' },
      { label: '120+', color: '#15803d', textColor: '#ffffff' },
    ],
  }

  // Orlando Commercial legends (max 9 accounts) - granular
  const orlandoCommercialLegends = {
    active: [
      { label: '0-2', color: '#f0fdf4', textColor: '#166534' },
      { label: '3-4', color: '#d1fae5', textColor: '#15803d' },
      { label: '5-6', color: '#6ee7b7', textColor: '#ffffff' },
      { label: '7-9', color: '#34d399', textColor: '#ffffff' },
      { label: '9+', color: '#10b981', textColor: '#ffffff' },
    ],
    terminated: [
      { label: '0-5', color: '#fef2f2', textColor: '#991b1b' },
      { label: '6-10', color: '#fecaca', textColor: '#7f1d1d' },
      { label: '11-15', color: '#fca5a5', textColor: '#7f1d1d' },
      { label: '16-20', color: '#f87171', textColor: '#ffffff' },
      { label: '21-30', color: '#ef4444', textColor: '#ffffff' },
      { label: '30+', color: '#dc2626', textColor: '#ffffff' },
    ],
    both: [
      { label: '0-50%', color: '#f0fdf4', textColor: '#166534' },
      { label: '51-70%', color: '#fef3c7', textColor: '#854d0e' },
      { label: '71-85%', color: '#fbbf24', textColor: '#ffffff' },
      { label: '86-95%', color: '#f97316', textColor: '#ffffff' },
      { label: '95-100%', color: '#991b1b', textColor: '#ffffff' },
    ],
    lifetime: [
      { label: '0-12', color: '#fbbf24', textColor: '#ffffff' },
      { label: '13-24', color: '#a3e635', textColor: '#ffffff' },
      { label: '25-36', color: '#86efac', textColor: '#15803d' },
      { label: '37-60', color: '#22c55e', textColor: '#ffffff' },
      { label: '61-120', color: '#16a34a', textColor: '#ffffff' },
      { label: '120+', color: '#15803d', textColor: '#ffffff' },
    ],
  }

  // Orlando Residential legends (8 categories for max 93 accounts)
  const orlandoResidentialLegends = {
    active: [
      { label: '0-10', color: '#f0fdf4', textColor: '#166534' },
      { label: '11-20', color: '#d1fae5', textColor: '#15803d' },
      { label: '21-35', color: '#a7f3d0', textColor: '#047857' },
      { label: '36-50', color: '#6ee7b7', textColor: '#ffffff' },
      { label: '51-70', color: '#34d399', textColor: '#ffffff' },
      { label: '71-90', color: '#10b981', textColor: '#ffffff' },
      { label: '90+', color: '#059669', textColor: '#ffffff' },
    ],
    terminated: [
      { label: '0-10', color: '#fef2f2', textColor: '#991b1b' },
      { label: '11-20', color: '#fecaca', textColor: '#7f1d1d' },
      { label: '21-30', color: '#fca5a5', textColor: '#7f1d1d' },
      { label: '31-50', color: '#f87171', textColor: '#ffffff' },
      { label: '51-75', color: '#ef4444', textColor: '#ffffff' },
      { label: '76-100', color: '#dc2626', textColor: '#ffffff' },
      { label: '100+', color: '#b91c1c', textColor: '#ffffff' },
    ],
    both: [
      { label: '0-50%', color: '#f0fdf4', textColor: '#166534' },
      { label: '51-70%', color: '#fef3c7', textColor: '#854d0e' },
      { label: '71-85%', color: '#fbbf24', textColor: '#ffffff' },
      { label: '86-95%', color: '#f97316', textColor: '#ffffff' },
      { label: '95-100%', color: '#991b1b', textColor: '#ffffff' },
    ],
    lifetime: [
      { label: '0-12', color: '#fbbf24', textColor: '#ffffff' },
      { label: '13-24', color: '#a3e635', textColor: '#ffffff' },
      { label: '25-36', color: '#86efac', textColor: '#15803d' },
      { label: '37-60', color: '#22c55e', textColor: '#ffffff' },
      { label: '61-120', color: '#16a34a', textColor: '#ffffff' },
      { label: '120+', color: '#15803d', textColor: '#ffffff' },
    ],
  }

  // Jacksonville Commercial legends (max 2 accounts, NO terminated)
  const jacksonvilleCommercialLegends = {
    active: [
      { label: '0', color: '#f0fdf4', textColor: '#166534' },
      { label: '1', color: '#6ee7b7', textColor: '#ffffff' },
      { label: '2+', color: '#10b981', textColor: '#ffffff' },
    ],
    terminated: [
      { label: '0 (No Losses)', color: '#fef2f2', textColor: '#991b1b' },
    ],
    both: [
      { label: '0-50%', color: '#f0fdf4', textColor: '#166534' },
      { label: '51-70%', color: '#fef3c7', textColor: '#854d0e' },
      { label: '71-85%', color: '#fbbf24', textColor: '#ffffff' },
      { label: '86-95%', color: '#f97316', textColor: '#ffffff' },
      { label: '95-100%', color: '#991b1b', textColor: '#ffffff' },
    ],
    lifetime: [
      { label: '0-12', color: '#fbbf24', textColor: '#ffffff' },
      { label: '13-24', color: '#a3e635', textColor: '#ffffff' },
      { label: '25-36', color: '#86efac', textColor: '#15803d' },
      { label: '37-60', color: '#22c55e', textColor: '#ffffff' },
      { label: '61-120', color: '#16a34a', textColor: '#ffffff' },
      { label: '120+', color: '#15803d', textColor: '#ffffff' },
    ],
  }

  // Jacksonville Residential legends (max 130 accounts)
  const jacksonvilleResidentialLegends = {
    active: [
      { label: '0-10', color: '#f0fdf4', textColor: '#166534' },
      { label: '11-25', color: '#d1fae5', textColor: '#15803d' },
      { label: '26-40', color: '#a7f3d0', textColor: '#047857' },
      { label: '41-60', color: '#6ee7b7', textColor: '#ffffff' },
      { label: '61-80', color: '#34d399', textColor: '#ffffff' },
      { label: '81-110', color: '#10b981', textColor: '#ffffff' },
      { label: '110+', color: '#059669', textColor: '#ffffff' },
    ],
    terminated: [
      { label: '0-5', color: '#fef2f2', textColor: '#991b1b' },
      { label: '6-10', color: '#fecaca', textColor: '#7f1d1d' },
      { label: '11-20', color: '#fca5a5', textColor: '#7f1d1d' },
      { label: '21-30', color: '#f87171', textColor: '#ffffff' },
      { label: '31-50', color: '#ef4444', textColor: '#ffffff' },
      { label: '50+', color: '#dc2626', textColor: '#ffffff' },
    ],
    both: [
      { label: '0-50%', color: '#f0fdf4', textColor: '#166534' },
      { label: '51-70%', color: '#fef3c7', textColor: '#854d0e' },
      { label: '71-85%', color: '#fbbf24', textColor: '#ffffff' },
      { label: '86-95%', color: '#f97316', textColor: '#ffffff' },
      { label: '95-100%', color: '#991b1b', textColor: '#ffffff' },
    ],
    lifetime: [
      { label: '0-12', color: '#fbbf24', textColor: '#ffffff' },
      { label: '13-24', color: '#a3e635', textColor: '#ffffff' },
      { label: '25-36', color: '#86efac', textColor: '#15803d' },
      { label: '37-60', color: '#22c55e', textColor: '#ffffff' },
      { label: '61-120', color: '#16a34a', textColor: '#ffffff' },
      { label: '120+', color: '#15803d', textColor: '#ffffff' },
    ],
  }

  // Arizona legends (original)
  const arizonaLegends = {
    active: [
      { label: '0-5', color: '#f0fdf4', textColor: '#166534' },
      { label: '6-15', color: '#86efac', textColor: '#15803d' },
      { label: '16-30', color: '#22c55e', textColor: '#ffffff' },
      { label: '31-50', color: '#16a34a', textColor: '#ffffff' },
      { label: '50+', color: '#15803d', textColor: '#ffffff' },
    ],
    terminated: [
      { label: '0-20', color: '#fef2f2', textColor: '#991b1b' },
      { label: '21-50', color: '#fca5a5', textColor: '#7f1d1d' },
      { label: '51-100', color: '#f87171', textColor: '#ffffff' },
      { label: '101-200', color: '#dc2626', textColor: '#ffffff' },
      { label: '200+', color: '#991b1b', textColor: '#ffffff' },
    ],
    both: [
      { label: '0-50%', color: '#f0fdf4', textColor: '#166534' },
      { label: '51-70%', color: '#fef3c7', textColor: '#854d0e' },
      { label: '71-85%', color: '#fbbf24', textColor: '#ffffff' },
      { label: '86-95%', color: '#f97316', textColor: '#ffffff' },
      { label: '95-100%', color: '#991b1b', textColor: '#ffffff' },
    ],
    lifetime: [
      { label: '0-12', color: '#fbbf24', textColor: '#ffffff' },
      { label: '13-24', color: '#a3e635', textColor: '#ffffff' },
      { label: '25-36', color: '#86efac', textColor: '#15803d' },
      { label: '37-60', color: '#22c55e', textColor: '#ffffff' },
      { label: '61-120', color: '#16a34a', textColor: '#ffffff' },
      { label: '120+', color: '#15803d', textColor: '#ffffff' },
    ],
  }

  const titles = {
    active: 'Active Accounts Density',
    terminated: 'Terminated Accounts Density',
    both: 'Churn Rate',
    lifetime: 'Average Customer Lifetime',
  }

  // Select appropriate legend set based on location and account type
  let legends = arizonaLegends
  if (location === 'miami') {
    legends = accountType === 'commercial' ? miamiCommercialLegends : miamiResidentialLegends
  } else if (location === 'dallas') {
    legends = accountType === 'commercial' ? dallasCommercialLegends : dallasResidentialLegends
  } else if (location === 'orlando') {
    legends = accountType === 'commercial' ? orlandoCommercialLegends : orlandoResidentialLegends
  } else if (location === 'jacksonville') {
    legends = accountType === 'commercial' ? jacksonvilleCommercialLegends : jacksonvilleResidentialLegends
  }
  
  // For 'both' and 'lifetime' modes, use Arizona legends (shared between locations)
  const currentLegend = (mode === 'both' || mode === 'lifetime') 
    ? arizonaLegends[mode] 
    : legends[mode]
  
  const title = titles[mode]

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardContent className="p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="space-y-2">
          {currentLegend.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-12 h-8 rounded border border-slate-200 flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: item.color,
                  color: item.textColor,
                }}
              >
                {item.label}
              </div>
              <span className="text-sm text-slate-600">
                {mode === 'active' && 'Active accounts'}
                {mode === 'terminated' && 'Terminated accounts'}
                {mode === 'both' && 'Churn rate'}
                {mode === 'lifetime' && 'Months'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
