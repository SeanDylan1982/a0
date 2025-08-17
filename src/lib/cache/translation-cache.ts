import { CacheManager } from './cache-manager'

export interface CachedTranslations {
  language: string
  translations: Record<string, string>
  version: string
  cachedAt: number
}

export class TranslationCache {
  private static readonly CACHE_PREFIX = 'translations'
  private static readonly TTL = 7200 // 2 hours
  private static readonly SUPPORTED_LANGUAGES = ['en', 'af', 'zu']

  static async getTranslations(language: string): Promise<Record<string, string> | null> {
    const cached = await CacheManager.get<CachedTranslations>(
      `lang:${language}`,
      { prefix: this.CACHE_PREFIX, ttl: this.TTL }
    )
    return cached?.translations || null
  }

  static async setTranslations(
    language: string, 
    translations: Record<string, string>,
    version: string = '1.0'
  ): Promise<void> {
    const cachedData: CachedTranslations = {
      language,
      translations,
      version,
      cachedAt: Date.now()
    }

    await CacheManager.set(
      `lang:${language}`,
      cachedData,
      { prefix: this.CACHE_PREFIX, ttl: this.TTL }
    )
  }

  static async getTranslation(language: string, key: string): Promise<string | null> {
    const translations = await this.getTranslations(language)
    return translations?.[key] || null
  }

  static async setTranslation(language: string, key: string, value: string): Promise<void> {
    const translations = await this.getTranslations(language) || {}
    translations[key] = value
    await this.setTranslations(language, translations)
  }

  static async invalidateLanguage(language: string): Promise<void> {
    await CacheManager.del(`lang:${language}`, { prefix: this.CACHE_PREFIX })
  }

  static async invalidateAllTranslations(): Promise<void> {
    await CacheManager.invalidatePattern('lang:*', { prefix: this.CACHE_PREFIX })
  }

  static async warmupTranslations(): Promise<void> {
    // This would be called during application startup
    console.log('Warming up translation cache for languages:', this.SUPPORTED_LANGUAGES)
    
    // In a real implementation, this would:
    // 1. Fetch all translations from database
    // 2. Cache them for each supported language
    // 3. Set up cache invalidation triggers
  }

  static async getTranslationVersion(language: string): Promise<string | null> {
    const cached = await CacheManager.get<CachedTranslations>(
      `lang:${language}`,
      { prefix: this.CACHE_PREFIX }
    )
    return cached?.version || null
  }

  static async bulkSetTranslations(
    translationsByLanguage: Record<string, Record<string, string>>,
    version: string = '1.0'
  ): Promise<void> {
    const promises = Object.entries(translationsByLanguage).map(([language, translations]) =>
      this.setTranslations(language, translations, version)
    )
    await Promise.all(promises)
  }
}