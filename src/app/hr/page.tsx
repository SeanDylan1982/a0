'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Briefcase,
  UserCheck,
  UserMinus,
  Plane,
  Heart,
  Coffee
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageLayout } from '@/components/page-layout'

interface Employee {
  id: string
  userId: string
  employeeId: string
  department: string
  position: string
  salary: number
  hireDate: string
  terminationDate?: string
  status: string
  emergencyContact?: string
  emergencyPhone?: string
  notes?: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
  leaveRequests: LeaveRequest[]
}

interface LeaveRequest {
  id: string
  type: string
  startDate: string
  endDate: string
  reason?: string
  status: string
  createdAt: string
}

export default function HRPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchEmployees()
    fetchLeaveRequests()
  }, [])

  const fetchEmployees = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setEmployees([])
      setIsLoading(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      })
    }
  }

  const fetchLeaveRequests = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLeaveRequests([])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch leave requests",
        variant: "destructive",
      })
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'ON_LEAVE': return 'secondary'
      case 'TERMINATED': return 'destructive'
      case 'SUSPENDED': return 'destructive'
      default: return 'secondary'
    }
  }

  const getLeaveStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'secondary'
      case 'APPROVED': return 'default'
      case 'REJECTED': return 'destructive'
      case 'CANCELLED': return 'secondary'
      default: return 'secondary'
    }
  }

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'VACATION': return Plane
      case 'SICK': return Heart
      case 'PERSONAL': return Coffee
      case 'MATERNITY': return UserCheck
      case 'PATERNITY': return UserCheck
      case 'UNPAID': return UserMinus
      default: return Calendar
    }
  }

  const sampleEmployees: Employee[] = [
    {
      id: '1',
      userId: 'user1',
      employeeId: 'EMP001',
      department: 'Sales',
      position: 'Sales Manager',
      salary: 25000,
      hireDate: '2023-01-15',
      status: 'ACTIVE',
      emergencyContact: 'Jane Doe',
      emergencyPhone: '0821234567',
      notes: 'Excellent performer',
      createdAt: '2023-01-15',
      user: {
        id: 'user1',
        name: 'John Smith',
        email: 'john@company.com'
      },
      leaveRequests: []
    }
  ]

  const sampleLeaveRequests: LeaveRequest[] = [
    {
      id: '1',
      type: 'VACATION',
      startDate: '2024-02-01',
      endDate: '2024-02-05',
      reason: 'Family vacation',
      status: 'APPROVED',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      type: 'SICK',
      startDate: '2024-01-20',
      endDate: '2024-01-20',
      reason: 'Medical appointment',
      status: 'PENDING',
      createdAt: '2024-01-18'
    }
  ]

  const filteredEmployees = sampleEmployees.filter(employee => {
    const matchesSearch = employee.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter
    return matchesSearch && matchesDepartment
  })

  const totalEmployees = sampleEmployees.length
  const activeEmployees = sampleEmployees.filter(e => e.status === 'ACTIVE').length
  const pendingLeaveRequests = sampleLeaveRequests.filter(lr => lr.status === 'PENDING').length
  const totalPayroll = sampleEmployees.reduce((sum, e) => sum + e.salary, 0)

  return (
    <PageLayout currentPage="/hr" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'HR' }]}>
        {/* Page header with card styling */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-rose-50 to-pink-50 border-l-4 border-l-rose-500 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Human Resources</h1>
                  <p className="text-gray-600 text-sm mb-2">Manage employees, leave, and payroll</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-sm font-medium">
                    🇿🇦 PAYE, UIF, and SDL compliant
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">👤</span>
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
              Add Employee
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Employees
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                {activeEmployees} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Monthly Payroll
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R{totalPayroll.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Before deductions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Leave Requests
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingLeaveRequests}</div>
              <p className="text-xs text-muted-foreground">
                Pending approval
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Compliance
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">100%</div>
              <p className="text-xs text-muted-foreground">
                PAYE & UIF up to date
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="employees" className="w-full">
          <TabsList>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="leave">Leave Management</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="HR">Human Resources</SelectItem>
                  <SelectItem value="IT">Information Technology</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Employees</CardTitle>
                <CardDescription>Manage your workforce and employee records</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading employees...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hire Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{employee.user.name}</div>
                              <div className="text-sm text-gray-500">{employee.user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{employee.employeeId}</TableCell>
                          <TableCell>{employee.department}</TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell className="font-medium">
                            R{employee.salary.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeColor(employee.status)}>
                              {employee.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(employee.hireDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Leave Management</CardTitle>
                <CardDescription>BCEA compliant leave tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Leave Requests</h3>
                    <div className="space-y-3">
                      {sampleLeaveRequests.map((request) => {
                        const IconComponent = getLeaveTypeIcon(request.type)
                        return (
                          <div key={request.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <IconComponent className="h-5 w-5 text-gray-400 mt-0.5" />
                                <div>
                                  <h4 className="font-medium capitalize">{request.type.toLowerCase()}</h4>
                                  <p className="text-sm text-gray-600">
                                    {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                                  </p>
                                  {request.reason && (
                                    <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                                  )}
                                </div>
                              </div>
                              <Badge variant={getLeaveStatusBadgeColor(request.status)}>
                                {request.status}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Leave Entitlements</h3>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Annual Leave</span>
                          <span className="text-sm text-gray-600">15 days / year</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">BCEA compliant</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Sick Leave</span>
                          <span className="text-sm text-gray-600">30 days / 3-year cycle</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">BCEA compliant</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Maternity Leave</span>
                          <span className="text-sm text-gray-600">4 months</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">UIF benefits available</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Management</CardTitle>
                <CardDescription>PAYE, UIF, and SDL calculations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Payroll management coming soon!</p>
                  <Button>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process Payroll
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Dashboard</CardTitle>
                <CardDescription>South African labor law compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Tax Compliance</h3>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">PAYE Registration</span>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Registered with SARS</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">UIF Registration</span>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">UIF contributions up to date</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">SDL Registration</span>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Skills development levy paid</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Labor Law Compliance</h3>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">BCEA Compliance</span>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Basic Conditions of Employment Act</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Minimum Wage</span>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Above national minimum wage</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Working Hours</span>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Within legal limits</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </PageLayout>
  )
}