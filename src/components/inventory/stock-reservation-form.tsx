'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Clock, Package, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Product {
  id: string
  sku: string
  name: string
  quantity: number
  unit: string
}

interface StockReservationFormProps {
  product: Product
  onSuccess?: (reservationId: string) => void
  onCancel?: () => void
  defaultQuantity?: number
  defaultReason?: string
}

export function StockReservationForm({ 
  product, 
  onSuccess, 
  onCancel, 
  defaultQuantity,
  defaultReason 
}: StockReservationFormProps) {
  const [quantity, setQuantity] = useState(defaultQuantity?.toString() || '')
  const [reason, setReason] = useState(defaultReason || '')
  const [expirationMinutes, setExpirationMinutes] = useState('30')
  const [availableStock, setAvailableStock] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const { toast } = useToast()

  // Fetch available stock when component mounts
  useEffect(() => {
    fetchAvailableStock()
  }, [product.id])

  const fetchAvailableStock = async () => {
    try {
      const response = await fetch(`/api/inventory/pool?productId=${product.id}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableStock(data.data.availableStock)
      }
    } catch (error) {
      console.error('Failed to fetch available stock:', error)
    }
  }

  const validateReservation = async () => {
    if (!quantity) return

    setIsValidating(true)
    try {
      const response = await fetch('/api/inventory/validate-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: parseInt(quantity),
          operation: 'reserve'
        }),
      })

      const data = await response.json()
      
      if (!data.valid) {
        toast({
          title: "Insufficient Stock",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Stock validation failed:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleQuantityChange = (value: string) => {
    setQuantity(value)
    // Debounce validation
    setTimeout(() => {
      if (value && parseInt(value) > 0) {
        validateReservation()
      }
    }, 500)
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

    const reservationQuantity = parseInt(quantity)
    
    if (reservationQuantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Reservation quantity must be positive",
        variant: "destructive",
      })
      return
    }

    if (availableStock !== null && reservationQuantity > availableStock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${availableStock} ${product.unit} available for reservation`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/inventory/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: reservationQuantity,
          reason,
          expirationMinutes: parseInt(expirationMinutes)
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Stock reserved successfully. Reservation ID: ${data.reservationId}`,
        })
        onSuccess?.(data.reservationId)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create stock reservation",
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

  const expirationTime = new Date(Date.now() + parseInt(expirationMinutes) * 60 * 1000)

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Reserve Stock</span>
        </CardTitle>
        <CardDescription>
          Reserve stock for {product.name} (SKU: {product.sku})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Stock Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Total Stock</Label>
                <div className="text-2xl font-bold">{product.quantity} {product.unit}</div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Available for Reservation</Label>
                <div className="text-lg">
                  {availableStock !== null ? (
                    <>
                      {availableStock} {product.unit}
                      {availableStock !== product.quantity && (
                        <Badge variant="secondary" className="ml-2">
                          {product.quantity - availableStock} reserved
                        </Badge>
                      )}
                    </>
                  ) : (
                    'Loading...'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Reserve *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={availableStock || undefined}
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="Enter quantity to reserve"
              required
            />
            {isValidating && (
              <div className="text-sm text-gray-500">Validating availability...</div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reservation Reason *</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger>
                <SelectValue placeholder="Select reason for reservation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALES_ORDER">Sales Order</SelectItem>
                <SelectItem value="PURCHASE_ORDER">Purchase Order Processing</SelectItem>
                <SelectItem value="QUOTE_PREPARATION">Quote Preparation</SelectItem>
                <SelectItem value="CUSTOMER_HOLD">Customer Hold</SelectItem>
                <SelectItem value="QUALITY_CHECK">Quality Check</SelectItem>
                <SelectItem value="TRANSFER_PREPARATION">Transfer Preparation</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="expiration">Reservation Duration</Label>
            <Select value={expirationMinutes} onValueChange={setExpirationMinutes}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
                <SelectItem value="480">8 hours</SelectItem>
                <SelectItem value="1440">24 hours</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600">
              Reservation will expire at: <strong>{expirationTime.toLocaleString()}</strong>
            </div>
          </div>

          {/* Warning for low stock */}
          {availableStock !== null && parseInt(quantity) > availableStock * 0.8 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This reservation will use {Math.round((parseInt(quantity) / availableStock) * 100)}% of available stock.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isValidating || !availableStock}
            >
              {isSubmitting ? 'Creating Reservation...' : 'Reserve Stock'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}