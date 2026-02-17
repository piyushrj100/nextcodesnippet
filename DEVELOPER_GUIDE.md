# 🚀 Developer Onboarding - DocMiner AI

> **Quick reference for developers taking over this project**

## ⚡ TL;DR

**Current State:** Frontend UI is complete with mock data. Backend integration layer is ready but not connected.

**Your Mission:** Connect the frontend to a PageIndex-powered backend.

**Time to Production:** ~2-4 hours

---

## 🎯 Step-by-Step Integration

### 1️⃣ Read the Docs (5 min)

Must-read in order:
1. **[BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)** ← START HERE
2. [lib/README.md](./lib/README.md) ← Service layer & hooks
3. [examples/backend_pageindex.py](./examples/backend_pageindex.py) ← Backend code

Optional (for UI work):
- [COMPONENTS.md](./COMPONENTS.md) ← UI components
- [RAG_DOCUMENTATION.md](./RAG_DOCUMENTATION.md) ← RAG features

### 2️⃣ Get PageIndex Key (5 min)

1. Go to: https://dash.pageindex.ai/api-keys
2. Sign up / log in
3. Create new API key
4. Copy it (starts with `pi_...`)

### 3️⃣ Set Up Backend (30 min)

```bash
# Create backend folder
mkdir backend && cd backend

# Copy example backend
cp ../examples/backend_pageindex.py main.py

# Install dependencies
pip install fastapi uvicorn pageindex python-multipart

# Add your API key to main.py (line 38)
# Replace: YOUR_PAGEINDEX_API_KEY

# Run backend
uvicorn main:app --reload --port 8000
```

Test: `curl http://localhost:8000/health` → Should return `{"status": "ok"}`

### 4️⃣ Connect Frontend (10 min)

```bash
# Create .env.local in frontend root
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Backup current mock page
mv app/page.tsx app/page-mock.tsx.backup

# Use API-integrated version
cp app/page-with-api.tsx.example app/page.tsx

# Install dependencies (if needed)
pnpm install

# Run frontend
pnpm dev
```

Open: http://localhost:3001

### 5️⃣ Test the Flow (15 min)

1. **Upload a PDF:**
   - Click the paperclip icon
   - Select a PDF file
   - Wait for "Processing complete" message

2. **Ask a question:**
   - Type: "What is this document about?"
   - Press Enter
   - Watch for:
     - 🔍 "Searching document..." indicator
     - Real-time streaming response
     - Citation numbers [1][2][3] in the answer
     - Source cards below the message

3. **Click a citation:**
   - Click any `[1]` badge in the answer
   - Document viewer should open
   - Highlighted text should be visible

4. **Test tree visualization:**
   - Type: "test" (lowercase)
   - Interactive tree should appear in chat
   - Drag to pan, scroll to zoom

---

## 📂 Key Files to Know

### Frontend

| File | Purpose | When to Edit |
|------|---------|--------------|
| `app/page.tsx` | Main chat page | Never (use page-with-api.tsx.example instead) |
| `lib/hooks/useRAG.ts` | RAG query hooks | Need different streaming behavior |
| `lib/config/api.config.ts` | API endpoints | Backend URL changes |
| `components/chat/ChatMessage.tsx` | Message rendering | Change message UI |
| `components/document/DocumentViewer.tsx` | Document modal | Change viewer UI |
| `types/api.ts` | Backend types | Backend response format changes |

### Backend

| File | Purpose | When to Edit |
|------|---------|--------------|
| `examples/backend_pageindex.py` | Complete backend | Copy this to start your backend |
| Lines 1-100 | Setup & imports | Initial configuration |
| Lines 100-200 | Citation parsing | Change citation format |
| Lines 200-400 | Query endpoint | Non-streaming logic |
| Lines 400-600 | Stream endpoint | Streaming logic |
| Lines 600-673 | Upload & status | Document management |

---

## 🎨 UI Customization

### Change Theme Colors

**Purple to Blue Example:**

```tsx
// components/layout/Sidebar.tsx (line 56)
// OLD: from-purple-500 to-violet-600
// NEW: from-blue-500 to-cyan-600

// Search and replace across all files:
// purple-500 → blue-500
// purple-600 → blue-600
// violet-600 → cyan-600
```

### Change Logo

