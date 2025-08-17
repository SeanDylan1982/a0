# Services Documentation

## InventoryPool Service

The InventoryPool service provides centralized inventory management with stock reservations, movements tracking, and realistic adjustment validation.

### Key Features

- **Stock Reservations**: Reserve stock for pending orders with automatic expiration
- **Movement Tracking**: Record all stock movements with before/after quantities
- **Realistic Adjustments**: Validate adjustment reasons (breakage, theft, spillage, etc.)
- **Concurrent Safety**: Handle multiple operations safely with database transactions
- **Integration**: Works seamlessly with existing InventoryAlertManager

### Core Methods

#### Stock Availability
```typescript
// Get available stock (total - reserved)
const available = await InventoryPool.getAvailableStock(productId)

// Validate stock operation before execution
const validation = await InventoryPool.validateStockOperation(productId, quantity, 'reserve')
```

#### Stock Reservations
```typescript
// Reserve stock with automatic expiration
const reservationId = await InventoryPool.reserveStock({
  productId: 'product-id',
  quantity: 25,
  reason: 'Sales order #12345',
  userId: 'user-id',
  expirationMinutes: 30 // Optional, defaults to 30
})

// Release reservation
await InventoryPool.releaseReservation(reservationId)

// Cleanup expired reservations
const cleanedCount = await InventoryPool.cleanupExpiredReservations()
```

#### Stock Movements
```typescript
// Record stock movement (purchase, sale, transfer, etc.)
const movement = await InventoryPool.recordMovement({
  productId: 'product-id',
  type: 'PURCHASE', // PURCHASE, SALE, TRANSFER, RETURN, DAMAGE, etc.
  quantity: 100,
  reason: 'Purchase order received',
  reference: 'PO-12345',
  userId: 'user-id'
})

// Record stock adjustment with validation
const adjustment = await InventoryPool.updateStock({
  productId: 'product-id',
  quantity: -5, // Negative for reduction
  reason: 'BREAKAGE', // Must be from VALID_ADJUSTMENT_REASONS
  userId: 'user-id'
})
```

#### Stock History and Summary
```typescript
// Get stock movements for a product
const movements = await InventoryPool.getStockMovements(productId, {
  from: new Date('2024-01-01'),
  to: new Date('2024-12-31')
})

// Get comprehensive stock summary
const summary = await InventoryPool.getStockSummary(productId)
// Returns: totalStock, availableStock, reservedStock, activeReservations, recentMovements
```

### Valid Adjustment Reasons

The service enforces realistic adjustment reasons:
- `BREAKAGE` - Physical damage
- `THEFT` - Stolen items
- `SPILLAGE` - Liquid/powder spillage
- `DAMAGE` - General damage
- `EXPIRED` - Expired products
- `LOST` - Missing items
- `FOUND` - Found items during count
- `RECOUNT` - Stock count adjustment
- `SUPPLIER_ERROR` - Supplier delivery error
- `RETURN_TO_SUPPLIER` - Returned to supplier
- `QUALITY_CONTROL` - QC rejection
- `SAMPLE_USED` - Used for samples
- `WRITE_OFF` - Written off

### API Endpoints

#### GET /api/inventory/pool
Get stock summary for a product.
```
Query: ?productId=<product-id>
Response: { success: true, data: StockSummary }
```

#### POST /api/inventory/pool/reserve
Reserve stock for a product.
```
Body: { productId, quantity, reason, expirationMinutes? }
Response: { success: true, data: { reservationId } }
```

#### DELETE /api/inventory/pool/reserve
Release a stock reservation.
```
Query: ?reservationId=<reservation-id>
Response: { success: true, message: "Reservation released" }
```

#### POST /api/inventory/pool/movements
Record stock movement or adjustment.
```
Body: { 
  action: 'record' | 'adjust',
  productId, 
  type?, // For record action
  quantity, 
  reason,
  reference? // For record action
}
Response: { success: true, data: MovementInfo }
```

#### GET /api/inventory/pool/movements
Get stock movements for a product.
```
Query: ?productId=<product-id>&from=<date>&to=<date>
Response: { success: true, data: MovementInfo[] }
```

#### POST /api/inventory/pool/validate
Validate stock operation before execution.
```
Body: { productId, quantity, operation: 'reserve' | 'reduce' }
Response: { success: true, data: { valid, availableStock, message } }
```

#### POST /api/inventory/pool/cleanup
Cleanup expired reservations (requires DIRECTOR or INVENTORY_MANAGER role).
```
Response: { success: true, data: { cleanedReservations: number } }
```

### React Hook

Use the `useInventoryPool` hook for easy integration in React components:

```typescript
import { useInventoryPool } from '@/hooks/useInventoryPool'

function InventoryComponent() {
  const {
    loading,
    error,
    getStockSummary,
    reserveStock,
    recordMovement,
    adjustStock
  } = useInventoryPool()

  const handleReserveStock = async () => {
    const reservationId = await reserveStock({
      productId: 'product-id',
      quantity: 10,
      reason: 'Customer order'
    })
    
    if (reservationId) {
      console.log('Stock reserved:', reservationId)
    } else {
      console.error('Reservation failed:', error)
    }
  }

  // ... component logic
}
```

### Integration with Existing Systems

The InventoryPool service integrates seamlessly with:

- **InventoryAlertManager**: Automatically triggers stock level checks
- **Activity Logger**: All operations are logged for audit trails
- **Socket.IO**: Real-time notifications for stock changes
- **Prisma ORM**: Uses existing database models and transactions

### Error Handling

The service provides comprehensive error handling:
- Validation errors for invalid data
- Stock availability errors for insufficient inventory
- Permission errors for unauthorized operations
- Database errors with proper rollback

### Testing

Comprehensive test suites are available:
- Unit tests: `src/lib/services/__tests__/inventory-pool.test.ts`
- Integration tests: `src/lib/services/__tests__/inventory-pool-integration.test.ts`

Run tests with:
```bash
npm test -- src/lib/services/__tests__/inventory-pool
```

### Performance Considerations

- Database transactions ensure data consistency
- Indexes on key fields for fast queries
- Automatic cleanup of expired reservations
- Pagination for large datasets
- Caching integration ready (Redis)

### Security

- User authentication required for all operations
- Role-based access control for sensitive operations
- Input validation and sanitization
- Audit trails for all stock changes