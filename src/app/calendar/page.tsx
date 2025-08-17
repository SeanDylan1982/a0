'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { 
  Calendar, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Clock,
  MapPin,
  Users,
  Package,
  ShoppingCart,
  FileText,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3X3,
  CalendarDays
} from 'lucide-react'
import { ShareButton } from '@/components/share-button'
import { TooltipButton } from '@/components/tooltip-button'
import { useToast } from '@/hooks/use-toast'
import { PageLayout } from '@/components/page-layout'

interface Event {
  id: string
  title: string
  description?: string
  startDate: string
  endDate: string
  type: string
  location?: string
  attendees: string[]
  isAllDay: boolean
  reminder?: string
  createdAt: string
  isHoliday?: boolean
  isPublicHoliday?: boolean
  isBirthday?: boolean
  isAnniversary?: boolean
}

const southAfricanHolidays = [
  { date: '2025-01-01', name: 'New Year\'s Day', type: 'HOLIDAY', isPublicHoliday: true },
  { date: '2025-03-21', name: 'Human Rights Day', type: 'HOLIDAY', isPublicHoliday: true },
  { date: '2025-04-18', name: 'Good Friday', type: 'HOLIDAY', isPublicHoliday: true },
  { date: '2025-04-21', name: 'Family Day', type: 'HOLIDAY', isPublicHoliday: true },
  { date: '2025-04-27', name: 'Freedom Day', type: 'HOLIDAY', isPublicHoliday: true },
  { date: '2025-05-01', name: 'Workers\' Day', type: 'HOLIDAY', isPublicHoliday: true },
  { date: '2025-06-16', name: 'Youth Day', type: 'HOLIDAY', isPublicHoliday: true },
  { date: '2025-08-09', name: 'National Women\'s Day', type: 'HOLIDAY', isPublicHoliday: true },
  { date: '2025-09-24', name: 'Heritage Day', type: 'HOLIDAY', isPublicHoliday: true },
  { date: '2025-12-16', name: 'Day of Reconciliation', type: 'HOLIDAY', isPublicHoliday: true },
  { date: '2025-12-25', name: 'Christmas Day', type: 'HOLIDAY', isPublicHoliday: true },
  { date: '2025-12-26', name: 'Day of Goodwill', type: 'HOLIDAY', isPublicHoliday: true },
]

const taxDeadlines = [
  { date: '2025-03-25', name: 'VAT Filing - February', type: 'DEADLINE', description: 'Monthly VAT return due' },
  { date: '2025-04-25', name: 'VAT Filing - March', type: 'DEADLINE', description: 'Monthly VAT return due' },
  { date: '2025-05-07', name: 'PAYE/UIF/SDL Submission', type: 'DEADLINE', description: 'Monthly payroll tax submission' },
  { date: '2025-07-25', name: 'Provisional Tax - First Period', type: 'DEADLINE', description: 'First provisional tax payment' },
]

const staffBirthdays = [
  { date: '2025-03-15', name: 'Thabo Ndlovu', type: 'BIRTHDAY', department: 'Sales' },
  { date: '2025-04-02', name: 'Sarah Johnson', type: 'BIRTHDAY', department: 'HR' },
  { date: '2025-04-18', name: 'Mike Chen', type: 'BIRTHDAY', department: 'IT' },
  { date: '2025-05-12', name: 'Naledi Radebe', type: 'BIRTHDAY', department: 'Finance' },
  { date: '2025-06-08', name: 'David Smith', type: 'BIRTHDAY', department: 'Operations' },
  { date: '2025-07-22', name: 'Priya Patel', type: 'BIRTHDAY', department: 'Marketing' },
  { date: '2025-08-30', name: 'James Wilson', type: 'BIRTHDAY', department: 'Logistics' },
  { date: '2025-09-14', name: 'Emma Brown', type: 'BIRTHDAY', department: 'Customer Service' },
  { date: '2025-10-05', name: 'Kgomotso Mokoena', type: 'BIRTHDAY', department: 'Sales' },
  { date: '2025-11-18', name: 'Lisa Anderson', type: 'BIRTHDAY', department: 'HR' },
  { date: '2025-12-03', name: 'Thomas Lee', type: 'BIRTHDAY', department: 'IT' },
]

