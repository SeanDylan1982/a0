import { NextRequest, NextResponse } from 'next/server'
import { translationManager, SupportedLanguage } from '@/lib/services/translation-manager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const baseLanguage = (searchParams.get('base') || 'en') as SupportedLanguage
    const targetLanguage = searchParams.get('target') as SupportedLanguage

    if (!targetLanguage || !['en', 'af', 'zu'].includes(targetLanguage)) {
      return NextResponse.json(
        { error: 'Valid target language parameter required (en, af, zu)' },
        { status: 400 }
      )
    }

    if (!['en', 'af', 'zu'].includes(baseLanguage)) {
      return NextResponse.json(
        { error: 'Valid base language parameter required (en, af, zu)' },
        { status: 400 }
      )
    }

    const missingKeys = await translationManager.getMissingTranslations(
      baseLanguage,
      targetLanguage
    )

    return NextResponse.json({
      baseLanguage,
      targetLanguage,
      missingKeys,
      count: missingKeys.length
    })
  } catch (error) {
    console.error('Error finding missing translations:', error)
    return NextResponse.json(
      { error: 'Failed to find missing translations' },
      { status: 500 }
    )
  }
}