# Activity Logging Service

The Activity Logging Service provides comprehensive tracking of user actions across the Account Zero platform. It ensures all business operations are logged for audit trails, compliance, and management oversight.

## Features

- **Comprehensive Logging**: Tracks all user actions across modules
- **Role-Based Access**: Filters activities based on user roles and permissions
- **Performance Optimized**: Includes proper database indexing for fast queries
- **IP and User Agent Tracking**: Captures client information for security audits
- **Automatic Middleware**: Easy integration with API routes
- **Utility Functions**: Pre-built helpers for common logging scenarios

## Quick Start

### 1. Basic Activity Logging

```typescript
import { ActivityLogger } from '@/lib/services/activity-logger'

// Log a simple activity
await ActivityLogger.log({
  userId: 'user123',
  module: 'inventory',
  action: 'create',
  entityType: 'product',
  entityId: 'product123',
  entityName: 'New Product',
  details: { price: 100, quantity: 50 },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
})
```

### 2. Using Utility Functions

```typescript
import { logInventoryActivity, ACTIVITY_ACTIONS } from '@/lib/utils/activity-utils'

// Log inventory-specific activity
await logInventoryActivity(
  userId,
  ACTIVITY_ACTIONS.STOCK_IN,
  productId,
  productName,
  { quantity: 100, reason: 'Purchase order received' }
)
```

### 3. API Route Integration

```typescript
import { withActivityLogging, createCRUDActivityContext } from '@/lib/middleware/activity-middleware'

export const POST = withActivityLogging(
  async (request: NextRequest) => {
    // Your API logic here
    const result = await createSomething(data)
    return NextResponse.json(result)
  },
  // Activity context extractor
  (req, response) => createCRUDActivityContext(
    userId,
    'inventory',
    'product',
    req.method,
    response
  )
)
```

### 4. Retrieving Activities

```typescript
import { ActivityLogger } from '@/lib/services/activity-logger'

// Get activities with role-based filtering
const activities = await ActivityLogger.getActivitiesByRole(
  userId,
  userRole,
  {
    module: 'inventory',
    limit: 20,
    startDate: new Date('2024-01-01')
  }
)

// Get activities for a specific entity
const entityActivities = await ActivityLogger.getEntityActivities(
  'product',
  'product123',
  10
)
```

## API Reference

### ActivityLogger Class

#### `log(activity: ActivityLogData): Promise<void>`
Logs a single activity. Never throws errors to avoid breaking main operations.

#### `getActivities(filters?: ActivityFilters): Promise<ActivityLogWithUser[]>`
Retrieves activities with optional filtering and pagination.

#### `getActivitiesByRole(userId: string, role: UserRole, filters?: ActivityFilters): Promise<ActivityLogWithUser[]>`
Gets activities filtered by user role and permissions.

#### `getActivityCount(filters?: ActivityFilters): Promise<number>`
Returns count of activities matching filters.

#### `getEntityActivities(entityType: string, entityId: string, limit?: number): Promise<ActivityLogWithUser[]>`
Gets activities for a specific entity.

#### `getModuleActivities(module: string, limit?: number): Promise<ActivityLogWithUser[]>`
Gets recent activities for a specific module.

#### `cleanupOldActivities(daysToKeep?: number): Promise<number>`
Removes old activity logs (default: 365 days).

### Utility Functions

#### Activity Logging Helpers
- `logInventoryActivity()` - Log inventory-related activities
- `logSalesActivity()` - Log sales-related activities  
- `logCustomerActivity()` - Log customer-related activities
- `logHRActivity()` - Log HR-related activities
- `logSystemActivity()` - Log system-related activities

#### Permission Helpers
- `canViewActivities()` - Check if user can view specific activities
- `formatActivityDetails()` - Format activity details for display
- `getActivityIcon()` - Get appropriate icon for activity type

### Constants

#### Activity Actions
```typescript
ACTIVITY_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update', 
  DELETE: 'delete',
  APPROVE: 'approve',
  STOCK_IN: 'stock_in',
  STOCK_OUT: 'stock_out',
  // ... more actions
}
```

#### Modules
```typescript
MODULES = {
  INVENTORY: 'inventory',
  SALES: 'sales',
  HR: 'hr',
  ACCOUNTING: 'accounting',
  // ... more modules
}
```

#### Entity Types
```typescript
ENTITY_TYPES = {
  PRODUCT: 'product',
  CUSTOMER: 'customer',
  SALE: 'sale',
  INVOICE: 'invoice',
  // ... more types
}
```

## Role-Based Access Control

The system implements role-based filtering of activities:

- **DIRECTOR**: Can view all activities across all modules
- **MANAGER**: Can view activities in their functional area and subordinate roles
- **HOD**: Can view activities in their department
- **SALES_REP**: Can view sales activities and their own activities
- **INVENTORY_MANAGER**: Can view inventory activities and their own activities
- **HR_STAFF**: Can view HR activities and their own activities
- **ACCOUNTANT**: Can view financial activities and their own activities
- **STAFF_MEMBER/USER**: Can only view their own activities

## Database Schema

The ActivityLog model includes the following indexes for performance:

```prisma
model ActivityLog {
  // ... fields ...
  
  @@index([userId, timestamp])
  @@index([module, timestamp])
  @@index([entityType, entityId])
  @@index([timestamp])
}
```

## Best Practices

### 1. Use Utility Functions
Always prefer utility functions over direct ActivityLogger calls for consistency:

```typescript
// Good
await logInventoryActivity(userId, ACTIVITY_ACTIONS.CREATE, productId, productName)

// Avoid
await ActivityLogger.log({ userId, module: 'inventory', ... })
```

### 2. Include Meaningful Details
Provide context in the details object:

```typescript
await logInventoryActivity(userId, ACTIVITY_ACTIONS.UPDATE, productId, productName, {
  changes: { price: { from: 100, to: 120 } },
  reason: 'Price adjustment due to supplier cost increase'
})
```

### 3. Handle Errors Gracefully
Activity logging should never break main operations:

```typescript
try {
  await logInventoryActivity(...)
} catch (error) {
  console.warn('Activity logging failed:', error)
  // Continue with main operation
}
```

### 4. Use Middleware for API Routes
For consistent logging across API routes, use the middleware:

```typescript
export const POST = withActivityLogging(handler, contextExtractor)
```

### 5. Implement Cleanup
Regularly clean up old activities to maintain performance:

```typescript
// In a scheduled job
await ActivityLogger.cleanupOldActivities(365) // Keep 1 year
```

## Testing

The service includes comprehensive unit tests. Run tests with:

```bash
npm run test:run src/lib/services/__tests__/activity-logger.simple.test.ts
```

## Performance Considerations

- Activities are logged asynchronously to avoid blocking main operations
- Database indexes are optimized for common query patterns
- Pagination is used for large result sets
- Old activities can be archived or deleted to maintain performance

## Security

- IP addresses and user agents are captured for audit trails
- Role-based access ensures users only see appropriate activities
- All database operations use parameterized queries to prevent injection
- Sensitive data should not be included in activity details