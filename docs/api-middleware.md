# API Middleware System Documentation

## Overview

The API Middleware System provides a comprehensive, layered approach to handling API requests in Account Zero. It integrates authentication, authorization, activity logging, data validation, cross-module synchronization, real-time notifications, and error handling into a unified middleware stack.

## Architecture

The middleware system follows a layered architecture where each layer adds specific functionality:

```
Request → Authentication → Authorization → Validation → Handler → Activity Logging → Sync → Notifications → Response
```

### Middleware Layers

1. **Authentication Middleware**: Verifies user identity and attaches user context
2. **Authorization Middleware**: Checks user permissions and role-based access
3. **Validation Middleware**: Validates request data against schemas
4. **Activity Logging Middleware**: Records user actions for audit trails
5. **Sync Middleware**: Propagates data changes across modules
6. **Notification Middleware**: Triggers real-time notifications
7. **Error Handling Middleware**: Provides consistent error responses with translation

## Usage

### Basic Usage with Predefined Configurations

```typescript
import { quickMigrate } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'

async function handleGET(request: AuthenticatedRequest) {
  // Your handler logic here
  return NextResponse.json({ data: 'success' })
}

async function handlePOST(request: AuthenticatedRequest) {
  // Your handler logic here
  return NextResponse.json({ message: 'Created successfully' })
}

// Apply middleware with predefined configuration
const { GET, POST } = quickMigrate('customers', {
  GET: handleGET,
  POST: handlePOST
})

export { GET, POST }
```

### Advanced Usage with Custom Configuration

```typescript
import { withApiMiddleware } from '@/lib/middleware/api-middleware'
import { PERMISSIONS } from '@/lib/middleware/auth-middleware'
import { VALIDATION_SCHEMAS } from '@/lib/middleware/route-migrator'

const customConfig = {
  auth: {
    required: true,
    permission: PERMISSIONS.INVENTORY_UPDATE
  },
  activity: {
    module: 'inventory',
    entityType: 'product'
  },
  validation: {
    schema: {
      POST: VALIDATION_SCHEMAS.product.create,
      PUT: VALIDATION_SCHEMAS.product.update
    },
    translateErrors: true
  },
  notifications: {
    triggers: [
      {
        condition: (req, response) => response?.product?.quantity <= response?.product?.minStock,
        type: 'INVENTORY_ALERT',
        priority: 'HIGH',
        title: 'Low Stock Alert',
        message: 'Product stock below minimum threshold',
        targetRoles: ['DIRECTOR', 'MANAGER', 'INVENTORY_MANAGER']
      }
    ]
  }
}

const wrappedHandler = withApiMiddleware(handler, customConfig)
export const POST = wrappedHandler
```

## Predefined Configurations

### PUBLIC
- **Authentication**: Not required
- **Use Case**: Health checks, public endpoints

### AUTHENTICATED
- **Authentication**: Required
- **Authorization**: Basic user authentication
- **Use Case**: General user endpoints

### ADMIN_ONLY
- **Authentication**: Required
- **Authorization**: Director and Manager roles only
- **Use Case**: Administrative functions

### MANAGEMENT
- **Authentication**: Required
- **Authorization**: Director, Manager, and HOD roles
- **Use Case**: Management-level operations

### SALES
- **Authentication**: Required
- **Authorization**: Sales permission required
- **Activity Logging**: Sales module
- **Validation**: Sale creation/update schemas
- **Notifications**: Large transaction alerts
- **Use Case**: Sales and invoicing endpoints

### INVENTORY
- **Authentication**: Required
- **Authorization**: Inventory permission required
- **Activity Logging**: Inventory module
- **Validation**: Product creation/update schemas
- **Notifications**: Low stock alerts
- **Use Case**: Inventory management endpoints

### CUSTOMERS
- **Authentication**: Required
- **Authorization**: Customer permission required
- **Activity Logging**: Customer module
- **Validation**: Customer creation/update schemas
- **Notifications**: New customer alerts
- **Use Case**: Customer management endpoints

### SETTINGS
- **Authentication**: Required
- **Authorization**: Settings update permission required
- **Activity Logging**: Settings module
- **Validation**: Settings update schemas
- **Notifications**: Settings change alerts
- **Use Case**: System configuration endpoints

## Authentication & Authorization

