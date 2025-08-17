'use client'

import { useCallback, useEffect, useState } from 'react'
import { SupportedLanguage, TranslationParams } from '@/lib/services/translation-manager'
import { useTranslation } from '@/contexts/translation-context'

export interface UseTranslationsReturn {
  t: (key: string, params?: TranslationParams) => string
  language: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void
  isLoading: boolean
  error: string | null
  translations: Record<string, string>
}

/**
 * Hook for accessing translations with context
 */
export function useTranslations(): UseTranslationsReturn {
  const { 
    language, 
    setLanguage, 
    translate, 
    isLoading, 
    error, 
    translations 
  } = useTranslation()

  const t = useCallback((key: string, params?: TranslationParams) => {
    return translate(key, params)
  }, [translate])

  return {
    t,
    language,
    setLanguage,
    isLoading,
    error,
    translations
  }
}

/**
 * Hook for loading module-specific translations
 */
export function useModuleTranslations(module: string) {
  const { language } = useTranslation()
  const [moduleTranslations, setModuleTranslations] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadModuleTranslations()
  }, [language, module])

  const loadModuleTranslations = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/translations?language=${language}&module=${module}`)
      if (!response.ok) {
        throw new Error('Failed to load module translations')
      }

      const data = await response.json()
      setModuleTranslations(data.translations || {})
    } catch (err) {
      console.error('Error loading module translations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load module translations')
      setModuleTranslations({})
    } finally {
      setIsLoading(false)
    }
  }

  const t = useCallback((key: string, params?: TranslationParams) => {
    let translation = moduleTranslations[key] || key

    if (params) {
      translation = translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match
      })
    }

    return translation
  }, [moduleTranslations])

  return {
    t,
    translations: moduleTranslations,
    isLoading,
    error,
    reload: loadModuleTranslations
  }
}

/**
 * Hook for managing translations (admin functionality)
 */
export function useTranslationManager() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addTranslation = async (
    key: string,
    translations: Record<SupportedLanguage, string>,
    module?: string
  ) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key,
          translations,
          module
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add translation')
      }

      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add translation'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getMissingTranslations = async (
    baseLanguage: SupportedLanguage = 'en',
    targetLanguage: SupportedLanguage
  ) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(
        `/api/translations/missing?base=${baseLanguage}&target=${targetLanguage}`
      )

      if (!response.ok) {
        throw new Error('Failed to get missing translations')
      }

      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get missing translations'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const translateKey = async (
    key: string,
    language: SupportedLanguage,
    params?: TranslationParams
  ) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/translations/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          language,
          params
        })
      })

      if (!response.ok) {
        throw new Error('Failed to translate key')
      }

      const data = await response.json()
      return data.translation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to translate key'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    addTranslation,
    getMissingTranslations,
    translateKey,
    isLoading,
    error
  }
}