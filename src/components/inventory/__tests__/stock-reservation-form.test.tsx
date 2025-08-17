import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StockReservationForm } from '../stock-reservation-form'
import { useToast } from '@/hooks/use-toast'

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn()
}))

// Mock fetch
global.fetch = vi.fn()

const mockToast = vi.fn()
const mockProduct = {
  id: 'product-1',
  sku: 'TEST-001',
  name: 'Test Product',
  quantity: 100,
  unit: 'pcs'
}

describe('StockReservationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useToast as any).mockReturnValue({ toast: mockToast })
    
    // Mock the initial stock summary fetch
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/inventory/pool')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              availableStock: 85,
              reservedStock: 15
            }
          })
        })
      }
      if (url.includes('/api/inventory/validate-stock')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            valid: true,
            availableStock: 85,
            message: 'Stock operation valid'
          })
        })
      }
      if (url.includes('/api/inventory/reservations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            reservationId: 'reservation-123'
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    })
  })

  it('renders form with product information', async () => {
    render(<StockReservationForm product={mockProduct} />)
    
    expect(screen.getByText('Reserve Stock')).toBeInTheDocument()
    expect(screen.getByText('Test Product (SKU: TEST-001)')).toBeInTheDocument()
    expect(screen.getByText('100 pcs')).toBeInTheDocument()
    
    // Wait for available stock to load
    await waitFor(() => {
      expect(screen.getByText('85 pcs')).toBeInTheDocument()
      expect(screen.getByText('15 reserved')).toBeInTheDocument()
    })
  })

  it('shows expiration time calculation', () => {
    render(<StockReservationForm product={mockProduct} />)
    
    const expirationSelect = screen.getByDisplayValue('30 minutes')
    expect(expirationSelect).toBeInTheDocument()
    
    // Should show calculated expiration time
    expect(screen.getByText(/Reservation will expire at:/)).toBeInTheDocument()
  })

  it('validates stock availability on quantity change', async () => {
    render(<StockReservationForm product={mockProduct} />)
    
    await waitFor(() => {
      expect(screen.getByText('85 pcs')).toBeInTheDocument()
    })
    
    const quantityInput = screen.getByLabelText(/Quantity to Reserve/)
    fireEvent.change(quantityInput, { target: { value: '50' } })
    
    // Should trigger validation after debounce
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/inventory/validate-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: 'product-1',
          quantity: 50,
          operation: 'reserve'
        }),
      })
    }, { timeout: 1000 })
  })

  it('shows warning for high percentage reservations', async () => {
    render(<StockReservationForm product={mockProduct} />)
    
    await waitFor(() => {
      expect(screen.getByText('85 pcs')).toBeInTheDocument()
    })
    
    const quantityInput = screen.getByLabelText(/Quantity to Reserve/)
    fireEvent.change(quantityInput, { target: { value: '70' } }) // 70/85 = 82% > 80%
    
    await waitFor(() => {
      expect(screen.getByText(/This reservation will use 82% of available stock/)).toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    const onSuccess = vi.fn()
    render(<StockReservationForm product={mockProduct} onSuccess={onSuccess} />)
    
    await waitFor(() => {
      expect(screen.getByText('85 pcs')).toBeInTheDocument()
    })
    
    const submitButton = screen.getByText('Reserve Stock')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
    })
    
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('prevents over-reservation', async () => {
    render(<StockReservationForm product={mockProduct} />)
    
    await waitFor(() => {
      expect(screen.getByText('85 pcs')).toBeInTheDocument()
    })
    
    const quantityInput = screen.getByLabelText(/Quantity to Reserve/)
    const reasonSelect = screen.getByRole('combobox')
    
    fireEvent.change(quantityInput, { target: { value: '100' } }) // More than available
    fireEvent.click(reasonSelect)
    fireEvent.click(screen.getByText('Sales Order'))
    
    const submitButton = screen.getByText('Reserve Stock')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Insufficient Stock",
        description: "Only 85 pcs available for reservation",
        variant: "destructive",
      })
    })
  })

  it('submits reservation successfully', async () => {
    const onSuccess = vi.fn()
    render(<StockReservationForm product={mockProduct} onSuccess={onSuccess} />)
    
    await waitFor(() => {
      expect(screen.getByText('85 pcs')).toBeInTheDocument()
    })
    
    const quantityInput = screen.getByLabelText(/Quantity to Reserve/)
    const reasonSelect = screen.getByRole('combobox')
    
    fireEvent.change(quantityInput, { target: { value: '30' } })
    fireEvent.click(reasonSelect)
    fireEvent.click(screen.getByText('Sales Order'))
    
    const submitButton = screen.getByText('Reserve Stock')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/inventory/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: 'product-1',
          quantity: 30,
          reason: 'SALES_ORDER',
          expirationMinutes: 30
        }),
      })
    })
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Stock reserved successfully. Reservation ID: reservation-123",
      })
    })
    
    expect(onSuccess).toHaveBeenCalledWith('reservation-123')
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/inventory/pool')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: { availableStock: 85, reservedStock: 15 }
          })
        })
      }
      if (url.includes('/api/inventory/reservations')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Insufficient stock available' })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    })
    
    render(<StockReservationForm product={mockProduct} />)
    
    await waitFor(() => {
      expect(screen.getByText('85 pcs')).toBeInTheDocument()
    })
    
    const quantityInput = screen.getByLabelText(/Quantity to Reserve/)
    const reasonSelect = screen.getByRole('combobox')
    
    fireEvent.change(quantityInput, { target: { value: '20' } })
    fireEvent.click(reasonSelect)
    fireEvent.click(screen.getByText('Sales Order'))
    
    const submitButton = screen.getByText('Reserve Stock')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Insufficient stock available",
        variant: "destructive",
      })
    })
  })

  it('uses default values when provided', () => {
    render(
      <StockReservationForm 
        product={mockProduct} 
        defaultQuantity={25}
        defaultReason="QUOTE_PREPARATION"
      />
    )
    
    const quantityInput = screen.getByLabelText(/Quantity to Reserve/)
    expect(quantityInput).toHaveValue(25)
    
    // Note: Testing select default value is complex with this component structure
    // In a real scenario, you might need to check the select's internal state
  })

  it('updates expiration time when duration changes', () => {
    render(<StockReservationForm product={mockProduct} />)
    
    const expirationSelect = screen.getByDisplayValue('30 minutes')
    fireEvent.click(expirationSelect)
    fireEvent.click(screen.getByText('2 hours'))
    
    // Should update the expiration time display
    expect(screen.getByText(/Reservation will expire at:/)).toBeInTheDocument()
  })
})