```tsx
// components/layout/Sidebar.tsx (line 56-59)
// Change "DM" to your logo text

// Or replace with image:
<img src="/logo.svg" alt="Logo" className="w-8 h-8" />
```

### Change App Name

```tsx
// app/layout.tsx (line 16)
export const metadata = {
  title: "Your App Name",
  // ...
}

// components/layout/Sidebar.tsx (line 60)
<span>Your App Name</span>
```

---

## 🐛 Common Issues

### Issue: "API not found" / CORS errors

**Fix:**
```bash
# 1. Check backend is running
curl http://localhost:8000/health

# 2. Check .env.local exists and has correct URL
cat .env.local

# 3. Restart frontend
pnpm dev
```

### Issue: Citations not clickable

**Check:**
- Backend returns `citationNumber` in each source
- `MarkdownRenderer.tsx` processes `[N]` patterns correctly
- `onCitationClick` prop is passed through `ChatMessage.tsx`

### Issue: Document viewer shows no highlights

**Check:**
- Backend returns `highlights` array (even if empty)
- Each highlight has `text`, `startOffset`, `endOffset`
- `DocumentViewer.tsx` receives `highlights` prop

### Issue: Streaming doesn't work

**Check:**
1. Backend endpoint returns `Content-Type: text/event-stream`
2. Each event is `data: {...}\n\n` format
3. Frontend uses `useRAGStream` (not `useRAGQuery`)

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ page.tsx    │→→│ useRAG       │→→│ api.service.ts   │→→│
│  │ (UI logic)  │  │ (hooks)      │  │ (HTTP client)    │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓ fetch/SSE
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ FastAPI     │→→│ PageIndex    │→→│ LLM              │  │
│  │ (endpoints) │  │ SDK          │  │ (reasoning)      │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
                        PageIndex API
                   (tree building + retrieval)
```

**Request Flow:**

1. User uploads PDF → Backend sends to PageIndex → Tree built
2. User asks question → Backend calls PageIndex Chat API
3. PageIndex:
   - Reads tree structure (no full text, just summaries)
   - LLM reasons about relevant sections
   - Reads full text of those sections only
   - Returns answer with `<doc=file;page=N>` citations
4. Backend post-processes:
   - Parses citations → converts to `[1][2][3]`
   - Fetches tree nodes for metadata
   - Extracts highlights
   - Streams response to frontend
5. Frontend renders with inline citations + source cards

---

## 🔒 Production Checklist

Before deploying:

- [ ] Add authentication (Clerk, Auth0, NextAuth.js)
- [ ] Set up database for conversations (PostgreSQL, MongoDB)
- [ ] Add rate limiting to backend
- [ ] Validate file uploads (size, type, virus scan)
- [ ] Use HTTPS for all API calls
- [ ] Set production environment variables
- [ ] Add error monitoring (Sentry, LogRocket)
- [ ] Set up CDN for static assets
- [ ] Add backup system for documents
- [ ] Configure proper CORS for production domain

---

## 📞 Need Help?

1. **Check docs:** All `.md` files in root directory
2. **Read backend code:** `examples/backend_pageindex.py` has 673 lines of comments
3. **Test with curl:** Isolate frontend vs backend issues
4. **Check browser console:** Look for network errors
5. **Check backend logs:** Look for PageIndex API errors

---

## 🎯 Priority Tasks After Integration

1. **High Priority:**
   - [ ] Add user authentication
   - [ ] Persist conversations to database
   - [ ] Deploy to production (Vercel + Railway)
   - [ ] Add error boundaries

2. **Medium Priority:**
   - [ ] Multi-document querying
   - [ ] Document sharing between users
   - [ ] Export conversations to PDF
   - [ ] Advanced search filters

3. **Nice to Have:**
   - [ ] Custom highlight colors
   - [ ] Collaborative annotations
   - [ ] Document comparison mode
   - [ ] Batch upload
   - [ ] Mobile app (React Native)

---

**Last Updated:** This file was generated for a new developer taking over the project. The frontend is production-ready but uses mock data. Backend integration is the #1 priority.

**Estimated Integration Time:**
- Backend setup: 30 min
- Frontend connection: 10 min
- Testing: 15 min
- Reading docs: 30 min
- **Total: ~90 min to first working query**

**Good luck! 🚀**
