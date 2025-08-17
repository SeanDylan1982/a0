# Technology Stack & Development Guidelines

## Core Technologies

### Frontend

- **Next.js 14** - React framework with App Router
- **TypeScript 5** - Strict typing enabled, `noImplicitAny: false` for gradual adoption
- **Tailwind CSS** - Utility-first styling with shadcn/ui components
- **shadcn/ui** - Component library using Radix UI primitives
- **Framer Motion** - Animations and transitions

### Backend & Database

- **MongoDB** - Primary database with Prisma ORM
- **Prisma** - Database ORM with MongoDB provider
- **Socket.IO** - Real-time communication
- **Node.js** - Server runtime

### Key Libraries

- **React Hook Form + Zod** - Form validation and schema validation
- **TanStack Query** - Data fetching, caching, and synchronization
- **Zustand** - Lightweight state management
- **NextAuth.js** - Authentication system
- **Lucide React** - Icon library
- **Date-fns** - Date manipulation
- **Recharts** - Data visualization

## Development Commands

```bash
# Development
npm run dev              # Start Next.js development server
npm run server          # Start custom server (server.ts)

# Database
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema changes to database
npm run seed-database   # Seed initial database data
npm run seed-products   # Seed product data

# Build & Deploy
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
```

## Configuration Notes

- **Build Configuration**: TypeScript and ESLint errors are ignored during builds for rapid development
- **Hot Reload**: Disabled in favor of manual recompilation via nodemon
- **Strict Mode**: React strict mode disabled for development
- **Path Aliases**: `@/*` maps to `./src/*`

## Code Style Guidelines

- Use TypeScript for all new code
- Follow shadcn/ui component patterns
- Implement proper error boundaries
- Use Zod schemas for data validation
- Prefer server components where possible
- Use Tailwind CSS classes over custom CSS
