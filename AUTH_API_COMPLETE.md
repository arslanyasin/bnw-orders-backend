# 🔐 Complete Authentication API Documentation

## ✅ All Features Implemented

Your Bank Order Processing System now has **complete authentication** with all requested features!

---

## 📋 Feature Checklist

- ✅ **Register user** (Admin can create any role, regular users get 'staff' role)
- ✅ **Login** with JWT tokens
- ✅ **Refresh token** for extending sessions
- ✅ **Role-based middleware** (Admin, Staff, Dispatch)
- ✅ **Password hashing** with bcrypt
- ✅ **Forgot password** with secure token
- ✅ **Reset password** with token validation
- ✅ **Change password** for authenticated users
- ✅ **Account locking** after failed attempts
- ✅ **Audit logging** for all auth operations

---

## 📊 User Schema (Mongoose)

```typescript
@Schema({ timestamps: true })
export class User extends Document {
  email: string;                    // Unique, required
  password: string;                 // Hashed with bcrypt
  firstName: string;                // Required
  lastName: string;                 // Required
  role: UserRole;                   // admin | staff | dispatch
  isActive: boolean;                // Default: true
  isEmailVerified: boolean;         // Default: false
  lastLogin?: Date;
  loginAttempts: number;            // Default: 0
  lockUntil?: Date;                 // Account lock expiration
  isDeleted: boolean;               // Soft delete
  deletedAt?: Date;
  refreshToken?: string;
  passwordResetToken?: string;      // Hashed reset token
  passwordResetExpires?: Date;      // Token expiration

  // Timestamps (auto-generated)
  createdAt: Date;
  updatedAt: Date;
}
```

**Virtual Field:**
- `fullName` - Returns `firstName + lastName`

**Methods:**
- `comparePassword(password)` - Compare plain password with hash
- `isLocked` - Check if account is locked

---

## 🚀 API Endpoints

### Base URL
```
http://localhost:3000/api/v1/auth
```

---

## 1. Register User

**POST** `/auth/register`

Register a new user. By default, users are assigned the **staff** role. Only admins can create users with other roles via the `/users` endpoint.

