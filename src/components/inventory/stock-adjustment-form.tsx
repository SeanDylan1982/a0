'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Package, Plus, Minus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { VALID_ADJUSTMENT_REASONS } from '@/lib/services/inventory-pool'

interface Product {
  id: string
  sku: string
  name: string
  quantity: number
  minStock: number
  unit: string
}

interface StockAdjustmentFormProps {
  product: Product
  onSuccess?: () => void
  onCancel?: () => void
}

export function StockAdjustmentForm({ product, onSuccess, onCancel }: StockAdjustmentFormProps) {
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const { toast } = useToast()

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value) || 0
    setQuantity(value)
    
    // Check if adjustment requires approval (threshold: 100 units)
    setRequiresApproval(numValue > 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!quantity || !reason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const adjustmentQuantity = adjustmentType === 'increase' 
      ? parseInt(quantity) 
      : -parseInt(quantity)

    if (adjustmentType === 'decrease' && product.quantity + adjustmentQuantity < 0) {
      toast({
        title: "Invalid Adjustment",
        description: "Cannot reduce stock below zero",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: adjustmentQuantity,
          reason,
          notes,
          requireApproval: requiresApproval
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: requiresApproval 
            ? "Stock adjustment submitted for approval"
            : "Stock adjustment completed successfully",
        })
        onSuccess?.()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to process stock adjustment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const newQuantity = adjustmentType === 'increase' 
    ? product.quantity + (parseInt(quantity) || 0)
    : product.quantity - (parseInt(quantity) || 0)

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <span>Stock Adjustment</span>
        </CardTitle>
        <CardDescription>
          Adjust stock levels for {product.name} (SKU: {product.sku})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Stock Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Current Stock</Label>
                <div className="text-2xl font-bold">{product.quantity} {product.unit}</div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Minimum Stock</Label>
                <div className="text-lg">{product.minStock} {product.unit}</div>
              </div>
            </div>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <div className="flex space-x-4">
              <Button
                type="button"
                variant={adjustmentType === 'increase' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('increase')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Increase Stock</span>
              </Button>
              <Button
                type="button"
                variant={adjustmentType === 'decrease' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('decrease')}
                className="flex items-center space-x-2"
              >
                <Minus className="h-4 w-4" />
                <span>Decrease Stock</span>
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Adjustment Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="Enter quantity to adjust"
              required
            />
            {quantity && (
              <div className="text-sm text-gray-600">
                New stock level will be: <strong>{newQuantity} {product.unit}</strong>
                {newQuantity <= product.minStock && (
                  <Badge variant="destructive" className="ml-2">Below minimum stock</Badge>
                )}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Adjustment Reason *</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason for this adjustment" />
              </SelectTrigger>
              <SelectContent>
                {VALID_ADJUSTMENT_REASONS.map((reasonOption) => (
                  <SelectItem key={reasonOption} value={reasonOption}>
                    {reasonOption.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide additional details about this adjustment..."
              rows={3}
            />
          </div>

          {/* Approval Warning */}
          {requiresApproval && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This adjustment exceeds the threshold and will require management approval before being processed.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : requiresApproval ? 'Submit for Approval' : 'Apply Adjustment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}