import { PrismaClient } from '@prisma/client'

// Allow injection for testing
let prisma: PrismaClient

// Initialize prisma client
if (process.env.NODE_ENV === 'test') {
  // In test environment, prisma will be injected
  prisma = {} as PrismaClient
} else {
  prisma = new PrismaClient()
}

export interface Translation {
  id: string
  key: string
  language: string
  value: string
  module?: string
  createdAt: Date
  updatedAt: Date
}

export interface TranslationParams {
  [key: string]: string | number
}

export type SupportedLanguage = 'en' | 'af' | 'zu'

export class TranslationManager {
  private cache: Map<string, Map<string, string>> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma
  }

  /**
   * Get translation for a specific key and language
   */
  async translate(
    key: string, 
    language: SupportedLanguage, 
    params?: TranslationParams
  ): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `${language}:${key}`
      const cached = this.getCachedTranslation(language, key)
      
      if (cached) {
        return this.interpolateParams(cached, params)
      }

      // Fetch from database
      const translation = await this.prisma.translation.findUnique({
        where: {
          key_language: {
            key,
            language
          }
        }
      })

      if (translation) {
        this.setCachedTranslation(language, key, translation.value)
        return this.interpolateParams(translation.value, params)
      }

      // Fallback to English if not found
      if (language !== 'en') {
        const fallback = await this.translate(key, 'en', params)
        if (fallback !== key) {
          return fallback
        }
      }

      // Return key if no translation found
      console.warn(`Translation missing for key: ${key} (${language})`)
      return key
    } catch (error) {
      console.error('Translation error:', error)
      return key
    }
  }

  /**
   * Get all translations for a specific language
   */
  async getTranslations(language: SupportedLanguage): Promise<Record<string, string>> {
    try {
      const translations = await this.prisma.translation.findMany({
        where: { language },
        select: { key: true, value: true }
      })

      const result: Record<string, string> = {}
      translations.forEach(t => {
        result[t.key] = t.value
        this.setCachedTranslation(language, t.key, t.value)
      })

      return result
    } catch (error) {
      console.error('Error fetching translations:', error)
      return {}
    }
  }

  /**
   * Add or update a translation
   */
  async addTranslation(
    key: string, 
    translations: Record<SupportedLanguage, string>,
    module?: string
  ): Promise<void> {
    try {
      const operations = Object.entries(translations).map(([language, value]) => 
        this.prisma.translation.upsert({
          where: {
            key_language: {
              key,
              language: language as SupportedLanguage
            }
          },
          update: {
            value,
            module,
            updatedAt: new Date()
          },
          create: {
            key,
            language: language as SupportedLanguage,
            value,
            module
          }
        })
      )

      await Promise.all(operations)

      // Clear cache for updated translations
      Object.keys(translations).forEach(language => {
        this.clearCachedTranslation(language as SupportedLanguage, key)
      })
    } catch (error) {
      console.error('Error adding translation:', error)
      throw error
    }
  }

  /**
   * Get translations by module
   */
  async getTranslationsByModule(
    module: string, 
    language: SupportedLanguage
  ): Promise<Record<string, string>> {
    try {
      const translations = await this.prisma.translation.findMany({
        where: { 
          module,
          language 
        },
        select: { key: true, value: true }
      })

      const result: Record<string, string> = {}
      translations.forEach(t => {
        result[t.key] = t.value
      })

      return result
    } catch (error) {
      console.error('Error fetching module translations:', error)
      return {}
    }
  }

  /**
   * Check if translation exists
   */
  async hasTranslation(key: string, language: SupportedLanguage): Promise<boolean> {
    try {
      const translation = await this.prisma.translation.findUnique({
        where: {
          key_language: {
            key,
            language
          }
        }
      })
      return !!translation
    } catch (error) {
      console.error('Error checking translation:', error)
      return false
    }
  }

  /**
   * Get missing translations for a language
   */
  async getMissingTranslations(
    baseLanguage: SupportedLanguage = 'en',
    targetLanguage: SupportedLanguage
  ): Promise<string[]> {
    try {
      const baseKeys = await this.prisma.translation.findMany({
        where: { language: baseLanguage },
        select: { key: true }
      })

      const targetKeys = await this.prisma.translation.findMany({
        where: { language: targetLanguage },
        select: { key: true }
      })

      const baseKeySet = new Set(baseKeys.map(t => t.key))
      const targetKeySet = new Set(targetKeys.map(t => t.key))

      return Array.from(baseKeySet).filter(key => !targetKeySet.has(key))
    } catch (error) {
      console.error('Error finding missing translations:', error)
      return []
    }
  }

  /**
   * Clear all cached translations
   */
  clearCache(): void {
    this.cache.clear()
    this.cacheExpiry.clear()
  }

  /**
   * Clear cache for specific language
   */
  clearLanguageCache(language: SupportedLanguage): void {
    this.cache.delete(language)
    this.cacheExpiry.delete(language)
  }

  // Private helper methods
  private getCachedTranslation(language: string, key: string): string | null {
    const languageCache = this.cache.get(language)
    if (!languageCache) return null

    const expiry = this.cacheExpiry.get(language)
    if (expiry && Date.now() > expiry) {
      this.cache.delete(language)
      this.cacheExpiry.delete(language)
      return null
    }

    return languageCache.get(key) || null
  }

  private setCachedTranslation(language: string, key: string, value: string): void {
    if (!this.cache.has(language)) {
      this.cache.set(language, new Map())
      this.cacheExpiry.set(language, Date.now() + this.CACHE_TTL)
    }
    
    this.cache.get(language)!.set(key, value)
  }

  private clearCachedTranslation(language: SupportedLanguage, key: string): void {
    const languageCache = this.cache.get(language)
    if (languageCache) {
      languageCache.delete(key)
    }
  }

  private interpolateParams(text: string, params?: TranslationParams): string {
    if (!params) return text

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key]?.toString() || match
    })
  }
}

// Export singleton instance
export const translationManager = new TranslationManager()