'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  FileText, 
  Calendar, 
  Settings, 
  Bell,
  Search,
  Menu,
  X,
  MessageSquare,
  Megaphone,
  User,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/contexts/language-context'
import { useSidebar } from '@/contexts/sidebar-context'
import { useCompanySettings } from '@/hooks/use-company-settings'
import { LanguageSelector } from '@/components/language-selector'
import { NotificationsModal } from '@/components/notifications-modal'
import { CompactConnectionStatus } from '@/components/connection-status'
import { ConnectionModal } from '@/components/connection-modal'
import { InventoryAlertIcon } from '@/components/inventory-alert-icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface HeaderProps {
  currentPage: string
  breadcrumbs?: { name: string; href?: string }[]
}

const getColorForPage = (href: string) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
    '/': { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', hover: 'hover:bg-blue-50 hover:text-blue-700' },
    '/inventory': { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', hover: 'hover:bg-green-50 hover:text-green-700' },
    '/sales': { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', hover: 'hover:bg-orange-50 hover:text-orange-700' },
    '/customers': { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700', hover: 'hover:bg-purple-50 hover:text-purple-700' },
    '/invoicing': { bg: 'bg-cyan-50', border: 'border-cyan-500', text: 'text-cyan-700', hover: 'hover:bg-cyan-50 hover:text-cyan-700' },
    '/calendar': { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700', hover: 'hover:bg-amber-50 hover:text-amber-700' },
    '/hr': { bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-700', hover: 'hover:bg-rose-50 hover:text-rose-700' },
    '/accounting': { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', hover: 'hover:bg-emerald-50 hover:text-emerald-700' },
    '/messaging': { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-700', hover: 'hover:bg-indigo-50 hover:text-indigo-700' },
    '/notice-board': { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', hover: 'hover:bg-orange-50 hover:text-orange-700' },
    '/users': { bg: 'bg-teal-50', border: 'border-teal-500', text: 'text-teal-700', hover: 'hover:bg-teal-50 hover:text-teal-700' },
    '/settings': { bg: 'bg-slate-50', border: 'border-slate-500', text: 'text-slate-700', hover: 'hover:bg-slate-50 hover:text-slate-700' },
  }
  return colorMap[href] || { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', hover: 'hover:bg-blue-50 hover:text-blue-700' }
}

const navigation = [
  { nameKey: 'nav.dashboard', icon: LayoutDashboard, href: '/' },
  { nameKey: 'nav.inventory', icon: Package, href: '/inventory' },
  { nameKey: 'nav.sales', icon: ShoppingCart, href: '/sales' },
  { nameKey: 'nav.customers', icon: Users, href: '/customers' },
  { nameKey: 'nav.invoicing', icon: FileText, href: '/invoicing' },
  { nameKey: 'nav.calendar', icon: Calendar, href: '/calendar' },
  { nameKey: 'nav.hr', icon: Users, href: '/hr' },
  { nameKey: 'nav.accounting', icon: FileText, href: '/accounting' },
  { nameKey: 'nav.messaging', icon: MessageSquare, href: '/messaging' },
  { nameKey: 'nav.noticeBoard', icon: Megaphone, href: '/notice-board' },
  { nameKey: 'nav.users', icon: Users, href: '/users' },
  { nameKey: 'nav.settings', icon: Settings, href: '/settings' },
]

export function Header({ currentPage, breadcrumbs = [] }: HeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showConnectionModal, setShowConnectionModal] = useState(false)
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar()
  const { toast } = useToast()
  const { t } = useLanguage()
  const companySettings = useCompanySettings()

  const searchResults = [
    { type: 'customer', name: 'ABC Construction Ltd', description: 'Construction company in Cape Town', href: '/customers' },
    { type: 'invoice', name: 'INV-2025-001234', description: 'Outstanding invoice - R 15,420.00', href: '/invoicing' },
    { type: 'supplier', name: 'Tech Supplies SA', description: 'IT equipment supplier', href: '/inventory' },
    { type: 'product', name: 'Laptop Dell XPS 15', description: 'SKU: LP-001 - Stock: 45 units', href: '/inventory' },
    { type: 'customer', name: 'Johannesburg Retail', description: 'Retail chain - Premium customer', href: '/customers' },
    { type: 'invoice', name: 'INV-2025-001235', description: 'Paid invoice - R 8,950.00', href: '/invoicing' },
  ]

  const filteredResults = searchResults.filter(result =>
    result.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    result.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearchSelect = (result: any) => {
    setShowSearchResults(false)
    setSearchQuery('')
    toast({
      title: `Navigating to ${result.type}`,
      description: `Opening ${result.name}`,
    })
    setTimeout(() => {
      window.location.href = result.href
    }, 500)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  const handleNavigation = (item: any) => {
    setSidebarOpen(false)
    window.location.href = item.href
  }

  const handleProfileClick = () => {
    window.location.href = '/profile'
  }

  const handleLogout = () => {
    // In a real application, this would handle logout logic
    // For now, we'll just show a toast and redirect to login
    toast({
      title: "Logging out",
      description: "You have been successfully logged out",
    })
    setTimeout(() => {
      window.location.href = '/login'
    }, 1000)
  }

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-bold">Business Manager</h1>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <nav className="mt-4">
            {navigation.map((item) => (
              <button
                key={item.nameKey}
                onClick={() => handleNavigation(item)}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium ${
                  item.href === currentPage
                    ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {t(item.nameKey)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <TooltipProvider>
        <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col lg:bg-white lg:border-r lg:border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-52'}`}>
          <div className="flex items-center justify-between h-16 px-4 border-b">
            {!sidebarCollapsed && (
              <div className="flex items-center">
                <h1 className="text-lg font-bold text-gray-900">{companySettings.companyName}</h1>
                <div className="ml-2 text-xs text-gray-500">{companySettings.country === 'ZA' ? '🇿🇦' : '🌍'}</div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 h-8 w-8"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          <nav className="flex-1 mt-4">
            {navigation.map((item) => {
              const NavButton = (
                <button
                  key={item.nameKey}
                  onClick={() => handleNavigation(item)}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-2 text-sm font-medium transition-all duration-200 ${
                    item.href === currentPage
                      ? `${getColorForPage(item.href).bg} border-r-4 ${getColorForPage(item.href).border} ${getColorForPage(item.href).text} font-semibold`
                      : `text-gray-600 ${getColorForPage(item.href).hover}`
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                  {!sidebarCollapsed && (
                    <span className="truncate">{t(item.nameKey)}</span>
                  )}
                </button>
              )
              
              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.nameKey}>
                    <TooltipTrigger asChild>
                      {NavButton}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      {t(item.nameKey)}
                    </TooltipContent>
                  </Tooltip>
                )
              }
              
              return NavButton
            })}
          </nav>
          
          {/* App branding at bottom */}
          <div className="p-4 border-t border-gray-200">
            {sidebarCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">a0</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  Account Zero
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">a0</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Account Zero</div>
                  <div className="text-xs text-gray-500">Business Management</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>

      {/* Top navigation */}
      <header className={`sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-52'}`}>
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
            
            {/* Breadcrumb navigation */}
            <nav className="hidden md:flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {index > 0 && <span className="text-gray-400">/</span>}
                  {index === 0 ? (
                    <a 
                      href="/" 
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors duration-200 font-medium"
                    >
                      {crumb.name}
                    </a>
                  ) : (
                    <span className={index === breadcrumbs.length - 1 ? "text-gray-900 font-medium" : "text-gray-500"}>
                      {crumb.name}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <form onSubmit={handleSearchSubmit}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder={t('common.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowSearchResults(e.target.value.length > 0)
                  }}
                  onFocus={() => setShowSearchResults(searchQuery.length > 0)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </form>
              
              {/* Search results dropdown */}
              {showSearchResults && filteredResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  {filteredResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleSearchSelect(result)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {result.type}
                            </Badge>
                            <span className="font-medium text-gray-900">{result.name}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {showSearchResults && filteredResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                  <p className="text-sm text-gray-500">{t('common.noResults')} "{searchQuery}"</p>
                </div>
              )}
            </div>
            
            <LanguageSelector />
            
            <InventoryAlertIcon onToggleAlerts={() => {
              if (window && (window as any).toggleInventoryAlerts) {
                (window as any).toggleInventoryAlerts()
              }
            }} />
            
            <CompactConnectionStatus onClick={() => setShowConnectionModal(true)} />
            
            <NotificationsModal>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
              </Button>
            </NotificationsModal>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors duration-200">
                  <Avatar>
                    <AvatarImage src="/placeholder-avatar.jpg" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">John Doe</p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 hidden md:block" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Connection Status Modal */}
      <ConnectionModal 
        isOpen={showConnectionModal} 
        onClose={() => setShowConnectionModal(false)} 
      />
    </>
  )
}