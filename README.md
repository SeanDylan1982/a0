# 🚀 Account Zero - South African Business Management System

A comprehensive, production-ready business management application designed specifically for South African small to medium businesses, featuring full SARS compliance, POPIA data protection, and real-time inventory management.

## ✨ Features

### 🎯 Core Business Management
- **Dashboard**: Real-time business overview with KPIs and alerts
- **Inventory Management**: Stock tracking with automated alerts and barcode support
- **Customer Management**: POPIA-compliant customer database with account statements
- **Sales & Invoicing**: SARS-compliant VAT invoicing with automated numbering
- **Calendar & Scheduling**: Integrated calendar with South African holidays and tax deadlines
- **HR Management**: Employee records, leave management, and payroll tracking
- **Accounting**: Chart of accounts, transactions, and financial reporting

### 🌍 South African Compliance
- **SARS VAT Compliance**: 15% VAT calculation and compliant tax invoices
- **POPIA Data Protection**: Secure customer data handling and privacy controls
- **South African Holidays**: Pre-loaded public holidays and observances
- **Tax Deadlines**: Automated reminders for VAT, PAYE, and provisional tax
- **Multi-language Support**: English, Afrikaans and isiZulu interface options

### 🔧 Technical Features
- **Real-time Notifications**: Socket.IO powered instant updates
- **Responsive Design**: Mobile-first design that works on all devices
- **Advanced Search**: Global search across customers, products, and documents
- **Document Sharing**: Email, WhatsApp, and download sharing options
- **Automated Alerts**: Stock level monitoring and management notifications
- **Data Export**: PDF generation and Excel export capabilities

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **Framer Motion** - Smooth animations and transitions

### Backend
- **Node.js** - Server runtime
- **Prisma ORM** - Database management
- **MongoDB Atlas** - Cloud database
- **Socket.IO** - Real-time communication
- **NextAuth.js** - Authentication system

### Additional Libraries
- **React Hook Form + Zod** - Form validation
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Date-fns** - Date manipulation
- **Recharts** - Data visualization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/account-zero.git
cd account-zero
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the root directory:
```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/accountzero"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3500"
COMPANY_NAME="Your Company Name"
COMPANY_COUNTRY="ZA"
```

4. **Database Setup**
```bash
# Generate Prisma client
npx prisma generate

# Seed the database
npm run seed-database
npm run seed-products
```

5. **Start Development Server**
```bash
npm run dev
```

Visit `http://localhost:3500` to access the application.

### Production Deployment

1. **Build the application**
```bash
npm run build
```

2. **Start production server**
```bash
npm run server
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── customers/         # Customer management
│   ├── inventory/         # Inventory management
│   ├── invoicing/         # Sales and invoicing
│   ├── calendar/          # Calendar and scheduling
│   ├── hr/               # Human resources
│   ├── accounting/       # Financial management
│   └── settings/         # System settings
├── components/            # Reusable React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Custom components
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
└── styles/               # Global styles

prisma/
├── schema.prisma         # Database schema
└── seed.ts              # Database seeding

scripts/
├── seed-database.ts     # Database initialization
└── seed-products.ts     # Product data seeding
```

## 🔐 User Roles & Permissions

### Administrator
- Full system access
- User management
- System configuration
- Data export/import
- Security settings

### Manager
- Business overview dashboard
- All operational modules
- Report generation
- Staff management
- Approval workflows

### Sales Staff
- Customer management
- Quote and invoice creation
- Order processing
- Customer communications
- Sales reporting

### Inventory Manager
- Stock management
- Purchase orders
- Supplier management
- Stock alerts and reports
- Barcode management

### HR Staff
- Employee records
- Leave management
- Payroll processing
- HR reporting
- Compliance tracking

### General User
- Personal dashboard
- Basic data entry
- Document viewing
- Calendar access
- Profile management

## 🌍 Internationalization

The application supports multiple languages:
- **English** (default)
- **Afrikaans**

Language can be changed using the language selector in the header.

## 📊 Key Features Detail

### Inventory Management
- **Real-time Stock Tracking**: Automatic updates with every transaction
- **Low Stock Alerts**: Configurable minimum stock levels with notifications
- **Barcode Support**: Generate and print barcode labels
- **Supplier Management**: Track suppliers and purchase orders
- **Stock Movements**: Complete audit trail of all inventory changes

### Customer Management
- **POPIA Compliance**: Secure data handling with privacy controls
- **Account Types**: Cash, Credit, and No Account customer types
- **Credit Management**: Credit limits, payment terms, and aging reports
- **Document History**: Complete record of all customer transactions
- **Communication Tracking**: Log all customer interactions

### Invoicing & Sales
- **SARS Compliance**: VAT-compliant invoices with proper numbering
- **Document Types**: Quotes, Invoices, Credit Notes, Delivery Notes
- **Automated Numbering**: Year-based document numbering system
- **Payment Tracking**: Record and track customer payments
- **Multi-format Export**: PDF, Excel, and email delivery

### Calendar Integration
- **South African Holidays**: Pre-loaded public holidays
- **Tax Deadlines**: Automated reminders for tax obligations
- **Staff Birthdays**: Employee birthday tracking
- **Company Events**: Meetings, deadlines, and important dates
- **Multiple Views**: Month, week, day, and year views

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL="mongodb+srv://..."

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3500"

# Company Settings
COMPANY_NAME="Your Company Name"
COMPANY_COUNTRY="ZA"

# Optional Features
ENABLE_NOTIFICATIONS="true"
ENABLE_REAL_TIME="true"
```

### Company Settings
Access company settings through the Settings menu to configure:
- Company information
- Tax settings
- Document templates
- User permissions
- System preferences

## 🚨 Monitoring & Alerts

### Inventory Alerts
- **Critical**: Out of stock items
- **Error**: Critically low stock (≤50% of minimum)
- **Warning**: Low stock (≤minimum stock level)

### System Notifications
- Real-time alerts via Socket.IO
- Email notifications for critical events
- Calendar reminders for important dates
- Dashboard widgets for key metrics

## 📈 Reporting

### Available Reports
- **Sales Reports**: Revenue, customer analysis, product performance
- **Inventory Reports**: Stock levels, movements, valuation
- **Financial Reports**: P&L, Balance Sheet, Cash Flow
- **Customer Reports**: Aging, statements, communication history
- **HR Reports**: Employee records, leave balances, payroll

### Export Options
- PDF generation
- Excel spreadsheets
- CSV data export
- Email delivery
- Print-ready formats

## 🔒 Security

### Data Protection
- POPIA compliant data handling
- Encrypted data transmission
- Secure authentication
- Role-based access control
- Audit trail logging

### Backup & Recovery
- Automated database backups
- Point-in-time recovery
- Data export capabilities
- Disaster recovery procedures

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check MongoDB connection
npx prisma db pull
```

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

**Socket.IO Connection Problems**
- Check firewall settings
- Verify port 5000 is available
- Ensure WebSocket support

### Support
- Check the documentation in `/docs`
- Review error logs in the console
- Contact system administrator
- Submit issues via the support portal

## 📚 Additional Documentation

- [User Manual](./docs/USER_MANUAL.md) - Comprehensive user guide
- [API Documentation](./docs/API.md) - REST API reference
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment
- [Contributing](./CONTRIBUTING.md) - Development guidelines

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Email: support@accountzero.co.za
- Documentation: [docs.accountzero.co.za](https://docs.accountzero.co.za)
- Community: [community.accountzero.co.za](https://community.accountzero.co.za)

---

**Built with ❤️ for South African businesses**

*Account Zero - Streamlining business management with local compliance and global standards.*