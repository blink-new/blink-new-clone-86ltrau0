# Blink.new Clone Backend

A comprehensive Node.js backend for the Blink.new clone, providing AI-powered code generation, user management, project handling, and payment processing.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with session management
- **AI Code Generation**: OpenAI & Anthropic integration for code generation
- **Project Management**: Full CRUD operations for projects and files
- **Payment Processing**: Stripe integration with subscription plans
- **Real-time Collaboration**: WebSocket support for live editing
- **File Management**: Upload, download, and project packaging
- **Rate Limiting**: Comprehensive rate limiting for API protection
- **Database**: SQLite with comprehensive schema

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- SQLite (included)

## 🛠️ Installation

1. **Clone and navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment setup:**
```bash
cp .env.example .env
```

4. **Configure environment variables in `.env`:**
```env
# Server Configuration
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-here
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=./database.sqlite

# AI Providers (Required for AI features)
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Email Service (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Stripe (Optional - for payments)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

5. **Initialize database:**
```bash
npm run db:migrate
```

6. **Start development server:**
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "plan": "free",
    "credits": 10
  },
  "token": "jwt-token"
}
```

#### POST `/api/auth/login`
Login with email and password.

#### GET `/api/auth/me`
Get current user information (requires authentication).

#### POST `/api/auth/logout`
Logout and invalidate session.

### Project Endpoints

#### GET `/api/projects`
Get all projects for authenticated user.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status
- `visibility` (string): Filter by visibility

#### POST `/api/projects`
Create a new project.

**Request:**
```json
{
  "name": "My Awesome App",
  "description": "A cool React app",
  "techStack": "react",
  "visibility": "private"
}
```

#### GET `/api/projects/:id`
Get single project with files.

#### PUT `/api/projects/:id`
Update project details.

#### DELETE `/api/projects/:id`
Delete project.

#### PUT `/api/projects/:id/code`
Update project code and files.

#### GET `/api/projects/:id/download`
Download project as ZIP file.

### AI Endpoints

#### POST `/api/ai/generate`
Generate code from natural language prompt.

**Request:**
```json
{
  "prompt": "Create a React todo app with add, delete, and mark complete functionality",
  "techStack": "react",
  "model": "gpt-4",
  "complexity": "medium",
  "includeFiles": true
}
```

**Response:**
```json
{
  "generationId": "uuid",
  "code": "// Generated code here...",
  "files": [
    {
      "id": "uuid",
      "path": "App.tsx",
      "content": "// React component code...",
      "type": "component",
      "language": "tsx"
    }
  ],
  "tokensUsed": 1500,
  "cost": 0.045,
  "model": "gpt-4",
  "techStack": "react"
}
```

#### POST `/api/ai/chat`
Chat with AI about your project.

#### GET `/api/ai/generations`
Get AI generation history.

### User Endpoints

#### GET `/api/users/profile`
Get user profile with statistics.

#### PUT `/api/users/profile`
Update user profile.

#### POST `/api/users/avatar`
Upload user avatar image.

#### PUT `/api/users/password`
Change user password.

#### GET `/api/users/usage`
Get usage statistics.

#### GET `/api/users/sessions`
Get active sessions.

#### DELETE `/api/users/sessions/:sessionId`
Revoke a session.

### Payment Endpoints

#### GET `/api/payments/plans`
Get available subscription plans.

#### POST `/api/payments/checkout`
Create Stripe checkout session.

#### GET `/api/payments/history`
Get payment history.

#### GET `/api/payments/subscription`
Get current subscription status.

#### POST `/api/payments/webhook`
Stripe webhook handler (for Stripe events).

## 🔌 WebSocket API

Connect to WebSocket at `ws://localhost:3001`

### Authentication
```json
{
  "type": "auth",
  "payload": {
    "token": "jwt-token"
  }
}
```

### Join Project
```json
{
  "type": "join_project",
  "payload": {
    "projectId": "project-uuid"
  }
}
```

### Real-time Events
- `project_updated`: Project changes
- `code_changed`: Code modifications
- `cursor_moved`: Cursor position updates
- `user_joined`: User joined project
- `user_left`: User left project

## 🗄️ Database Schema

### Users Table
- `id` (TEXT PRIMARY KEY)
- `email` (TEXT UNIQUE)
- `password_hash` (TEXT)
- `display_name` (TEXT)
- `avatar_url` (TEXT)
- `plan` (TEXT) - free, starter, pro, max
- `credits` (INTEGER)
- `created_at`, `updated_at`, `last_login`

### Projects Table
- `id` (TEXT PRIMARY KEY)
- `user_id` (TEXT FOREIGN KEY)
- `name`, `description` (TEXT)
- `tech_stack` (TEXT) - react, vue, angular, etc.
- `status` (TEXT) - draft, building, completed, error
- `visibility` (TEXT) - private, public
- `code_content` (TEXT)
- `preview_url`, `download_url` (TEXT)

### AI Generations Table
- `id` (TEXT PRIMARY KEY)
- `user_id`, `project_id` (TEXT FOREIGN KEY)
- `prompt`, `generated_code` (TEXT)
- `model` (TEXT)
- `tokens_used` (INTEGER)
- `cost` (DECIMAL)
- `status` (TEXT)

### Payment Transactions Table
- `id` (TEXT PRIMARY KEY)
- `user_id` (TEXT FOREIGN KEY)
- `stripe_payment_id` (TEXT)
- `amount` (DECIMAL)
- `status`, `plan` (TEXT)
- `credits_added` (INTEGER)

## 🔧 Configuration

### AI Models Supported
- **OpenAI**: gpt-4, gpt-3.5-turbo
- **Anthropic**: claude-3-sonnet, claude-3-haiku

### Tech Stacks Supported
- React
- Vue
- Angular
- Vanilla JavaScript
- Next.js
- Nuxt.js

### Subscription Plans
- **Free**: 10 credits, public projects only
- **Starter**: $20/month, 100 credits, private projects
- **Pro**: $50/month, 250 credits, advanced AI models
- **Max**: $100/month, 500 credits, beta features

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-production-jwt-secret
DATABASE_URL=./production.sqlite
CORS_ORIGIN=https://yourdomain.com
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 🔒 Security Features

- JWT authentication with session management
- Password hashing with bcrypt
- Rate limiting on all endpoints
- CORS protection
- Input validation with Joi
- SQL injection prevention
- File upload restrictions
- Webhook signature verification

## 📊 Monitoring & Logging

- Request/response logging
- Error tracking with stack traces
- API usage statistics
- Performance monitoring
- WebSocket connection tracking

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check the API documentation
- Review the error logs
- Ensure environment variables are set correctly

## 🔄 API Rate Limits

- **General API**: 100 requests per 15 minutes
- **AI Generation**: 10 requests per hour
- **Authentication**: 5 attempts per 15 minutes

## 📈 Scaling Considerations

For production scaling:
- Use PostgreSQL instead of SQLite
- Implement Redis for session storage
- Add load balancing
- Use separate AI service instances
- Implement proper logging and monitoring
- Add database connection pooling
- Use CDN for file storage