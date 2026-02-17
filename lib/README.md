# Backend API Integration Guide (PageIndex)

## Overview

This directory contains the complete service layer and React hooks for integrating with a **PageIndex-powered RAG backend**. PageIndex uses reasoning-based retrieval (no vector DB, no chunking, no embeddings).

## Structure

```
lib/
├── config/
│   └── api.config.ts          # API configuration and endpoints
├── services/
│   ├── api.service.ts         # Core HTTP client (fetch + SSE streaming)
│   └── rag.service.ts         # PageIndex-aware RAG service methods
└── hooks/
    ├── useRAG.ts              # RAG query + streaming hooks (with tool_start/tool_result)
    ├── useDocuments.ts        # Document upload + status polling + tree access
    └── useConversations.ts    # Conversation management hooks
```

## Configuration

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### API Endpoints

Defined in `lib/config/api.config.ts`:

| Endpoint | Purpose |
|----------|---------|
| `/api/rag/query` | Non-streaming RAG query |
| `/api/rag/stream` | Streaming RAG query (SSE) |
| `/api/documents/upload` | Upload PDF to PageIndex |
| `/api/documents/:id/status` | Poll processing status |
| `/api/documents/:id/tree` | Get PageIndex tree structure |
| `/api/documents` | List all documents |
| `/api/conversations` | Conversation CRUD |

## PageIndex Flow

```
1. Upload PDF → PageIndex builds hierarchical tree (ToC)
2. User asks question → Backend calls PageIndex Chat API
3. PageIndex internally:
   a. Reads tree structure (no text, just titles + summaries)
   b. LLM reasons about which sections are relevant
   c. Reads full text of those sections
   d. Generates answer with <doc=file;page=N> citations
4. Backend post-processes:
   a. Parses <doc=file;page=N> → converts to [1][2][3]
   b. Fetches tree nodes for section metadata
   c. Extracts keyword-based highlights
   d. Returns normalized response for frontend
```

## Usage Examples

### 1. Basic RAG Query

```tsx
import { useRAGQuery } from '@/lib/hooks/useRAG';

function ChatComponent() {
  const { query, isLoading, error } = useRAGQuery({
    onSuccess: (response) => {
      console.log('Answer:', response.answer);
      console.log('Sources:', response.sources); // nodeId, title, pageIndex, highlights
    },
  });

  const handleSend = async (message: string) => {
    await query({
      query: message,
      docId: 'pi-abc123',        // PageIndex document ID
      enableCitations: true,      // Get [1][2][3] in the answer
    });
  };
}
```

### 2. Streaming with PageIndex Events

```tsx
import { useRAGStream } from '@/lib/hooks/useRAG';

function StreamingChat() {
  const { streamQuery, isStreaming, isSearching, accumulatedText } = useRAGStream({
    onToolStart: (meta) => console.log('Searching document...', meta.toolName),
    onToolResult: (meta) => console.log('Found relevant content'),
    onToken: (token) => console.log('Token:', token),
    onSource: (source) => console.log('Source:', source.title, source.pageIndex),
    onComplete: () => console.log('Done'),
  });

  return (
    <div>
      {isSearching && <p>🔍 Searching document sections...</p>}
      <p>{accumulatedText}</p>
      {isStreaming && <p>AI is typing...</p>}
    </div>
  );
}
```

### 3. Complete Chat Hook

```tsx
import { useChat } from '@/lib/hooks/useRAG';

function ChatPage() {
  const { messages, sendMessage, clearMessages, isProcessing, isSearchingDoc } = useChat({
    useStreaming: true,
    docId: 'pi-abc123',
    enableCitations: true,
  });

  return (
    <div>
      {isSearchingDoc && <p>🔍 Searching document...</p>}
      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong> {msg.content}
          {msg.sources?.map((s) => (
            <span key={s.id}>[{s.citationNumber}] {s.title} (p.{s.pageIndex})</span>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### 4. Document Upload with Status Polling

```tsx
import { useDocumentUpload } from '@/lib/hooks/useDocuments';

function DocumentUpload() {
  const { uploadDocuments, isUploading, uploadProgress, processingStatus } = useDocumentUpload();

  const handleUpload = async (files: File[]) => {
    // waitForReady=true → polls PageIndex until tree is built
    const response = await uploadDocuments({ files }, true);
    console.log('Doc ID:', response.documents[0].id); // "pi-abc123"
  };

  return (
    <div>
      {isUploading && <progress value={uploadProgress} max={100} />}
      {processingStatus === 'processing' && <p>PageIndex is building tree structure...</p>}
    </div>
  );
}
```

### 5. Access PageIndex Tree

```tsx
import { useDocuments } from '@/lib/hooks/useDocuments';

