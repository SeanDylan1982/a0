import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}))

// Mock access control manager
vi.mock('@/lib/services/access-control-manager', () => ({
  accessControlManager: {
    hasPermission: vi.fn(),
    hasRole: vi.fn()
  }
}))

import {
  withAuth,
  withPermission,
  withRole,
  withAdminRole,
  withManagementRole,
  withOwnDataAccess,
  extractUserId,
  PERMISSIONS,
  AuthenticatedRequest
} from '../auth-middleware'
import { accessControlManager } from '@/lib/services/access-control-manager'
import { prisma } from '@/lib/prisma'

const mockAccessControlManager = accessControlManager as any
const mockPrisma = prisma as any

describe('Auth Middleware', () => {
  let mockRequest: NextRequest
  let mockHandler: vi.Mock

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost:3500/api/test')
    mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('withAuth', () => {
    it('should authenticate valid user and call handler', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: UserRole.USER,
        name: 'Test User'
      }
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      const requestWithAuth = new NextRequest('http://localhost:3500/api/test', {
        headers: { 'x-user-id': 'user123' }
      })

      const middleware = withAuth(mockHandler)
      const response = await middleware(requestWithAuth)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser
        })
      )
      expect(response).toEqual(NextResponse.json({ success: true }))
    })

    it('should return 401 for missing user header', async () => {
      const middleware = withAuth(mockHandler)
      const response = await middleware(mockRequest)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
      
      const body = await response.json()
      expect(body.error).toBe('Authentication required')
    })

    it('should return 401 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      
      const requestWithAuth = new NextRequest('http://localhost:3500/api/test', {
        headers: { 'x-user-id': 'nonexistent' }
      })

      const middleware = withAuth(mockHandler)
      const response = await middleware(requestWithAuth)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })

    it('should handle authentication errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))
      
      const requestWithAuth = new NextRequest('http://localhost:3500/api/test', {
        headers: { 'x-user-id': 'user123' }
      })

      const middleware = withAuth(mockHandler)
      const response = await middleware(requestWithAuth)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.error).toBe('Authentication failed')
    })
  })

  describe('withPermission', () => {
    const testPermission = PERMISSIONS.SALES_READ

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        role: UserRole.SALES_REP,
        name: 'Test User'
      })
      
      mockRequest = new NextRequest('http://localhost:3500/api/test', {
        headers: { 'x-user-id': 'user123' }
      })
    })

    it('should allow access when user has permission', async () => {
      mockAccessControlManager.hasPermission.mockResolvedValue(true)

      const middleware = withPermission(testPermission, mockHandler)
      const response = await middleware(mockRequest)

      expect(mockAccessControlManager.hasPermission).toHaveBeenCalledWith('user123', testPermission)
      expect(mockHandler).toHaveBeenCalled()
      expect(response).toEqual(NextResponse.json({ success: true }))
    })

    it('should deny access when user lacks permission', async () => {
      mockAccessControlManager.hasPermission.mockResolvedValue(false)

      const middleware = withPermission(testPermission, mockHandler)
      const response = await middleware(mockRequest)

      expect(mockAccessControlManager.hasPermission).toHaveBeenCalledWith('user123', testPermission)
      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
      
      const body = await response.json()
      expect(body.error).toBe('Insufficient permissions')
    })

    it('should handle permission check errors', async () => {
      mockAccessControlManager.hasPermission.mockRejectedValue(new Error('Permission error'))

      const middleware = withPermission(testPermission, mockHandler)
      const response = await middleware(mockRequest)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.error).toBe('Permission check failed')
    })
  })

  describe('withRole', () => {
    const allowedRoles = [UserRole.MANAGER, UserRole.DIRECTOR]

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        role: UserRole.MANAGER,
        name: 'Test User'
      })
      
      mockRequest = new NextRequest('http://localhost:3500/api/test', {
        headers: { 'x-user-id': 'user123' }
      })
    })

    it('should allow access when user has required role', async () => {
      mockAccessControlManager.hasRole.mockResolvedValue(true)

      const middleware = withRole(allowedRoles, mockHandler)
      const response = await middleware(mockRequest)

      expect(mockAccessControlManager.hasRole).toHaveBeenCalledWith('user123', allowedRoles)
      expect(mockHandler).toHaveBeenCalled()
      expect(response).toEqual(NextResponse.json({ success: true }))
    })

    it('should deny access when user lacks required role', async () => {
      mockAccessControlManager.hasRole.mockResolvedValue(false)

      const middleware = withRole(allowedRoles, mockHandler)
      const response = await middleware(mockRequest)

      expect(mockAccessControlManager.hasRole).toHaveBeenCalledWith('user123', allowedRoles)
      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
      
      const body = await response.json()
      expect(body.error).toBe('Insufficient role permissions')
    })
  })

  describe('withAdminRole', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        role: UserRole.DIRECTOR,
        name: 'Test User'
      })
      
      mockRequest = new NextRequest('http://localhost:3500/api/test', {
        headers: { 'x-user-id': 'user123' }
      })
    })

    it('should allow access for director role', async () => {
      mockAccessControlManager.hasRole.mockResolvedValue(true)

      const middleware = withAdminRole(mockHandler)
      const response = await middleware(mockRequest)

      expect(mockAccessControlManager.hasRole).toHaveBeenCalledWith(
        'user123', 
        [UserRole.DIRECTOR, UserRole.MANAGER]
      )
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should deny access for non-admin roles', async () => {
      mockAccessControlManager.hasRole.mockResolvedValue(false)

      const middleware = withAdminRole(mockHandler)
      const response = await middleware(mockRequest)

      expect(response.status).toBe(403)
    })
  })

  describe('withManagementRole', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        role: UserRole.HOD,
        name: 'Test User'
      })
      
      mockRequest = new NextRequest('http://localhost:3500/api/test', {
        headers: { 'x-user-id': 'user123' }
      })
    })

    it('should allow access for management roles', async () => {
      mockAccessControlManager.hasRole.mockResolvedValue(true)

      const middleware = withManagementRole(mockHandler)
      const response = await middleware(mockRequest)

      expect(mockAccessControlManager.hasRole).toHaveBeenCalledWith(
        'user123', 
        [UserRole.DIRECTOR, UserRole.MANAGER, UserRole.HOD]
      )
      expect(mockHandler).toHaveBeenCalled()
    })
  })

  describe('withOwnDataAccess', () => {
    it('should allow directors to access any data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'director123',
        email: 'director@example.com',
        role: UserRole.DIRECTOR,
        name: 'Director'
      })

      const requestWithUserId = new NextRequest('http://localhost:3500/api/users/other123', {
        headers: { 'x-user-id': 'director123' }
      })
      
      const middleware = withOwnDataAccess(mockHandler)
      const response = await middleware(requestWithUserId)

      expect(mockHandler).toHaveBeenCalled()
      expect(response).toEqual(NextResponse.json({ success: true }))
    })

    it('should allow managers to access any data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'manager123',
        email: 'manager@example.com',
        role: UserRole.MANAGER,
        name: 'Manager'
      })

      const requestWithUserId = new NextRequest('http://localhost:3500/api/users/other123', {
        headers: { 'x-user-id': 'manager123' }
      })
      
      const middleware = withOwnDataAccess(mockHandler)
      const response = await middleware(requestWithUserId)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should allow users to access their own data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'user@example.com',
        role: UserRole.SALES_REP,
        name: 'User'
      })

      const requestWithOwnId = new NextRequest('http://localhost:3500/api/users/user123', {
        headers: { 'x-user-id': 'user123' }
      })
      
      const middleware = withOwnDataAccess(mockHandler)
      const response = await middleware(requestWithOwnId)

      expect(mockHandler).toHaveBeenCalled()
      expect(response).toEqual(NextResponse.json({ success: true }))
    })

    it('should deny users access to other users data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'user@example.com',
        role: UserRole.SALES_REP,
        name: 'User'
      })

      const requestWithOtherId = new NextRequest('http://localhost:3500/api/users/other123', {
        headers: { 'x-user-id': 'user123' }
      })
      
      const middleware = withOwnDataAccess(mockHandler)
      const response = await middleware(requestWithOtherId)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
      
      const body = await response.json()
      expect(body.error).toBe('Access denied: can only access own data')
    })

    it('should allow access when no user ID in path', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'user@example.com',
        role: UserRole.SALES_REP,
        name: 'User'
      })

      const requestWithoutUserId = new NextRequest('http://localhost:3500/api/users', {
        headers: { 'x-user-id': 'user123' }
      })
      
      const middleware = withOwnDataAccess(mockHandler)
      const response = await middleware(requestWithoutUserId)

      expect(mockHandler).toHaveBeenCalled()
    })
  })

  describe('extractUserId', () => {
    it('should extract valid MongoDB ObjectId from URL path', () => {
      const request = new NextRequest('http://localhost:3500/api/users/507f1f77bcf86cd799439011')
      const userId = extractUserId(request)
      
      expect(userId).toBe('507f1f77bcf86cd799439011')
    })

    it('should return null for invalid ObjectId format', () => {
      const request = new NextRequest('http://localhost:3500/api/users/invalid-id')
      const userId = extractUserId(request)
      
      expect(userId).toBeNull()
    })

    it('should return null when no ObjectId in path', () => {
      const request = new NextRequest('http://localhost:3500/api/users')
      const userId = extractUserId(request)
      
      expect(userId).toBeNull()
    })

    it('should handle malformed URLs gracefully', () => {
      const request = new NextRequest('invalid-url')
      const userId = extractUserId(request)
      
      expect(userId).toBeNull()
    })
  })

  describe('PERMISSIONS constants', () => {
    it('should have all required permission constants', () => {
      expect(PERMISSIONS.DASHBOARD_READ).toEqual({
        module: 'dashboard',
        action: 'read'
      })

      expect(PERMISSIONS.SALES_CREATE).toEqual({
        module: 'sales',
        action: 'create'
      })

      expect(PERMISSIONS.INVENTORY_UPDATE).toEqual({
        module: 'inventory',
        action: 'update'
      })

      expect(PERMISSIONS.USERS_DELETE).toEqual({
        module: 'users',
        action: 'delete'
      })
    })
  })

  describe('Integration Tests', () => {
    it('should work with chained middleware', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        role: UserRole.SALES_REP,
        name: 'Test User'
      })
      mockAccessControlManager.hasPermission.mockResolvedValue(true)

      const requestWithAuth = new NextRequest('http://localhost:3500/api/test', {
        headers: { 'x-user-id': 'user123' }
      })

      const middleware = withPermission(PERMISSIONS.SALES_READ, mockHandler)
      const response = await middleware(requestWithAuth)

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'user123',
            role: UserRole.SALES_REP
          })
        })
      )
      expect(response).toEqual(NextResponse.json({ success: true }))
    })

    it('should handle complex permission scenarios', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        role: UserRole.STAFF_MEMBER,
        name: 'Test User'
      })
      mockAccessControlManager.hasPermission.mockResolvedValue(false)

      const requestWithAuth = new NextRequest('http://localhost:3500/api/test', {
        headers: { 'x-user-id': 'user123' }
      })

      const middleware = withPermission(PERMISSIONS.SALES_CREATE, mockHandler)
      const response = await middleware(requestWithAuth)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
    })
  })
})