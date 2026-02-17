# Backend Integration Guide - DocMiner AI

> **Complete guide for integrating the PageIndex-powered RAG backend with the frontend.**

## 🎯 Overview

**DocMiner AI** is a RAG-powered chat interface that uses **PageIndex** (vectorless, reasoning-based RAG) for document retrieval. This guide will help you:

1. Set up the backend server
2. Connect the frontend to real APIs
3. Switch from mock data to live data
4. Deploy to production

---

## 📁 Project Structure

```
my-app/
├── app/
│   ├── page.tsx                    # ⚠️ Currently uses MOCK data
│   └── page-with-api.tsx.example   # ✅ API-integrated version (use this!)
├── components/
│   ├── chat/                       # Chat UI components
│   ├── document/                   # Document viewer + citations
│   ├── layout/                     # Header + Sidebar
│   └── tree/                       # Tree visualization
├── lib/
│   ├── config/api.config.ts        # API endpoints configuration
│   ├── services/
│   │   ├── api.service.ts          # HTTP client (fetch + SSE)
│   │   └── rag.service.ts          # RAG service methods
│   └── hooks/
│       ├── useRAG.ts               # Query + streaming hooks
│       ├── useDocuments.ts         # Upload + status + tree
│       └── useConversations.ts     # Conversation management
├── types/
│   ├── api.ts                      # PageIndex API types
│   └── message.ts                  # Frontend message types
├── examples/
│   ├── backend_pageindex.py        # ✅ COMPLETE FastAPI backend
│   └── backend_example.py          # ⚠️ OLD (Vector DB - deprecated)
└── .env.local                      # ⚠️ CREATE THIS (see below)
```

---

## 🚀 Quick Start (5 Steps)

### Step 1: Get PageIndex API Key

