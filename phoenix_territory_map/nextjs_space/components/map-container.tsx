'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LoadingState } from './loading-state'
import { EmptyState } from './empty-state'

const DEFAULT_MAP_STYLE: CSSProperties = {
  width: '100%',
  height: 'clamp(420px, 60vh, 720px)',
}

export interface MapContainerProps {
  children: ReactNode
  isLoading?: boolean
  loadingMessage?: string
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: LucideIcon
  emptyAction?: ReactNode
  className?: string
  contentClassName?: string
  mapClassName?: string
  mapStyle?: CSSProperties
}

export function MapContainer({
  children,
  isLoading,
  loadingMessage,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  className,
  contentClassName,
  mapClassName,
  mapStyle,
}: MapContainerProps) {
  if (isLoading) {
    return <LoadingState message={loadingMessage ?? 'Loading map data...'} />
  }

  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle ?? 'No data available'}
        description={emptyDescription ?? 'Upload data to see this view.'}
        icon={emptyIcon ?? MapPin}
        action={emptyAction}
      />
    )
  }

  return (
    <Card className={cn('bg-white/80 backdrop-blur-sm border-0 shadow-lg', className)}>
      <CardContent className={cn('p-6', contentClassName)}>
        <div
          className={cn('w-full rounded-lg overflow-hidden', mapClassName)}
          style={mapStyle ?? DEFAULT_MAP_STYLE}
        >
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
