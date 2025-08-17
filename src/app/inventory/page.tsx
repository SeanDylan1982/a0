'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Barcode,
  Truck,
  FileText
} from 'lucide-react'
import { ShareButton } from '@/components/share-button'
import { TooltipButton } from '@/components/tooltip-button'
import { useToast } from '@/hooks/use-toast'
import { PageLayout } from '@/components/page-layout'

interface Product {
  id: string
  sku: string
  name: string
  description?: string
  category: string
  price: number
  cost: number
  quantity: number
  minStock: number
  maxStock: number
  unit: string
  barcode?: string
  location?: string
  status: string
  createdAt: string
  updatedAt: string
  supplier?: {
    id: string
    name: string
  }
}

interface Supplier {
  id: string
  name: string
  email?: string
  phone?: string
  status: string
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const { toast } = useToast()

  useEffect(() => {
    fetchProducts()
    fetchSuppliers()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/inventory/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/inventory/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.suppliers)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch suppliers",
        variant: "destructive",
      })
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    const minStock = parseInt(formData.get('minStock') as string)
    const quantity = parseInt(formData.get('quantity') as string)
    
    // Validate stock levels
    if (quantity < 0) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity cannot be negative",
        variant: "destructive",
      })
      return
    }
    
    if (minStock < 0) {
      toast({
        title: "Invalid Min Stock",
        description: "Minimum stock cannot be negative",
        variant: "destructive",
      })
      return
    }
    
    try {
      const response = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sku: formData.get('sku'),
          name: formData.get('name'),
          description: formData.get('description'),
          category: formData.get('category'),
          price: parseFloat(formData.get('price') as string),
          cost: parseFloat(formData.get('cost') as string),
          quantity,
          minStock,
          maxStock: parseInt(formData.get('maxStock') as string),
          unit: formData.get('unit'),
          barcode: formData.get('barcode'),
          location: formData.get('location'),
          supplierId: formData.get('supplierId'),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product created successfully",
        })
        setIsAddProductOpen(false)
        fetchProducts()
        
        // Check for immediate alerts
        if (quantity <= minStock) {
          toast({
            title: "Stock Alert",
            description: `${formData.get('name')} is at or below minimum stock level`,
            variant: "destructive",
          })
        }
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to create product",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'INACTIVE': return 'secondary'
      case 'DISCONTINUED': return 'destructive'
      case 'OUT_OF_STOCK': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStockStatus = (product: Product) => {
    if (product.quantity === 0) return { status: 'OUT_OF_STOCK', color: 'destructive', icon: AlertTriangle }
    if (product.quantity <= product.minStock) return { status: 'LOW_STOCK', color: 'destructive', icon: TrendingDown }
    if (product.quantity >= product.maxStock) return { status: 'OVERSTOCK', color: 'secondary', icon: TrendingUp }
    return { status: 'IN_STOCK', color: 'default', icon: Package }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(products.map(p => p.category))]

  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.cost), 0)
  const lowStockItems = products.filter(p => p.quantity <= p.minStock).length
  const outOfStockItems = products.filter(p => p.quantity === 0).length

  return (
    <PageLayout currentPage="/inventory" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Inventory' }]}>
        {/* Page header with card styling */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Inventory Management</h1>
                  <p className="text-gray-600 text-sm mb-2">Manage products, suppliers, and stock levels</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                    🇿🇦 VAT compliant inventory tracking
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">📦</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end mb-6">
          <div className="flex space-x-2">
            <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>
                    Create a new product in your inventory
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sku">SKU</Label>
                      <Input id="sku" name="sku" required />
                    </div>
                    <div>
                      <Label htmlFor="name">Product Name</Label>
                      <Input id="name" name="name" required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input id="category" name="category" required />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select name="unit" defaultValue="pcs">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">Pieces</SelectItem>
                          <SelectItem value="kg">Kilograms</SelectItem>
                          <SelectItem value="lbs">Pounds</SelectItem>
                          <SelectItem value="l">Liters</SelectItem>
                          <SelectItem value="gal">Gallons</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price ($)</Label>
                      <Input id="price" name="price" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label htmlFor="cost">Cost ($)</Label>
                      <Input id="cost" name="cost" type="number" step="0.01" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="quantity">Current Quantity</Label>
                      <Input id="quantity" name="quantity" type="number" defaultValue="0" required />
                    </div>
                    <div>
                      <Label htmlFor="minStock">Min Stock</Label>
                      <Input id="minStock" name="minStock" type="number" defaultValue="0" required />
                    </div>
                    <div>
                      <Label htmlFor="maxStock">Max Stock</Label>
                      <Input id="maxStock" name="maxStock" type="number" defaultValue="1000" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="barcode">Barcode</Label>
                      <Input id="barcode" name="barcode" />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" name="location" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="supplierId">Supplier</Label>
                    <Select name="supplierId">
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Create Product</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Inventory Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Low Stock Items
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{lowStockItems}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Out of Stock
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-700" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{outOfStockItems}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="stock-movements">Stock Movements</TabsTrigger>
            <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
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
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
                <CardDescription>Manage your product inventory</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading products...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const stockStatus = getStockStatus(product)
                        const stockValue = product.quantity * product.cost
                        
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                {product.description && (
                                  <div className="text-sm text-gray-500">{product.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">{product.sku}</TableCell>
                            <TableCell>{product.category}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{product.quantity}</span>
                                <span className="text-sm text-gray-500">{product.unit}</span>
                                {stockStatus.icon && (
                                  <stockStatus.icon className="h-4 w-4" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>${product.price.toFixed(2)}</TableCell>
                            <TableCell>${stockValue.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={stockStatus.color as any}>
                                {stockStatus.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <ShareButton 
                                  title={product.name}
                                  data={product}
                                  type="record"
                                  variant="ghost"
                                />
                                <TooltipButton tooltip="Edit product details" variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </TooltipButton>
                                <TooltipButton tooltip="Print barcode label" variant="ghost" size="sm">
                                  <Barcode className="h-4 w-4" />
                                </TooltipButton>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Suppliers</CardTitle>
                <CardDescription>Manage your product suppliers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Supplier management coming soon!</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplier
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock-movements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Movements</CardTitle>
                <CardDescription>Track inventory changes and movements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Stock movement tracking coming soon!</p>
                  <Button>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchase-orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>Manage purchase orders and supplier deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Purchase order management coming soon!</p>
                  <Button>
                    <Truck className="h-4 w-4 mr-2" />
                    Create Purchase Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </PageLayout>
  )
}