1. Go to [dash.pageindex.ai/api-keys](https://dash.pageindex.ai/api-keys)
2. Create a new API key
3. Copy it (starts with `pi_...`)

### Step 2: Set Up Backend

```bash
# Navigate to backend directory (or create one)
cd backend  # or mkdir backend && cd backend

# Copy the example backend
cp ../examples/backend_pageindex.py main.py

# Install dependencies
pip install fastapi uvicorn pageindex python-multipart

# Add your API key
# Edit main.py and replace: YOUR_PAGEINDEX_API_KEY
```

**Edit `main.py`:**
```python
# Line 38 in main.py
pi_client = PageIndexClient(api_key="pi_your_actual_key_here")
```

### Step 3: Configure Frontend

Create `.env.local` in the frontend root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 4: Switch to API-Integrated Page

```bash
# Backup current mock version
mv app/page.tsx app/page-mock.tsx.backup

# Use the API version
cp app/page-with-api.tsx.example app/page.tsx
```

### Step 5: Run Everything

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd my-app
pnpm dev
```

**Open:** http://localhost:3001

---

## 🔌 API Endpoints Reference

Your backend must implement these endpoints (all are in `examples/backend_pageindex.py`):

### 1. **POST** `/api/rag/query` - Non-streaming RAG query

**Request:**
```json
{
  "query": "What are the key findings?",
  "docId": "pi-abc123",
  "enableCitations": true
}
```

**Response:**
```json
{
  "answer": "The key findings include [1] ... Furthermore [2] ...",
  "sources": [
    {
      "id": "report.pdf_0007",
      "nodeId": "0007",
      "title": "5. Conclusion",
      "documentName": "report.pdf",
      "pageIndex": 16,
      "endPageIndex": 17,
      "content": "Full section text...",
      "summary": "Section summary",
      "citationNumber": 1,
      "highlights": [
        { "text": "key findings", "startOffset": 42, "endOffset": 54 }
      ]
    }
  ],
  "metadata": {
    "model": "pageindex",
    "tokensUsed": 500
  }
}
```

### 2. **POST** `/api/rag/stream` - Streaming RAG (SSE)

**Request:** Same as `/api/rag/query`

**Response:** Server-Sent Events stream

```
data: {"type":"tool_start","metadata":{"toolName":"search"}}

data: {"type":"tool_result","metadata":{...}}

data: {"type":"token","content":"The"}

data: {"type":"token","content":" key"}

data: {"type":"source","source":{...}}

data: {"type":"done"}
```

### 3. **POST** `/api/documents/upload` - Upload PDF

**Request:** `multipart/form-data` with file

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "id": "pi-abc123",
      "name": "report.pdf",
      "status": "processing"
    }
  ]
}
```

### 4. **GET** `/api/documents/:id/status` - Check processing status

**Response:**
```json
{
  "id": "pi-abc123",
  "name": "report.pdf",
  "status": "completed",
  "pages": 25
}
```

### 5. **GET** `/api/documents/:id/tree` - Get PageIndex tree

**Response:**
```json
{
  "doc_id": "pi-abc123",
  "status": "completed",
  "result": [
    {
      "node_id": "0000",
      "title": "Document Title",
      "page_index": 1,
      "prefix_summary": "Overview...",
      "nodes": [
        { "node_id": "0001", "title": "1. Introduction", "page_index": 2 }
      ]
    }
  ]
}
```

### 6. **GET** `/api/documents` - List all documents

**Response:**
```json
{
  "documents": [
    { "id": "pi-abc123", "name": "report.pdf", "status": "completed" }
  ]
}
```

### 7. **DELETE** `/api/documents/:id` - Delete document

**Response:**
```json
{ "success": true }
```

### 8. **GET/POST/DELETE** `/api/conversations` - Conversation CRUD

See `lib/hooks/useConversations.ts` for usage.

---

## 🎨 Frontend Hook Usage

### Basic Query (Non-Streaming)

```tsx
import { useRAGQuery } from '@/lib/hooks/useRAG';

function ChatComponent() {
  const { query, isLoading, error } = useRAGQuery({
    onSuccess: (response) => {
      console.log('Answer:', response.answer);
      console.log('Sources:', response.sources);
    },
  });

  const handleSend = async (message: string) => {
    const response = await query({
      query: message,
      docId: 'pi-abc123',
      enableCitations: true,
    });
  };
}
```

### Streaming with Real-time Tokens

```tsx
import { useRAGStream } from '@/lib/hooks/useRAG';

function StreamingChat() {
  const { streamQuery, isStreaming, isSearching, accumulatedText } = useRAGStream({
    onToolStart: () => console.log('🔍 Searching document...'),
    onToken: (token) => {
      // Update UI with each token
      setCurrentMessage(prev => prev + token);
    },
    onSource: (source) => console.log('📄 Found source:', source.title),
    onComplete: () => console.log('✅ Done'),
  });

  return (
    <div>
      {isSearching && <p>🔍 Searching document sections...</p>}
      {isStreaming && <TypingIndicator />}
      <p>{accumulatedText}</p>
    </div>
  );
}
```

### Complete Chat Hook (Recommended)

```tsx
import { useChat } from '@/lib/hooks/useRAG';

function ChatPage() {
  const {
    messages,
    sendMessage,
    clearMessages,
    isProcessing,
    isSearchingDoc,
  } = useChat({
    useStreaming: true,
    docId: 'pi-abc123',
    enableCitations: true,
  });

  return (
    <div>
      {isSearchingDoc && <p>🔍 Searching document...</p>}
      <ChatWindow messages={messages} isTyping={isProcessing} />
      <ChatInput onSend={sendMessage} disabled={isProcessing} />
    </div>
  );
}
```

### Document Upload

```tsx
import { useDocumentUpload } from '@/lib/hooks/useDocuments';

function DocumentUpload() {
  const { uploadDocuments, isUploading, uploadProgress, processingStatus } =
    useDocumentUpload();

  const handleUpload = async (files: File[]) => {
    // waitForReady=true polls PageIndex until tree is built
    const response = await uploadDocuments({ files }, true);
    const docId = response.documents[0].id; // "pi-abc123"
    console.log('Document ready:', docId);
  };

  return (
    <div>
      {isUploading && <progress value={uploadProgress} max={100} />}
      {processingStatus === 'processing' && <p>Building tree structure...</p>}
    </div>
  );
}
```

### Access PageIndex Tree

```tsx
import { useDocuments } from '@/lib/hooks/useDocuments';

function TreeViewer() {
  const { getDocumentTree } = useDocuments();

  const showTree = async (docId: string) => {
    const tree = await getDocumentTree(docId);
    // tree.result = [{ node_id, title, page_index, summary, nodes }]
    console.log(tree);
  };
}
```

---

## 🔄 Migration Checklist

**Switching from mock data to real API:**

- [ ] Get PageIndex API key from [dash.pageindex.ai](https://dash.pageindex.ai/api-keys)
- [ ] Copy `examples/backend_pageindex.py` → `backend/main.py`
- [ ] Add API key to `main.py` (line 38)
- [ ] Install backend dependencies: `pip install fastapi uvicorn pageindex python-multipart`
- [ ] Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`
- [ ] Replace `app/page.tsx` with `app/page-with-api.tsx.example`
- [ ] Start backend: `uvicorn main:app --reload --port 8000`
- [ ] Start frontend: `pnpm dev`
- [ ] Upload a PDF via the UI
- [ ] Ask a question about the document
- [ ] Verify citations [1][2][3] appear and are clickable

---

## 🧪 Testing the Integration

### 1. Health Check

```bash
curl http://localhost:8000/health
# Expected: {"status": "ok"}
```

### 2. Upload Test PDF

```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@test.pdf"
```

### 3. Check Status

```bash
curl http://localhost:8000/api/documents/pi-abc123/status
```

### 4. Query Test

```bash
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the main topic?",
    "docId": "pi-abc123",
    "enableCitations": true
  }'
```

---

## 🐛 Troubleshooting

### CORS Errors

**Symptom:** Browser console shows "CORS policy blocked"

**Fix:** Ensure backend has CORS middleware (already in `backend_pageindex.py`):

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### API Not Found (404)

**Check:**
1. Backend is running: `curl http://localhost:8000/health`
2. `.env.local` has correct URL: `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. Endpoint paths match exactly (e.g., `/api/rag/query` not `/rag/query`)

### No Sources Returned

**Ensure backend:**
1. Returns `sources` array in response
2. Each source has `citationNumber` field (1, 2, 3...)
3. `highlights` array is present (can be empty)

### PageIndex "Document Not Ready"

**Wait for processing:**
```tsx
const { uploadDocuments } = useDocumentUpload();

// waitForReady=true polls until tree is built
await uploadDocuments({ files }, true);
```

### Streaming Doesn't Work

**Check:**
1. Backend returns `Content-Type: text/event-stream`
2. Each event is `data: {...}\n\n` format
3. Frontend uses `useRAGStream` hook (not `useRAGQuery`)

---

## 📚 Additional Resources

- **PageIndex Docs:** [dash.pageindex.ai](https://dash.pageindex.ai)
- **Backend Example:** `examples/backend_pageindex.py` (673 lines, fully commented)
- **Service Layer Docs:** `lib/README.md`
- **Component Docs:** `COMPONENTS.md`
- **RAG Deep Dive:** `RAG_DOCUMENTATION.md`
- **PageIndex Analysis:** `PAGEINDEX_ANALYSIS.md`

---

## 🚢 Production Deployment

### Environment Variables

**Frontend (.env.production):**
```env
NEXT_PUBLIC_API_URL=https://api.docminer.ai
```

**Backend:**
```env
PAGEINDEX_API_KEY=pi_prod_key_here
ALLOWED_ORIGINS=https://docminer.ai
DATABASE_URL=postgresql://...
```

### Security Checklist

- [ ] Use HTTPS for all API calls
- [ ] Add authentication (JWT tokens, API keys, etc.)
- [ ] Rate limit API endpoints
- [ ] Validate file uploads (size, type, virus scan)
- [ ] Sanitize user inputs
- [ ] Use environment variables for secrets (never hardcode)
- [ ] Enable CORS only for your domain
- [ ] Add request logging and monitoring

### Deployment Options

**Backend:**
- Railway.app (easiest)
- Heroku
- AWS Lambda + API Gateway
- Google Cloud Run
- DigitalOcean App Platform

**Frontend:**
- Vercel (recommended for Next.js)
- Netlify
- Cloudflare Pages
- AWS Amplify

---

## 🎯 Next Steps After Integration

1. **Add Authentication:** Protect API routes with JWT/Auth0/Clerk
2. **Persist Conversations:** Save to PostgreSQL/MongoDB
3. **Multi-tenancy:** Add user workspaces and document sharing
4. **Advanced Features:**
   - Document comparison mode
   - Batch upload
   - Export conversations to PDF
   - Custom highlight colors
   - Collaborative annotations
5. **Monitoring:** Add Sentry, LogRocket, or similar
6. **Analytics:** Track query patterns, popular documents, etc.

---

## ❓ FAQ

**Q: Can I use Vector DB instead of PageIndex?**  
A: Yes, but you'll need to rewrite the backend. See `examples/backend_example.py` (deprecated) for reference.

**Q: Does this support multiple documents per query?**  
A: Yes! Pass an array: `docId: ['pi-abc', 'pi-def']`

**Q: How do I customize the citation format?**  
A: Edit `MarkdownRenderer.tsx` → `processCitations()` function.

**Q: Can I use OpenAI instead of PageIndex's LLM?**  
A: Yes, but you'll lose the reasoning-based retrieval. You'd need to build your own tree → prompt flow.

**Q: How do I add more tree visualization options?**  
A: Edit `components/tree/TreeRenderer.tsx` and `treeUtils.ts`. vis-network has many layout options.

---

## 📞 Support

If you're stuck:
1. Check the existing docs: `lib/README.md`, `COMPONENTS.md`, `RAG_DOCUMENTATION.md`
2. Review `examples/backend_pageindex.py` comments (673 lines of detailed explanations)
3. Test with curl to isolate frontend vs backend issues
4. Check browser console and backend logs for errors

---

**Built with ❤️ using Next.js 15, PageIndex, and Tailwind CSS v4**
