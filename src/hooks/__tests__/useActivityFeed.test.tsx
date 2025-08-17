import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useActivityFeed, useActivityStats, useEntityActivities } from '../useActivityFeed'
import { UserRole } from '@prisma/client'
import { vi } from 'vitest'

// Mock the dependencies
vi.mock('../use-socket', () => ({
  useSocketActivities: vi.fn()
}))

vi.mock('../../contexts/user-context', () => ({
  useUser: vi.fn()
}))

const mockUseSocketActivities = vi.mocked(await import('../use-socket')).useSocketActivities
const mockUseUser = vi.mocked(await import('../../contexts/user-context')).useUser

// Mock fetch
global.fetch = vi.fn()

describe('useActivityFeed', () => {
  let queryClient: QueryClient
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    
    vi.clearAllMocks()
    
    // Default mock implementations
    mockUseUser.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.DIRECTOR
      },
      hasRole: vi.fn(() => true)
    })
    
    mockUseSocketActivities.mockReturnValue({
      activities: [],
      subscribed: false
    })
    
    // Mock successful fetch response
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        activities: [
          {
            id: 'activity-1',
            userId: 'user-1',
            module: 'sales',
            action: 'create',
            entityType: 'invoice',
            entityId: 'invoice-1',
            entityName: 'Invoice #001',
            details: {},
            timestamp: new Date('2024-01-01T10:00:00Z'),
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
            user: {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
              role: UserRole.DIRECTOR
            }
          }
        ]
      })
    })
  })
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
  
  describe('useActivityFeed', () => {
    it('fetches activities successfully', async () => {
      const { result } = renderHook(() => useActivityFeed(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.activities).toHaveLength(1)
      expect(result.current.activities[0].entityName).toBe('Invoice #001')
      expect(result.current.error).toBeNull()
    })
    
    it('filters activities based on user role', async () => {
      // Test with Manager role
      mockUseUser.mockReturnValue({
        user: {
          id: 'user-2',
          email: 'manager@example.com',
          role: UserRole.MANAGER
        },
        hasRole: vi.fn((roles) => roles.includes(UserRole.MANAGER))
      })
      
      const { result } = renderHook(() => useActivityFeed(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // Should call fetch with role-based parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/activities?')
      )
    })
    
    it('handles real-time activity updates', async () => {
      const realtimeActivity = {
        id: 'realtime-1',
        userId: 'user-1',
        module: 'inventory',
        action: 'update',
        entityType: 'product',
        entityName: 'Product A',
        timestamp: new Date('2024-01-01T11:00:00Z'),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: UserRole.DIRECTOR
        }
      }
      
      mockUseSocketActivities.mockReturnValue({
        activities: [realtimeActivity],
        subscribed: true
      })
      
      const { result } = renderHook(() => useActivityFeed({ enableRealtime: true }), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // Should include both fetched and real-time activities
      expect(result.current.activities.length).toBeGreaterThan(0)
      expect(result.current.isRealtimeConnected).toBe(true)
    })
    
    it('applies search and filtering correctly', async () => {
      const { result } = renderHook(() => useActivityFeed(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // Test search functionality
      act(() => {
        result.current.setSearchTerm('invoice')
      })
      expect(result.current.searchTerm).toBe('invoice')
      
      // Test module filtering
      act(() => {
        result.current.setSelectedModules(['sales'])
      })
      expect(result.current.selectedModules).toEqual(['sales'])
      
      // Test action filtering
      act(() => {
        result.current.setSelectedActions(['create'])
      })
      expect(result.current.selectedActions).toEqual(['create'])
    })
    
    it('handles pagination correctly', async () => {
      const { result } = renderHook(() => useActivityFeed(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.currentPage).toBe(1)
      expect(result.current.pageSize).toBe(20)
      
      act(() => {
        result.current.setCurrentPage(2)
      })
      expect(result.current.currentPage).toBe(2)
      
      act(() => {
        result.current.setPageSize(10)
      })
      expect(result.current.pageSize).toBe(10)
    })
    
    it('provides available filter options', async () => {
      const { result } = renderHook(() => useActivityFeed(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.availableModules).toContain('sales')
      expect(result.current.availableActions).toContain('create')
    })
    
    it('handles role-based module access', async () => {
      // Test with Sales Rep role
      mockUseUser.mockReturnValue({
        user: {
          id: 'user-3',
          email: 'sales@example.com',
          role: UserRole.SALES_REP
        },
        hasRole: vi.fn((roles) => roles.includes(UserRole.SALES_REP))
      })
      
      const { result } = renderHook(() => useActivityFeed(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // Sales rep should only see sales-related activities
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('modules=sales')
      )
    })
    
    it('handles fetch errors gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))
      
      const { result } = renderHook(() => useActivityFeed(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.error).toBeTruthy()
      expect(result.current.activities).toHaveLength(0)
    })
    
    it('refreshes data correctly', async () => {
      const { result } = renderHook(() => useActivityFeed(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      // Clear previous calls
      vi.clearAllMocks()
      
      // Call refresh
      result.current.refresh()
      
      // Should trigger new fetch
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })
  
  describe('useActivityStats', () => {
    it('fetches activity statistics', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          totalActivities: 100,
          activitiesByModule: { sales: 50, inventory: 30, hr: 20 },
          activitiesByAction: { create: 40, update: 35, delete: 25 }
        })
      })
      
      const { result } = renderHook(() => useActivityStats(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.stats).toBeDefined()
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/activities/stats')
      )
    })
    
    it('handles time range filtering', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      }
      
      const { result } = renderHook(() => useActivityStats(timeRange), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2024-01-01')
      )
    })
  })
  
  describe('useEntityActivities', () => {
    it('fetches activities for specific entity', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          activities: [
            {
              id: 'activity-1',
              entityType: 'product',
              entityId: 'product-1',
              action: 'update',
              timestamp: new Date()
            }
          ]
        })
      })
      
      const { result } = renderHook(
        () => useEntityActivities('product', 'product-1'),
        { wrapper }
      )
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.activities).toHaveLength(1)
      expect(global.fetch).toHaveBeenCalledWith('/api/activities/product/product-1')
    })
    
    it('does not fetch when entity info is missing', async () => {
      const { result } = renderHook(
        () => useEntityActivities('', ''),
        { wrapper }
      )
      
      expect(result.current.isLoading).toBe(false)
      expect(result.current.activities).toHaveLength(0)
    })
  })
  
  describe('Role-based access control', () => {
    const testRoles = [
      {
        role: UserRole.DIRECTOR,
        expectedModules: undefined, // All modules
        description: 'Director sees all modules'
      },
      {
        role: UserRole.MANAGER,
        expectedModules: ['sales', 'inventory', 'customers', 'invoicing', 'accounting'],
        description: 'Manager sees functional area modules'
      },
      {
        role: UserRole.HOD,
        expectedModules: ['hr', 'users', 'calendar'],
        description: 'HOD sees department modules'
      },
      {
        role: UserRole.SALES_REP,
        expectedModules: ['sales', 'customers', 'invoicing'],
        description: 'Sales rep sees sales-related modules'
      },
      {
        role: UserRole.STAFF_MEMBER,
        expectedModules: ['calendar'],
        description: 'Staff member sees limited modules'
      }
    ]
    
    testRoles.forEach(({ role, expectedModules, description }) => {
      it(description, async () => {
        mockUseUser.mockReturnValue({
          user: {
            id: 'user-test',
            email: 'test@example.com',
            role
          },
          hasRole: vi.fn((roles) => roles.includes(role))
        })
        
        const { result } = renderHook(() => useActivityFeed(), { wrapper })
        
        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })
        
        if (expectedModules) {
          expectedModules.forEach(module => {
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`modules=${module}`)
            )
          })
        }
      })
    })
  })
})