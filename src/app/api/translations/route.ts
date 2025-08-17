import { NextRequest, NextResponse } from 'next/server'
import { translationManager, SupportedLanguage } from '@/lib/services/translation-manager'
import { z } from 'zod'

const GetTranslationsSchema = z.object({
  language: z.enum(['en', 'af', 'zu']),
  module: z.string().optional()
})

const AddTranslationSchema = z.object({
  key: z.string().min(1),
  translations: z.record(z.enum(['en', 'af', 'zu']), z.string()),
  module: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get('language') as SupportedLanguage
    const module = searchParams.get('module')

    if (!language || !['en', 'af', 'zu'].includes(language)) {
      return NextResponse.json(
        { error: 'Valid language parameter required (en, af, zu)' },
        { status: 400 }
      )
    }

    let translations: Record<string, string>

    if (module) {
      translations = await translationManager.getTranslationsByModule(module, language)
    } else {
      translations = await translationManager.getTranslations(language)
    }

    return NextResponse.json({
      language,
      module,
      translations,
      count: Object.keys(translations).length
    })
  } catch (error) {
    console.error('Error fetching translations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch translations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = AddTranslationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { key, translations, module } = validation.data

    await translationManager.addTranslation(key, translations, module)

    return NextResponse.json({
      success: true,
      message: 'Translation added successfully',
      key,
      languages: Object.keys(translations)
    })
  } catch (error) {
    console.error('Error adding translation:', error)
    return NextResponse.json(
      { error: 'Failed to add translation' },
      { status: 500 }
    )
  }
}