import { useState, useEffect } from 'react'

interface CompanySettings {
  companyName: string
  country: string
}

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: 'Demo Company Ltd',
    country: 'ZA'
  })

  useEffect(() => {
    fetchCompanySettings()
  }, [])

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch('/api/settings/company')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch company settings:', error)
    }
  }

  return settings
}