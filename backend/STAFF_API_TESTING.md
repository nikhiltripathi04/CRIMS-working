# Staff API Testing Guide - Postman

This guide provides comprehensive testing data for all staff-related endpoints.

## Prerequisites

1. **Base URL**: `http://localhost:3000`
2. **Authentication**: You need an admin token. First, login as admin to get the token.

---

## Step 1: Login as Admin (Get Token)

### Endpoint
```
POST http://localhost:3000/api/auth/login
```

### Headers
```
Content-Type: application/json
```

### Body (raw JSON)
```json
{
  "username": "admin",
  "password": "admin123"
}
```

### Expected Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "username": "admin",
      "role": "admin",
      "email": "admin@example.com"
    }
  }
}
```

**Important**: Copy the `token` value from the response. You'll need it for all staff endpoints.

---

## Step 2: Set Authorization Header

For all subsequent requests, add this header:

### Headers
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

Replace `YOUR_TOKEN_HERE` with the actual token from Step 1.

---

## Staff Endpoints

### 1. Create Staff Member

**Method**: `POST`  
**URL**: `http://localhost:3000/api/staff`

#### Headers
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

#### Body (raw JSON) - Example 1
```json
{
  "fullName": "John Doe",
  "username": "johndoe",
  "password": "staff123"
}
```

#### Body (raw JSON) - Example 2
```json
{
  "fullName": "Jane Smith",
  "username": "janesmith",
  "password": "staff456"
}
```

#### Body (raw JSON) - Example 3
```json
{
  "fullName": "Mike Johnson",
  "username": "mikej",
  "password": "staff789"
}
```

#### Expected Success Response (201)
```json
{
  "success": true,
  "message": "Staff member created successfully",
  "data": {
    "id": "674587a1b2c3d4e5f6789012",
    "fullName": "John Doe",
    "username": "johndoe",
    "role": "staff",
    "createdAt": "2025-11-26T10:46:30.000Z"
  }
}
```

#### Expected Error Responses

**Missing Fields (400)**
```json
{
  "success": false,
  "message": "Please provide full name, username, and password"
}
```

**Username Already Exists (400)**
```json
{
  "success": false,
  "message": "Username already exists"
}
```

**Unauthorized (401)**
```json
{
  "message": "No token provided"
}
```

---

### 2. Get All Staff Members

**Method**: `GET`  
**URL**: `http://localhost:3000/api/staff`

#### Headers
```
Authorization: Bearer YOUR_TOKEN_HERE
```

#### Expected Success Response (200)
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "674587a1b2c3d4e5f6789012",
      "fullName": "Mike Johnson",
      "username": "mikej",
      "role": "staff",
      "createdBy": "67456789a1b2c3d4e5f67890",
      "createdAt": "2025-11-26T10:48:30.000Z",
      "__v": 0
    },
    {
      "_id": "674587a1b2c3d4e5f6789011",
      "fullName": "Jane Smith",
      "username": "janesmith",
      "role": "staff",
      "createdBy": "67456789a1b2c3d4e5f67890",
      "createdAt": "2025-11-26T10:47:30.000Z",
      "__v": 0
    },
    {
      "_id": "674587a1b2c3d4e5f6789010",
      "fullName": "John Doe",
      "username": "johndoe",
      "role": "staff",
      "createdBy": "67456789a1b2c3d4e5f67890",
      "createdAt": "2025-11-26T10:46:30.000Z",
      "__v": 0
    }
  ]
}
```

---

### 3. Update Staff Member

**Method**: `PUT`  
**URL**: `http://localhost:3000/api/staff/:id`

Replace `:id` with the actual staff member ID from the GET response.

**Example**: `http://localhost:3000/api/staff/674587a1b2c3d4e5f6789012`

#### Headers
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

#### Body (raw JSON) - Update Full Name Only
```json
{
  "fullName": "John Michael Doe"
}
```

#### Body (raw JSON) - Update Password Only
```json
{
  "password": "newpassword123"
}
```

#### Body (raw JSON) - Update Both
```json
{
  "fullName": "John Michael Doe",
  "password": "newpassword123"
}
```

#### Expected Success Response (200)
```json
{
  "success": true,
  "message": "Staff member updated successfully",
  "debug_body": {
    "fullName": "John Michael Doe"
  },
  "data": {
    "id": "674587a1b2c3d4e5f6789012",
    "fullName": "John Michael Doe",
    "username": "johndoe",
    "role": "staff"
  }
}
```

#### Expected Error Responses

**Staff Not Found (404)**
```json
{
  "success": false,
  "message": "Staff member not found"
}
```

---

### 4. Delete Staff Member

**Method**: `DELETE`  
**URL**: `http://localhost:3000/api/staff/:id`

Replace `:id` with the actual staff member ID.

**Example**: `http://localhost:3000/api/staff/674587a1b2c3d4e5f6789012`

#### Headers
```
Authorization: Bearer YOUR_TOKEN_HERE
```

#### Expected Success Response (200)
```json
{
  "success": true,
  "message": "Staff member deleted successfully"
}
```

#### Expected Error Responses

**Staff Not Found (404)**
```json
{
  "success": false,
  "message": "Staff member not found"
}
```

---

## Testing Workflow

### Recommended Test Sequence

1. **Login as Admin** → Get token
2. **Create Staff #1** (John Doe)
3. **Create Staff #2** (Jane Smith)
4. **Create Staff #3** (Mike Johnson)
5. **Get All Staff** → Verify all 3 are listed
6. **Update Staff #1** → Change full name
7. **Get All Staff** → Verify update
8. **Delete Staff #3**
9. **Get All Staff** → Verify only 2 remain
10. **Try to create duplicate** → Use existing username, expect error

---

## Postman Environment Variables (Optional)

You can set up environment variables in Postman for easier testing:

| Variable Name | Value |
|--------------|-------|
| `base_url` | `http://localhost:3000` |
| `admin_token` | (Set after login) |
| `staff_id` | (Set after creating staff) |

Then use them in requests:
- URL: `{{base_url}}/api/staff`
- Header: `Authorization: Bearer {{admin_token}}`

---

## Common Issues

### 401 Unauthorized
- **Cause**: Missing or invalid token
- **Solution**: Login again and use the new token

### 403 Forbidden
- **Cause**: Token is valid but user is not an admin
- **Solution**: Ensure you're logged in as admin

### 404 Not Found (on POST)
- **Cause**: Route not mounted
- **Solution**: Verify `server.js` has `app.use('/api/staff', staffRoutes);`

### 400 Bad Request
- **Cause**: Missing required fields or duplicate username
- **Solution**: Check request body matches the required format

---

## Notes

- All staff members are associated with the admin who created them via `createdBy` field
- Staff members can only be managed by the admin who created them
- Passwords are automatically hashed before storage
- Usernames are automatically converted to lowercase and trimmed
- The password field is excluded from GET responses for security
