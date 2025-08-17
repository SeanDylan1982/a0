'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LanguageSelector } from '@/components/language-selector'
import { useTranslations } from '@/hooks/useTranslations'

export function TranslationDemo() {
  const { t, language, isLoading, error } = useTranslations()

  if (isLoading) {
    return <div className="p-4">Loading translations...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Translation System Demo</CardTitle>
          <CardDescription>
            Current language: {language}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span>Language:</span>
            <LanguageSelector showLabel />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Common Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm">
                  {t('common.save')}
                </Button>
                <Button variant="outline" size="sm">
                  {t('common.cancel')}
                </Button>
                <Button variant="outline" size="sm">
                  {t('common.delete')}
                </Button>
                <Button variant="outline" size="sm">
                  {t('common.edit')}
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Navigation</h3>
              <div className="space-y-2">
                <div className="text-sm">{t('nav.dashboard')}</div>
                <div className="text-sm">{t('nav.inventory')}</div>
                <div className="text-sm">{t('nav.sales')}</div>
                <div className="text-sm">{t('nav.customers')}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Parameter Interpolation</h3>
            <div className="text-sm">
              {t('activity.user_action', { 
                user: 'John Doe', 
                action: 'created', 
                entity: 'new product' 
              })}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Status Messages</h3>
            <div className="space-y-1 text-sm">
              <div className="text-green-600">{t('success.saved_successfully')}</div>
              <div className="text-red-600">{t('errors.something_went_wrong')}</div>
              <div className="text-yellow-600">{t('common.loading')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}