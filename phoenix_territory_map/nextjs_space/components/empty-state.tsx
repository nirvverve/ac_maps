'use client'

import type { ElementType, ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ElementType
  iconClassName?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon: Icon, iconClassName, action, className }: EmptyStateProps) {
  return (
    <Card className={cn('max-w-md mx-auto', className)}>
      <CardContent className="p-6 text-center">
        {Icon ? <Icon className={cn('h-12 w-12 text-slate-500 mx-auto mb-4', iconClassName)} /> : null}
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        {description ? <p className="text-slate-600 mb-4">{description}</p> : null}
        {action}
      </CardContent>
    </Card>
  )
}
