# Project Structure & Organization

## Root Directory Structure

```
├── src/                    # Source code
├── prisma/                 # Database schema and migrations
├── scripts/                # Database seeding and utility scripts
├── docs/                   # Project documentation
├── public/                 # Static assets
├── .kiro/                  # Kiro IDE configuration
└── db/                     # Local database files
```

## Source Code Organization (`src/`)

### App Router Structure (`src/app/`)
- **Route-based organization** following Next.js 14 App Router conventions
- **Feature modules**: Each business domain has its own route directory
- **API routes**: Located in `src/app/api/` with RESTful structure

#### Business Domain Routes
```
src/app/
├── accounting/         # Financial management
├── calendar/          # Events and scheduling
├── customers/         # Customer management
├── hr/               # Human resources
├── inventory/        # Stock and product management
├── invoicing/        # Sales documents and invoicing
├── sales/            # Sales processes
├── settings/         # System configuration
└── users/            # User management
```

### Shared Code Structure
```
src/
├── components/           # Reusable React components
│   ├── ui/              # shadcn/ui base components
│   └── ...              # Custom business components
├── contexts/            # React context providers
├── hooks/               # Custom React hooks
└── lib/                 # Utility functions and configurations
```

## Database Schema Organization

### Prisma Models (grouped by domain)
- **User Management**: User, Team, TeamMember
- **Customer Management**: Customer, CustomerContact
- **Inventory**: Product, Supplier, InventoryLog
- **Sales & Documents**: Sale, Quote, Invoice, CreditNote, DeliveryNote
- **Accounting**: Account, Transaction
- **HR**: Employee, LeaveRequest
- **System**: Event, Note, DocumentSequence

## File Naming Conventions

- **Components**: PascalCase (e.g., `CustomerForm.tsx`)
- **Pages**: lowercase with hyphens (e.g., `customer-details/page.tsx`)
- **API routes**: lowercase with hyphens (e.g., `api/customers/route.ts`)
- **Utilities**: camelCase (e.g., `formatCurrency.ts`)
- **Types**: PascalCase with `.types.ts` suffix

## Import Path Guidelines

- Use `@/` alias for all internal imports
- Group imports: external libraries first, then internal modules
- Prefer named exports over default exports for utilities
- Use barrel exports (`index.ts`) for component directories

## Component Organization Patterns

- **Page Components**: Server components by default in route directories
- **UI Components**: Client components in `src/components/ui/`
- **Business Components**: Domain-specific components near their usage
- **Form Components**: Co-located with their respective pages
- **Layout Components**: Shared layouts in `src/components/layout/`