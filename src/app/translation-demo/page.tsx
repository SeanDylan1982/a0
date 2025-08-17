import { TranslationProvider } from '@/contexts/translation-context'
import { TranslationDemo } from '@/components/translation-demo'

export default function TranslationDemoPage() {
  return (
    <TranslationProvider>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Multi-Language Translation System</h1>
        <TranslationDemo />
      </div>
    </TranslationProvider>
  )
}