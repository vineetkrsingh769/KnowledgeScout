# KnowledgeScout - Document Q&A System

📋 **Project Overview**

KnowledgeScout is a document question-answering system that allows users to upload documents and ask AI-powered questions with accurate source references and page numbers.

## 🎯 Main Purpose

Build an intelligent document Q&A system where:
- Users can upload documents
- Ask questions about document content  
- Get answers with verified page references
- Maintain document privacy and access control

## ⚡ Core Features & Requirements

### 🔑 Must-Have Features
- **Document Upload & Management** (`/docs` page)
- **Question Answering** (`/ask` page)
- **Admin Dashboard** (`/admin` page)
- **Source Referencing** - Answers must include valid page numbers
- **Query Caching** - 60-second cache with cache flags
- **Pagination** - For document lists
- **Private Documents** - Visible only to owners or via share tokens

### 🧪 Judge Verification Points
- ✅ Answers reference real pages in documents
- ✅ Pagination works correctly
- ✅ Cached queries are properly flagged
- ✅ Private documents are hidden from unauthorized users

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (free)
- npm or yarn

### ⏱️ 5-Minute Setup

#### Step 1: MongoDB Setup (Cloud - No Installation Needed)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" and create account (2 minutes)
3. Create a FREE "M0 Sandbox" cluster
4. In "Database Access":
   - Add user: `knowledgescout`
   - Password: `Password123`
   - Privileges: "Read and write to any database"
5. In "Network Access":
   - Click "Allow Access from Anywhere"
6. Get connection string from "Connect" → "Connect your application"

#### Step 2: Backend Setup
```bash
# Terminal 1 - Backend
cd backend

# Create environment file
echo "MONGODB_URI=mongodb+srv://knowledgescout:Password123@your-cluster-url.mongodb.net/knowledgescout?retryWrites=true&w=majority
JWT_SECRET=knowledgescout-super-secret-key-2024
PORT=5000" > .env

# Install dependencies
npm install

# Start backend server
npm run dev
```

**Expected Output:**
```
✅ Connected to MongoDB
🚀 KnowledgeScout server running on port 5000
```

#### Step 3: Frontend Setup
```bash
# Terminal 2 - Frontend  
cd frontend
npm install
npm run dev
```

**Expected Output:**
```
Vite dev server running at:
> Local: http://localhost:3000/
```

#### Step 4: Test the Application
1. Open http://localhost:3000
2. Register new account (`test@example.com` / `password123`)
3. Upload a PDF document
4. Ask questions on the Ask page
5. Verify answers include page references

## 🛠️ API Documentation

### 🔐 Authentication Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |

### 📄 Document Management
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/docs` | Upload document (multipart) |
| GET | `/api/docs?limit=10&offset=0` | List documents with pagination |
| GET | `/api/docs/:id` | Get specific document |

### ❓ Question Answering
| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| POST | `/api/ask` | `{"query": "question", "k": 3}` | Ask questions about documents |

### ⚙️ Admin Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/index/rebuild` | Rebuild search index |
| GET | `/api/index/stats` | Get index statistics |

## 📋 API Usage Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Upload Document
```bash
curl -X POST http://localhost:5000/api/docs \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: unique-key-123" \
  -F "document=@sample.pdf"
```

### Ask Question
```bash
curl -X POST http://localhost:5000/api/ask \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is machine learning?","k":3}'
```

### Response Format
```json
{
  "answer": "Based on your documents...",
  "sources": [
    {
      "documentId": "doc123",
      "documentName": "AI_Guide.pdf", 
      "pageNumber": 5,
      "content": "Machine learning is a subset of AI...",
      "score": 0.89
    }
  ],
  "cached": false
}
```

## 🏗️ System Architecture

### Frontend Structure
```
frontend/
├── src/
│   ├── pages/
│   │   ├── DocsPage.jsx      # Document management
│   │   ├── AskPage.jsx       # Question answering  
│   │   └── AdminPage.jsx     # Admin dashboard
│   ├── components/Navbar.jsx
│   └── contexts/AuthContext.jsx
```