const companyAnniversaries = [
  { date: '2025-04-01', name: 'Company Founding Day', type: 'ANNIVERSARY', description: 'Account Zero celebrates 8 years' },
  { date: '2025-06-15', name: 'Thabo Ndlovu - 5 Years', type: 'ANNIVERSARY', description: 'Work anniversary' },
  { date: '2025-08-20', name: 'Sarah Johnson - 3 Years', type: 'ANNIVERSARY', description: 'Work anniversary' },
  { date: '2025-09-10', name: 'Mike Chen - 2 Years', type: 'ANNIVERSARY', description: 'Work anniversary' },
  { date: '2025-11-05', name: 'Naledi Radebe - 1 Year', type: 'ANNIVERSARY', description: 'Work anniversary' },
]

const importantDeadlines = [
  { date: '2025-03-31', name: 'Q1 Financial Reports', type: 'DEADLINE', description: 'End of quarter reporting' },
  { date: '2025-06-30', name: 'Q2 Financial Reports', type: 'DEADLINE', description: 'End of quarter reporting' },
  { date: '2025-09-30', name: 'Q3 Financial Reports', type: 'DEADLINE', description: 'End of quarter reporting' },
  { date: '2025-12-31', name: 'Q4 Financial Reports', type: 'DEADLINE', description: 'End of quarter reporting' },
  { date: '2025-02-28', name: 'Annual Tax Returns', type: 'DEADLINE', description: 'Company tax filing deadline' },
]

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'year'>('month')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddEventOpen, setIsAddEventOpen] = useState(false)
  const { toast } = useToast()

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'MEETING': return Users
      case 'APPOINTMENT': return Clock
      case 'DEADLINE': return AlertTriangle
      case 'SHIPMENT': return Package
      case 'REMINDER': return CheckCircle
      case 'HOLIDAY': return Calendar
      case 'BIRTHDAY': return Calendar
      case 'ANNIVERSARY': return Calendar
      case 'MAINTENANCE': return AlertTriangle
      default: return Calendar
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'MEETING': return 'bg-blue-100 text-blue-800'
      case 'APPOINTMENT': return 'bg-green-100 text-green-800'
      case 'DEADLINE': return 'bg-red-100 text-red-800'
      case 'SHIPMENT': return 'bg-purple-100 text-purple-800'
      case 'REMINDER': return 'bg-yellow-100 text-yellow-800'
      case 'HOLIDAY': return 'bg-gray-100 text-gray-800'
      case 'BIRTHDAY': return 'bg-pink-100 text-pink-800'
      case 'ANNIVERSARY': return 'bg-indigo-100 text-indigo-800'
      case 'MAINTENANCE': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const sampleEvents: Event[] = [
    {
      id: '1',
      title: 'Staff Meeting',
      description: 'Weekly team sync',
      startDate: '2025-03-20T09:00:00',
      endDate: '2025-03-20T10:00:00',
      type: 'MEETING',
      location: 'Conference Room A',
      attendees: ['user1', 'user2'],
      isAllDay: false,
      createdAt: '2025-03-18T00:00:00'
    },
    {
      id: '2',
      title: 'Inventory Delivery',
      description: 'Expected delivery from supplier',
      startDate: '2025-03-22T14:00:00',
      endDate: '2025-03-22T16:00:00',
      type: 'SHIPMENT',
      location: 'Warehouse',
      attendees: ['user3'],
      isAllDay: false,
      createdAt: '2025-03-18T00:00:00'
    },
    ...southAfricanHolidays.map(holiday => ({
      id: `holiday-${holiday.date}`,
      title: holiday.name,
      startDate: `${holiday.date}T00:00:00`,
      endDate: `${holiday.date}T23:59:59`,
      type: holiday.type,
      isAllDay: true,
      attendees: [],
      createdAt: '2025-03-18T00:00:00',
      isHoliday: true,
      isPublicHoliday: holiday.isPublicHoliday
    })),
    ...taxDeadlines.map(deadline => ({
      id: `deadline-${deadline.date}`,
      title: deadline.name,
      description: deadline.description,
      startDate: `${deadline.date}T00:00:00`,
      endDate: `${deadline.date}T23:59:59`,
      type: deadline.type,
      isAllDay: true,
      attendees: [],
      createdAt: '2025-03-18T00:00:00'
    })),
    ...staffBirthdays.map(birthday => ({
      id: `birthday-${birthday.date}`,
      title: `${birthday.name}'s Birthday`,
      description: `Birthday - ${birthday.department} Department`,
      startDate: `${birthday.date}T00:00:00`,
      endDate: `${birthday.date}T23:59:59`,
      type: birthday.type,
      isAllDay: true,
      attendees: [],
      createdAt: '2025-03-18T00:00:00',
      isBirthday: true
    })),
    ...companyAnniversaries.map(anniversary => ({
      id: `anniversary-${anniversary.date}`,
      title: anniversary.name,
      description: anniversary.description,
      startDate: `${anniversary.date}T00:00:00`,
      endDate: `${anniversary.date}T23:59:59`,
      type: anniversary.type,
      isAllDay: true,
      attendees: [],
      createdAt: '2025-03-18T00:00:00',
      isAnniversary: true
    })),
    ...importantDeadlines.map(deadline => ({
      id: `important-deadline-${deadline.date}`,
      title: deadline.name,
      description: deadline.description,
      startDate: `${deadline.date}T00:00:00`,
      endDate: `${deadline.date}T23:59:59`,
      type: deadline.type,
      isAllDay: true,
      attendees: [],
      createdAt: '2025-03-18T00:00:00'
    }))
  ]

  const eventsForSelectedDate = selectedDate 
    ? sampleEvents.filter(event => {
        const eventDate = new Date(event.startDate)
        return eventDate.toDateString() === selectedDate.toDateString()
      })
    : []

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentMonth(newMonth)
  }

  const renderMonthView = () => (
    <div className="bg-white rounded-lg border h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-xl font-semibold">Calendar</h2>
            <p className="text-sm text-gray-600">View and manage your schedule</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[150px] text-center">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-4 h-[calc(100%-60px)] flex justify-center overflow-auto">
        <CalendarComponent
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border w-full max-w-6xl min-w-[700px] h-full"
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          modifiers={{
            holiday: (date) => {
              return southAfricanHolidays.some(holiday => 
                new Date(holiday.date).toDateString() === date.toDateString()
              )
            },
            publicHoliday: (date) => {
              return southAfricanHolidays.some(holiday => 
                holiday.isPublicHoliday && new Date(holiday.date).toDateString() === date.toDateString()
              )
            }
          }}
          modifiersStyles={{
            holiday: { backgroundColor: '#fef3c7', color: '#92400e' },
            publicHoliday: { backgroundColor: '#fee2e2', color: '#991b1b' }
          }}
        />
      </div>
    </div>
  )

  const renderWeekView = () => {
    const startOfWeek = selectedDate ? new Date(selectedDate) : new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    
    return (
      <div className="bg-white rounded-lg border h-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Week View</h2>
              <p className="text-sm text-gray-600">Weekly schedule overview</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => {
                const newWeek = new Date(startOfWeek)
                newWeek.setDate(startOfWeek.getDate() - 7)
                setSelectedDate(newWeek)
              }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[200px] text-center text-sm">
                {startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                {new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <Button variant="outline" size="sm" onClick={() => {
                const newWeek = new Date(startOfWeek)
                newWeek.setDate(startOfWeek.getDate() + 7)
                setSelectedDate(newWeek)
              }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="p-4 h-[calc(100%-100px)] overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
              <div key={day} className="text-center font-medium text-sm text-gray-600 py-2">
                <div className="hidden lg:block">{day}</div>
                <div className="lg:hidden">{day.slice(0, 3)}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date(startOfWeek)
              date.setDate(startOfWeek.getDate() + i)
              const dayEvents = sampleEvents.filter(event => {
                const eventDate = new Date(event.startDate)
                return eventDate.toDateString() === date.toDateString()
              })
              
              return (
                <div 
                  key={i} 
                  className="border rounded-lg p-2 min-h-[180px] max-h-[250px] overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="text-sm font-medium mb-1">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold text-gray-700 mb-2">
                    {date.getDate()}
                  </div>
                  <div className="space-y-1 max-h-[160px] overflow-y-auto">
                    {dayEvents.slice(0, 4).map(event => {
                      const IconComponent = getEventTypeIcon(event.type)
                      return (
                        <div key={event.id} className={`text-xs p-1.5 rounded ${getEventTypeColor(event.type)}`}>
                          <div className="flex items-center space-x-1">
                            <IconComponent className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate text-xs font-medium">{event.title}</span>
                          </div>
                          {!event.isAllDay && (
                            <div className="text-xs opacity-75 mt-0.5">
                              {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {dayEvents.length > 4 && (
                      <div className="text-xs text-gray-500 font-medium">+{dayEvents.length - 4} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderDayView = () => (
    <div className="bg-white rounded-lg border h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Day View</h2>
        <p className="text-sm text-gray-600">Detailed daily schedule</p>
      </div>
      <div className="p-4 h-[calc(100%-80px)] overflow-auto">
        <div className="mb-4">
          <h3 className="text-lg font-medium">
            {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Select a date'}
          </h3>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 12 }, (_, i) => {
            const hour = i + 8 // 8 AM to 7 PM
            const hourEvents = sampleEvents.filter(event => {
              const eventDate = new Date(event.startDate)
              return eventDate.toDateString() === (selectedDate || new Date()).toDateString() &&
                     eventDate.getHours() === hour
            })
            
            return (
              <div key={i} className="flex items-start border-l-2 border-gray-200 pl-4 py-2">
                <div className="w-16 text-sm text-gray-500 font-medium flex-shrink-0">
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
                <div className="flex-1 min-w-0">
                  {hourEvents.map(event => {
                    const IconComponent = getEventTypeIcon(event.type)
                    return (
                      <div key={event.id} className={`mb-2 p-2 rounded-lg ${getEventTypeColor(event.type)}`}>
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-4 w-4 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{event.title}</div>
                            {event.description && (
                              <div className="text-xs opacity-80 truncate">{event.description}</div>
                            )}
                            <div className="text-xs opacity-70">
                              {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                              {new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const renderYearView = () => (
    <div className="bg-white rounded-lg border h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Year View - {currentMonth.getFullYear()}</h2>
            <p className="text-sm text-gray-600">Annual overview</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => {
              const newYear = new Date(currentMonth)
              newYear.setFullYear(currentMonth.getFullYear() - 1)
              setCurrentMonth(newYear)
            }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const newYear = new Date(currentMonth)
              newYear.setFullYear(currentMonth.getFullYear() + 1)
              setCurrentMonth(newYear)
            }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4 h-[calc(100%-100px)] overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }, (_, i) => {
            const monthDate = new Date(currentMonth.getFullYear(), i, 1)
            const monthEvents = sampleEvents.filter(event => {
              const eventDate = new Date(event.startDate)
              return eventDate.getMonth() === i && eventDate.getFullYear() === currentMonth.getFullYear()
            })
            
            return (
              <div 
                key={i} 
                className="border rounded-lg p-3 h-40 flex flex-col cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  const newMonth = new Date(currentMonth.getFullYear(), i, 1)
                  setCurrentMonth(newMonth)
                  setViewMode('month')
                }}
              >
                <h3 className="font-medium text-base mb-2">
                  {monthDate.toLocaleDateString('en-US', { month: 'long' })}
                </h3>
                <div className="text-sm text-gray-500 mb-3">
                  {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}
                </div>
                <div className="space-y-1 flex-1 overflow-y-auto">
                  {monthEvents.slice(0, 3).map(event => {
                    const IconComponent = getEventTypeIcon(event.type)
                    return (
                      <div key={event.id} className={`text-xs p-1.5 rounded ${getEventTypeColor(event.type)}`}>
                        <div className="flex items-center space-x-1">
                          <IconComponent className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate text-xs font-medium">{event.title}</span>
                        </div>
                        <div className="text-xs opacity-75 mt-0.5">
                          {new Date(event.startDate).getDate()}
                        </div>
                      </div>
                    )
                  })}
                  {monthEvents.length > 3 && (
                    <div className="text-xs text-gray-500 font-medium">+{monthEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <PageLayout currentPage="/calendar" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Calendar' }]}>
        {/* Page header with card styling */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-l-amber-500 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Calendar & Scheduling</h1>
                  <p className="text-gray-600 text-sm mb-2">Manage appointments, deadlines, and important dates</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                    🇿🇦 SA public holidays & tax deadlines
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">📅</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end mb-6">
          <div className="flex space-x-2">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>

        {/* View mode selector */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 bg-white rounded-lg border p-1 inline-block">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="flex items-center space-x-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Month</span>
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="flex items-center space-x-2"
            >
              <List className="h-4 w-4" />
              <span>Week</span>
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="flex items-center space-x-2"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Day</span>
            </Button>
            <Button
              variant={viewMode === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('year')}
              className="flex items-center space-x-2"
            >
              <Grid3X3 className="h-4 w-4" />
              <span>Year</span>
            </Button>
          </div>
        </div>

        {/* Responsive calendar container based on view mode */}
        <div className={`
          ${viewMode === 'year' ? 'h-[calc(100vh-180px)]' : 'flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)]'}
        `}>
          <div className={`
            ${viewMode === 'year' ? 'w-full h-full' : 'flex-1 min-h-0 h-full'}
            ${viewMode === 'day' ? 'w-full' : ''}
          `}>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'year' && renderYearView()}
          </div>

          {/* Events sidebar - responsive based on view mode */}
          {(viewMode === 'month' || viewMode === 'week') && (
            <div className="w-full lg:w-80 space-y-4 flex-shrink-0">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>
                    {selectedDate ? selectedDate.toLocaleDateString() : 'Select a date'}
                  </CardTitle>
                  <CardDescription>
                    Events and appointments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {eventsForSelectedDate.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No events scheduled for this date</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {eventsForSelectedDate.map((event) => {
                        const IconComponent = getEventTypeIcon(event.type)
                        return (
                          <div key={event.id} className={`border rounded-lg p-3 ${event.isPublicHoliday ? 'border-red-200 bg-red-50' : ''}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-lg ${getEventTypeColor(event.type)}`}>
                                  <IconComponent className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-medium flex items-center space-x-2">
                                    <span>{event.title}</span>
                                    {event.isPublicHoliday && (
                                      <Badge variant="destructive" className="text-xs">Public Holiday</Badge>
                                    )}
                                    {event.isHoliday && !event.isPublicHoliday && (
                                      <Badge variant="outline" className="text-xs">Holiday</Badge>
                                    )}
                                    {event.isBirthday && (
                                      <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-800">Birthday</Badge>
                                    )}
                                    {event.isAnniversary && (
                                      <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800">Anniversary</Badge>
                                    )}
                                  </h3>
                                  {event.description && (
                                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                                  )}
                                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                    <div className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {event.isAllDay ? 'All day' : new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {event.location && (
                                      <div className="flex items-center">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {event.location}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!event.isHoliday && !event.isBirthday && !event.isAnniversary && (
                                <div className="flex space-x-1">
                                  <ShareButton 
                                    title={event.title}
                                    data={event}
                                    type="calendar"
                                    variant="ghost"
                                    size="sm"
                                  />
                                  <TooltipButton tooltip="Edit event" variant="ghost" size="sm">
                                    <Edit className="h-3 w-3" />
                                  </TooltipButton>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Upcoming Events</CardTitle>
                  <CardDescription>Next 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {sampleEvents
                      .filter(event => !event.isHoliday && !event.isBirthday && !event.isAnniversary)
                      .slice(0, 5)
                      .map((event) => {
                      const IconComponent = getEventTypeIcon(event.type)
                      return (
                        <div key={event.id} className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${getEventTypeColor(event.type)}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{event.title}</h4>
                            <p className="text-xs text-gray-500">
                              {new Date(event.startDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
    </PageLayout>
  )
}