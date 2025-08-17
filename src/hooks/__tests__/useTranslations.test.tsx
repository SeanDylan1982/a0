import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React, { ReactNode } from 'react'
import { TranslationProvider } from '@/contexts/translation-context'
import { useTranslations, useModuleTranslations, useTranslationManager } from '../useTranslations'

// Mock fetch
global.fetch = vi.fn()

const mockFetch = vi.mocked(fetch)

// Test wrapper component
const createWrapper = (defaultLanguage = 'en') => {
  return ({ children }: { children: ReactNode }) => (
    <TranslationProvider defaultLanguage={defaultLanguage}>
      {children}
    </TranslationProvider>
  )
}

describe('useTranslations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should provide translation function', async () => {
    const mockTranslations = {
      translations: {
        'common.save': 'Save',
        'common.cancel': 'Cancel'
      }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranslations
    } as Response)

    const { result } = renderHook(() => useTranslations(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.t('common.save')).toBe('Save')
    expect(result.current.t('missing.key')).toBe('missing.key')
  })

  it('should handle parameter interpolation', async () => {
    const mockTranslations = {
      translations: {
        'greeting.hello': 'Hello {{name}}'
      }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranslations
    } as Response)

    const { result } = renderHook(() => useTranslations(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.t('greeting.hello', { name: 'John' })).toBe('Hello John')
  })

  it('should change language', async () => {
    const mockEnglishTranslations = {
      translations: { 'common.save': 'Save' }
    }
    const mockAfrikaansTranslations = {
      translations: { 'common.save': 'Stoor' }
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEnglishTranslations
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAfrikaansTranslations
      } as Response)

    const { result } = renderHook(() => useTranslations(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.language).toBe('en')

    act(() => {
      result.current.setLanguage('af')
    })

    await waitFor(() => {
      expect(result.current.language).toBe('af')
    })

    expect(localStorage.getItem('preferred-language')).toBe('af')
  })

  it('should handle loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    const { result } = renderHook(() => useTranslations(), {
      wrapper: createWrapper()
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('should handle error state', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useTranslations(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
  })
})

describe('useModuleTranslations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load module-specific translations', async () => {
    const mockTranslations = {
      translations: {
        'nav.dashboard': 'Dashboard',
        'nav.inventory': 'Inventory'
      }
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ translations: {} })
      } as Response) // For TranslationProvider
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTranslations
      } as Response) // For module translations

    const { result } = renderHook(() => useModuleTranslations('navigation'), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.t('nav.dashboard')).toBe('Dashboard')
    expect(mockFetch).toHaveBeenCalledWith('/api/translations?language=en&module=navigation')
  })

  it('should reload module translations', async () => {
    const mockTranslations = {
      translations: {
        'nav.dashboard': 'Dashboard'
      }
    }

    mockFetch
      .mockResolvedValue({
        ok: true,
        json: async () => mockTranslations
      } as Response)

    const { result } = renderHook(() => useModuleTranslations('navigation'), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.reload()
    })

    expect(mockFetch).toHaveBeenCalledTimes(3) // Provider + initial load + reload
  })
})

describe('useTranslationManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should add translation', async () => {
    const mockResponse = {
      success: true,
      message: 'Translation added successfully'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const { result } = renderHook(() => useTranslationManager())

    const translations = {
      en: 'Save',
      af: 'Stoor',
      zu: 'Gcina'
    }

    await act(async () => {
      const response = await result.current.addTranslation('common.save', translations, 'common')
      expect(response).toEqual(mockResponse)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/translations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: 'common.save',
        translations,
        module: 'common'
      })
    })
  })

  it('should get missing translations', async () => {
    const mockResponse = {
      baseLanguage: 'en',
      targetLanguage: 'af',
      missingKeys: ['common.delete', 'common.edit'],
      count: 2
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const { result } = renderHook(() => useTranslationManager())

    await act(async () => {
      const response = await result.current.getMissingTranslations('en', 'af')
      expect(response).toEqual(mockResponse)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/translations/missing?base=en&target=af')
  })

  it('should translate key with API', async () => {
    const mockResponse = {
      key: 'common.save',
      language: 'en',
      translation: 'Save',
      params: { name: 'John' }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const { result } = renderHook(() => useTranslationManager())

    await act(async () => {
      const translation = await result.current.translateKey('common.save', 'en', { name: 'John' })
      expect(translation).toBe('Save')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/translations/common.save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language: 'en',
        params: { name: 'John' }
      })
    })
  })

  it('should handle API errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useTranslationManager())

    await act(async () => {
      await expect(
        result.current.addTranslation('test.key', { en: 'Test' })
      ).rejects.toThrow('Network error')
    })

    expect(result.current.error).toBe('Network error')
  })
})