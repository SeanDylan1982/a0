'use client'

import React from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslations } from '@/hooks/useTranslations'
import { SupportedLanguage } from '@/lib/services/translation-manager'

const languages = [
  { code: 'en' as SupportedLanguage, name: 'English', flag: '🇬🇧' },
  { code: 'af' as SupportedLanguage, name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'zu' as SupportedLanguage, name: 'isiZulu', flag: '🇿🇦' }
]

interface LanguageSelectorProps {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg'
  showLabel?: boolean
  className?: string
}

export function LanguageSelector({ 
  variant = 'ghost',
  size = 'default',
  showLabel = false,
  className = ''
}: LanguageSelectorProps) {
  const { language, setLanguage, t } = useTranslations()

  const currentLanguage = languages.find(lang => lang.code === language)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={`gap-2 ${className}`}
        >
          <Globe className="h-4 w-4" />
          {showLabel && (
            <>
              <span className="hidden sm:inline">
                {currentLanguage?.name || 'Language'}
              </span>
              <span className="sm:hidden">
                {currentLanguage?.flag}
              </span>
            </>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
            {language === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface LanguageSwitcherProps {
  className?: string
}

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useTranslations()

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant={language === lang.code ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLanguage(lang.code)}
          className="px-2 py-1 text-xs"
          title={lang.name}
        >
          {lang.flag}
        </Button>
      ))}
    </div>
  )
}