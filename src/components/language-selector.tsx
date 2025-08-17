'use client'

import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/contexts/language-context'
import { FlagGB, FlagZA, FlagEmojiGB, FlagEmojiZA } from '@/components/flags'

const languages = [
  { 
    code: 'en', 
    name: 'English', 
    flag: <FlagGB />,
    flagEmoji: <FlagEmojiGB />
  },
  { 
    code: 'af', 
    name: 'Afrikaans', 
    flag: <FlagZA />,
    flagEmoji: <FlagEmojiZA />
  },
  { 
    code: 'zu', 
    name: 'isiZulu', 
    flag: <FlagZA />,
    flagEmoji: <FlagEmojiZA />
  },
]

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()
  const [useSVG, setUseSVG] = useState(true)

  const currentLanguage = languages.find(lang => lang.code === language)

  // Handle flag rendering errors by falling back to emoji
  const handleFlagError = () => {
    setUseSVG(false)
  }

  useEffect(() => {
    // Test if SVG flags are supported
    try {
      const testSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      setUseSVG(!!testSVG.createSVGRect)
    } catch (error) {
      setUseSVG(false)
    }
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Select language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code as any)}
            className={`flex items-center space-x-2 ${
              language === lang.code ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <span className="flex-shrink-0">
              {useSVG ? lang.flag : lang.flagEmoji}
            </span>
            <span>{lang.name}</span>
            {language === lang.code && (
              <span className="text-xs text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}