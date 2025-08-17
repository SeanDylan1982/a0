import { db } from '@/lib/db-manager'

const products = [
  {
    sku: 'LAPTOP-001',
    name: 'Dell Latitude 5520',
    description: 'Business laptop with Intel i5 processor',
    category: 'Electronics',
    price: 15999.00,
    cost: 12000.00,
    quantity: 5,
    minStock: 3,
    maxStock: 20,
    unit: 'pcs',
    location: 'Warehouse A1'
  },
  {
    sku: 'MOUSE-001',
    name: 'Logitech MX Master 3',
    description: 'Wireless productivity mouse',
    category: 'Electronics',
    price: 1299.00,
    cost: 800.00,
    quantity: 2,
    minStock: 5,
    maxStock: 50,
    unit: 'pcs',
    location: 'Warehouse A2'
  },
  {
    sku: 'CHAIR-001',
    name: 'Ergonomic Office Chair',
    description: 'Adjustable height office chair with lumbar support',
    category: 'Furniture',
    price: 2499.00,
    cost: 1800.00,
    quantity: 0,
    minStock: 2,
    maxStock: 15,
    unit: 'pcs',
    location: 'Warehouse B1'
  },
  {
    sku: 'DESK-001',
    name: 'Standing Desk Converter',
    description: 'Height adjustable desk converter',
    category: 'Furniture',
    price: 3999.00,
    cost: 2500.00,
    quantity: 8,
    minStock: 3,
    maxStock: 12,
    unit: 'pcs',
    location: 'Warehouse B2'
  },
  {
    sku: 'PAPER-001',
    name: 'A4 Copy Paper',
    description: '80gsm white copy paper - 500 sheets',
    category: 'Office Supplies',
    price: 89.99,
    cost: 65.00,
    quantity: 1,
    minStock: 10,
    maxStock: 100,
    unit: 'pcs',
    location: 'Warehouse C1'
  },
  {
    sku: 'PEN-001',
    name: 'Ballpoint Pens Blue',
    description: 'Blue ballpoint pens - pack of 10',
    category: 'Office Supplies',
    price: 45.00,
    cost: 25.00,
    quantity: 25,
    minStock: 20,
    maxStock: 200,
    unit: 'pcs',
    location: 'Warehouse C2'
  },
  {
    sku: 'MONITOR-001',
    name: 'Samsung 24" LED Monitor',
    description: '24-inch Full HD LED monitor',
    category: 'Electronics',
    price: 2899.00,
    cost: 2200.00,
    quantity: 3,
    minStock: 5,
    maxStock: 25,
    unit: 'pcs',
    location: 'Warehouse A3'
  },
  {
    sku: 'KEYBOARD-001',
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical gaming keyboard',
    category: 'Electronics',
    price: 1599.00,
    cost: 1100.00,
    quantity: 7,
    minStock: 4,
    maxStock: 30,
    unit: 'pcs',
    location: 'Warehouse A4'
  }
]

async function seedProducts() {
  console.log('🌱 Seeding products...')
  
  try {
    for (const product of products) {
      await db.product.create({
        data: {
          ...product,
          status: 'ACTIVE'
        }
      })
      console.log(`✅ Created product: ${product.name}`)
    }
    
    console.log('🎉 Products seeded successfully!')
    
    // Check for immediate alerts
    const lowStockProducts = products.filter(p => p.quantity <= p.minStock)
    const outOfStockProducts = products.filter(p => p.quantity === 0)
    
    if (outOfStockProducts.length > 0) {
      console.log(`🚨 ${outOfStockProducts.length} products are OUT OF STOCK`)
    }
    
    if (lowStockProducts.length > 0) {
      console.log(`⚠️  ${lowStockProducts.length} products are LOW STOCK`)
    }
    
  } catch (error) {
    console.error('❌ Error seeding products:', error)
  } finally {
    await db.$disconnect()
  }
}

seedProducts()