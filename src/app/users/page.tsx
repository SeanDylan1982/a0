'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  Building, 
  Shield,
  Edit,
  Trash2,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageLayout } from '@/components/page-layout'

interface User {
  id: string
  email: string
  name: string
  role: string
  status: string
  createdAt: string
}

interface Team {
  id: string
  name: string
  description?: string
  leader: User
  members: User[]
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
    fetchTeams()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data.teams)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive",
      })
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.get('email'),
          name: formData.get('name'),
          role: formData.get('role'),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "User created successfully",
        })
        setIsAddUserOpen(false)
        fetchUsers()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to create user",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          leaderId: formData.get('leaderId'),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team created successfully",
        })
        setIsAddTeamOpen(false)
        fetchTeams()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to create team",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive'
      case 'MANAGER': return 'default'
      case 'SALES_STAFF': return 'secondary'
      case 'INVENTORY_MANAGER': return 'outline'
      case 'HR_STAFF': return 'secondary'
      case 'ACCOUNTANT': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'INACTIVE': return 'secondary'
      case 'SUSPENDED': return 'destructive'
      default: return 'secondary'
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <PageLayout currentPage="/users" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Users' }]}>
        {/* Page header with card styling */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-l-4 border-l-teal-500 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">User Management</h1>
                  <p className="text-gray-600 text-sm mb-2">Manage users, teams, and permissions</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-sm font-medium">
                    🇿🇦 POPIA compliant user data management
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">👥</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end mb-6">
          <div className="flex space-x-2">
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account with appropriate permissions
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select name="role" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrator</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="SALES_STAFF">Sales Staff</SelectItem>
                        <SelectItem value="INVENTORY_MANAGER">Inventory Manager</SelectItem>
                        <SelectItem value="HR_STAFF">HR Staff</SelectItem>
                        <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                        <SelectItem value="STAFF">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Create User</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddTeamOpen} onOpenChange={setIsAddTeamOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Add Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>
                    Create a new team and assign a team leader
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddTeam} className="space-y-4">
                  <div>
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input id="teamName" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" />
                  </div>
                  <div>
                    <Label htmlFor="leaderId">Team Leader</Label>
                    <Select name="leaderId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team leader" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN').map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Create Team</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage user accounts and roles</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeColor(user.role)}>
                              {user.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeColor(user.status)}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
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

          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Teams</CardTitle>
                <CardDescription>Manage teams and team assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {teams.map((team) => (
                    <Card key={team.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{team.name}</h3>
                            <p className="text-sm text-gray-600">{team.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {team.leader.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-600">
                                Leader: {team.leader.name}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Users className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Configure permissions for each user role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { role: 'ADMIN', permissions: ['Full system access', 'User management', 'All modules'] },
                    { role: 'MANAGER', permissions: ['Team management', 'Sales oversight', 'Reporting'] },
                    { role: 'SALES_STAFF', permissions: ['Create sales', 'View inventory', 'Customer management'] },
                    { role: 'INVENTORY_MANAGER', permissions: ['Inventory management', 'Purchase orders', 'Stock reports'] },
                    { role: 'HR_STAFF', permissions: ['Employee management', 'Leave requests', 'HR reports'] },
                    { role: 'ACCOUNTANT', permissions: ['Accounting', 'Invoicing', 'Financial reports'] },
                    { role: 'STAFF', permissions: ['Basic access', 'View assigned data'] },
                  ].map((roleConfig) => (
                    <div key={roleConfig.role} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{roleConfig.role.replace('_', ' ')}</h3>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {roleConfig.permissions.map((permission) => (
                          <Badge key={permission} variant="secondary">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </PageLayout>
  )
}