### Backend Structure
```
backend/
├── src/
│   ├── models/
│   │   ├── User.js           # User accounts
│   │   ├── Document.js       # Document storage
│   │   └── QuestionCache.js  # 60-second cache
│   ├── routes/
│   │   ├── auth.js           # Login/register
│   │   ├── docs.js           # Document CRUD
│   │   ├── ask.js            # Q&A engine
│   │   └── index.js          # Admin endpoints
│   └── middleware/
│       ├── auth.js           # JWT authentication
│       └── idempotency.js    # Duplicate request prevention
```

## ⚙️ Configuration

### Environment Variables (.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/knowledgescout
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
```

### Rate Limiting
- 60 requests per minute per user
- 429 Response when exceeded:
```json
{"error": {"code": "RATE_LIMIT"}}
```

### Error Format
All errors follow uniform format:
```json
{
  "error": {
    "code": "FIELD_REQUIRED",
    "field": "email", 
    "message": "Email is required"
  }
}
```

## 🧪 Testing & Verification Checklist

### ✅ Judge Test Requirements

#### Document Upload & Management
- [ ] POST `/api/docs` accepts multipart file uploads
- [ ] GET `/api/docs` supports `?limit=&offset=` pagination
- [ ] Private documents hidden from other users
- [ ] Share tokens work for document access

#### Question Answering
- [ ] POST `/api/ask` returns answers with valid page references
- [ ] Answers reference real pages that exist in documents
- [ ] Query results cached for 60 seconds
- [ ] Cached responses flagged with `"cached": true`

#### Admin Features
- [ ] POST `/api/index/rebuild` accessible to admins only
- [ ] GET `/api/index/stats` shows indexing statistics
- [ ] Role-based access control working

#### System Robustness
- [ ] Rate limiting: 60 req/min/user
- [ ] Idempotency: Idempotency-Key header prevents duplicates
- [ ] CORS enabled for frontend access
- [ ] Error handling with uniform format

## 🐛 Troubleshooting

### Common Issues & Solutions

#### MongoDB Connection Failed
```bash
# Check if MongoDB Atlas IP is whitelisted
# Verify connection string in .env file
# Ensure database user has correct privileges
```

#### PDF Upload Fails
```bash
# Check file size (max 10MB)
# Verify file is actual PDF
# Check uploads directory permissions
```

#### Rate Limit Errors
```bash
# Wait 1 minute between requests
# Implement exponential backoff in frontend
```

#### Admin Access Denied
```bash
# Create admin user manually:
node createAdmin.js
```

## 📈 Deployment Notes

### For Hackathon Demo
- Use MongoDB Atlas (free tier)
- Keep backend running on port 5000
- Frontend on port 3000
- Test all judge verification points

### Production Ready Features
- ✅ JWT Authentication
- ✅ Rate Limiting
- ✅ Error Handling
- ✅ Input Validation
- ✅ CORS Configuration
- ✅ Pagination
- ✅ Caching
- ✅ Idempotency

## 👥 Test Credentials

**Regular User:**
- Email: `test@example.com`
- Password: `password123`

**Admin User:**
- Email: `admin@example.com`
- Password: `admin123`

## 🎯 Hackathon Success Tips

1. **Test Judge Requirements First** - Focus on the verification checklist
2. **Demo the Core Flow** - Upload → Ask → Get page-referenced answers
3. **Show Caching** - Make same query twice to demonstrate cache flags
4. **Verify Pagination** - Upload multiple documents to test pagination
5. **Test Privacy** - Show private documents are hidden between users

## 🔒 Privacy & Security

The system must correctly hide private documents from unauthorized users. Key privacy features:
- Document ownership verification
- Share token system for controlled access
- User-based document filtering
- Secure authentication with JWT tokens

## 🚀 Tech Stack

### Backend
- Node.js + Express.js
- MongoDB with Mongoose
- JWT authentication
- PDF text extraction
- Rate limiting
- CORS enabled

### Frontend
- React 18
- Vite
- React Router
- Axios for API calls
- Tailwind CSS for styling

## 📄 License

MIT License - feel free to use this project for your hackathon!

---

**Good luck with your hackathon! 🚀**