function TreeViewer() {
  const { getDocumentTree } = useDocuments();

  const showTree = async (docId: string) => {
    const tree = await getDocumentTree(docId);
    // tree.result = [{ node_id, title, page_index, summary, nodes: [...] }]
    console.log(tree);
  };
}
```

```tsx
import { useDocuments } from '@/lib/hooks/useDocuments';

function DocumentList() {
  const { documents, fetchDocuments, deleteDocument, isLoading } = useDocuments();

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {documents.map((doc) => (
        <div key={doc.id}>
          <span>{doc.name}</span>
          <button onClick={() => deleteDocument(doc.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### 6. Conversation Management

```tsx
import { useConversations } from '@/lib/hooks/useConversations';

function ConversationSidebar() {
  const {
    conversations,
    saveConversation,
    deleteConversation,
    getConversation,
  } = useConversations();

  const handleSave = async () => {
    await saveConversation({
      title: 'New Chat',
      messages: [
        {
          role: 'user',
          content: 'Hello',
          timestamp: new Date().toISOString(),
        },
      ],
    });
  };

  return (
    <div>
      {conversations.map((conv) => (
        <div key={conv.id}>
          <span>{conv.title}</span>
          <button onClick={() => deleteConversation(conv.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

## Backend Integration

### Expected Backend Endpoints

Your backend wraps PageIndex. See `examples/backend_pageindex.py` for a complete FastAPI example.

#### 1. POST `/api/rag/query`

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
  "answer": "The key findings include... [1] Furthermore... [2]",
  "sources": [
    {
      "id": "report.pdf_0007",
      "nodeId": "0007",
      "title": "5. Conclusion",
      "documentName": "report.pdf",
      "pageIndex": 16,
      "endPageIndex": 17,
      "content": "Full section text from PageIndex tree node...",
      "summary": "LLM-generated section summary",
      "citationNumber": 1,
      "highlights": [
        { "text": "key findings include", "startOffset": 42, "endOffset": 61 }
      ]
    }
  ],
  "metadata": {
    "model": "pageindex",
    "tokensUsed": 500,
    "retrievalMethod": "pageindex"
  }
}
```

#### 2. POST `/api/rag/stream` (SSE)

**Request:** Same as query

**Response:** Server-Sent Events stream
```
data: {"type":"tool_start","metadata":{"toolName":"search","type":"mcp_tool_use_start"}}
data: {"type":"tool_result","metadata":{"type":"mcp_tool_result_start"}}
data: {"type":"token","content":"The"}
data: {"type":"token","content":" key"}
data: {"type":"source","source":{"nodeId":"0007","title":"5. Conclusion",...}}
data: {"type":"done"}
```

#### 3. POST `/api/documents/upload`

**Request:** FormData with PDF file

**Response:**
```json
{
  "success": true,
  "documents": [
    { "id": "pi-abc123", "name": "report.pdf", "status": "processing" }
  ]
}
```

#### 4. GET `/api/documents/:id/status`

**Response:**
```json
{ "id": "pi-abc123", "name": "report.pdf", "status": "completed", "pages": 25 }
```

#### 5. GET `/api/documents/:id/tree`

**Response:** PageIndex tree structure
```json
{
  "doc_id": "pi-abc123",
  "status": "completed",
  "result": [
    {
      "node_id": "0000", "title": "Document Title", "page_index": 1,
      "prefix_summary": "# Document Title\n\nOverview...",
      "nodes": [
        { "node_id": "0001", "title": "Abstract", "page_index": 1, "summary": "..." },
        { "node_id": "0002", "title": "1 Introduction", "page_index": 2, "summary": "..." }
      ]
    }
  ]
}
```

## TypeScript Types

All types in `/types/`:
- `api.ts` — `RAGQueryRequest`, `StreamChunk`, `PageIndexTreeNode`, `PageIndexNodeMapEntry`, `PageIndexTreeSearchResult`
- `message.ts` — `DocumentSource` (with `nodeId`, `title`, `pageIndex`, `endPageIndex`, `summary`, `prefixSummary`, `highlights`)

## Next Steps

1. Set `NEXT_PUBLIC_API_URL` in `.env.local`
2. Set up the FastAPI backend (see `examples/backend_pageindex.py`)
3. Get a PageIndex API key from [dash.pageindex.ai](https://dash.pageindex.ai/api-keys)
4. Rename `page-with-api.tsx.example` → `page.tsx` to switch from mock to real API
5. Upload a PDF and start querying!
