# Quick Start Guide

Get your Bank Order Processing System backend up and running in 5 minutes.

## Prerequisites Check

```bash
# Check Node.js version (should be >= 18.x)
node --version

# Check MongoDB (should be running)
mongod --version
```

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env file
# REQUIRED: Update these values
# - MONGODB_URI (your MongoDB connection string)
# - JWT_SECRET (minimum 32 characters)
# - JWT_REFRESH_SECRET (minimum 32 characters)
```

**Quick .env Setup:**
```env
NODE_ENV=development
APP_PORT=3000
MONGODB_URI=mongodb://localhost:27017/bank_orders
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-characters-long
```

### 3. Start MongoDB

```bash
# If MongoDB is not running, start it
# macOS (with Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Or run directly
mongod
```

### 4. Run the Application

```bash
# Development mode with hot reload
npm run start:dev
```

You should see:
```
🚀 Bank Order Processing System is running on: http://localhost:3000/api/v1
📝 Environment: development
🔐 JWT Authentication enabled
📊 MongoDB connected
```

## Test the API

### 1. Register First Admin User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bank.com",
    "password": "Admin123!",
    "firstName": "System",
    "lastName": "Admin"
  }'
```

**Save the `accessToken` from the response!**

### 2. Create an Order

```bash
# Replace YOUR_TOKEN with the accessToken from step 1
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "ABC Corp",
    "accountNumber": "1234567890",
    "amount": 50000,
    "description": "Wire transfer",
    "priority": "high"
  }'
```

### 3. Get All Orders

```bash
curl -X GET http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Project Structure Overview

```
src/
├── main.ts                          # Entry point
├── app.module.ts                    # Root module
├── config/                          # Configuration
├── common/                          # Shared utilities
│   ├── decorators/                 # @Roles, @CurrentUser
│   ├── guards/                     # Auth & RBAC
│   ├── filters/                    # Error handlers
│   └── pipes/                      # Validation
├── modules/
│   ├── auth/                       # Authentication
│   ├── users/                      # User management
│   └── orders/                     # Order processing
└── shared/
    ├── database/                   # DB connection
    └── logger/                     # Logging service
```

## User Roles

### Default Role (Staff)
- Registration creates `staff` role by default
- Can create and manage orders

### Admin
- Full system access
- Can only be created by another admin via `/api/v1/users` endpoint

### Dispatch
- View and update order status
- Can mark orders as dispatched

## Common Commands

```bash
# Development
npm run start:dev              # Start with hot reload

# Production
npm run build                  # Build for production
npm run start:prod             # Run production build

# Code Quality
npm run lint                   # Run linter
npm run format                 # Format code

# Testing
npm run test                   # Run tests
npm run test:cov               # Test coverage
```

## API Endpoints Summary

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Refresh token

### Users
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create user (Admin)
- `PATCH /api/v1/users/:id` - Update user (Admin)
- `DELETE /api/v1/users/:id` - Delete user (Admin)

### Orders
- `GET /api/v1/orders` - Get all orders
- `GET /api/v1/orders/:id` - Get order
- `POST /api/v1/orders` - Create order
- `PATCH /api/v1/orders/:id` - Update order
- `PATCH /api/v1/orders/:id/assign` - Assign order
- `DELETE /api/v1/orders/:id` - Delete order (Admin)

## Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Check connection string in .env
# Default: mongodb://localhost:27017/bank_orders
```

### Port Already in Use
```bash
# Change port in .env
APP_PORT=3001

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### JWT Errors
```bash
# Ensure secrets are at least 32 characters
# Generate random secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Next Steps

1. **Read Full Documentation**: Check `README.md` for detailed info
2. **API Examples**: See `API_EXAMPLES.md` for more examples
3. **Customize**: Add your own modules and features
4. **Security**: Update JWT secrets for production
5. **Deploy**: Configure for production environment

## Quick Tips

- All passwords are hashed with bcrypt
- Account locks after 5 failed login attempts
- Audit logs are stored in `logs/audit-*.log`
- Soft deletes are used (isDeleted flag)
- All endpoints return consistent JSON format
- Rate limiting: 100 requests per minute

## Development Workflow

1. Create feature branch
2. Develop feature (use existing modules as reference)
3. Add validation DTOs
4. Implement service logic
5. Add routes with proper guards
6. Test endpoints
7. Check logs for audit trail

## Need Help?

- **Full Documentation**: `README.md`
- **API Examples**: `API_EXAMPLES.md`
- **Architecture**: Review code in `src/modules/` for patterns

Happy Coding! 🚀