### Request Body
```json
{
  "email": "john.doe@bank.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Response (201 Created)
```json
{
  "statusCode": 201,
  "message": "Success",
  "data": {
    "user": {
      "_id": "673fb1234567890abcdef123",
      "email": "john.doe@bank.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "staff",
      "isActive": true,
      "isEmailVerified": false,
      "createdAt": "2025-12-05T10:00:00.000Z",
      "updatedAt": "2025-12-05T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-12-05T10:00:00.000Z"
}
```

### Error Responses
- **400** - Validation failed
- **409** - Email already exists

---

## 2. Login

**POST** `/auth/login`

Authenticate user and receive JWT tokens.

### Request Body
```json
{
  "email": "john.doe@bank.com",
  "password": "SecurePass123!"
}
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "user": {
      "_id": "673fb1234567890abcdef123",
      "email": "john.doe@bank.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "staff",
      "isActive": true,
      "lastLogin": "2025-12-05T10:05:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-12-05T10:05:00.000Z"
}
```

### Error Responses
- **401** - Invalid credentials
- **401** - Account is temporarily locked
- **401** - Account is inactive

### Security Features
- **Failed login tracking**: After 5 failed attempts, account locks for 15 minutes
- **Account lock**: `lockUntil` field prevents login during lock period
- **Audit logging**: All login attempts are logged

---

## 3. Logout

**POST** `/auth/logout`

🔒 **Requires Authentication**

Invalidate refresh token and log out user.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "Logged out successfully"
  },
  "timestamp": "2025-12-05T10:10:00.000Z"
}
```

---

## 4. Refresh Token

**POST** `/auth/refresh`

Get new access token using refresh token.

### Request Body
```json
{
  "userId": "673fb1234567890abcdef123",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-12-05T10:15:00.000Z"
}
```

### Error Responses
- **401** - Invalid or expired refresh token
- **401** - User not found

---

## 5. Forgot Password

**POST** `/auth/forgot-password`

Request password reset token. In production, this sends an email. In development, the token is returned in the response.

### Request Body
```json
{
  "email": "john.doe@bank.com"
}
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "If an account with that email exists, a password reset link has been sent.",
    "resetToken": "a1b2c3d4e5f6..." // Only in development!
  },
  "timestamp": "2025-12-05T10:20:00.000Z"
}
```

### Security Features
- **No user enumeration**: Always returns success message, even if email doesn't exist
- **Token hashing**: Reset token is hashed before storing in database
- **Time-limited**: Token expires after 1 hour
- **Development mode**: Token returned in response for testing (remove in production!)

---

## 6. Reset Password

**POST** `/auth/reset-password`

Reset password using token from forgot-password email.

### Request Body
```json
{
  "token": "a1b2c3d4e5f6...",
  "newPassword": "NewSecurePass123!"
}
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "Password has been reset successfully"
  },
  "timestamp": "2025-12-05T10:25:00.000Z"
}
```

### Error Responses
- **400** - Invalid or expired reset token

### Flow
1. User requests password reset
2. Receives token via email (or in dev response)
3. Submits token + new password
4. Password is updated and hashed
5. Reset token is cleared from database

---

## 7. Change Password

**POST** `/auth/change-password`

🔒 **Requires Authentication**

Change password for authenticated user (requires current password).

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "Password changed successfully"
  },
  "timestamp": "2025-12-05T10:30:00.000Z"
}
```

### Error Responses
- **401** - Unauthorized (no token)
- **401** - Current password is incorrect
- **404** - User not found

---

## 🔑 JWT Token Details

### Access Token
- **Expiration**: 15 minutes (configurable via `JWT_ACCESS_EXPIRATION`)
- **Purpose**: API authentication
- **Contains**: User ID, email, role

### Refresh Token
- **Expiration**: 7 days (configurable via `JWT_REFRESH_EXPIRATION`)
- **Purpose**: Get new access token
- **Storage**: Stored in database, allows revocation

### Token Payload
```json
{
  "sub": "673fb1234567890abcdef123",
  "email": "john.doe@bank.com",
  "role": "staff",
  "iat": 1733395200,
  "exp": 1733395800
}
```

---

## 🛡️ Role-Based Access Control (RBAC)

### Roles

#### Admin
- Full system access
- Can create users with any role
- Can manage all users and orders
- Can delete users and orders

#### Staff
- Create and manage orders
- View users
- Assign orders
- Cannot delete users

#### Dispatch
- View orders
- Update order status
- Mark orders as dispatched
- Limited user access

### Using Roles in Controllers

```typescript
@Get()
@Roles(UserRole.ADMIN, UserRole.STAFF)
findAll() {
  return this.usersService.findAll();
}
```

### Using Roles in Swagger
All protected endpoints are marked with 🔒 and require `Authorization: Bearer <token>` header.

---

## 🔐 Security Features

### 1. Password Hashing
- **Algorithm**: bcrypt
- **Salt Rounds**: 10 (configurable)
- **Pre-save hook**: Passwords automatically hashed before saving

### 2. Account Locking
- **Trigger**: 5 failed login attempts
- **Duration**: 15 minutes
- **Auto-reset**: Successful login resets attempts

### 3. Token Security
- **Reset tokens**: Hashed before storage (SHA-256)
- **Time-limited**: 1 hour expiration
- **Single-use**: Cleared after successful reset

### 4. Audit Logging
All auth operations are logged:
- `USER_REGISTERED`
- `USER_LOGIN`
- `USER_LOGOUT`
- `PASSWORD_RESET_REQUESTED`
- `PASSWORD_RESET_COMPLETED`
- `PASSWORD_CHANGED`

Logs stored in: `logs/audit-*.log` (90-day retention)

---

## 📝 Testing the API

### Using cURL

#### 1. Register
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@bank.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### 2. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@bank.com",
    "password": "Test123!"
  }'
```

