# API Documentation

Account Zero REST API reference for developers integrating with the business management system.

## Base URL
```
http://localhost:3500/api
```

## Authentication
All API endpoints require authentication via NextAuth.js session cookies or API tokens.

## Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "error": null
}
```

## Error Responses
```json
{
  "success": false,
  "data": null,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

## Endpoints

### Authentication
#### POST /api/auth/signin
Login user with credentials.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

### Customers
#### GET /api/customers
Get all customers with pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search term

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [...],
    "total": 100,
    "page": 1,
    "totalPages": 10
  }
}
```

#### POST /api/customers
Create new customer.

**Request:**
```json
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "+27123456789",
  "address": "123 Main St",
  "accountType": "CREDIT",
  "creditLimit": 10000
}
```

#### GET /api/customers/[id]
Get customer by ID with full details.

#### PUT /api/customers/[id]
Update customer information.

#### DELETE /api/customers/[id]
Delete customer (soft delete).

### Products
#### GET /api/products
Get all active products.

**Query Parameters:**
- `search` (string): Search term
- `category` (string): Filter by category
- `inStock` (boolean): Filter by stock availability

#### POST /api/products
Create new product.

**Request:**
```json
{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "cost": 50.00,
  "stockQuantity": 100,
  "minimumStock": 10,
  "category": "Electronics",
  "barcode": "1234567890123"
}
```

#### PUT /api/products/[id]
Update product information.

### Inventory
#### GET /api/inventory/alerts
Get current inventory alerts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "alert_id",
      "productId": "product_id",
      "productName": "Product Name",
      "currentStock": 5,
      "minimumStock": 10,
      "severity": "WARNING",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/inventory/validate-stock
Validate stock availability for products.

**Request:**
```json
{
  "items": [
    {
      "productId": "product_id",
      "quantity": 5
    }
  ]
}
```

#### POST /api/inventory/adjust
Adjust stock levels.

**Request:**
```json
{
  "productId": "product_id",
  "adjustment": -5,
  "reason": "Sale",
  "reference": "INV-2025000001"
}
```

### Invoicing
#### GET /api/invoices
Get all invoices with pagination.

#### POST /api/invoices
Create new invoice.

**Request:**
```json
{
  "customerId": "customer_id",
  "items": [
    {
      "productId": "product_id",
      "quantity": 2,
      "unitPrice": 99.99
    }
  ],
  "notes": "Invoice notes"
}
```

#### GET /api/invoices/[id]
Get invoice by ID.

#### PUT /api/invoices/[id]/status
Update invoice status.

**Request:**
```json
{
  "status": "PAID"
}
```

### Quotes
#### GET /api/quotes
Get all quotes.

#### POST /api/quotes
Create new quote.

#### PUT /api/quotes/[id]/convert
Convert quote to invoice.

### Calendar
#### GET /api/calendar/events
Get calendar events.

**Query Parameters:**
- `start` (string): Start date (ISO format)
- `end` (string): End date (ISO format)
- `type` (string): Event type filter

#### POST /api/calendar/events
Create calendar event.

**Request:**
```json
{
  "title": "Event Title",
  "description": "Event description",
  "startDate": "2025-01-01T10:00:00Z",
  "endDate": "2025-01-01T11:00:00Z",
  "type": "MEETING",
  "attendees": ["user1@example.com"]
}
```

### Settings
#### GET /api/settings/company
Get company settings.

#### PUT /api/settings/company
Update company settings.

**Request:**
```json
{
  "name": "Company Name",
  "address": "Company Address",
  "phone": "+27123456789",
  "email": "info@company.com",
  "vatNumber": "4123456789",
  "registrationNumber": "2021/123456/07"
}
```

### Reports
#### GET /api/reports/sales
Get sales report.

**Query Parameters:**
- `startDate` (string): Start date
- `endDate` (string): End date
- `groupBy` (string): Group by period (day, week, month)

#### GET /api/reports/inventory
Get inventory report.

#### GET /api/reports/customers
Get customer report.

### Document Numbering
#### GET /api/documents/next-number
Get next document number.

**Query Parameters:**
- `type` (string): Document type (INVOICE, QUOTE, CREDIT_NOTE, DELIVERY_NOTE)

### Real-time Events
WebSocket events via Socket.IO on port 5000:

#### Client Events
- `join_room`: Join user-specific room
- `inventory_alert_dismissed`: Dismiss inventory alert

#### Server Events
- `inventory_alert`: New inventory alert
- `stock_updated`: Stock level changed
- `document_created`: New document created
- `system_notification`: System-wide notification

## Rate Limiting
- 100 requests per minute per IP
- 1000 requests per hour per authenticated user

## Error Codes
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `STOCK_INSUFFICIENT`: Not enough stock available
- `DUPLICATE_ENTRY`: Resource already exists
- `SERVER_ERROR`: Internal server error

## SDK Examples

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/customers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'New Customer',
    email: 'customer@example.com'
  })
});

const result = await response.json();
```

### cURL
```bash
curl -X POST http://localhost:3500/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"New Customer","email":"customer@example.com"}'
```

## Webhooks
Configure webhooks to receive real-time notifications:

### Available Events
- `invoice.created`
- `invoice.paid`
- `stock.low`
- `customer.created`

### Webhook Payload
```json
{
  "event": "invoice.created",
  "data": {...},
  "timestamp": "2025-01-01T00:00:00Z"
}
```