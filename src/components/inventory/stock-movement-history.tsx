'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  History, 
  Calendar as CalendarIcon, 
  Filter, 
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  AlertTriangle,
  RotateCcw,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

interface StockMovement {
  id: string
  productId: string
  type: string
  quantity: number
  reason: string
  reference?: string
  userId: string
  beforeQty: number
  afterQty: number
  timestamp: string
  user?: {
    name: string
    email: string
  }
  product?: {
    name: string
    sku: string
    unit: string
  }
}

interface StockMovementHistoryProps {
  productId?: string
  showProductInfo?: boolean
  maxHeight?: string
}

export function StockMovementHistory({ 
  productId, 
  showProductInfo = false,
  maxHeight = "600px"
}: StockMovementHistoryProps) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchMovements()
  }, [productId])

  useEffect(() => {
    filterMovements()
  }, [movements, searchTerm, typeFilter, dateRange])

  const fetchMovements = async () => {
    setIsLoading(true)
    try {
      const url = productId 
        ? `/api/inventory/movements?productId=${productId}`
        : '/api/inventory/movements'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setMovements(data.movements)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch stock movements",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error while fetching movements",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterMovements = () => {
    let filtered = movements

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(movement => 
        movement.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.product?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.user?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(movement => movement.type === typeFilter)
    }

    // Date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(movement => {
        const movementDate = new Date(movement.timestamp)
        if (dateRange.from && movementDate < dateRange.from) return false
        if (dateRange.to && movementDate > dateRange.to) return false
        return true
      })
    }

    setFilteredMovements(filtered)
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'SALE': return <TrendingDown className="h-4 w-4 text-blue-600" />
      case 'ADJUSTMENT': return <RefreshCw className="h-4 w-4 text-orange-600" />
      case 'TRANSFER': return <Truck className="h-4 w-4 text-purple-600" />
      case 'RETURN': return <RotateCcw className="h-4 w-4 text-green-600" />
      case 'DAMAGE':
      case 'THEFT':
      case 'SPILLAGE':
      case 'BREAKAGE': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getMovementBadgeColor = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'RETURN': return 'default'
      case 'SALE': return 'secondary'
      case 'ADJUSTMENT': return 'outline'
      case 'TRANSFER': return 'secondary'
      case 'DAMAGE':
      case 'THEFT':
      case 'SPILLAGE':
      case 'BREAKAGE': return 'destructive'
      default: return 'outline'
    }
  }

  const getQuantityDisplay = (movement: StockMovement) => {
    const isIncrease = ['PURCHASE', 'RETURN'].includes(movement.type)
    const isDecrease = ['SALE', 'DAMAGE', 'THEFT', 'SPILLAGE', 'BREAKAGE', 'TRANSFER'].includes(movement.type)
    
    if (isIncrease) {
      return <span className="text-green-600 font-medium">+{movement.quantity}</span>
    } else if (isDecrease) {
      return <span className="text-red-600 font-medium">-{movement.quantity}</span>
    } else {
      // For adjustments, check if quantity increased or decreased
      const change = movement.afterQty - movement.beforeQty
      if (change > 0) {
        return <span className="text-green-600 font-medium">+{Math.abs(change)}</span>
      } else {
        return <span className="text-red-600 font-medium">-{Math.abs(change)}</span>
      }
    }
  }

  const exportMovements = () => {
    const csvContent = [
      ['Date', 'Type', 'Product', 'SKU', 'Quantity Change', 'Before', 'After', 'Reason', 'Reference', 'User'].join(','),
      ...filteredMovements.map(movement => [
        format(new Date(movement.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        movement.type,
        movement.product?.name || 'N/A',
        movement.product?.sku || 'N/A',
        movement.afterQty - movement.beforeQty,
        movement.beforeQty,
        movement.afterQty,
        movement.reason,
        movement.reference || '',
        movement.user?.name || 'Unknown'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-movements-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const movementTypes = [...new Set(movements.map(m => m.type))]

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Stock Movement History</span>
            </CardTitle>
            <CardDescription>
              {productId ? 'Product-specific' : 'All'} inventory movements and audit trail
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={exportMovements}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={fetchMovements}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search movements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {movementTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredMovements.length} of {movements.length} movements
        </div>

        {/* Movements Table */}
        <div style={{ maxHeight }} className="overflow-auto">
          {isLoading ? (
            <div className="text-center py-8">Loading movements...</div>
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No stock movements found matching your criteria
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  {showProductInfo && (
                    <>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                    </>
                  )}
                  <TableHead>Change</TableHead>
                  <TableHead>Before</TableHead>
                  <TableHead>After</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(movement.timestamp), 'MMM dd, yyyy')}</div>
                        <div className="text-gray-500">{format(new Date(movement.timestamp), 'HH:mm:ss')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getMovementIcon(movement.type)}
                        <Badge variant={getMovementBadgeColor(movement.type) as any}>
                          {movement.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    {showProductInfo && (
                      <>
                        <TableCell>
                          <div className="font-medium">{movement.product?.name}</div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{movement.product?.sku}</code>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {getQuantityDisplay(movement)}
                        <span className="text-sm text-gray-500">{movement.product?.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell>{movement.beforeQty}</TableCell>
                    <TableCell className="font-medium">{movement.afterQty}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={movement.reason}>
                        {movement.reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      {movement.reference && (
                        <code className="text-sm bg-gray-100 px-1 rounded">
                          {movement.reference}
                        </code>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{movement.user?.name || 'Unknown'}</div>
                        {movement.user?.email && (
                          <div className="text-gray-500 text-xs">{movement.user.email}</div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  )
}