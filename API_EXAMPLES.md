# API Usage Examples

## Authentication Flow

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@bank.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response:**
```json
{
  "statusCode": 201,
  "message": "Success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "staff@bank.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "staff",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@bank.com",
    "password": "SecurePass123!"
  }'
```

### 3. Get Current User Profile

```bash
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Refresh Access Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 5. Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Order Management

### 1. Create New Order

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "ABC Corporation",
    "accountNumber": "1234567890",
    "amount": 50000.00,
    "description": "Wire transfer request",
    "priority": "high",
    "metadata": {
      "branch": "Downtown",
      "requestedBy": "Finance Department"
    }
  }'
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "orderNumber": "ORD-251205-00001",
    "customerName": "ABC Corporation",
    "accountNumber": "1234567890",
    "amount": 50000,
    "description": "Wire transfer request",
    "status": "pending",
    "priority": "high",
    "createdBy": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "staff@bank.com"
    },
    "statusHistory": [
      {
        "action": "Order Created",
        "performedBy": "507f1f77bcf86cd799439011",
        "timestamp": "2025-12-05T10:30:00.000Z"
      }
    ],
    "createdAt": "2025-12-05T10:30:00.000Z",
    "updatedAt": "2025-12-05T10:30:00.000Z"
  }
}
```

### 2. Get All Orders

```bash
curl -X GET http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Get Orders by Status

```bash
curl -X GET "http://localhost:3000/api/v1/orders?status=pending" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Available statuses:** `pending`, `processing`, `dispatched`, `completed`, `cancelled`

### 4. Get Single Order

```bash
curl -X GET http://localhost:3000/api/v1/orders/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Update Order Status

```bash
curl -X PATCH http://localhost:3000/api/v1/orders/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "processing",
    "notes": "Started processing the wire transfer"
  }'
```

### 6. Assign Order to User

```bash
curl -X PATCH http://localhost:3000/api/v1/orders/507f1f77bcf86cd799439012/assign \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignedTo": "507f1f77bcf86cd799439013"
  }'
```

### 7. Mark Order as Dispatched

```bash
curl -X PATCH http://localhost:3000/api/v1/orders/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "dispatched",
    "notes": "Wire transfer completed and dispatched"
  }'
```

### 8. Delete Order (Admin Only)

```bash
curl -X DELETE http://localhost:3000/api/v1/orders/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## User Management (Admin)

### 1. Get All Users

```bash
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 2. Get User by ID

```bash
curl -X GET http://localhost:3000/api/v1/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 3. Create User with Specific Role

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bank.com",
    "password": "SecurePass123!",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "admin"
  }'
```

**Available roles:** `admin`, `staff`, `dispatch`

### 4. Update User

```bash
curl -X PATCH http://localhost:3000/api/v1/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Updated",
    "role": "admin",
    "isActive": true
  }'
```

### 5. Deactivate User

```bash
curl -X PATCH http://localhost:3000/api/v1/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

### 6. Delete User

```bash
curl -X DELETE http://localhost:3000/api/v1/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## Error Responses

### Validation Error
```json
{
  "statusCode": 400,
  "timestamp": "2025-12-05T10:30:00.000Z",
  "path": "/api/v1/orders",
  "method": "POST",
  "message": "Validation failed",
  "errors": [
    {
      "field": "amount",
      "errors": ["amount must be a positive number"]
    }
  ]
}
```

### Unauthorized
```json
{
  "statusCode": 401,
  "timestamp": "2025-12-05T10:30:00.000Z",
  "path": "/api/v1/users",
  "method": "GET",
  "message": "Invalid or expired token"
}
```

### Forbidden
```json
{
  "statusCode": 403,
  "timestamp": "2025-12-05T10:30:00.000Z",
  "path": "/api/v1/users",
  "method": "POST",
  "message": "Insufficient permissions. Required roles: admin"
}
```

### Not Found
```json
{
  "statusCode": 404,
  "timestamp": "2025-12-05T10:30:00.000Z",
  "path": "/api/v1/orders/507f1f77bcf86cd799439012",
  "method": "GET",
  "message": "Order with ID 507f1f77bcf86cd799439012 not found"
}
```

---

## Role-Based Access Examples

### Admin Role
- Can access all endpoints
- Can create users with any role
- Can delete users and orders
- Full system access

```bash
# Admin creating another admin
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin2@bank.com",
    "password": "SecurePass123!",
    "firstName": "Admin",
    "lastName": "Two",
    "role": "admin"
  }'
```

### Staff Role
- Can create and manage orders
- Can view users
- Can assign orders
- Cannot delete users

```bash
# Staff creating an order
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "XYZ Ltd",
    "accountNumber": "9876543210",
    "amount": 25000.00,
    "description": "Payment processing"
  }'
```

### Dispatch Role
- Can view orders
- Can update order status
- Can mark orders as dispatched
- Limited user access

```bash
# Dispatch updating order status
curl -X PATCH http://localhost:3000/api/v1/orders/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer DISPATCH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "dispatched",
    "notes": "Package dispatched via courier"
  }'
```

---

## Testing the API

Use these examples with:
- **cURL** - Command line
- **Postman** - GUI API client
- **Insomnia** - REST client
- **HTTPie** - User-friendly CLI

Remember to replace:
- `YOUR_ACCESS_TOKEN` with actual token from login
- `507f1f77bcf86cd799439011` with actual IDs
- `localhost:3000` with your server address
