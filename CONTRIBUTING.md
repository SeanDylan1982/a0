# Contributing to Account Zero

Thank you for your interest in contributing to Account Zero! This guide will help you get started with development and ensure your contributions align with our standards.

## Development Setup

### Prerequisites
- Node.js 18+
- Git
- MongoDB Atlas account
- Code editor (VS Code recommended)

### Local Development
1. **Fork and clone the repository**
```bash
git clone https://github.com/your-username/account-zero.git
cd account-zero
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Database setup**
```bash
npx prisma generate
npm run seed-database
npm run seed-products
```

5. **Start development server**
```bash
npm run dev
```

## Code Standards

### TypeScript
- Use strict TypeScript configuration
- Define proper types for all functions and components
- Avoid `any` type usage
- Use interfaces for object shapes

### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Follow component composition patterns
- Use TypeScript for prop definitions

### Styling
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and colors
- Use shadcn/ui components when possible

### Database
- Use Prisma ORM for all database operations
- Write proper migrations for schema changes
- Include proper indexes for performance
- Follow naming conventions (camelCase for fields)

## Project Structure

### File Organization
```
src/
├── app/                    # Next.js pages and API routes
├── components/            # Reusable React components
│   ├── ui/               # shadcn/ui base components
│   └── [feature]/        # Feature-specific components
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and configurations
└── types/                # TypeScript type definitions
```

### Naming Conventions
- **Files**: kebab-case (`customer-details.tsx`)
- **Components**: PascalCase (`CustomerDetails`)
- **Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Types/Interfaces**: PascalCase (`CustomerData`)

## Git Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages
Follow conventional commits format:
```
type(scope): description

feat(inventory): add real-time stock alerts
fix(invoicing): resolve VAT calculation error
docs(api): update endpoint documentation
refactor(auth): simplify user session handling
```

### Pull Request Process
1. Create feature branch from `main`
2. Make your changes with proper tests
3. Update documentation if needed
4. Submit pull request with clear description
5. Address review feedback
6. Squash commits before merge

## Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
- Place tests next to source files (`component.test.tsx`)
- Use descriptive test names
- Test both happy path and error cases
- Mock external dependencies

### Example Test
```typescript
import { render, screen } from '@testing-library/react';
import { CustomerDetails } from './customer-details';

describe('CustomerDetails', () => {
  it('displays customer information correctly', () => {
    const customer = {
      id: '1',
      name: 'Test Customer',
      email: 'test@example.com'
    };

    render(<CustomerDetails customer={customer} />);
    
    expect(screen.getByText('Test Customer')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
```

## API Development

### Route Structure
- Use Next.js App Router API routes
- Implement proper error handling
- Add request validation with Zod
- Include proper TypeScript types

### Example API Route
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db-manager';

const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: validatedData
    });

    return NextResponse.json({
      success: true,
      data: customer
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to create customer'
    }, { status: 400 });
  }
}
```

## Database Changes

### Schema Modifications
1. Update `prisma/schema.prisma`
2. Generate migration: `npx prisma db push`
3. Update seed files if needed
4. Test migration thoroughly

### Migration Best Practices
- Make backward-compatible changes when possible
- Include proper indexes for performance
- Document breaking changes
- Test with production-like data

## UI/UX Guidelines

### Design Principles
- **Consistency**: Use established patterns and components
- **Accessibility**: Follow WCAG 2.1 guidelines
- **Performance**: Optimize for mobile devices
- **Usability**: Prioritize user experience

### Component Development
- Use shadcn/ui as base components
- Implement proper loading states
- Add error handling and fallbacks
- Include proper ARIA labels

### Responsive Design
- Mobile-first approach
- Test on multiple screen sizes
- Use Tailwind responsive utilities
- Ensure touch-friendly interactions

## South African Compliance

### SARS Requirements
- 15% VAT calculation accuracy
- Proper tax invoice formatting
- Sequential document numbering
- Required tax information display

### POPIA Compliance
- Secure data handling
- User consent mechanisms
- Data retention policies
- Privacy controls implementation

## Performance Guidelines

### Frontend Optimization
- Use Next.js Image component
- Implement proper code splitting
- Minimize bundle size
- Use React.memo for expensive components

### Backend Optimization
- Implement database query optimization
- Use proper caching strategies
- Handle concurrent requests efficiently
- Monitor memory usage

## Security Considerations

### Authentication
- Use NextAuth.js for authentication
- Implement proper session management
- Add rate limiting to API routes
- Validate all user inputs

### Data Protection
- Sanitize user inputs
- Use HTTPS in production
- Implement proper CORS policies
- Follow OWASP security guidelines

## Documentation

### Code Documentation
- Add JSDoc comments for complex functions
- Document API endpoints thoroughly
- Include usage examples
- Keep README files updated

### User Documentation
- Update user manual for new features
- Include screenshots for UI changes
- Provide troubleshooting guides
- Maintain changelog

## Review Process

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance impact considered
- [ ] Accessibility requirements met

### Review Guidelines
- Be constructive and respectful
- Focus on code quality and maintainability
- Suggest improvements with examples
- Approve when standards are met

## Release Process

### Version Management
- Follow semantic versioning (SemVer)
- Update CHANGELOG.md
- Tag releases properly
- Document breaking changes

### Deployment
- Test in staging environment
- Run full test suite
- Update production documentation
- Monitor post-deployment

## Getting Help

### Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

### Communication
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Email: dev@accountzero.co.za
- Discord: [Account Zero Dev Community](https://discord.gg/accountzero)

## License

By contributing to Account Zero, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Account Zero! Your efforts help make business management better for South African businesses.