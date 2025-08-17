'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type Language = 'en' | 'af' | 'zu'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.inventory': 'Inventory',
    'nav.sales': 'Sales',
    'nav.customers': 'Customers',
    'nav.invoicing': 'Invoicing',
    'nav.calendar': 'Calendar',
    'nav.hr': 'HR',
    'nav.accounting': 'Accounting',
    'nav.messaging': 'Messaging',
    'nav.noticeBoard': 'Notice Board',
    'nav.users': 'Users',
    'nav.settings': 'Settings',
    
    // Dashboard
    'dashboard.welcome': 'Welcome to Account Zero - Your South African Business Management Solution',
    'dashboard.compliant': 'Compliant with POPIA, VAT, PAYE, and UIF regulations',
    'dashboard.totalRevenue': 'Total Revenue',
    'dashboard.inventoryValue': 'Inventory Value',
    'dashboard.activeCustomers': 'Active Customers',
    'dashboard.pendingOrders': 'Pending Orders',
    'dashboard.noticeBoard': 'Notice Board',
    'dashboard.managementAnnouncements': 'Management announcements and important updates',
    'dashboard.recentActivities': 'Recent Activities',
    'dashboard.latestActions': 'Latest actions from your team',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.commonTasks': 'Common tasks you can perform quickly',
    'dashboard.addProduct': 'Add Product',
    'dashboard.addCustomer': 'Add Customer',
    'dashboard.newSale': 'New Sale',
    'dashboard.createInvoice': 'Create Invoice',
    
    // Common
    'common.search': 'Search...',
    'common.searchPlaceholder': 'Search customers, invoices, suppliers...',
    'common.noResults': 'No results found',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.new': 'New',
    'common.viewAll': 'View All',
    
    // Notice Board
    'notice.vatDeadline': 'VAT Submission Deadline',
    'notice.vatDeadlineDesc': 'Reminder: VAT returns for February are due by 25 March 2025. Ensure all invoices are captured.',
    'notice.maintenance': 'System Maintenance',
    'notice.maintenanceDesc': 'Scheduled maintenance this weekend: Saturday 22:00 - Sunday 06:00. System will be unavailable.',
    'notice.onboarding': 'New Employee Onboarding',
    'notice.onboardingDesc': 'Welcome to our 3 new team members starting next week. Please ensure all necessary documentation is ready.',
    
    // Messaging
    'messaging.messages': 'Messages',
    'messaging.newConversation': 'New',
    'messaging.searchConversations': 'Search conversations...',
    'messaging.typeMessage': 'Type a message...',
    'messaging.online': 'online',
    'messaging.groupChat': 'Group chat',
    'messaging.noEvents': 'No events scheduled for this date',
  },
  af: {
    // Navigation
    'nav.dashboard': 'Kontroleskerm',
    'nav.inventory': 'Voorraad',
    'nav.sales': 'Verkope',
    'nav.customers': 'Kliënte',
    'nav.invoicing': 'Fakturering',
    'nav.calendar': 'Kalender',
    'nav.hr': 'MP',
    'nav.accounting': 'Boekhouding',
    'nav.messaging': 'Boodskappe',
    'nav.noticeBoard': 'Kennisgewingbord',
    'nav.users': 'Gebruikers',
    'nav.settings': 'Instellings',
    
    // Dashboard
    'dashboard.welcome': 'Welkom by Account Zero - Jou Suid-Afrikaanse Besigheidsbestuurstelsel',
    'dashboard.compliant': 'In ooreenstemming met POPIA, BTW, PAYE, en UIF regulasies',
    'dashboard.totalRevenue': 'Totale Inkomste',
    'dashboard.inventoryValue': 'Voorraadwaarde',
    'dashboard.activeCustomers': 'Aktiewe Kliënte',
    'dashboard.pendingOrders': 'Wagende Bestellings',
    'dashboard.noticeBoard': 'Kennisgewingbord',
    'dashboard.managementAnnouncements': 'Bestuursaankondigings en belangrike opdaterings',
    'dashboard.recentActivities': 'Onlangse Aktiwiteite',
    'dashboard.latestActions': 'Laaste aksies van jou span',
    'dashboard.quickActions': 'Vinnige Aksies',
    'dashboard.commonTasks': 'Algemene take wat jy vinnig kan uitvoer',
    'dashboard.addProduct': 'Voeg Produk By',
    'dashboard.addCustomer': 'Voeg Kliënt By',
    'dashboard.newSale': 'Nuwe Verkoop',
    'dashboard.createInvoice': 'Skep Faktuur',
    
    // Common
    'common.search': 'Soek...',
    'common.searchPlaceholder': 'Soek kliënte, fakture, verskaffers...',
    'common.noResults': 'Geen resultate gevind nie',
    'common.loading': 'Laai tans...',
    'common.save': 'Stoor',
    'common.cancel': 'Kanselleer',
    'common.delete': 'Verwyder',
    'common.edit': 'Wysig',
    'common.new': 'Nuwe',
    'common.viewAll': 'Bekyk Alles',
    
    // Notice Board
    'notice.vatDeadline': 'BTW Indieningstermyn',
    'notice.vatDeadlineDesc': 'Herinnering: BTW opgawes vir Februarie is verskuldig teen 25 Maart 2025. Maak seker alle fakture is ingevul.',
    'notice.maintenance': 'Stelselonderhoud',
    'notice.maintenanceDesc': 'Geskeduleerde onderhoud hierdie naweek: Saterdag 22:00 - Sondag 06:00. Stelsel sal nie beskikbaar wees nie.',
    'notice.onboarding': 'Nuwe Werknemer Inwerkingstelling',
    'notice.onboardingDesc': 'Welkom by ons 3 nuwe spanlede wat volgende week begin. Maak seker alle nodige dokumentasie gereed is.',
    
    // Messaging
    'messaging.messages': 'Boodskappe',
    'messaging.newConversation': 'Nuwe',
    'messaging.searchConversations': 'Soek gesprekke...',
    'messaging.typeMessage': 'Tik \'n boodskap...',
    'messaging.online': 'aanlyn',
    'messaging.groupChat': 'Groepgesprek',
    'messaging.noEvents': 'Geen gebeurtenisse geskeduleer vir hierdie datum nie',
  },
  zu: {
    // Navigation
    'nav.dashboard': 'Ikheli lemininingwane',
    'nav.inventory': 'Isitokisi',
    'nav.sales': 'Okuthengisa',
    'nav.customers': 'Abakhenyi',
    'nav.invoicing': 'Ukuthola i-invoys',
    'nav.calendar': 'Ikhalenda',
    'nav.hr': 'Abasebenzi',
    'nav.accounting': 'Ukuhlela imali',
    'nav.messaging': 'Umyalezo',
    'nav.noticeBoard': 'Ibhodi Lezaziso',
    'nav.users': 'Abasebenzisi',
    'nav.settings': 'Izilungiselelo',
    
    // Dashboard
    'dashboard.welcome': 'Wamukelekile e-Account Zero - Isistimu sakho sokuphatha ishishini laseNingizimu Afrika',
    'dashboard.compliant': 'Ukuvumelana ne-POPIA, i-VAT, i-PAYE, ne-UIF imithetho',
    'dashboard.totalRevenue': 'Inani Lonke Lomnotho',
    'dashboard.inventoryValue': 'Inani Lwesitokisi',
    'dashboard.activeCustomers': 'Abakhenyi Abasebenzayo',
    'dashboard.pendingOrders': 'Izinyathelo Ezilindile',
    'dashboard.noticeBoard': 'Ibhodi Lezaziso',
    'dashboard.managementAnnouncements': 'Izaziso zokuphatha nokunye okubalulekile',
    'dashboard.recentActivities': 'Imisebenzi Yakamuva',
    'dashboard.latestActions': 'Izenzo zakamuva zeqembu lakho',
    'dashboard.quickActions': 'Izenzo Ezisheshayo',
    'dashboard.commonTasks': 'Imisebenzi ejwayelekile ongazenza ngokushesha',
    'dashboard.addProduct': 'Yongeza Is products',
    'dashboard.addCustomer': 'Yongza Umkhenyi',
    'dashboard.newSale': 'Okuthengiswa Okusha',
    'dashboard.createInvoice': 'Dala i-Invoys',
    
    // Common
    'common.search': 'Sesha...',
    'common.searchPlaceholder': 'Sesha abakhenyi, i-invoys, abathengisi...',
    'common.noResults': 'Akukho okufunekiwe',
    'common.loading': 'Iyalayisha...',
    'common.save': 'Gcina',
    'common.cancel': 'Khansela',
    'common.delete': 'Cisha',
    'common.edit': 'Lungisa',
    'common.new': 'Okusha',
    'common.viewAll': 'Buka Konke',
    
    // Notice Board
    'notice.vatDeadline': 'Isikhathi Sokuhlinzeka i-VAT',
    'notice.vatDeadlineDesc': 'Ikhumbuzo: I-VAT yaseFebruariya idlule nge-25 Matshi 2025. Qinisekisa zonke i-invoys ziqediwe.',
    'notice.maintenance': 'Ukulungiswa Kwe sistimu',
    'notice.maintenanceDesc': 'Ukulungiswa okuhlelwele leli weekend: Mgqibelo 22:00 - Sonto 06:00. I sistimu izoba ibikho.',
    'notice.onboarding': 'Ukungena Kwabasebenzi Abasha',
    'notice.onboardingDesc': 'Wamukelekile kubo-3 abaqambi bethu abasha uqala ngeviki elizayo. Qinisekisa wonke amadokhumenti adingekayo alungile.',
    
    // Messaging
    'messaging.messages': 'Imiyalezo',
    'messaging.newConversation': 'Okusha',
    'messaging.searchConversations': 'Sesha ingxoxo...',
    'messaging.typeMessage': 'Thayipha imiyalezo...',
    'messaging.online': 'akhawunti',
    'messaging.groupChat': 'Ingxoxo eqenjini',
    'messaging.noEvents': 'Akukho zenzo ezihleliwe leli suku',
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}