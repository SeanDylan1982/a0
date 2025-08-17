const { PrismaClient } = require('@prisma/client')

async function testDashboardError() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Testing the exact dashboard queries that are failing...')
    
    // Test the monthly revenue query that might be failing
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)

    console.log('Month range:', { monthStart, monthEnd })

    console.log('1. Testing monthly revenue query...')
    const monthlyRevenue = await prisma.invoice.aggregate({
      where: {
        status: 'PAID',
        paidDate: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      _sum: { total: true }
    })
    console.log('Monthly revenue result:', monthlyRevenue)
    
    console.log('2. Testing recent sales with relations...')
    const recentSales = await prisma.sale.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        user: true
      }
    })
    console.log('Recent sales count:', recentSales.length)
    console.log('Sample sale:', recentSales[0])
    
    console.log('3. Testing low stock products...')
    const lowStockProducts = await prisma.product.findMany({
      where: {
        quantity: {
          lte: 10
        }
      },
      take: 5,
      orderBy: { quantity: 'asc' }
    })
    console.log('Low stock products count:', lowStockProducts.length)
    
    console.log('4. Testing overdue invoices...')
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: 'OVERDUE',
        dueDate: {
          lt: new Date()
        }
      },
      take: 5,
      orderBy: { dueDate: 'asc' },
      include: {
        customer: true
      }
    })
    console.log('Overdue invoices count:', overdueInvoices.length)
    
  } catch (error) {
    console.error('❌ Specific error found:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    })
  } finally {
    await prisma.$disconnect()
  }
}

testDashboardError()