import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StockAdjustmentForm } from '../stock-adjustment-form'
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
  quantity: 50,
  minStock: 10,
  unit: 'pcs'
}

describe('StockAdjustmentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useToast as any).mockReturnValue({ toast: mockToast })
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })
  })

  it('renders form with product information', () => {
    render(<StockAdjustmentForm product={mockProduct} />)
    
    expect(screen.getByText('Stock Adjustment')).toBeInTheDocument()
    expect(screen.getByText('Test Product (SKU: TEST-001)')).toBeInTheDocument()
    expect(screen.getByText('50 pcs')).toBeInTheDocument()
    expect(screen.getByText('10 pcs')).toBeInTheDocument()
  })

  it('allows switching between increase and decrease', () => {
    render(<StockAdjustmentForm product={mockProduct} />)
    
    const increaseButton = screen.getByText('Increase Stock')
    const decreaseButton = screen.getByText('Decrease Stock')
    
    expect(increaseButton).toHaveClass('bg-primary') // Default selected
    
    fireEvent.click(decreaseButton)
    expect(decreaseButton).toHaveClass('bg-primary')
  })

  it('shows new stock level calculation', async () => {
    render(<StockAdjustmentForm product={mockProduct} />)
    
    const quantityInput = screen.getByLabelText(/Adjustment Quantity/)
    fireEvent.change(quantityInput, { target: { value: '20' } })
    
    await waitFor(() => {
      expect(screen.getByText(/New stock level will be: 70 pcs/)).toBeInTheDocument()
    })
  })

  it('shows below minimum stock warning', async () => {
    render(<StockAdjustmentForm product={mockProduct} />)
    
    // Switch to decrease
    fireEvent.click(screen.getByText('Decrease Stock'))
    
    const quantityInput = screen.getByLabelText(/Adjustment Quantity/)
    fireEvent.change(quantityInput, { target: { value: '45' } }) // 50 - 45 = 5, below min of 10
    
    await waitFor(() => {
      expect(screen.getByText('Below minimum stock')).toBeInTheDocument()
    })
  })

  it('shows approval warning for large adjustments', async () => {
    render(<StockAdjustmentForm product={mockProduct} />)
    
    const quantityInput = screen.getByLabelText(/Adjustment Quantity/)
    fireEvent.change(quantityInput, { target: { value: '150' } }) // Large adjustment
    
    await waitFor(() => {
      expect(screen.getByText(/exceeds the threshold and will require management approval/)).toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    const onSuccess = vi.fn()
    render(<StockAdjustmentForm product={mockProduct} onSuccess={onSuccess} />)
    
    const submitButton = screen.getByText('Apply Adjustment')
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

  it('prevents reducing stock below zero', async () => {
    render(<StockAdjustmentForm product={mockProduct} />)
    
    // Switch to decrease
    fireEvent.click(screen.getByText('Decrease Stock'))
    
    const quantityInput = screen.getByLabelText(/Adjustment Quantity/)
    const reasonSelect = screen.getByRole('combobox')
    
    fireEvent.change(quantityInput, { target: { value: '60' } }) // More than current stock
    fireEvent.click(reasonSelect)
    fireEvent.click(screen.getByText('Breakage'))
    
    const submitButton = screen.getByText('Apply Adjustment')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Invalid Adjustment",
        description: "Cannot reduce stock below zero",
        variant: "destructive",
      })
    })
  })

  it('submits adjustment successfully', async () => {
    const onSuccess = vi.fn()
    render(<StockAdjustmentForm product={mockProduct} onSuccess={onSuccess} />)
    
    const quantityInput = screen.getByLabelText(/Adjustment Quantity/)
    const reasonSelect = screen.getByRole('combobox')
    
    fireEvent.change(quantityInput, { target: { value: '25' } })
    fireEvent.click(reasonSelect)
    fireEvent.click(screen.getByText('Breakage'))
    
    const submitButton = screen.getByText('Apply Adjustment')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/inventory/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: 'product-1',
          quantity: 25,
          reason: 'BREAKAGE',
          notes: '',
          requireApproval: false
        }),
      })
    })
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Stock adjustment completed successfully",
      })
    })
    
    expect(onSuccess).toHaveBeenCalled()
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Insufficient permissions' })
    })
    
    render(<StockAdjustmentForm product={mockProduct} />)
    
    const quantityInput = screen.getByLabelText(/Adjustment Quantity/)
    const reasonSelect = screen.getByRole('combobox')
    
    fireEvent.change(quantityInput, { target: { value: '10' } })
    fireEvent.click(reasonSelect)
    fireEvent.click(screen.getByText('Breakage'))
    
    const submitButton = screen.getByText('Apply Adjustment')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Insufficient permissions",
        variant: "destructive",
      })
    })
  })

  it('handles network errors', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('Network error'))
    
    render(<StockAdjustmentForm product={mockProduct} />)
    
    const quantityInput = screen.getByLabelText(/Adjustment Quantity/)
    const reasonSelect = screen.getByRole('combobox')
    
    fireEvent.change(quantityInput, { target: { value: '10' } })
    fireEvent.click(reasonSelect)
    fireEvent.click(screen.getByText('Breakage'))
    
    const submitButton = screen.getByText('Apply Adjustment')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    })
  })
})