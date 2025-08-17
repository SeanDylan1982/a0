import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// South African specific data
const saProvinces = [
  'Western Cape', 'Eastern Cape', 'Northern Cape', 'Free State',
  'KwaZulu-Natal', 'North West', 'Gauteng', 'Mpumalanga', 'Limpopo'
]

const saCities = [
  'Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth',
  'Bloemfontein', 'East London', 'Pietermaritzburg', 'Polokwane', 'Nelspruit'
]

const saCompanies = [
  'ABC Construction Pty Ltd', 'Tech Solutions SA', 'Johannesburg Retail',
  'Cape Town Logistics', 'Durban Manufacturing', 'Pretoria Consulting',
  'Port Elizabeth Imports', 'Bloemfontein Services', 'East London Trading',
  'Pietermaritzburg Holdings', 'Polokwane Industries', 'Nelspruit Enterprises'
]

// Helper function to generate South African ID number
function generateSAIdNumber() {
  const year = Math.floor(Math.random() * 50) + 50 // 1950-1999
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')
  const sequence = String(Math.floor(Math.random() * 1000)).padStart(4, '0')
  const citizenship = Math.floor(Math.random() * 2) // 0 = SA citizen, 1 = permanent resident
  const race = Math.floor(Math.random() * 10) // 0-8 for race indicator
  const checkDigit = Math.floor(Math.random() * 10)
  
  return `${year}${month}${day}${sequence}${citizenship}${race}${checkDigit}`
}

// Helper function to generate South African phone number
function generateSAPhoneNumber() {
  const prefixes = ['011', '012', '013', '014', '015', '016', '017', '018', '019', '021', '022', '023', '024', '025', '026', '027', '028', '029', '031', '032', '033', '034', '035', '036', '037', '038', '039', '041', '042', '043', '044', '045', '046', '047', '048', '049', '051', '053', '054', '056', '057', '058', '059', '061', '062', '063', '064', '065', '066', '067', '068', '069', '071', '072', '073', '074', '075', '076', '077', '078', '079', '081', '082', '083', '084', '085', '086', '087', '088', '089']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
  return `${prefix} ${suffix.slice(0, 3)} ${suffix.slice(3, 7)}`
}

