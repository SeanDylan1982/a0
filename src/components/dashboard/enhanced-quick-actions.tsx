'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/language-context'
import { Zap, Plus } from 'lucide-react'

export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  href: string
  permission: string
  color: string
}

interface EnhancedQuickActionsProps {
  actions: QuickAction[]
  isLoading?: boolean
}

export function EnhancedQuickActions({ actions, isLoading }: EnhancedQuickActionsProps) {
  const router = useRouter()
  const { t } = useLanguage()

  const handleActionClick = (action: QuickAction) => {
    router.push(action.href)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span>Quick Actions</span>
          </CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span>Quick Actions</span>
          </div>
          {actions.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {actions.length} available
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Streamlined access to common tasks based on your permissions</CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-600 text-sm">No quick actions available</p>
            <p className="text-gray-500 text-xs mt-1">Actions will appear based on your role and permissions</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className={`h-auto p-4 flex flex-col items-center space-y-2 ${action.color} transition-all duration-200 hover:scale-105 hover:shadow-md`}
                onClick={() => handleActionClick(action)}
              >
                <div className="text-2xl mb-1">{action.icon}</div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {action.description}
                  </div>
                </div>
                <div className="flex items-center justify-center w-full mt-2">
                  <Plus className="h-3 w-3 mr-1" />
                  <span className="text-xs">Create</span>
                </div>
              </Button>
            ))}
          </div>
        )}
        
        {actions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Actions based on your role permissions</span>
              <span>{actions.length} of {actions.length} available</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}