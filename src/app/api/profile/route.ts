import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

export async function GET(request: NextRequest) {
  try {
    // In a real application, you would fetch the employee profile from the database
    // For now, we'll return mock data suitable for HR management
    return NextResponse.json(mockProfile)
  } catch (error) {
    console.error('Error fetching employee profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real application, you would update the employee profile in the database
    // For now, we'll just return the updated mock data
    const updatedProfile = {
      ...mockProfile,
      ...body
    }
    
    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error('Error updating employee profile:', error)
    return NextResponse.json(
      { error: 'Failed to update employee profile' },
      { status: 500 }
    )
  }
}