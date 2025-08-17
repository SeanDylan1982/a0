import { NextRequest, NextResponse } from 'next/server'
import { translationManager, SupportedLanguage } from '@/lib/services/translation-manager'
import { z } from 'zod'

const TranslateSchema = z.object({
  language: z.enum(['en', 'af', 'zu']),
  params: z.record(z.union([z.string(), z.number()])).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get('language') as SupportedLanguage
    const paramsStr = searchParams.get('params')

    if (!language || !['en', 'af', 'zu'].includes(language)) {
      return NextResponse.json(
        { error: 'Valid language parameter required (en, af, zu)' },
        { status: 400 }
      )
    }

    let translationParams
    if (paramsStr) {
      try {
        translationParams = JSON.parse(paramsStr)
      } catch {
        return NextResponse.json(
          { error: 'Invalid params format' },
          { status: 400 }
        )
      }
    }

    const translation = await translationManager.translate(
      params.key,
      language,
      translationParams
    )

    return NextResponse.json({
      key: params.key,
      language,
      translation,
      params: translationParams
    })
  } catch (error) {
    console.error('Error translating key:', error)
    return NextResponse.json(
      { error: 'Failed to translate key' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const body = await request.json()
    const validation = TranslateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { language, params: translationParams } = validation.data

    const translation = await translationManager.translate(
      params.key,
      language,
      translationParams
    )

    return NextResponse.json({
      key: params.key,
      language,
      translation,
      params: translationParams
    })
  } catch (error) {
    console.error('Error translating key:', error)
    return NextResponse.json(
      { error: 'Failed to translate key' },
      { status: 500 }
    )
  }
}