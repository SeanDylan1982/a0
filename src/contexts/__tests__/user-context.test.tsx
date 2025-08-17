import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserProvider, useUser, useCurrentUser, useUserPermissions, useUserNotifications } from '../user-context'
import { UserRole, NotificationType } from '@prisma/client'
import { vi } from 'vitest'

// Mock the hooks that UserContext depends on
vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: vi.fn()
}))

vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
  useNotificationCount: vi.fn()
}))

vi.mock('../../hooks/use-socket', () => ({
  useSocketNotifications: vi.fn()
}))

const mockUsePermissions = vi.mocked(await import('../../hooks/usePermissions')).usePermissions
const mockUseNotificationCount = vi.mocked(await import('../../hooks/useNotifications')).useNotificationCount
const mockUseSocketNotifications = vi.mocked(await import('../../hooks/use-socket')).useSocketNotifications

// Test component that uses the user context
function TestComponent() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    permissions,
    hasPermission,
    hasRole,
    isAdmin,
    isManagement,
    unreadNotificationCounts,
    totalUnreadCount,
    isSocketConnected,
    error
  } = useUser()
  
  return (
    <div>
      <div data-testid="user-email">{user?.email || 'No user'}</div>
      <div data-testid="user-role">{user?.role || 'No role'}</div>
      <div data-testid="is-authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="permissions-count">{permissions.length}</div>
      <div data-testid="is-admin">{isAdmin.toString()}</div>
      <div data-testid="is-management">{isManagement.toString()}</div>
      <div data-testid="total-unread">{totalUnreadCount}</div>
      <div data-testid="socket-connected">{isSocketConnected.toString()}</div>
      <div data-testid="error">{error || 'No error'}</div>
    </div>
  )
}

function TestConvenienceHooks() {
  const user = useCurrentUser()
  const { hasPermission, isAdmin } = useUserPermissions()
  const { totalUnreadCount } = useUserNotifications()
  
  return (
    <div>
      <div data-testid="current-user">{user?.email || 'No user'}</div>
      <div data-testid="convenience-admin">{isAdmin.toString()}</div>
      <div data-testid="convenience-unread">{totalUnreadCount}</div>
    </div>
  )
}

