# Swagger/OpenAPI Documentation Guide

## ✅ Swagger is Now Integrated!

Your Bank Order Processing System API now includes comprehensive Swagger/OpenAPI documentation.

## Access Swagger UI

Once the application is running:

```
http://localhost:3000/api/docs
```

## Features Included

### 1. **Interactive API Documentation**
- All endpoints documented with descriptions
- Request/response examples
- Parameter descriptions
- Status codes and error messages

### 2. **Try It Out**
- Test API endpoints directly from the browser
- No need for Postman or curl during development
- Live API testing with real responses

### 3. **JWT Authentication**
- Bearer token authentication configured
- Click "Authorize" button in Swagger UI
- Enter your JWT token once
- All authenticated requests will include the token automatically

### 4. **Organized by Tags**
- **Authentication**: Register, Login, Logout, Refresh token
- **Users**: User management endpoints
- **Orders**: Order processing endpoints

## How to Use Swagger

### Step 1: Start the Application

```bash
npm run start:dev
```

You'll see:
```
📖 Swagger API Docs: http://localhost:3000/api/docs
```

### Step 2: Open Swagger UI

Navigate to: `http://localhost:3000/api/docs`

### Step 3: Authenticate

1. First, register or login using the **Authentication** section
2. Copy the `accessToken` from the response
3. Click the **"Authorize"** button (🔒 icon at the top right)
4. Paste your token in the format: `Bearer YOUR_TOKEN`
5. Click "Authorize"
6. All subsequent requests will be authenticated

### Step 4: Test Endpoints

- Expand any endpoint
- Click **"Try it out"**
- Fill in the parameters
- Click **"Execute"**
- See the response below

## Example Workflow

### 1. Register a User

```
POST /api/v1/auth/register
```

Request body (click "Try it out"):
```json
{
  "email": "john.doe@bank.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

Response:
```json
{
  "statusCode": 201,
  "message": "Success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "john.doe@bank.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "staff"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Authorize in Swagger

- Copy the `accessToken`
- Click **Authorize** button
- Enter: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Click "Authorize"

### 3. Test Authenticated Endpoints

Now you can test:
- `GET /api/v1/users/me` - Get your profile
- `POST /api/v1/orders` - Create an order
- `GET /api/v1/orders` - List all orders

## API Documentation Features

### Request Schemas

Each endpoint shows:
- Required fields
- Optional fields
- Data types
- Validation rules
- Example values

### Response Schemas

See exactly what the API returns:
- Success responses
- Error responses
- Field descriptions
- Data structure

### Query Parameters

For endpoints with filters:
```
GET /api/v1/orders?status=pending
```

Swagger shows:
- Available query parameters
- Enum values (for status, priority, etc.)
- Whether they're required or optional

### Path Parameters

For endpoints with IDs:
```
GET /api/v1/orders/{id}
PATCH /api/v1/users/{id}
```

Swagger shows:
- Parameter format (MongoDB ObjectId)
- Description
- Examples

## Swagger Configuration

Located in: `src/main.ts`

```typescript
const config = new DocumentBuilder()
  .setTitle('Bank Order Processing System API')
  .setDescription('Production-grade API...')
  .setVersion('1.0')
  .addBearerAuth() // JWT authentication
  .build();
```

## Customization

### Update API Information

Edit `src/main.ts`:

```typescript
.setTitle('Your Custom Title')
.setDescription('Your description')
.setVersion('2.0')
.setContact('API Support', 'https://support.com', 'api@support.com')
.setLicense('MIT', 'https://opensource.org/licenses/MIT')
```

### Add More Tags

In your controllers:

```typescript
@ApiTags('NewModule')
@Controller('new-module')
export class NewModuleController {
  // ...
}
```

### Document Custom Responses

```typescript
@ApiResponse({
  status: 200,
  description: 'Custom response',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' }
    }
  }
})
```

## Export OpenAPI Specification

Swagger generates an OpenAPI 3.0 JSON file that you can:

1. **Import into Postman**
   - File > Import > Paste URL: `http://localhost:3000/api/docs-json`

2. **Generate Client SDKs**
   ```bash
   # Download the spec
   curl http://localhost:3000/api/docs-json > openapi.json

   # Use OpenAPI Generator to create client libraries
   npx @openapitools/openapi-generator-cli generate \
     -i openapi.json \
     -g typescript-axios \
     -o ./client
   ```

3. **Share with Frontend Team**
   - Send them the docs URL
   - They can see all endpoints and models
   - Auto-complete in their IDE

## Production Setup

### Disable Swagger in Production

Edit `src/main.ts`:

```typescript
if (process.env.NODE_ENV !== 'production') {
  // Swagger setup code
  const config = new DocumentBuilder()...
  SwaggerModule.setup('api/docs', app, document);
}
```

### Protect Swagger with Authentication

```typescript
app.use('/api/docs', basicAuth({
  users: { 'admin': 'secret-password' },
  challenge: true
}));
```

## Swagger Decorators Reference

### Class Level

```typescript
@ApiTags('Module Name')              // Group endpoints
@ApiBearerAuth('JWT-auth')           // Require JWT
```

### Method Level

```typescript
@ApiOperation({ summary: 'Description' })
@ApiResponse({ status: 200, description: 'Success' })
@ApiResponse({ status: 400, description: 'Bad Request' })
@ApiParam({ name: 'id', description: 'User ID' })
@ApiQuery({ name: 'filter', required: false })
@ApiBody({ type: CreateUserDto })
```

### DTO Properties

```typescript
@ApiProperty({
  example: 'john@example.com',
  description: 'User email',
  required: true,
  minLength: 5,
  maxLength: 100
})
email: string;

@ApiPropertyOptional({
  enum: UserRole,
  example: 'admin'
})
role?: UserRole;
```

## Benefits of Swagger

1. ✅ **Documentation** - Always up-to-date
2. ✅ **Testing** - No need for Postman during development
3. ✅ **Client Generation** - Auto-generate TypeScript/JavaScript clients
4. ✅ **Team Collaboration** - Share API specs easily
5. ✅ **API Discovery** - Explore all endpoints visually
6. ✅ **Validation** - See exact data requirements
7. ✅ **Examples** - Request/response examples for all endpoints

## Troubleshooting

### Swagger UI Not Loading

1. Check the application is running: `npm run start:dev`
2. Verify the URL: `http://localhost:3000/api/docs`
3. Check browser console for errors
4. Clear browser cache

### Authorization Not Working

1. Ensure you're using the correct token format: `Bearer YOUR_TOKEN`
2. Check token hasn't expired (default: 15 minutes)
3. Verify you copied the entire token
4. Try refreshing your token using `/api/v1/auth/refresh`

### Endpoints Not Showing

1. Check controller has `@ApiTags()` decorator
2. Verify DTOs have `@ApiProperty()` decorators
3. Rebuild the application: `npm run build`
4. Restart the dev server

## Additional Resources

- **Swagger/OpenAPI Spec**: https://swagger.io/specification/
- **NestJS Swagger**: https://docs.nestjs.com/openapi/introduction
- **OpenAPI Generator**: https://openapi-generator.tech/

---

**Your API is now fully documented with Swagger!** 📖🚀

Access it at: `http://localhost:3000/api/docs`
