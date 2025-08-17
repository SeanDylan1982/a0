import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { TranslationManager, SupportedLanguage } from '../translation-manager'

// Mock Prisma
vi.mock('@prisma/client')

const mockPrisma = {
  translation: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    groupBy: vi.fn()
  }
}

vi.mocked(PrismaClient).mockImplementation(() => mockPrisma as any)

describe('TranslationManager', () => {
  let translationManager: TranslationManager

  beforeEach(() => {
    translationManager = new TranslationManager(mockPrisma as any)
    vi.clearAllMocks()
  })

  afterEach(() => {
    translationManager.clearCache()
  })

  describe('translate', () => {
    it('should return translation from database', async () => {
      const mockTranslation = {
        key: 'common.save',
        language: 'en',
        value: 'Save'
      }

      mockPrisma.translation.findUnique.mockResolvedValue(mockTranslation)

      const result = await translationManager.translate('common.save', 'en')

      expect(result).toBe('Save')
      expect(mockPrisma.translation.findUnique).toHaveBeenCalledWith({
        where: {
          key_language: {
            key: 'common.save',
            language: 'en'
          }
        }
      })
    })

    it('should return key if translation not found', async () => {
      mockPrisma.translation.findUnique.mockResolvedValue(null)

      const result = await translationManager.translate('missing.key', 'en')

      expect(result).toBe('missing.key')
    })

    it('should fallback to English if translation not found in other language', async () => {
      const mockEnglishTranslation = {
        key: 'common.save',
        language: 'en',
        value: 'Save'
      }

      mockPrisma.translation.findUnique
        .mockResolvedValueOnce(null) // First call for 'af' returns null
        .mockResolvedValueOnce(mockEnglishTranslation) // Second call for 'en' returns translation

      const result = await translationManager.translate('common.save', 'af')

      expect(result).toBe('Save')
      expect(mockPrisma.translation.findUnique).toHaveBeenCalledTimes(2)
    })

    it('should interpolate parameters in translation', async () => {
      const mockTranslation = {
        key: 'greeting.hello',
        language: 'en',
        value: 'Hello {{name}}, you have {{count}} messages'
      }

      mockPrisma.translation.findUnique.mockResolvedValue(mockTranslation)

      const result = await translationManager.translate('greeting.hello', 'en', {
        name: 'John',
        count: 5
      })

      expect(result).toBe('Hello John, you have 5 messages')
    })

    it('should use cached translation on second call', async () => {
      const mockTranslation = {
        key: 'common.save',
        language: 'en',
        value: 'Save'
      }

      mockPrisma.translation.findUnique.mockResolvedValue(mockTranslation)

      // First call
      await translationManager.translate('common.save', 'en')
      // Second call
      const result = await translationManager.translate('common.save', 'en')

      expect(result).toBe('Save')
      expect(mockPrisma.translation.findUnique).toHaveBeenCalledTimes(1)
    })
  })

  describe('getTranslations', () => {
    it('should return all translations for a language', async () => {
      const mockTranslations = [
        { key: 'common.save', value: 'Save' },
        { key: 'common.cancel', value: 'Cancel' }
      ]

      mockPrisma.translation.findMany.mockResolvedValue(mockTranslations)

      const result = await translationManager.getTranslations('en')

      expect(result).toEqual({
        'common.save': 'Save',
        'common.cancel': 'Cancel'
      })
      expect(mockPrisma.translation.findMany).toHaveBeenCalledWith({
        where: { language: 'en' },
        select: { key: true, value: true }
      })
    })
  })

  describe('addTranslation', () => {
    it('should add translations for multiple languages', async () => {
      const translations = {
        en: 'Save',
        af: 'Stoor',
        zu: 'Gcina'
      }

      mockPrisma.translation.upsert.mockResolvedValue({})

      await translationManager.addTranslation('common.save', translations, 'common')

      expect(mockPrisma.translation.upsert).toHaveBeenCalledTimes(3)
      expect(mockPrisma.translation.upsert).toHaveBeenCalledWith({
        where: {
          key_language: {
            key: 'common.save',
            language: 'en'
          }
        },
        update: {
          value: 'Save',
          module: 'common',
          updatedAt: expect.any(Date)
        },
        create: {
          key: 'common.save',
          language: 'en',
          value: 'Save',
          module: 'common'
        }
      })
    })
  })

  describe('getTranslationsByModule', () => {
    it('should return translations for specific module', async () => {
      const mockTranslations = [
        { key: 'nav.dashboard', value: 'Dashboard' },
        { key: 'nav.inventory', value: 'Inventory' }
      ]

      mockPrisma.translation.findMany.mockResolvedValue(mockTranslations)

      const result = await translationManager.getTranslationsByModule('navigation', 'en')

      expect(result).toEqual({
        'nav.dashboard': 'Dashboard',
        'nav.inventory': 'Inventory'
      })
      expect(mockPrisma.translation.findMany).toHaveBeenCalledWith({
        where: { 
          module: 'navigation',
          language: 'en' 
        },
        select: { key: true, value: true }
      })
    })
  })

  describe('hasTranslation', () => {
    it('should return true if translation exists', async () => {
      mockPrisma.translation.findUnique.mockResolvedValue({ id: '1' })

      const result = await translationManager.hasTranslation('common.save', 'en')

      expect(result).toBe(true)
    })

    it('should return false if translation does not exist', async () => {
      mockPrisma.translation.findUnique.mockResolvedValue(null)

      const result = await translationManager.hasTranslation('missing.key', 'en')

      expect(result).toBe(false)
    })
  })

  describe('getMissingTranslations', () => {
    it('should return keys missing in target language', async () => {
      const baseKeys = [
        { key: 'common.save' },
        { key: 'common.cancel' },
        { key: 'common.delete' }
      ]

      const targetKeys = [
        { key: 'common.save' },
        { key: 'common.cancel' }
      ]

      mockPrisma.translation.findMany
        .mockResolvedValueOnce(baseKeys)
        .mockResolvedValueOnce(targetKeys)

      const result = await translationManager.getMissingTranslations('en', 'af')

      expect(result).toEqual(['common.delete'])
    })
  })

  describe('cache management', () => {
    it('should clear all cache', () => {
      // Add some cached data
      translationManager['setCachedTranslation']('en', 'test.key', 'Test Value')
      
      translationManager.clearCache()
      
      const cached = translationManager['getCachedTranslation']('en', 'test.key')
      expect(cached).toBeNull()
    })

    it('should clear language-specific cache', () => {
      // Add cached data for multiple languages
      translationManager['setCachedTranslation']('en', 'test.key', 'Test Value')
      translationManager['setCachedTranslation']('af', 'test.key', 'Toets Waarde')
      
      translationManager.clearLanguageCache('en')
      
      const enCached = translationManager['getCachedTranslation']('en', 'test.key')
      const afCached = translationManager['getCachedTranslation']('af', 'test.key')
      
      expect(enCached).toBeNull()
      expect(afCached).toBe('Toets Waarde')
    })

    it('should expire cache after TTL', () => {
      // Mock Date.now to control time
      const originalNow = Date.now
      let currentTime = 1000000

      Date.now = vi.fn(() => currentTime)

      // Add cached translation
      translationManager['setCachedTranslation']('en', 'test.key', 'Test Value')
      
      // Advance time beyond TTL (5 minutes)
      currentTime += 6 * 60 * 1000
      
      const cached = translationManager['getCachedTranslation']('en', 'test.key')
      expect(cached).toBeNull()

      // Restore original Date.now
      Date.now = originalNow
    })
  })

  describe('parameter interpolation', () => {
    it('should handle missing parameters gracefully', () => {
      const result = translationManager['interpolateParams'](
        'Hello {{name}}, you have {{count}} messages',
        { name: 'John' }
      )

      expect(result).toBe('Hello John, you have {{count}} messages')
    })

    it('should handle numeric parameters', () => {
      const result = translationManager['interpolateParams'](
        'You have {{count}} items',
        { count: 42 }
      )

      expect(result).toBe('You have 42 items')
    })

    it('should handle no parameters', () => {
      const result = translationManager['interpolateParams'](
        'Simple message without parameters'
      )

      expect(result).toBe('Simple message without parameters')
    })
  })
})