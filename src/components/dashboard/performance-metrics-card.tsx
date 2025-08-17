'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

export interface PerformanceMetric {
  id: string
  name: string
  value: number
  unit: string
  change: number
  changeType: 'positive' | 'negative'
  target?: number
  description: string
}

interface PerformanceMetricsCardProps {
  metrics: PerformanceMetric[]
  isLoading?: boolean
}

export function PerformanceMetricsCard({ metrics, isLoading }: PerformanceMetricsCardProps) {
  const { t } = useLanguage()

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') {
      return `${value.toFixed(1)}%`
    }
    if (unit === 'orders' || unit === 'items') {
      return value.toLocaleString()
    }
    if (unit === 'R') {
      return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return `${value.toLocaleString()} ${unit}`
  }

  const getProgressPercentage = (value: number, target?: number) => {
    if (!target) return 0
    return Math.min((value / target) * 100, 100)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500'
    if (percentage >= 70) return 'bg-yellow-500'
    if (percentage >= 50) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <span>Performance Metrics</span>
          </CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
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
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          <span>Performance Metrics</span>
        </CardTitle>
        <CardDescription>Real-time key performance indicators</CardDescription>
      </CardHeader>
      <CardContent>
        {metrics.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-600 text-sm">No performance metrics available</p>
            <p className="text-gray-500 text-xs mt-1">Metrics will appear based on your role and permissions</p>
          </div>
        ) : (
          <div className="space-y-6">
            {metrics.map((metric) => {
              const progressPercentage = getProgressPercentage(metric.value, metric.target)
              const progressColor = getProgressColor(progressPercentage)
              
              return (
                <div key={metric.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{metric.name}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-lg">
                            {formatValue(metric.value, metric.unit)}
                          </span>
                          <Badge
                            variant={metric.changeType === 'positive' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {metric.changeType === 'positive' ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      
                      {metric.target && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>Progress to target</span>
                            <div className="flex items-center space-x-1">
                              <Target className="h-3 w-3" />
                              <span>{formatValue(metric.target, metric.unit)}</span>
                            </div>
                          </div>
                          <div className="relative">
                            <Progress 
                              value={progressPercentage} 
                              className="h-2"
                            />
                            <div 
                              className={`absolute top-0 left-0 h-2 rounded-full transition-all ${progressColor}`}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500">
                            {progressPercentage.toFixed(1)}% of target achieved
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-600 mt-2">{metric.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}