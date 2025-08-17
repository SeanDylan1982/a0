import { NextResponse } from 'next/server'
import { quickMigrate } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'
import { SalesIntegrationService } from '@/lib/services/sales-integration-service'
import { SupportedLanguage } from '@/lib/services/translation-manager'

const salesService = new SalesIntegrationService()

async function handleGET(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get('type') as 'invoice' | 'quote' | 'sale'
    const languageParam = searchParams.get('language') || 'en'
    
    // Validate language
    const validLanguages: SupportedLanguage[] = ['en', 'af', 'zu']
    const language = validLanguages.includes(languageParam as SupportedLanguage) 
      ? languageParam as SupportedLanguage 
      : 'en'

    if (!documentType || !['invoice', 'quote', 'sale'].includes(documentType)) {
      return NextResponse.json(
        { error: 'Valid document type is required (invoice, quote, sale)' },
        { status: 400 }
      )
    }

    // Get translated document content
    const translations = await salesService.getTranslatedDocumentContent(documentType, language)

    return NextResponse.json({
      documentType,
      language,
      translations
    })

  } catch (error) {
    console.error('Get document translations error:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware
const { GET } = quickMigrate('sales', {
  GET: handleGET
})

export { GET }