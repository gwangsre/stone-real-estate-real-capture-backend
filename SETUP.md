# WMHSL Real Estate Backend - Setup Guide

## 📋 Prerequisites

Before you start, ensure you have the following installed on your system:

- **Node.js 22.x** (Download from [nodejs.org](https://nodejs.org))
- **Git** (Download from [git-scm.com](https://git-scm.com))
- **A code editor** (VS Code recommended)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/laophan74/wmhsl-real-estate-backend.git
cd wmhsl-real-estate-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

This project uses Firebase Firestore as the database. You need to:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing project
3. Enable **Firestore Database**
4. Go to **Project Settings** > **Service Accounts**
5. Click **Generate new private key**
6. Save the JSON file as `stone-real-estate-leads-firebase-adminsdk-fbsvc-248341b064.json` in the project root

### 4. Environment Variables

Create a `.env.local` file in the project root:

```env
# Firebase (uses the JSON file automatically)
# No additional Firebase config needed

# CORS Settings
CORS_ORIGIN=http://localhost:3000,https://your-frontend-domain.com

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Admin Registration (set to 'false' in production)
ALLOW_ADMIN_REGISTER=true

# Email Configuration (optional - for notifications)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=WMHSL Real Estate

# Development Settings
NODE_ENV=development
AUTH_DISABLED=false
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

The server will start at `http://localhost:3000` (or the PORT specified in your environment).

### Production Mode

```bash
npm start
```

### Database Scripts

Run the database setup script (see `run_db_script.ps1` for automated setup):

```bash
# Seed sample data
npm run seed-sample

# Seed admin users and messages
npm run seed-admins-messages

# Set admin password
npm run set-admin-password

# Dump database (backup)
npm run dump-db
```

## 🌐 API Endpoints

### Base URL
- **Local:** `http://localhost:3000/api/v1`
- **Production:** `https://your-backend-domain.vercel.app/api/v1`

### Authentication
```
POST /auth/login           # Login with username/password
POST /auth/register        # Register new admin (if enabled)
GET  /auth/me              # Get current user info
POST /auth/logout          # Logout
POST /auth/change-password # Change password
```

### Leads Management
```
POST /leads/public         # Create lead (public, no auth)
GET  /leads               # List leads (protected)
GET  /leads/:id           # Get lead by ID (protected)
PATCH /leads/:id          # Update lead (protected)
PATCH /leads/:id/status   # Update lead status (protected)
DELETE /leads/:id         # Soft delete lead (protected)
```

### Messages
```
GET  /messages/public-first # Get latest message (public)
GET  /messages             # List messages (protected)
POST /messages             # Create message (protected)
GET  /messages/:id         # Get message by ID (protected)
PATCH /messages/:id        # Update message (protected)
DELETE /messages/:id       # Delete message (protected)
```

### Admin Management
```
GET  /admins              # List admins (protected)
```

## 🚀 Deployment (Vercel)

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy

```bash
vercel
```

### 4. Set Environment Variables

In Vercel Dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add all variables from `.env.local`
4. Set `NODE_ENV=production`

### 5. Add Firebase Service Account

Upload your Firebase service account JSON file to your project root and commit it to the repository.

## 🔧 Testing the API

### Using curl

```bash
# Test health endpoint
curl http://localhost:3000/healthz

# Create a public lead
curl -X POST http://localhost:3000/api/v1/leads/public \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "0412345678",
    "suburb": "Hornsby",
    "timeframe": "1-3 months",
    "interested": "yes"
  }'

# Login as admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password"
  }'
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port 3000
   netstat -ano | findstr :3000
   # Kill the process
   taskkill /PID <process_id> /F
   ```

2. **Firebase permission errors**
   - Ensure the service account JSON file is in the project root
   - Check Firestore security rules
   - Verify the Firebase project is active

3. **CORS errors**
   - Add your frontend domain to `CORS_ORIGIN` environment variable
   - Ensure the variable is set in both local and production environments

4. **Authentication issues**
   - Check JWT_SECRET is set
   - Ensure admin users are created in the database
   - Verify token is being sent in Authorization header

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=*
NODE_ENV=development
```

## 📁 Project Structure

```
wmhsl-real-estate-backend/
├── src/
│   ├── config/          # Firebase and other configs
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, error handling, etc.
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── utils/           # Helper utilities
│   └── validators/      # Request validation schemas
├── scripts/             # Database and utility scripts
├── .env.local          # Environment variables (create this)
├── package.json        # Dependencies and scripts
├── vercel.json        # Vercel deployment config
└── stone-real-estate-leads-firebase-adminsdk-*.json  # Firebase key
```

## 🔐 Security Notes

- Change `JWT_SECRET` in production
- Set `ALLOW_ADMIN_REGISTER=false` in production
- Use strong passwords for admin accounts
- Keep Firebase service account file secure
- Use HTTPS in production
- Regularly update dependencies

## 📞 Support

If you encounter any issues:
1. Check the logs in the console
2. Verify all environment variables are set
3. Ensure Firebase is properly configured
4. Check the GitHub repository for updates

## 📝 Additional Scripts

See `run_db_script.ps1` for automated database setup and management tasks.