#### 3. Forgot Password
```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@bank.com"
  }'
```

#### 4. Reset Password
```bash
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "RESET_TOKEN_FROM_PREVIOUS_STEP",
    "newPassword": "NewTest123!"
  }'
```

#### 5. Change Password (Authenticated)
```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "currentPassword": "Test123!",
    "newPassword": "NewPassword123!"
  }'
```

### Using Swagger UI

1. Open: `http://localhost:3000/api/docs`
2. Expand **Authentication** section
3. Try each endpoint with "Try it out"
4. For protected endpoints:
   - First login to get token
   - Click 🔒 "Authorize" button
   - Enter: `Bearer YOUR_TOKEN`
   - Test protected endpoints

---

## 🔄 Complete Authentication Flow

### Registration Flow
```mermaid
User → Register → Hash Password → Save to DB → Generate Tokens → Return User + Tokens
```

### Login Flow
```mermaid
User → Login → Check Account Status → Verify Password →
Reset Login Attempts → Generate Tokens → Return User + Tokens
```

### Forgot Password Flow
```mermaid
User → Forgot Password → Generate Token → Hash & Store Token →
Send Email (TODO) → Return Success
```

### Reset Password Flow
```mermaid
User → Reset Password → Hash Token → Find User by Token →
Check Expiration → Update Password → Clear Token → Return Success
```

---

## 📂 File Locations

### Schemas
- `src/modules/users/schemas/user.schema.ts` - User model with password reset fields

### DTOs
- `src/modules/auth/dto/login.dto.ts`
- `src/modules/auth/dto/register.dto.ts`
- `src/modules/auth/dto/forgot-password.dto.ts`
- `src/modules/auth/dto/reset-password.dto.ts`
- `src/modules/auth/dto/change-password.dto.ts`

### Services
- `src/modules/auth/auth.service.ts` - All auth logic
- `src/modules/users/users.service.ts` - User management

### Controllers
- `src/modules/auth/auth.controller.ts` - Auth routes

### Guards & Middleware
- `src/common/guards/jwt-auth.guard.ts` - JWT authentication
- `src/common/guards/roles.guard.ts` - Role-based access
- `src/common/decorators/roles.decorator.ts` - `@Roles()` decorator
- `src/common/decorators/current-user.decorator.ts` - `@CurrentUser()` decorator
- `src/common/decorators/public.decorator.ts` - `@Public()` decorator

---

## 🚧 TODOs & Enhancements

### Immediate (Optional)
1. **Email Service** - Send actual password reset emails
   - Use Nodemailer or SendGrid
   - Create email templates
   - Add email queue (Bull)

2. **Email Verification** - Verify user email on registration
   - Generate verification token
   - Send verification email
   - Create verify endpoint

### Future Enhancements
1. **Two-Factor Authentication (2FA)** - TOTP or SMS-based
2. **OAuth Integration** - Google, Microsoft, etc.
3. **Session Management** - List active sessions, revoke sessions
4. **Password Policy** - Configurable password requirements
5. **Login History** - Track all login attempts with IP/device info
6. **Rate Limiting per User** - Prevent brute force at user level

---

## ✅ Summary

Your authentication system now includes:

1. ✅ Complete user registration with role assignment
2. ✅ Secure login with JWT (access + refresh tokens)
3. ✅ Password hashing with bcrypt
4. ✅ Role-based access control (Admin/Staff/Dispatch)
5. ✅ Forgot password with secure token generation
6. ✅ Reset password with token validation
7. ✅ Change password for authenticated users
8. ✅ Account locking after failed attempts
9. ✅ Comprehensive audit logging
10. ✅ Full Swagger documentation

**All endpoints are live and ready to test!**

Access Swagger: `http://localhost:3000/api/docs`

---

**🎉 Authentication API is Complete!**