describe('UserContext', () => {
  let queryClient: QueryClient
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    
    // Reset mocks
    vi.clearAllMocks()
    
    // Default mock implementations
    mockUsePermissions.mockReturnValue({
      permissions: [
        { module: 'sales', action: 'read' },
        { module: 'inventory', action: 'read' }
      ],
      hasPermission: vi.fn(() => true),
      hasRole: vi.fn(() => false),
      isLoading: false,
      error: null
    })
    
    mockUseNotificationCount.mockReturnValue({
      count: 0
    })
    
    mockUseSocketNotifications.mockReturnValue({
      counts: {},
      subscribed: false
    })
  })
  
  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          {component}
        </UserProvider>
      </QueryClientProvider>
    )
  }
  
  describe('UserProvider', () => {
    it('provides user context with mock data', async () => {
      renderWithProviders(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('dev@example.com')
        expect(screen.getByTestId('user-role')).toHaveTextContent('DIRECTOR')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      })
    })
    
    it('provides permissions data', async () => {
      renderWithProviders(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('permissions-count')).toHaveTextContent('2')
      })
    })
    
    it('calculates admin and management roles correctly', async () => {
      mockUsePermissions.mockReturnValue({
        permissions: [],
        hasPermission: vi.fn(() => true),
        hasRole: vi.fn((roles) => roles.includes(UserRole.DIRECTOR)),
        isLoading: false,
        error: null
      })
      
      renderWithProviders(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('is-admin')).toHaveTextContent('true')
        expect(screen.getByTestId('is-management')).toHaveTextContent('true')
      })
    })
    
    it('handles loading state', async () => {
      mockUsePermissions.mockReturnValue({
        permissions: [],
        hasPermission: vi.fn(() => false),
        hasRole: vi.fn(() => false),
        isLoading: true,
        error: null
      })
      
      renderWithProviders(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('true')
      })
    })
    
    it('handles error state', async () => {
      const errorMessage = 'Permission fetch failed'
      mockUsePermissions.mockReturnValue({
        permissions: [],
        hasPermission: vi.fn(() => false),
        hasRole: vi.fn(() => false),
        isLoading: false,
        error: errorMessage
      })
      
      renderWithProviders(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(errorMessage)
      })
    })
    
    it('calculates notification counts correctly', async () => {
      mockUseNotificationCount
        .mockReturnValueOnce({ count: 5 }) // CALENDAR_REMINDER
        .mockReturnValueOnce({ count: 3 }) // MESSAGE
        .mockReturnValueOnce({ count: 2 }) // NOTICE_BOARD
        .mockReturnValueOnce({ count: 1 }) // INVENTORY_ALERT
        .mockReturnValueOnce({ count: 0 }) // ACTIVITY
        .mockReturnValueOnce({ count: 0 }) // SYSTEM
      
      renderWithProviders(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('total-unread')).toHaveTextContent('11')
      })
    })
    
    it('prioritizes real-time counts over static counts', async () => {
      mockUseNotificationCount.mockReturnValue({ count: 5 })
      
      mockUseSocketNotifications.mockReturnValue({
        counts: {
          [NotificationType.MESSAGE]: 10,
          [NotificationType.CALENDAR_REMINDER]: 3
        },
        subscribed: true
      })
      
      renderWithProviders(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('socket-connected')).toHaveTextContent('true')
        // Should use real-time counts where available (10 + 3) + static counts for others (5 * 4) = 33
        expect(screen.getByTestId('total-unread')).toHaveTextContent('33')
      })
    })
  })
  
  describe('Convenience hooks', () => {
    it('useCurrentUser returns current user', async () => {
      renderWithProviders(<TestConvenienceHooks />)
      
      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('dev@example.com')
      })
    })
    
    it('useUserPermissions returns permission functions', async () => {
      mockUsePermissions.mockReturnValue({
        permissions: [],
        hasPermission: vi.fn(() => true),
        hasRole: vi.fn((roles) => roles.includes(UserRole.DIRECTOR)),
        isLoading: false,
        error: null
      })
      
      renderWithProviders(<TestConvenienceHooks />)
      
      await waitFor(() => {
        expect(screen.getByTestId('convenience-admin')).toHaveTextContent('true')
      })
    })
    
    it('useUserNotifications returns notification data', async () => {
      mockUseNotificationCount.mockReturnValue({ count: 7 })
      
      renderWithProviders(<TestConvenienceHooks />)
      
      await waitFor(() => {
        expect(screen.getByTestId('convenience-unread')).toHaveTextContent('42') // 7 * 6 notification types
      })
    })
  })
  
  describe('Error handling', () => {
    it('throws error when useUser is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        render(<TestComponent />)
      }).toThrow('useUser must be used within a UserProvider')
      
      consoleSpy.mockRestore()
    })
  })
  
  describe('Role-based functionality', () => {
    it('correctly identifies different user roles', async () => {
      const testCases = [
        { role: UserRole.DIRECTOR, isAdmin: true, isManagement: true },
        { role: UserRole.MANAGER, isAdmin: true, isManagement: true },
        { role: UserRole.HOD, isAdmin: false, isManagement: true },
        { role: UserRole.STAFF_MEMBER, isAdmin: false, isManagement: false }
      ]
      
      for (const testCase of testCases) {
        mockUsePermissions.mockReturnValue({
          permissions: [],
          hasPermission: vi.fn(() => true),
          hasRole: vi.fn((roles) => roles.includes(testCase.role)),
          isLoading: false,
          error: null
        })
        
        const { rerender } = renderWithProviders(<TestComponent />)
        
        await waitFor(() => {
          expect(screen.getByTestId('is-admin')).toHaveTextContent(testCase.isAdmin.toString())
          expect(screen.getByTestId('is-management')).toHaveTextContent(testCase.isManagement.toString())
        })
        
        // Clean up for next iteration
        rerender(<div />)
      }
    })
  })
})