### User Roles Hierarchy

```
DIRECTOR (Highest)
├── MANAGER
├── HOD (Head of Department)
├── SALES_REP
├── INTERNAL_CONSULTANT
├── INVENTORY_MANAGER
├── HR_STAFF
├── ACCOUNTANT
├── STAFF_MEMBER
└── USER (Lowest)
```

### Permission System

Permissions are module-based with actions:

```typescript
const PERMISSIONS = {
  SALES_READ: { module: 'sales', action: 'read' },
  SALES_CREATE: { module: 'sales', action: 'create' },
  SALES_UPDATE: { module: 'sales', action: 'update' },
  SALES_DELETE: { module: 'sales', action: 'delete' },
  
  INVENTORY_READ: { module: 'inventory', action: 'read' },
  INVENTORY_CREATE: { module: 'inventory', action: 'create' },
  // ... more permissions
}
```

## Activity Logging

All authenticated requests are automatically logged with:

- **User ID**: Who performed the action
- **Module**: Which business module (sales, inventory, etc.)
- **Action**: What was done (create, update, delete)
- **Entity Type**: What type of entity was affected
- **Entity ID**: Specific entity identifier
- **Entity Name**: Human-readable entity name
- **Details**: Additional context and changes
- **Timestamp**: When the action occurred
- **IP Address**: Client IP address
- **User Agent**: Client browser/application

### Activity Context

```typescript
interface ActivityContext {
  userId: string
  module: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  details?: Record<string, any>
}
```

## Data Validation

### Schema-Based Validation

All request data is validated against Zod schemas:

```typescript
// Example: Customer creation schema
const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().optional(),
  phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,}$/).optional(),
  // ... more fields
})
```

### Validation Error Handling

Validation errors are automatically translated and formatted:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ]
}
```

## Real-Time Notifications

### Notification Triggers

Notifications are automatically triggered based on business events:

```typescript
interface NotificationTrigger {
  condition: (req: NextRequest, response: any) => boolean
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  targetRoles?: UserRole[]
  targetUsers?: string[]
}
```

### Common Notification Triggers

- **Large Transactions**: Sales over configurable threshold
- **Low Stock**: Inventory below minimum levels
- **New Customers**: Customer registration
- **Settings Changes**: System configuration updates
- **System Errors**: Critical system failures

## Cross-Module Data Synchronization

### Automatic Data Propagation

Changes in one module automatically propagate to related modules:

- **Sales → Inventory**: Stock deduction
- **Sales → Accounting**: Revenue recording
- **Inventory → Sales**: Stock availability updates
- **HR → Users**: Employee profile updates

### Sync Rules

```typescript
interface SyncRule {
  sourceModule: string
  targetModules: string[]
  trigger: string
  transformer: (data: any) => any
  condition?: (data: any) => boolean
}
```

## Error Handling

### Structured Error Responses

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2023-12-01T10:00:00Z",
  "requestId": "req-123456"
}
```

### Error Translation

Error messages are automatically translated based on the `Accept-Language` header:

- **English (en)**: Default language
- **Afrikaans (af)**: South African Afrikaans
- **isiZulu (zu)**: South African Zulu

### Common Error Codes

- **P2002**: Unique constraint violation (409 Conflict)
- **P2025**: Record not found (404 Not Found)
- **VALIDATION_ERROR**: Request validation failed (400 Bad Request)
- **PERMISSION_DENIED**: Insufficient permissions (403 Forbidden)
- **AUTHENTICATION_REQUIRED**: Authentication required (401 Unauthorized)

## Rate Limiting

All endpoints include rate limiting protection:

- **Global Limits**: Applied to all requests
- **Per-User Limits**: Based on authenticated user
- **Per-IP Limits**: Based on client IP address

## Testing

### Integration Tests

Comprehensive test coverage includes:

```typescript
describe('API Middleware Integration', () => {
  it('should authenticate valid requests')
  it('should deny unauthorized access')
  it('should validate request data')
  it('should log activities')
  it('should trigger notifications')
  it('should handle errors gracefully')
  it('should translate error messages')
})
```

### Test Utilities

```typescript
import { createMockRequest, createMockUser } from '@/lib/test-utils'

const mockRequest = createMockRequest({
  method: 'POST',
  url: '/api/customers',
  body: { firstName: 'John', lastName: 'Doe' },
  user: createMockUser({ role: 'MANAGER' })
})
```

