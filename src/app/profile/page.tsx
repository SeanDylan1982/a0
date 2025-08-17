'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase,
  Edit,
  Save,
  Camera,
  Upload,
  Shield,
  Settings,
  IdCard,
  FileText,
  Award,
  Building,
  Users
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageLayout } from '@/components/page-layout'

interface EmployeeProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  position?: string
  department?: string
  bio?: string
  address?: string
  city?: string
  country?: string
  postalCode?: string
  startDate?: string
  profileImage?: string
  isActive: boolean
  lastLogin?: string
  // Additional HR fields
  idNumber?: string
  idPhoto?: string
  driversLicense?: string
  driversLicensePhoto?: string
  otherLicenses?: string[]
  emergencyContact?: string
  emergencyPhone?: string
  bankName?: string
  bankAccount?: string
  bankBranch?: string
  taxNumber?: string
  salary?: number
  employmentType?: 'permanent' | 'contract' | 'temporary' | 'internship'
  managerId?: string
  managerName?: string
  documents?: {
    name: string
    url: string
    uploadedDate: string
  }[]
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState<Partial<EmployeeProfile>>({})
  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'documents' | 'banking'>('personal')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData(data)
      } else {
        // Mock data for development - HR manager view
        const mockProfile: EmployeeProfile = {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@company.co.za',
          phone: '+27 11 123 4567',
          position: 'Senior Developer',
          department: 'IT',
          bio: 'Passionate about creating innovative solutions and building scalable applications.',
          address: '123 Tech Street',
          city: 'Johannesburg',
          country: 'South Africa',
          postalCode: '2000',
          startDate: '2023-01-15',
          profileImage: '/placeholder-avatar.jpg',
          isActive: true,
          lastLogin: new Date().toISOString(),
          // Additional HR fields
          idNumber: '9001015800085',
          idPhoto: '/placeholder-id.jpg',
          driversLicense: 'DL123456789',
          driversLicensePhoto: '/placeholder-license.jpg',
          otherLicenses: ['Professional Driver Permit', 'First Aid Certificate'],
          emergencyContact: 'Jane Doe',
          emergencyPhone: '+27 11 987 6543',
          bankName: 'First National Bank',
          bankAccount: '62512345678',
          bankBranch: 'Sandton City',
          taxNumber: '1234567890',
          salary: 45000,
          employmentType: 'permanent',
          managerId: '2',
          managerName: 'Sarah Smith',
          documents: [
            { name: 'ID Document', url: '/placeholder-id.jpg', uploadedDate: '2023-01-15' },
            { name: 'Drivers License', url: '/placeholder-license.jpg', uploadedDate: '2023-01-15' },
            { name: 'Employment Contract', url: '/placeholder-contract.pdf', uploadedDate: '2023-01-15' }
          ]
        }
        setProfile(mockProfile)
        setFormData(mockProfile)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/profile/upload-image', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(prev => prev ? { ...prev, profileImage: data.imageUrl } : null)
        setFormData(prev => ({ ...prev, profileImage: data.imageUrl }))
        toast({
          title: "Success",
          description: "Profile image updated successfully"
        })
      } else {
        throw new Error('Failed to upload image')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload profile image",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        setIsEditing(false)
        toast({
          title: "Success",
          description: "Profile updated successfully"
        })
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      })
    }
  }

  const handleInputChange = (field: keyof EmployeeProfile, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const renderPersonalInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          value={formData.firstName || ''}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          value={formData.lastName || ''}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone || ''}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="idNumber">ID Number</Label>
        <Input
          id="idNumber"
          value={formData.idNumber || ''}
          onChange={(e) => handleInputChange('idNumber', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="emergencyContact">Emergency Contact</Label>
        <Input
          id="emergencyContact"
          value={formData.emergencyContact || ''}
          onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="emergencyPhone">Emergency Phone</Label>
        <Input
          id="emergencyPhone"
          value={formData.emergencyPhone || ''}
          onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address || ''}
          onChange={(e) => handleInputChange('address', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          value={formData.city || ''}
          onChange={(e) => handleInputChange('city', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          value={formData.country || ''}
          onChange={(e) => handleInputChange('country', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="postalCode">Postal Code</Label>
        <Input
          id="postalCode"
          value={formData.postalCode || ''}
          onChange={(e) => handleInputChange('postalCode', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={formData.bio || ''}
          onChange={(e) => handleInputChange('bio', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
          rows={3}
          placeholder="Employee bio and notes..."
        />
      </div>
    </div>
  )

  const renderEmploymentInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <Label htmlFor="position">Position</Label>
        <Input
          id="position"
          value={formData.position || ''}
          onChange={(e) => handleInputChange('position', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="department">Department</Label>
        <Input
          id="department"
          value={formData.department || ''}
          onChange={(e) => handleInputChange('department', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="startDate">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={formData.startDate || ''}
          onChange={(e) => handleInputChange('startDate', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="employmentType">Employment Type</Label>
        <select
          id="employmentType"
          value={formData.employmentType || ''}
          onChange={(e) => handleInputChange('employmentType', e.target.value as any)}
          disabled={!isEditing}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select type</option>
          <option value="permanent">Permanent</option>
          <option value="contract">Contract</option>
          <option value="temporary">Temporary</option>
          <option value="internship">Internship</option>
        </select>
      </div>
      <div>
        <Label htmlFor="salary">Salary (ZAR)</Label>
        <Input
          id="salary"
          type="number"
          value={formData.salary || ''}
          onChange={(e) => handleInputChange('salary', Number(e.target.value))}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="managerName">Manager</Label>
        <Input
          id="managerName"
          value={formData.managerName || ''}
          onChange={(e) => handleInputChange('managerName', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="driversLicense">Driver's License</Label>
        <Input
          id="driversLicense"
          value={formData.driversLicense || ''}
          onChange={(e) => handleInputChange('driversLicense', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="taxNumber">Tax Number</Label>
        <Input
          id="taxNumber"
          value={formData.taxNumber || ''}
          onChange={(e) => handleInputChange('taxNumber', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
    </div>
  )

  const renderBankingInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <Label htmlFor="bankName">Bank Name</Label>
        <Input
          id="bankName"
          value={formData.bankName || ''}
          onChange={(e) => handleInputChange('bankName', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="bankAccount">Bank Account</Label>
        <Input
          id="bankAccount"
          value={formData.bankAccount || ''}
          onChange={(e) => handleInputChange('bankAccount', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="bankBranch">Bank Branch</Label>
        <Input
          id="bankBranch"
          value={formData.bankBranch || ''}
          onChange={(e) => handleInputChange('bankBranch', e.target.value)}
          disabled={!isEditing}
          className="mt-1"
        />
      </div>
    </div>
  )

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="idPhoto">ID Document</Label>
          <div className="mt-1">
            {formData.idPhoto ? (
              <div className="border rounded-lg p-4">
                <img src={formData.idPhoto} alt="ID Document" className="w-full h-32 object-cover rounded" />
                <p className="text-sm text-gray-600 mt-2">ID Document uploaded</p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No ID document uploaded</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="driversLicensePhoto">Driver's License</Label>
          <div className="mt-1">
            {formData.driversLicensePhoto ? (
              <div className="border rounded-lg p-4">
                <img src={formData.driversLicensePhoto} alt="Driver's License" className="w-full h-32 object-cover rounded" />
                <p className="text-sm text-gray-600 mt-2">Driver's license uploaded</p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No driver's license uploaded</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <Label>Other Licenses</Label>
        <div className="mt-1">
          {formData.otherLicenses && formData.otherLicenses.length > 0 ? (
            <div className="space-y-2">
              {formData.otherLicenses.map((license, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span>{license}</span>
                  {isEditing && (
                    <Button variant="outline" size="sm" onClick={() => {
                      const updatedLicenses = formData.otherLicenses?.filter((_, i) => i !== index)
                      handleInputChange('otherLicenses', updatedLicenses || [])
                    }}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No additional licenses</p>
          )}
          {isEditing && (
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Add new license"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const newLicense = e.currentTarget.value.trim()
                    if (newLicense) {
                      const currentLicenses = formData.otherLicenses || []
                      handleInputChange('otherLicenses', [...currentLicenses, newLicense])
                      e.currentTarget.value = ''
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>Documents</Label>
        <div className="mt-1">
          {formData.documents && formData.documents.length > 0 ? (
            <div className="space-y-2">
              {formData.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-gray-600">Uploaded: {new Date(doc.uploadedDate).toLocaleDateString()}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No documents uploaded</p>
          )}
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <PageLayout currentPage="/profile" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Profile' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    )
  }

  if (!profile) {
    return (
      <PageLayout currentPage="/profile" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Profile' }]}>
        <div className="text-center">
          <p className="text-gray-500">Profile not found</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout currentPage="/profile" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Profile' }]}>
        {/* Page header with card styling */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Profile Management</h1>
                  <p className="text-gray-600 text-lg mb-3">Manage employee information, documents, and employment details</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    <Users className="h-4 w-4 mr-1" /> HR Management
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl">👤</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="relative inline-block">
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src={profile.profileImage} alt={profile.firstName} />
                    <AvatarFallback className="text-2xl">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors">
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>
                <CardTitle className="text-xl">
                  {profile.firstName} {profile.lastName}
                </CardTitle>
                <CardDescription>
                  {profile.position} • {profile.department}
                </CardDescription>
                <div className="flex justify-center mt-2 space-x-2">
                  <Badge variant={profile.isActive ? 'default' : 'secondary'}>
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {profile.employmentType && (
                    <Badge variant="outline">
                      {profile.employmentType.charAt(0).toUpperCase() + profile.employmentType.slice(1)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{profile.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{profile.phone}</span>
                    </div>
                  )}
                  {profile.idNumber && (
                    <div className="flex items-center space-x-2">
                      <IdCard className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">ID: {profile.idNumber}</span>
                    </div>
                  )}
                  {profile.startDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Started {new Date(profile.startDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {profile.managerName && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Manager: {profile.managerName}</span>
                    </div>
                  )}
                  {profile.lastLogin && (
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Last login {new Date(profile.lastLogin).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Employee Information</CardTitle>
                    <CardDescription>
                      Manage employee details, employment information, and documents
                    </CardDescription>
                  </div>
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    disabled={isUploading}
                  >
                    {isEditing ? (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('personal')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'personal'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <User className="h-4 w-4 inline mr-2" />
                      Personal Info
                    </button>
                    <button
                      onClick={() => setActiveTab('employment')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'employment'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Briefcase className="h-4 w-4 inline mr-2" />
                      Employment
                    </button>
                    <button
                      onClick={() => setActiveTab('documents')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'documents'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="h-4 w-4 inline mr-2" />
                      Documents
                    </button>
                    <button
                      onClick={() => setActiveTab('banking')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'banking'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Building className="h-4 w-4 inline mr-2" />
                      Banking
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                  {activeTab === 'personal' && renderPersonalInfo()}
                  {activeTab === 'employment' && renderEmploymentInfo()}
                  {activeTab === 'documents' && renderDocuments()}
                  {activeTab === 'banking' && renderBankingInfo()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </PageLayout>
  )
}