KnowledgeScout
===============

An AI-powered document knowledge base. Upload PDFs, manage your library, and ask natural-language questions to get grounded answers with page-level sources.

Project Title
-------------
KnowledgeScout

Project Description
-------------------
KnowledgeScout lets users upload PDF documents and turn them into a searchable knowledge base. The app extracts text from PDFs, stores structured pages, and answers questions by retrieving relevant passages and optionally using Gemini to generate grounded answers with citations.

Features
--------
- Document upload (PDF) with idempotent POSTs
- Automatic text extraction and page structuring
- Documents dashboard with pagination and metadata
- Per-document actions: Ask, Delete
- Question answering with sources (document name, page number, snippet)
- Optional Gemini RAG generation when `GEMINI_API_KEY` is set
- JWT authentication (register/login), protected routes, role-based admin
- Admin stats and index maintenance
- Global, consistent Navbar and responsive UI

Tech Stack
---------
- Frontend: React 18, React Router, Axios, Vite
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- File processing: multer, pdf-parse
- Auth: jsonwebtoken, bcryptjs
- Rate limiting: express-rate-limit
- Optional LLM: @google/generative-ai (Gemini 1.5 Flash)

Architecture Overview
---------------------
- Frontend SPA with protected routes (`/docs`, `/ask`, `/admin`)
- Backend REST API under `/api/*`
- MongoDB models: `User`, `Document`, `QuestionCache`, `IdempotencyKey`
- Retrieval: keyword frequency over per-page text; top-k passages
- Generation: Gemini with strict context prompting and fallback summary

Installation / Setup
--------------------

### 1. Prerequisites
- **Node.js**: Version 18 or higher.
- **MongoDB**: A running local MongoDB instance or a MongoDB Atlas connection string.

### 2. Configure Environment Variables
Create a file named `.env` inside the `backend` directory and add the following configuration:
```env
MONGODB_URI=mongodb://localhost:27017/knowledgescout
JWT_SECRET=your-strong-secret-key
PORT=5000

# Add your Gemini API key (optional for generating grounded answers)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run the Application
You can run the project using either of the two methods below.

#### Method A: Unified Script (Recommended)
This method installs dependencies and runs both the frontend and backend concurrently in a single terminal.

1. **Install all dependencies** (run from the root directory):
   ```bash
   npm run install-all
   ```
2. **Start both development servers**:
   ```bash
   npm run dev
   ```
   *This command runs the backend on port `5000` and the frontend on port `3000` concurrently.*

#### Method B: Separate Terminals
1. **Setup & Run Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
2. **Setup & Run Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

Usage & Features
----------------
KnowledgeScout is built around a comprehensive user journey:

1. **Landing / Hero Page (`/`)**:
   - Offers a modern, orange-gradient interface featuring glassmorphic cards describing application features.
   - Dynamic Call-To-Action (CTA) buttons: redirects guest users to **Get Started** / **Sign In**, and authenticated users directly to their dashboard.

2. **Authentication**:
   - Register or log in to create an account. Session tokens are securely managed.

3. **Documents Management (`/docs`)**:
   - Upload PDF documents (up to 10MB).
   - View your document library, pagination, and file metadata.
   - Delete documents or jump directly into scoped query questions.

4. **Asking Questions (`/ask`)**:
   - Ask natural language questions scoped to specific documents or search across your entire library.
   - Responses are generated with grounded answers, including cited page numbers and document source snippets.

Deployment
----------
- Backend: any Node host (Render, Railway, Heroku, Docker, etc.)
- Frontend: any static host (Vercel, Netlify, S3 + CloudFront)
- Required env vars on the server: `MONGODB_URI`, `JWT_SECRET`, optional `GEMINI_API_KEY`

API Endpoints
-------------
- Auth
  - POST `/api/auth/register` → `{ user, token }`
  - POST `/api/auth/login` → `{ user, token }`
- Documents
  - POST `/api/docs` (multipart `document`, PDF only; `Idempotency-Key` header)
  - GET `/api/docs?limit&offset`
  - GET `/api/docs/:id`
  - DELETE `/api/docs/:id`
- Ask
  - POST `/api/ask` body: `{ query, k?, documentId? }`
- Admin
  - GET `/api/index/stats`
  - POST `/api/index/rebuild`

Security & Rate Limiting
------------------------
- JWT auth required on protected routes; `adminAuth` for admin endpoints
- Global rate limit: 60 req/min (keyed by user or IP)
- Idempotent uploads via `Idempotency-Key`

Contributing
------------
1. Fork and branch from `main`
2. Use clear commit messages
3. Open a PR with a concise summary and testing notes

License
-------
MIT

