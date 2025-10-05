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
1. Prerequisites
   - Node 18+
   - MongoDB running locally or a connection string

2. Clone and install
   ```bash
   git clone <repo-url>
   cd KnowledgeScout
   
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. Environment variables
   Create `backend/.env` with:
   ```
   MONGODB_URI=mongodb://localhost:27017/knowledgescout
   JWT_SECRET=your-strong-secret
   GEMINI_API_KEY=your_gemini_api_key   # optional for LLM answers
   ```

4. Run
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

Usage
-----
1. Register or log in.
2. Go to Documents and upload a PDF (10MB max).
3. Use the Ask button on a document card to ask questions scoped to that file, or visit `/ask` to query across your library.
4. Answers display with sources and page numbers.

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

