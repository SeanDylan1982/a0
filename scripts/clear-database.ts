import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Clearing all data from database...')

  try {
    // Delete all records in the correct order to respect foreign key constraints
    
    // Delete payments first (depends on invoices)
    console.log('Deleting payments...')
    await prisma.payment.deleteMany({})
    
    // Delete sale items (depends on sales and products)
    console.log('Deleting sale items...')
    await prisma.saleItem.deleteMany({})
    
    // Delete purchase items (depends on purchases and products)
    console.log('Deleting purchase items...')
    await prisma.purchaseItem.deleteMany({})
    
    // Delete inventory logs (depends on products and users)
    console.log('Deleting inventory logs...')
    await prisma.inventoryLog.deleteMany({})
    
    // Delete team members (depends on teams and users)
    console.log('Deleting team members...')
    await prisma.teamMember.deleteMany({})
    
    // Delete customer contacts (depends on customers)
    console.log('Deleting customer contacts...')
    await prisma.customerContact.deleteMany({})
    
    // Delete sales (depends on customers, users, invoices)
    console.log('Deleting sales...')
    await prisma.sale.deleteMany({})
    
    // Delete invoices (depends on customers, users)
    console.log('Deleting invoices...')
    await prisma.invoice.deleteMany({})
    
    // Delete purchases (depends on suppliers, users)
    console.log('Deleting purchases...')
    await prisma.purchase.deleteMany({})
    
    // Delete products (depends on suppliers)
    console.log('Deleting products...')
    await prisma.product.deleteMany({})
    
    // Delete employees (depends on users)
    console.log('Deleting employees...')
    await prisma.employee.deleteMany({})
    
    // Delete leave requests (depends on employees)
    console.log('Deleting leave requests...')
    await prisma.leaveRequest.deleteMany({})
    
    // Delete events
    console.log('Deleting events...')
    await prisma.event.deleteMany({})
    
    // Delete notes (depends on users)
    console.log('Deleting notes...')
    await prisma.note.deleteMany({})
    
    // Delete teams (depends on users)
    console.log('Deleting teams...')
    await prisma.team.deleteMany({})
    
    // Delete customers
    console.log('Deleting customers...')
    await prisma.customer.deleteMany({})
    
    // Delete suppliers
    console.log('Deleting suppliers...')
    await prisma.supplier.deleteMany({})
    
    // Delete users
    console.log('Deleting users...')
    await prisma.user.deleteMany({})
    
    // Delete transactions (depends on accounts)
    console.log('Deleting transactions...')
    await prisma.transaction.deleteMany({})
    
    // Delete accounts
    console.log('Deleting accounts...')
    await prisma.account.deleteMany({})
    
    console.log('✅ All data cleared successfully!')
    console.log('📊 Database is now empty and ready for fresh data.')

  } catch (error) {
    console.error('❌ Error clearing database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })