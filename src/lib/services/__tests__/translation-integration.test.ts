import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { TranslationManager } from '../translation-manager'

// Use a test database for integration tests
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
})

describe('Translation Integration Tests', () => {
  let translationManager: TranslationManager

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.translation.deleteMany({
      where: {
        key: {
          startsWith: 'test.'
        }
      }
    })
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.translation.deleteMany({
      where: {
        key: {
          startsWith: 'test.'
        }
      }
    })
    await prisma.$disconnect()
  })

  beforeEach(() => {
    translationManager = new TranslationManager()
    translationManager.clearCache()
  })

  it('should perform complete translation workflow', async () => {
    const testKey = 'test.integration.message'
    const translations = {
      en: 'Hello {{name}}, welcome to the system!',
      af: 'Hallo {{name}}, welkom by die stelsel!',
      zu: 'Sawubona {{name}}, wamukelekile ohlelweni!'
    }

    // 1. Add translations
    await translationManager.addTranslation(testKey, translations, 'test')

    // 2. Verify translations exist
    for (const [language, expectedValue] of Object.entries(translations)) {
      const hasTranslation = await translationManager.hasTranslation(
        testKey, 
        language as 'en' | 'af' | 'zu'
      )
      expect(hasTranslation).toBe(true)

      const translation = await translationManager.translate(
        testKey,
        language as 'en' | 'af' | 'zu',
        { name: 'John' }
      )
      
      expect(translation).toBe(expectedValue.replace('{{name}}', 'John'))
    }

    // 3. Test fallback mechanism
    const nonExistentKey = 'test.nonexistent.key'
    const fallbackTranslation = await translationManager.translate(nonExistentKey, 'af')
    expect(fallbackTranslation).toBe(nonExistentKey)

    // 4. Test module-specific retrieval
    const moduleTranslations = await translationManager.getTranslationsByModule('test', 'en')
    expect(moduleTranslations[testKey]).toBe(translations.en)

    // 5. Test missing translations detection
    const missingKeys = await translationManager.getMissingTranslations('en', 'zu')
    expect(missingKeys).not.toContain(testKey) // Should not be missing since we added it

    // 6. Test cache functionality
    const startTime = Date.now()
    await translationManager.translate(testKey, 'en') // First call - hits database
    const firstCallTime = Date.now() - startTime

    const cacheStartTime = Date.now()
    await translationManager.translate(testKey, 'en') // Second call - hits cache
    const secondCallTime = Date.now() - cacheStartTime

    // Cache should be faster (though this is a rough test)
    expect(secondCallTime).toBeLessThan(firstCallTime + 10) // Allow some margin
  })

  it('should handle concurrent translation requests', async () => {
    const testKey = 'test.concurrent.message'
    const translations = {
      en: 'Concurrent test message',
      af: 'Gelyktydige toetsboodskap',
      zu: 'Umlayezo wokuhlola ngesikhathi esisodwa'
    }

    await translationManager.addTranslation(testKey, translations, 'test')

    // Make multiple concurrent requests
    const promises = Array.from({ length: 10 }, (_, i) => 
      translationManager.translate(testKey, 'en', { index: i })
    )

    const results = await Promise.all(promises)

    // All requests should return the same translation
    results.forEach(result => {
      expect(result).toBe('Concurrent test message')
    })
  })

  it('should handle large translation datasets', async () => {
    const batchSize = 100
    const testKeys = Array.from({ length: batchSize }, (_, i) => ({
      key: `test.batch.key${i}`,
      translations: {
        en: `English message ${i}`,
        af: `Afrikaanse boodskap ${i}`,
        zu: `Umlayezo wesiZulu ${i}`
      }
    }))

    // Add all translations
    const addPromises = testKeys.map(({ key, translations }) =>
      translationManager.addTranslation(key, translations, 'test')
    )
    await Promise.all(addPromises)

    // Retrieve all translations
    const allTranslations = await translationManager.getTranslations('en')
    
    // Verify all test translations are present
    testKeys.forEach(({ key, translations }) => {
      expect(allTranslations[key]).toBe(translations.en)
    })

    // Test batch retrieval performance
    const startTime = Date.now()
    await translationManager.getTranslationsByModule('test', 'en')
    const retrievalTime = Date.now() - startTime

    // Should complete within reasonable time (adjust threshold as needed)
    expect(retrievalTime).toBeLessThan(5000) // 5 seconds
  })

  it('should maintain data consistency across operations', async () => {
    const testKey = 'test.consistency.message'
    const initialTranslations = {
      en: 'Initial message',
      af: 'Aanvanklike boodskap',
      zu: 'Umlayezo wokuqala'
    }

    // Add initial translations
    await translationManager.addTranslation(testKey, initialTranslations, 'test')

    // Update translations
    const updatedTranslations = {
      en: 'Updated message',
      af: 'Bygewerkte boodskap',
      zu: 'Umlayezo obuyekeziwe'
    }

    await translationManager.addTranslation(testKey, updatedTranslations, 'test')

    // Verify updates
    for (const [language, expectedValue] of Object.entries(updatedTranslations)) {
      const translation = await translationManager.translate(
        testKey,
        language as 'en' | 'af' | 'zu'
      )
      expect(translation).toBe(expectedValue)
    }

    // Verify old values are not returned
    const englishTranslation = await translationManager.translate(testKey, 'en')
    expect(englishTranslation).not.toBe(initialTranslations.en)
    expect(englishTranslation).toBe(updatedTranslations.en)
  })

  it('should handle edge cases gracefully', async () => {
    // Test empty key
    const emptyKeyResult = await translationManager.translate('', 'en')
    expect(emptyKeyResult).toBe('')

    // Test special characters in key
    const specialKey = 'test.special.key-with_special.chars'
    const specialTranslations = {
      en: 'Special characters test',
      af: 'Spesiale karakters toets',
      zu: 'Ukuhlola kwezinhlamvu ezikhethekile'
    }

    await translationManager.addTranslation(specialKey, specialTranslations, 'test')
    const specialResult = await translationManager.translate(specialKey, 'en')
    expect(specialResult).toBe(specialTranslations.en)

    // Test very long translation
    const longTranslation = 'A'.repeat(1000)
    const longKey = 'test.long.message'
    await translationManager.addTranslation(longKey, { en: longTranslation }, 'test')
    const longResult = await translationManager.translate(longKey, 'en')
    expect(longResult).toBe(longTranslation)

    // Test complex parameter interpolation
    const complexKey = 'test.complex.params'
    const complexTranslation = 'User {{user}} has {{count}} items in {{category}} category'
    await translationManager.addTranslation(complexKey, { en: complexTranslation }, 'test')
    
    const complexResult = await translationManager.translate(complexKey, 'en', {
      user: 'John Doe',
      count: 42,
      category: 'Electronics'
    })
    
    expect(complexResult).toBe('User John Doe has 42 items in Electronics category')
  })
})