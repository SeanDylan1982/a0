'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageLayout } from '@/components/page-layout'
import { useLanguage } from '@/contexts/language-context'
import { Plus, Calendar, User, Tag } from 'lucide-react'

const notices = [
  {
    id: 1,
    titleKey: 'notice.vatDeadline',
    contentKey: 'notice.vatDeadlineDesc',
    priority: "high",
    author: "Finance Department",
    date: "2025-03-15",
    category: "Compliance"
  },
  {
    id: 2,
    titleKey: 'notice.maintenance',
    contentKey: 'notice.maintenanceDesc',
    priority: "medium",
    author: "IT Support",
    date: "2025-03-14",
    category: "System"
  },
  {
    id: 3,
    titleKey: 'notice.onboarding',
    contentKey: 'notice.onboardingDesc',
    priority: "low",
    author: "HR Department",
    date: "2025-03-13",
    category: "HR"
  },
  {
    id: 4,
    titleKey: 'notice.vatDeadline',
    contentKey: 'notice.vatDeadlineDesc',
    priority: "high",
    author: "Finance Department",
    date: "2025-03-12",
    category: "Compliance"
  },
  {
    id: 5,
    titleKey: 'notice.maintenance',
    contentKey: 'notice.maintenanceDesc',
    priority: "medium",
    author: "IT Support",
    date: "2025-03-11",
    category: "System"
  }
]

export default function NoticeBoardPage() {
  const { t } = useLanguage()

  return (
    <PageLayout currentPage="/notice-board" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Notice Board' }]}>
      {/* Page header with card styling */}
      <div className="mb-6">
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-l-orange-500 shadow-md">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('nav.noticeBoard')}</h1>
                <p className="text-gray-600 text-sm mb-2">{t('dashboard.managementAnnouncements')}</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm font-medium">
                  🇿🇦 Management communications and important updates
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>New Notice</span>
                </Button>
                <div className="hidden md:block">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">📢</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Notice filters */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="cursor-pointer">All</Badge>
              <Badge variant="outline" className="cursor-pointer">High Priority</Badge>
              <Badge variant="outline" className="cursor-pointer">Medium Priority</Badge>
              <Badge variant="outline" className="cursor-pointer">Low Priority</Badge>
              <Badge variant="outline" className="cursor-pointer">Compliance</Badge>
              <Badge variant="outline" className="cursor-pointer">System</Badge>
              <Badge variant="outline" className="cursor-pointer">HR</Badge>
            </div>
          </div>

          {/* Notice board grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {notices.map((notice) => (
              <Card 
                key={notice.id} 
                className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 ${
                  notice.priority === 'high' ? 'border-l-red-500' : 
                  notice.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{t(notice.titleKey)}</CardTitle>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge 
                          variant={notice.priority === 'high' ? 'destructive' : notice.priority === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {notice.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {notice.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{t(notice.contentKey)}</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <User className="h-4 w-4" />
                      <span>By {notice.author}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(notice.date).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500">{notice.category}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Read More
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load more */}
          <div className="mt-8 text-center">
            <Button variant="outline" className="w-full max-w-md">
              Load More Notices
            </Button>
          </div>
    </PageLayout>
  )
}