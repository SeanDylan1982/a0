'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  count: number
  className?: string
  maxCount?: number
  showZero?: boolean
}

export function NotificationBadge({ 
  count, 
  className, 
  maxCount = 99, 
  showZero = false 
}: NotificationBadgeProps) {
  if (count === 0 && !showZero) {
    return null
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()

  return (
    <span 
      className={cn(
        "absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium",
        "min-w-[16px] px-1",
        count > 9 && "h-5 w-auto min-w-[20px] px-1.5",
        className
      )}
      aria-label={`${count} unread notifications`}
      role="status"
    >
      {displayCount}
    </span>
  )
}