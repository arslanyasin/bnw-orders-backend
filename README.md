# Bank Order Processing System - Backend

Production-grade backend boilerplate for Bank Order Processing System built with NestJS, MongoDB, and JWT authentication.

## Features

- **NestJS Framework** - Scalable, maintainable TypeScript architecture
- **MongoDB + Mongoose** - NoSQL database with ODM
- **JWT Authentication** - Secure access and refresh tokens
- **Role-Based Access Control (RBAC)** - Admin, Staff, and Dispatch roles
- **Swagger/OpenAPI Documentation** - Interactive API docs at `/api/docs`
- **API Versioning** - Built-in versioning support (v1)
- **Request Validation** - Class-validator and DTOs
- **Global Error Handling** - Centralized exception filters
- **Logging System** - Winston with daily log rotation and audit logs
- **Security** - Helmet, CORS, Rate limiting, Password hashing
- **TypeScript** - Type safety and better developer experience

## Project Structure

```
bank-order-backend/
├── src/
│   ├── common/                    # Shared utilities
│   │   ├── decorators/           # Custom decorators (@Roles, @CurrentUser, @Public)
│   │   ├── filters/              # Exception filters
│   │   ├── guards/               # Auth & Role guards
│   │   ├── interceptors/         # Logging & Transform interceptors
│   │   ├── interfaces/           # Shared interfaces & enums
│   │   └── pipes/                # Validation pipes
│   ├── config/                   # Configuration files
│   │   ├── configuration.ts      # App config
│   │   └── env.validation.ts     # Env validation schema
│   ├── modules/                  # Feature modules
│   │   ├── auth/                # Authentication module
│   │   ├── users/               # User management
│   │   └── orders/              # Order processing
│   ├── shared/                   # Shared modules
│   │   ├── database/            # Database connection
│   │   ├── logger/              # Logging service
│   │   └── utils/               # Utility functions
│   ├── app.module.ts            # Root module
│   └── main.ts                  # Application entry point
├── logs/                        # Application logs
├── .env.example                 # Environment variables template
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js >= 18.x
- MongoDB >= 5.x
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bank-order-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your configuration:
   - Update `MONGODB_URI` with your MongoDB connection string
   - Change `JWT_SECRET` and `JWT_REFRESH_SECRET` (minimum 32 characters)
   - Configure other settings as needed

4. **Run the application**
   ```bash
   # Development
   npm run start:dev

   # Production
   npm run build
   npm run start:prod
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production/test) | development |
| `APP_PORT` | Application port | 3000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/bank_orders |
| `JWT_SECRET` | JWT secret key (min 32 chars) | Required |
| `JWT_REFRESH_SECRET` | JWT refresh secret | Required |
| `JWT_ACCESS_EXPIRATION` | Access token expiration | 15m |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiration | 7d |
| `CORS_ORIGIN` | Allowed CORS origins | http://localhost:3001 |
| `LOG_LEVEL` | Logging level | info |

## API Documentation

### Interactive Swagger Documentation

**Access Swagger UI**: `http://localhost:3000/api/docs`

Features:
- Try all endpoints directly from the browser
- JWT authentication built-in
- Request/response schemas
- Example payloads

See [SWAGGER_GUIDE.md](SWAGGER_GUIDE.md) for detailed documentation.

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

### User Endpoints

All user endpoints require authentication.

```http
GET    /api/v1/users          # Get all users (Admin, Staff)
GET    /api/v1/users/me       # Get current user profile
GET    /api/v1/users/:id      # Get user by ID (Admin, Staff)
POST   /api/v1/users          # Create user (Admin only)
PATCH  /api/v1/users/:id      # Update user (Admin only)
DELETE /api/v1/users/:id      # Delete user (Admin only)
```

### Order Endpoints

```http
GET    /api/v1/orders         # Get all orders
GET    /api/v1/orders/:id     # Get order by ID
POST   /api/v1/orders         # Create order (Admin, Staff)
PATCH  /api/v1/orders/:id     # Update order
PATCH  /api/v1/orders/:id/assign  # Assign order (Admin, Staff)
DELETE /api/v1/orders/:id     # Delete order (Admin only)
```

## User Roles

### Admin
- Full system access
- User management
- Order management
- System configuration

### Staff
- Create and manage orders
- Assign orders
- View users

### Dispatch
- View orders
- Update order status
- Mark orders as dispatched

## Security Features

1. **JWT Authentication** - Secure token-based authentication
2. **Password Hashing** - bcrypt with configurable salt rounds
3. **Account Locking** - After multiple failed login attempts
4. **Rate Limiting** - Protect against brute force attacks
5. **Helmet** - Security headers
6. **CORS** - Configurable cross-origin access
7. **Input Validation** - Request DTOs with class-validator
8. **Audit Logging** - Track all critical operations

## Logging

The application uses Winston for logging with the following features:

- **Console logs** - Colored output for development
- **File logs** - Daily rotating files
  - `logs/error-YYYY-MM-DD.log` - Error logs (14 days retention)
  - `logs/combined-YYYY-MM-DD.log` - All logs (14 days retention)
  - `logs/audit-YYYY-MM-DD.log` - Audit logs (90 days retention)

### Log Levels
- `error` - Error messages
- `warn` - Warning messages
- `info` - Informational messages
- `debug` - Debug messages
- `verbose` - Verbose output

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Scripts

```bash
npm run start          # Start application
npm run start:dev      # Start in development mode with watch
npm run start:debug    # Start in debug mode
npm run start:prod     # Start in production mode
npm run build          # Build for production
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run test           # Run tests
```

## Best Practices

1. **Use DTOs** - Always validate input with Data Transfer Objects
2. **Use Guards** - Protect routes with @UseGuards(JwtAuthGuard, RolesGuard)
3. **Use Decorators** - Leverage @Roles(), @CurrentUser(), @Public()
4. **Error Handling** - Throw appropriate HTTP exceptions
5. **Logging** - Log all critical operations with audit logs
6. **Soft Deletes** - Use `isDeleted` flag instead of hard deletes
7. **Timestamps** - All schemas include createdAt/updatedAt

## Extending the Boilerplate

### Adding a New Module

1. Generate module:
   ```bash
   nest g module modules/new-module
   nest g service modules/new-module
   nest g controller modules/new-module
   ```

2. Create schema in `modules/new-module/schemas/`
3. Create DTOs in `modules/new-module/dto/`
4. Implement service logic
5. Add routes in controller
6. Import module in `app.module.ts`

### Adding Custom Guards

Create in `src/common/guards/` and register globally in `app.module.ts` or use `@UseGuards()` decorator.

## Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB is running
- Check MONGODB_URI in .env
- Ensure network connectivity

### JWT Errors
- Verify JWT secrets are set and >= 32 characters
- Check token expiration times
- Ensure Authorization header format: `Bearer <token>`

### Port Already in Use
- Change APP_PORT in .env
- Or kill process using the port

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT secrets (min 64 characters recommended)
3. Configure production MongoDB URI
4. Enable HTTPS
5. Set appropriate CORS origins
6. Configure log rotation
7. Use process manager (PM2, systemd)
8. Set up monitoring and alerts

## License

UNLICENSED - Proprietary Software

## Support

For issues and questions, please contact the development team.
