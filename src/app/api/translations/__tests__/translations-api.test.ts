import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { translationManager } from '@/lib/services/translation-manager'

// Mock the translation manager
vi.mock('@/lib/services/translation-manager', () => ({
  translationManager: {
    getTranslations: vi.fn(),
    getTranslationsByModule: vi.fn(),
    addTranslation: vi.fn()
  }
}))

const mockTranslationManager = vi.mocked(translationManager)

describe('/api/translations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return translations for a language', async () => {
      const mockTranslations = {
        'common.save': 'Save',
        'common.cancel': 'Cancel'
      }

      mockTranslationManager.getTranslations.mockResolvedValue(mockTranslations)

      const request = new NextRequest('http://localhost/api/translations?language=en')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        language: 'en',
        module: null,
        translations: mockTranslations,
        count: 2
      })
      expect(mockTranslationManager.getTranslations).toHaveBeenCalledWith('en')
    })

    it('should return module-specific translations', async () => {
      const mockTranslations = {
        'nav.dashboard': 'Dashboard',
        'nav.inventory': 'Inventory'
      }

      mockTranslationManager.getTranslationsByModule.mockResolvedValue(mockTranslations)

      const request = new NextRequest('http://localhost/api/translations?language=en&module=navigation')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        language: 'en',
        module: 'navigation',
        translations: mockTranslations,
        count: 2
      })
      expect(mockTranslationManager.getTranslationsByModule).toHaveBeenCalledWith('navigation', 'en')
    })

    it('should return 400 for invalid language', async () => {
      const request = new NextRequest('http://localhost/api/translations?language=invalid')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid language parameter required (en, af, zu)')
    })

    it('should return 400 for missing language', async () => {
      const request = new NextRequest('http://localhost/api/translations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid language parameter required (en, af, zu)')
    })

    it('should handle service errors', async () => {
      mockTranslationManager.getTranslations.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/translations?language=en')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch translations')
    })
  })

  describe('POST', () => {
    it('should add translation successfully', async () => {
      mockTranslationManager.addTranslation.mockResolvedValue(undefined)

      const requestBody = {
        key: 'common.save',
        translations: {
          en: 'Save',
          af: 'Stoor',
          zu: 'Gcina'
        },
        module: 'common'
      }

      const request = new NextRequest('http://localhost/api/translations', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Translation added successfully',
        key: 'common.save',
        languages: ['en', 'af', 'zu']
      })
      expect(mockTranslationManager.addTranslation).toHaveBeenCalledWith(
        'common.save',
        requestBody.translations,
        'common'
      )
    })

    it('should return 400 for invalid request data', async () => {
      const requestBody = {
        key: '', // Invalid empty key
        translations: {
          en: 'Save'
        }
      }

      const request = new NextRequest('http://localhost/api/translations', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should return 400 for invalid language codes', async () => {
      const requestBody = {
        key: 'test.key',
        translations: {
          invalid: 'Test' // Invalid language code
        }
      }

      const request = new NextRequest('http://localhost/api/translations', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should handle service errors', async () => {
      mockTranslationManager.addTranslation.mockRejectedValue(new Error('Database error'))

      const requestBody = {
        key: 'common.save',
        translations: {
          en: 'Save'
        }
      }

      const request = new NextRequest('http://localhost/api/translations', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to add translation')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/translations', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to add translation')
    })
  })
})