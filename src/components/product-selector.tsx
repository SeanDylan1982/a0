'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Trash2, Package } from 'lucide-react'
import { TooltipButton } from '@/components/tooltip-button'

export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  price: number
  quantity: number
  unit: string
  category: string
}

export interface ProductItem {
  productId: string
  // accept full Product when available, but also allow partial shapes with at least sku and name
  product: (Partial<Product> & { sku: string; name: string })
  quantity: number
  price: number
  total: number
}

interface ProductSelectorProps {
  items: ProductItem[]
  onItemsChange: (items: ProductItem[]) => void
  title?: string
  inline?: boolean
}

export function ProductSelector({ items, onItemsChange, title = "Add Products", inline = false }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (inline || isOpen) {
      fetchProducts()
    }
  }, [inline, isOpen])

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        console.log('Products fetched:', data.products)
        setProducts(data.products || [])
      } else {
        console.error('Failed to fetch products:', response.status)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addProduct = async (product: Product) => {
    const existingItem = items.find(item => item.productId === product.id)
    const requestedQuantity = existingItem ? existingItem.quantity + 1 : 1
    
    // Check stock availability
    try {
      const response = await fetch(`/api/inventory/validate-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: requestedQuantity
        })
      })
      
      const stockCheck = await response.json()
      
      if (!stockCheck.available) {
        alert(`Cannot add ${product.name}: ${stockCheck.message}`)
        return
      }
    } catch (error) {
      console.error('Stock validation failed:', error)
      return
    }
    
    if (existingItem) {
      // Update quantity if product already exists
      const updatedItems = items.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      )
      onItemsChange(updatedItems)
    } else {
      // Add new product
      const newItem: ProductItem = {
        productId: product.id,
        product,
        quantity: 1,
        price: product.price,
        total: product.price
      }
      onItemsChange([...items, newItem])
    }
  }

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(productId)
      return
    }

    // Validate stock availability for new quantity
    try {
      const response = await fetch(`/api/inventory/validate-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      })
      
      const stockCheck = await response.json()
      
      if (!stockCheck.available) {
        const item = items.find(i => i.productId === productId)
        alert(`Cannot set quantity to ${quantity} for ${item?.product.name}: ${stockCheck.message}`)
        return
      }
    } catch (error) {
      console.error('Stock validation failed:', error)
      return
    }

    const updatedItems = items.map(item =>
      item.productId === productId
        ? { ...item, quantity, total: quantity * item.price }
        : item
    )
    onItemsChange(updatedItems)
  }

  const updatePrice = (productId: string, price: number) => {
    const updatedItems = items.map(item =>
      item.productId === productId
        ? { ...item, price, total: item.quantity * price }
        : item
    )
    onItemsChange(updatedItems)
  }

  const removeProduct = (productId: string) => {
    const updatedItems = items.filter(item => item.productId !== productId)
    onItemsChange(updatedItems)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(products.map(p => p.category))]
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="space-y-4">
      {/* Selected Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Selected Products ({items.length})
            </span>
            {inline ? (
              <div className="text-sm text-muted-foreground">Browse and add products below</div>
            ) : (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {title}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-[1200px] max-h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 h-full">
                    {/* Search and Filter */}
                    <div className="flex items-center space-x-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search products..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Products List */}
                    <div className="overflow-auto max-h-[65vh]">
                      {isLoading ? (
                        <div className="text-center py-8">Loading products...</div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No products found</p>
                        </div>
                      ) : (
                        <div className="w-full overflow-x-auto border rounded-lg">
                          <div className="min-w-[800px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[300px]">Product</TableHead>
                                  <TableHead className="w-[140px]">SKU</TableHead>
                                  <TableHead className="w-[140px]">Category</TableHead>
                                  <TableHead className="w-[120px]">Stock</TableHead>
                                  <TableHead className="w-[120px]">Price</TableHead>
                                  <TableHead className="w-[120px] text-center">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredProducts.map((product) => (
                                  <TableRow key={product.id}>
                                    <TableCell className="w-[300px]">
                                      <div>
                                        <div className="font-medium">{product.name}</div>
                                        {product.description && (
                                          <div className="text-sm text-gray-500 truncate max-w-[280px]">{product.description}</div>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="w-[140px]">{product.sku}</TableCell>
                                    <TableCell className="w-[140px]">
                                      <Badge variant="outline">{product.category}</Badge>
                                    </TableCell>
                                    <TableCell className="w-[120px]">
                                      <span className={product.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {product.quantity} {product.unit}
                                      </span>
                                    </TableCell>
                                    <TableCell className="w-[120px]">R {product.price.toFixed(2)}</TableCell>
                                    <TableCell className="w-[120px] text-center">
                                      <TooltipButton
                                        tooltip={product.quantity <= 0 ? "Out of stock" : "Add to selection"}
                                        size="sm"
                                        onClick={() => addProduct(product)}
                                        disabled={product.quantity <= 0}
                                        className="mx-auto"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </TooltipButton>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </DialogContent>
                </Dialog>
              )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No products selected. Click "Add Products" to get started.
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-sm text-gray-500">SKU: {item.product.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      R {item.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <TooltipButton
                        tooltip="Remove from selection"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduct(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </TooltipButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">R {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (15%):</span>
                  <span className="font-medium">R {(subtotal * 0.15).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>R {(subtotal * 1.15).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {inline && (
      <div className="space-y-4">
        {/* Search and Filter (inline) */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products List (inline) */}
        <div className="overflow-auto max-h-[65vh]">
          {isLoading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No products found</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto border rounded-lg">
              <div className="min-w-[1000px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Product</TableHead>
                      <TableHead className="w-[140px]">SKU</TableHead>
                      <TableHead className="w-[140px]">Category</TableHead>
                      <TableHead className="w-[120px]">Stock</TableHead>
                      <TableHead className="w-[120px]">Price</TableHead>
                      <TableHead className="w-[120px] text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="w-[300px]">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-gray-500 truncate max-w-[280px]">{product.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[140px]">{product.sku}</TableCell>
                        <TableCell className="w-[140px]">
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="w-[120px]">
                          <span className={product.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                            {product.quantity} {product.unit}
                          </span>
                        </TableCell>
                        <TableCell className="w-[120px]">R {product.price.toFixed(2)}</TableCell>
                        <TableCell className="w-[120px] text-center">
                          <TooltipButton
                            tooltip={product.quantity <= 0 ? "Out of stock" : "Add to selection"}
                            size="sm"
                            onClick={() => addProduct(product)}
                            disabled={product.quantity <= 0}
                            className="mx-auto"
                          >
                            <Plus className="h-4 w-4" />
                          </TooltipButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

  </div>
)
}