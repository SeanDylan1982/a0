'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { SupportedLanguage, TranslationParams } from '@/lib/services/translation-manager'

interface TranslationContextType {
  language: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void
  translations: Record<string, string>
  translate: (key: string, params?: TranslationParams) => string
  isLoading: boolean
  error: string | null
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

interface TranslationProviderProps {
  children: ReactNode
  defaultLanguage?: SupportedLanguage
}

export function TranslationProvider({ 
  children, 
  defaultLanguage = 'en' 
}: TranslationProviderProps) {
  const [language, setLanguage] = useState<SupportedLanguage>(defaultLanguage)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load translations when language changes
  useEffect(() => {
    loadTranslations(language)
  }, [language])

  // Load translations from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as SupportedLanguage
    if (savedLanguage && ['en', 'af', 'zu'].includes(savedLanguage)) {
      setLanguage(savedLanguage)
    }
  }, [])

  const loadTranslations = async (lang: SupportedLanguage) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/translations?language=${lang}`)
      if (!response.ok) {
        throw new Error('Failed to load translations')
      }

      const data = await response.json()
      setTranslations(data.translations || {})
    } catch (err) {
      console.error('Error loading translations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load translations')
      
      // Fallback to empty translations to prevent app crash
      setTranslations({})
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetLanguage = (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage)
    localStorage.setItem('preferred-language', newLanguage)
  }

  const translate = (key: string, params?: TranslationParams): string => {
    let translation = translations[key] || key

    // Interpolate parameters if provided
    if (params) {
      translation = translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match
      })
    }

    return translation
  }

  const value: TranslationContextType = {
    language,
    setLanguage: handleSetLanguage,
    translations,
    translate,
    isLoading,
    error
  }

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}