async function main() {
  console.log('🌱 Seeding database with mock data...')

  try {
    // Create Users
    console.log('Creating users...')
    const users = []
    for (let i = 0; i < 20; i++) {
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          username: faker.internet.userName(),
          password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
          name: faker.person.fullName(),
          avatar: faker.image.avatar(),
          role: ['ADMIN', 'MANAGER', 'SALES_STAFF', 'INVENTORY_MANAGER', 'HR_STAFF', 'ACCOUNTANT', 'STAFF'][Math.floor(Math.random() * 7)],
          status: 'ACTIVE',
          emailVerified: Math.random() > 0.3,
        }
      })
      users.push(user)
    }

    // Create Teams
    console.log('Creating teams...')
    const teams = []
    for (let i = 0; i < 5; i++) {
      const team = await prisma.team.create({
        data: {
          name: `${faker.company.buzzPhrase()} Team`,
          description: faker.company.catchPhrase(),
          leaderId: users[Math.floor(Math.random() * users.length)].id,
        }
      })
      teams.push(team)

      // Add team members
      const memberCount = Math.floor(Math.random() * 5) + 2
      for (let j = 0; j < memberCount; j++) {
        await prisma.teamMember.create({
          data: {
            userId: users[Math.floor(Math.random() * users.length)].id,
            teamId: team.id,
            role: ['member', 'lead'][Math.floor(Math.random() * 2)],
          }
        })
      }
    }

    // Create Customers
    console.log('Creating customers...')
    const customers = []
    for (let i = 0; i < 50; i++) {
      const customer = await prisma.customer.create({
        data: {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          phone: generateSAPhoneNumber(),
          company: saCompanies[Math.floor(Math.random() * saCompanies.length)],
          address: faker.location.streetAddress(),
          city: saCities[Math.floor(Math.random() * saCities.length)],
          state: saProvinces[Math.floor(Math.random() * saProvinces.length)],
          country: 'South Africa',
          postalCode: String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0'),
          taxId: generateSAIdNumber(),
          notes: faker.lorem.sentence(),
          status: ['ACTIVE', 'INACTIVE', 'PROSPECT', 'LEAD'][Math.floor(Math.random() * 4)],
        }
      })
      customers.push(customer)

      // Add customer contacts
      if (Math.random() > 0.5) {
        await prisma.customerContact.create({
          data: {
            customerId: customer.id,
            name: faker.person.fullName(),
            email: faker.internet.email(),
            phone: generateSAPhoneNumber(),
            position: faker.person.jobTitle(),
          }
        })
      }
    }

    // Create Suppliers
    console.log('Creating suppliers...')
    const suppliers = []
    for (let i = 0; i < 30; i++) {
      const supplier = await prisma.supplier.create({
        data: {
          name: saCompanies[Math.floor(Math.random() * saCompanies.length)],
          email: faker.internet.email(),
          phone: generateSAPhoneNumber(),
          address: faker.location.streetAddress(),
          city: saCities[Math.floor(Math.random() * saCities.length)],
          state: saProvinces[Math.floor(Math.random() * saProvinces.length)],
          country: 'South Africa',
          postalCode: String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0'),
          contactPerson: faker.person.fullName(),
          notes: faker.lorem.sentence(),
          status: Math.random() > 0.2 ? 'ACTIVE' : 'INACTIVE',
        }
      })
      suppliers.push(supplier)
    }

    // Create Products
    console.log('Creating products...')
    const products = []
    const categories = ['Electronics', 'Office Supplies', 'Furniture', 'Software', 'Hardware', 'Accessories']
    for (let i = 0; i < 100; i++) {
      const product = await prisma.product.create({
        data: {
          sku: `PRD-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`,
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          category: categories[Math.floor(Math.random() * categories.length)],
          price: parseFloat(faker.commerce.price()),
          cost: parseFloat(faker.commerce.price(100, 1000)),
          quantity: Math.floor(Math.random() * 1000),
          minStock: Math.floor(Math.random() * 50),
          maxStock: Math.floor(Math.random() * 500) + 100,
          unit: ['pcs', 'kg', 'ltr', 'm', 'box'][Math.floor(Math.random() * 5)],
          barcode: String(Math.floor(Math.random() * 1000000000000)),
          location: `Warehouse ${Math.floor(Math.random() * 5) + 1}`,
          supplierId: suppliers[Math.floor(Math.random() * suppliers.length)]?.id,
          status: ['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK'][Math.floor(Math.random() * 4)],
        }
      })
      products.push(product)
    }

    // Create Sales
    console.log('Creating sales...')
    const sales = []
    for (let i = 0; i < 80; i++) {
      const subtotal = parseFloat(faker.commerce.price(1000, 50000))
      const tax = subtotal * 0.15 // 15% VAT
      const total = subtotal + tax
      
      const sale = await prisma.sale.create({
        data: {
          customerId: customers[Math.floor(Math.random() * customers.length)].id,
          userId: users[Math.floor(Math.random() * users.length)].id,
          status: ['DRAFT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'][Math.floor(Math.random() * 6)],
          subtotal: subtotal,
          tax: tax,
          total: total,
          notes: faker.lorem.sentence(),
        }
      })
      sales.push(sale)

      // Add sale items
      const itemCount = Math.floor(Math.random() * 5) + 1
      for (let j = 0; j < itemCount; j++) {
        const product = products[Math.floor(Math.random() * products.length)]
        const quantity = Math.floor(Math.random() * 10) + 1
        const price = product.price
        
        await prisma.saleItem.create({
          data: {
            saleId: sale.id,
            productId: product.id,
            quantity: quantity,
            price: price,
            total: quantity * price,
          }
        })
      }
    }

    // Create Invoices
    console.log('Creating invoices...')
    const invoices = []
    for (let i = 0; i < 60; i++) {
      const subtotal = parseFloat(faker.commerce.price(5000, 100000))
      const tax = subtotal * 0.15 // 15% VAT
      const total = subtotal + tax
      
      const invoice = await prisma.invoice.create({
        data: {
          number: `INV-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
          customerId: customers[Math.floor(Math.random() * customers.length)].id,
          userId: users[Math.floor(Math.random() * users.length)].id,
          status: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'][Math.floor(Math.random() * 5)],
          subtotal: subtotal,
          tax: tax,
          total: total,
          dueDate: faker.date.future({ days: 30 }),
          paidDate: Math.random() > 0.5 ? faker.date.past() : null,
          notes: faker.lorem.sentence(),
        }
      })
      invoices.push(invoice)

      // Link some sales to invoices
      if (Math.random() > 0.3) {
        const sale = sales[Math.floor(Math.random() * sales.length)]
        await prisma.sale.update({
          where: { id: sale.id },
          data: { invoiceId: invoice.id }
        })
      }

      // Add payments for paid invoices
      if (invoice.status === 'PAID') {
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: total,
            method: ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHECK'][Math.floor(Math.random() * 4)],
            reference: `PAY-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`,
            notes: faker.lorem.sentence(),
          }
        })
      }
    }

    // Create Employees
    console.log('Creating employees...')
    for (let i = 0; i < 15; i++) {
      const user = users[i]
      const salary = parseFloat(faker.commerce.price(15000, 80000))
      
      await prisma.employee.create({
        data: {
          userId: user.id,
          employeeId: `EMP-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          department: ['Sales', 'HR', 'IT', 'Finance', 'Operations', 'Marketing'][Math.floor(Math.random() * 6)],
          position: faker.person.jobTitle(),
          salary: salary,
          hireDate: faker.date.past({ years: 5 }),
          status: ['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'SUSPENDED'][Math.floor(Math.random() * 4)],
          emergencyContact: faker.person.fullName(),
          emergencyPhone: generateSAPhoneNumber(),
          notes: faker.lorem.sentence(),
        }
      })
    }

    // Create Events
    console.log('Creating events...')
    for (let i = 0; i < 20; i++) {
      const startDate = faker.date.future({ days: 30 })
      const endDate = new Date(startDate.getTime() + Math.random() * 86400000) // Add 0-24 hours
      
      await prisma.event.create({
        data: {
          title: faker.company.buzzPhrase(),
          description: faker.lorem.paragraph(),
          startDate: startDate,
          endDate: endDate,
          type: ['MEETING', 'APPOINTMENT', 'DEADLINE', 'SHIPMENT', 'REMINDER', 'HOLIDAY', 'MAINTENANCE'][Math.floor(Math.random() * 7)],
          location: faker.location.city(),
          attendees: users.slice(0, Math.floor(Math.random() * 5) + 1).map(u => u.id),
          isAllDay: Math.random() > 0.7,
          reminder: Math.random() > 0.5 ? new Date(startDate.getTime() - Math.random() * 3600000) : null, // 0-1 hour before
        }
      })
    }

    // Create Notes
    console.log('Creating notes...')
    for (let i = 0; i < 30; i++) {
      await prisma.note.create({
        data: {
          userId: users[Math.floor(Math.random() * users.length)].id,
          title: faker.lorem.sentence(),
          content: faker.lorem.paragraphs(2),
          type: ['GENERAL', 'CUSTOMER', 'PRODUCT', 'SUPPLIER', 'TASK', 'REMINDER'][Math.floor(Math.random() * 6)],
          isPrivate: Math.random() > 0.7,
        }
      })
    }

    console.log('✅ Database seeded successfully!')
    console.log(`📊 Created:
      - ${users.length} users
      - ${teams.length} teams
      - ${customers.length} customers
      - ${suppliers.length} suppliers
      - ${products.length} products
      - ${sales.length} sales
      - ${invoices.length} invoices
      - 15 employees
      - 20 events
      - 30 notes
    `)

  } catch (error) {
    console.error('❌ Error seeding database:', error)
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