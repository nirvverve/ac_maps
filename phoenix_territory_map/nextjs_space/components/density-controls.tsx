
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, Building2, Home } from 'lucide-react'

interface DensityControlsProps {
  densityMode: 'active' | 'terminated' | 'both' | 'lifetime'
  onDensityModeChange: (mode: 'active' | 'terminated' | 'both' | 'lifetime') => void
  showLifetime?: boolean
  accountType?: 'residential' | 'commercial'
  onAccountTypeChange?: (type: 'residential' | 'commercial') => void
  showAccountTypeToggle?: boolean
}

// Updated: December 1, 2025 - Added residential/commercial toggle
export default function DensityControls({ 
  densityMode, 
  onDensityModeChange, 
  showLifetime = false,
  accountType = 'residential',
  onAccountTypeChange,
  showAccountTypeToggle = false
}: DensityControlsProps) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Account Type Toggle (Miami only) */}
          {showAccountTypeToggle && onAccountTypeChange && (
            <div className="pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Account Type</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={accountType === 'residential' ? 'default' : 'outline'}
                  className={`flex-1 ${
                    accountType === 'residential' 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                      : 'hover:bg-blue-50'
                  }`}
                  onClick={() => onAccountTypeChange('residential')}
                >
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span>Residential</span>
                  </div>
                </Button>
                <Button
                  variant={accountType === 'commercial' ? 'default' : 'outline'}
                  className={`flex-1 ${
                    accountType === 'commercial' 
                      ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                      : 'hover:bg-purple-50'
                  }`}
                  onClick={() => onAccountTypeChange('commercial')}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Commercial</span>
                  </div>
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Density View Mode</span>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button
              variant={densityMode === 'active' ? 'default' : 'outline'}
              className={`px-6 py-2 ${
                densityMode === 'active' 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'hover:bg-green-50'
              }`}
              onClick={() => onDensityModeChange('active')}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span>Active Accounts</span>
              </div>
            </Button>
            
            <Button
              variant={densityMode === 'terminated' ? 'default' : 'outline'}
              className={`px-6 py-2 ${
                densityMode === 'terminated' 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'hover:bg-red-50'
              }`}
              onClick={() => onDensityModeChange('terminated')}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">❌</span>
                <span>Terminated Accounts</span>
              </div>
            </Button>
            
            <Button
              variant={densityMode === 'both' ? 'default' : 'outline'}
              className={`px-6 py-2 ${
                densityMode === 'both' 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                  : 'hover:bg-orange-50'
              }`}
              onClick={() => onDensityModeChange('both')}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <span>Churn Rate</span>
              </div>
            </Button>
            
            {showLifetime && (
              <Button
                variant={densityMode === 'lifetime' ? 'default' : 'outline'}
                className={`px-6 py-2 ${
                  densityMode === 'lifetime' 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'hover:bg-blue-50'
                }`}
                onClick={() => onDensityModeChange('lifetime')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏱️</span>
                  <span>Customer Lifetime</span>
                </div>
              </Button>
            )}
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              {densityMode === 'active' && '🟢 Darker green = more active accounts'}
              {densityMode === 'terminated' && '🔴 Darker red = more terminated accounts'}
              {densityMode === 'both' && '📈 Green (low churn) → Red (high churn)'}
              {densityMode === 'lifetime' && '🟢 Darker green = longer customer lifetime (months)'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
