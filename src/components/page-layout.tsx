'use client'

import { ReactNode } from 'react'
import { useSidebar } from '@/contexts/sidebar-context'
import { Header } from '@/components/header'

interface PageLayoutProps {
  children: ReactNode
  currentPage: string
  breadcrumbs?: { name: string; href?: string }[]
}

export function PageLayout({ children, currentPage, breadcrumbs = [] }: PageLayoutProps) {
  const { sidebarCollapsed } = useSidebar()
  
  // Ensure breadcrumbs always include Home and current page
  const finalBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : [
    { name: 'Home', href: '/' },
    { name: currentPage.replace('/', '').charAt(0).toUpperCase() + currentPage.replace('/', '').slice(1) || 'Dashboard' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPage={currentPage} breadcrumbs={finalBreadcrumbs} />
      
      {/* Main content with dynamic sidebar spacing */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-52'}`}>
        <main className="p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}