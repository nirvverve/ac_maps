/**
 * Temporary loading skeleton for map views.
 *
 * This is a minimal implementation until bd-3pu (LoadingState) is completed.
 * All map components are heavy (Google Maps, large datasets) so they need
 * good loading states.
 */

import { Card, CardContent } from '@/components/ui/card'

export function MapViewSkeleton() {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardContent className="p-6">
        {/* Map container skeleton */}
        <div className="w-full h-[600px] bg-gray-100 rounded-lg animate-pulse mb-4">
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 text-sm">Loading map view...</div>
          </div>
        </div>

        {/* Controls skeleton */}
        <div className="flex gap-2 mb-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  )
}