## Migration Guide

### Migrating Existing Routes

1. **Identify Route Type**: Determine appropriate middleware configuration
2. **Update Imports**: Import middleware utilities
3. **Wrap Handlers**: Apply middleware to route handlers
4. **Test Integration**: Verify all middleware features work correctly

### Migration Script

Use the automated migration script:

```bash
npm run migrate-api-middleware
```

This script will:
- Scan all API routes
- Identify routes needing migration
- Apply appropriate middleware configurations
- Generate documentation
- Create backup files

## Best Practices

### Handler Implementation

```typescript
async function handlePOST(request: AuthenticatedRequest) {
  try {
    // Access authenticated user
    const userId = request.user?.id
    
    // Get validated request body (validation already applied)
    const data = await request.json()
    
    // Perform business logic
    const result = await businessLogic(data, userId)
    
    // Return success response
    return NextResponse.json({
      message: 'Operation successful',
      data: result
    })
  } catch (error) {
    // Let middleware handle error translation and logging
    throw error
  }
}
```

### Custom Validation

```typescript
import { validateSchema } from '@/lib/validation/api-schemas'

// In your handler
const validator = validateSchema(customSchema)
const validatedData = validator(requestData)
```

### Custom Notifications

```typescript
const customTrigger = {
  condition: (req, response) => {
    return req.method === 'POST' && response?.priority === 'urgent'
  },
  type: 'SYSTEM',
  priority: 'HIGH',
  title: 'Urgent Item Created',
  message: 'An urgent item requires immediate attention',
  targetRoles: ['DIRECTOR', 'MANAGER']
}
```

## Monitoring & Debugging

### Logging

All middleware operations are logged:

```typescript
console.log('API middleware: Authentication successful')
console.log('API middleware: Activity logged')
console.log('API middleware: Notification triggered')
```

### Debug Mode

Enable debug logging:

```typescript
process.env.DEBUG_MIDDLEWARE = 'true'
```

### Performance Monitoring

Monitor middleware performance:

- Request processing time
- Database query performance
- Notification delivery time
- Sync operation duration

## Security Considerations

### Input Sanitization

All input is validated and sanitized through Zod schemas.

### SQL Injection Prevention

Using Prisma ORM prevents SQL injection attacks.

### XSS Prevention

All output is properly escaped and sanitized.

### CSRF Protection

CSRF tokens are validated for state-changing operations.

### Rate Limiting

Prevents abuse and DoS attacks.

### Audit Trails

All actions are logged for security auditing.

## Performance Optimization

### Caching

- Permission checks are cached
- Translation lookups are cached
- User session data is cached

### Database Optimization

- Efficient queries with proper indexing
- Connection pooling
- Query optimization

### Async Operations

- Activity logging is asynchronous
- Notifications are queued
- Sync operations are background tasks

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check JWT token validity
   - Verify user exists in database
   - Confirm user status is active

2. **Permission Denied**
   - Verify user role and permissions
   - Check permission configuration
   - Confirm route protection level

3. **Validation Errors**
   - Review request data format
   - Check schema requirements
   - Verify data types

4. **Notification Issues**
   - Check notification triggers
   - Verify target user roles
   - Confirm Socket.IO connection

### Debug Commands

```bash
# Test middleware functionality
npm run test:middleware

# Check API route configuration
npm run check-routes

# Validate schemas
npm run validate-schemas
```

## API Reference

### Middleware Configuration Options

```typescript
interface ApiMiddlewareOptions {
  auth?: {
    required?: boolean
    roles?: UserRole[]
    permission?: Permission
  }
  activity?: {
    module: string
    entityType: string
    skipMethods?: string[]
  }
  sync?: {
    enabled?: boolean
    excludeRoutes?: string[]
  }
  notifications?: {
    triggers?: NotificationTrigger[]
  }
  validation?: {
    schema?: any | Record<string, any>
    translateErrors?: boolean
  }
}
```

### Quick Migration Options

```typescript
type QuickMigrateType = 
  | 'public'
  | 'authenticated' 
  | 'admin'
  | 'sales'
  | 'inventory'
  | 'customers'
  | 'settings'
```

---

*This documentation is automatically updated when middleware configurations change.*