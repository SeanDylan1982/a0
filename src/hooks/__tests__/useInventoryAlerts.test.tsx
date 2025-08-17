import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { 
  useInventoryAlerts, 
  useStockMovementAlerts, 
  useInventoryAlertSummary 
} from '../useInventoryAlerts'
import { UserRole } from '@prisma/client'
import { vi } from 'vitest'

// Mock the dependencies
vi.mock('../use-socket', () => ({
  useSocketInventory: vi.fn()
}))

vi.mock('../../contexts/user-context', () => ({
  useUser: vi.fn()
}))

const mockUseSocketInventory = vi.mocked(await import('../use-socket')).useSocketInventory
const mockUseUser = vi.mocked(await import('../../contexts/user-context')).useUser

// Mock fetch
global.fetch = vi.fn()

describe('useInventoryAlerts', () => {
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
        role: UserRole.INVENTORY_MANAGER
      },
      hasRole: vi.fn((roles) => roles.includes(UserRole.INVENTORY_MANAGER))
    })
    
    mockUseSocketInventory.mockReturnValue({
      alerts: [],
      movements: [],
      subscribed: false
    })
    
    // Mock successful fetch response
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        alerts: [
          {
            id: 'alert-1',
            productId: 'product-1',
            productName: 'Product A',
            currentStock: 5,
            minimumStock: 10,
            alertType: 'LOW_STOCK',
            severity: 'medium',
            timestamp: new Date('2024-01-01T10:00:00Z'),
            acknowledged: false
          }
        ]
      })
    } as any)
  })
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
  
  describe('useInventoryAlerts', () => {
    it('fetches inventory alerts successfully', async () => {
      const { result } = renderHook(() => useInventoryAlerts(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.alerts).toHaveLength(1)
      expect(result.current.alerts[0].productName).toBe('Product A')
      expect(result.current.alerts[0].alertType).toBe('LOW_STOCK')
      expect(result.current.error).toBeNull()
    })
    
    it('respects role-based access control', async () => {
      // Test with unauthorized role
      mockUseUser.mockReturnValue({
        user: {
          id: 'user-2',
          email: 'staff@example.com',
          role: UserRole.STAFF_MEMBER
        },
        hasRole: vi.fn(() => false)
      })
      
      const { result } = renderHook(() => useInventoryAlerts(), { wrapper })
      
      expect(result.current.canViewAlerts).toBe(false)
      expect(result.current.alerts).toHaveLength(0)
    })
    
    it('allows authorized roles to view alerts', async () => {
      const authorizedRoles = [
        UserRole.DIRECTOR,
        UserRole.MANAGER,
        UserRole.INVENTORY_MANAGER,
        UserRole.SALES_REP
      ]
      
      for (const role of authorizedRoles) {
        mockUseUser.mockReturnValue({
          user: {
            id: 'user-test',
            email: 'test@example.com',
            role
          },
          hasRole: vi.fn((roles) => roles.includes(role))
        })
        
        const { result } = renderHook(() => useInventoryAlerts(), { wrapper })
        
        expect(result.current.canViewAlerts).toBe(true)
      }
    })
    
    it('handles real-time alert updates', async () => {
      const realtimeAlert = {
        productId: 'product-2',
        productName: 'Product B',
        currentStock: 0,
        minimumStock: 5,
        alertType: 'OUT_OF_STOCK' as const,
        timestamp: new Date('2024-01-01T11:00:00Z')
      }
      
      mockUseSocketInventory.mockReturnValue({
        alerts: [realtimeAlert],
        movements: [],
        subscribed: true
      })
      
      const { result } = renderHook(() => useInventoryAlerts({ enableRealtime: true }), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.isRealtimeConnected).toBe(true)
      // Should include both fetched and real-time alerts
      expect(result.current.alerts.length).toBeGreaterThan(0)
    })
    
    it('calculates alert counts correctly', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          alerts: [
            {
              id: 'alert-1',
              productId: 'product-1',
              productName: 'Product A',
              alertType: 'LOW_STOCK',
              severity: 'medium',
              acknowledged: false
            },
            {
              id: 'alert-2',
              productId: 'product-2',
              productName: 'Product B',
              alertType: 'OUT_OF_STOCK',
              severity: 'critical',
              acknowledged: false
            },
            {
              id: 'alert-3',
              productId: 'product-3',
              productName: 'Product C',
              alertType: 'CRITICAL',
              severity: 'high',
              acknowledged: true
            }
          ]
        })
      } as any)
      
      const { result } = renderHook(() => useInventoryAlerts(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.alertCounts.critical).toBe(1)
      expect(result.current.alertCounts.high).toBe(0) // The high severity alert is acknowledged, so filtered out
      expect(result.current.alertCounts.medium).toBe(1)
      expect(result.current.alertCounts.total).toBe(2) // Only unacknowledged alerts are counted
    })
    
    it('acknowledges alerts correctly', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ alerts: [{ id: 'alert-1', acknowledged: false }] })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({})
        } as any)
      
      const { result } = renderHook(() => useInventoryAlerts(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      await act(async () => {
        await result.current.acknowledgeAlert('alert-1')
      })
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/alerts/alert-1/acknowledge',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })
    
    it('handles fetch errors gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))
      
      const { result } = renderHook(() => useInventoryAlerts(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.error).toBeTruthy()
      expect(result.current.alerts).toHaveLength(0)
    })
  })
  
  describe('useStockMovementAlerts', () => {
    beforeEach(() => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          movements: [
            {
              id: 'movement-1',
              productId: 'product-1',
              productName: 'Product A',
              type: 'ADJUSTMENT',
              quantity: -50,
              beforeQty: 100,
              afterQty: 50,
              reason: 'Damaged goods',
              userId: 'user-1',
              timestamp: new Date('2024-01-01T10:00:00Z'),
              isSignificant: true
            }
          ]
        })
      } as any)
    })
    
    it('fetches stock movements successfully', async () => {
      const { result } = renderHook(() => useStockMovementAlerts(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.movements).toHaveLength(1)
      expect(result.current.movements[0].type).toBe('ADJUSTMENT')
      expect(result.current.movements[0].isSignificant).toBe(true)
    })
    
    it('respects role-based access for movements', async () => {
      mockUseUser.mockReturnValue({
        user: {
          id: 'user-2',
          email: 'staff@example.com',
          role: UserRole.STAFF_MEMBER
        },
        hasRole: vi.fn(() => false)
      })
      
      const { result } = renderHook(() => useStockMovementAlerts(), { wrapper })
      
      expect(result.current.canViewMovements).toBe(false)
    })
  })
  
  describe('useInventoryAlertSummary', () => {
    it('provides alert summary for dashboard', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          alerts: [
            {
              id: 'alert-1',
              severity: 'critical',
              alertType: 'OUT_OF_STOCK',
              acknowledged: false
            },
            {
              id: 'alert-2',
              severity: 'high',
              alertType: 'LOW_STOCK',
              acknowledged: false
            }
          ]
        })
      } as any)
      
      const { result } = renderHook(() => useInventoryAlertSummary(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      
      expect(result.current.hasCriticalAlerts).toBe(true)
      expect(result.current.hasHighPriorityAlerts).toBe(true)
      expect(result.current.totalUnacknowledgedAlerts).toBe(2)
      expect(result.current.mostUrgentAlert).toBeDefined()
      expect(result.current.mostUrgentAlert?.severity).toBe('critical')
    })
  })
})