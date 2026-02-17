# Quick Start: API Integration

## Step 1: Set Environment Variables

Create `.env.local` in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Step 2: Replace Mock Data in page.tsx

Replace the current `page.tsx` with the API-integrated version:

```bash
cp app/page-with-api.tsx.example app/page.tsx
```

Or manually update `handleSendMessage` in `app/page.tsx`:

```typescript
import { useRAGQuery } from '@/lib/hooks/useRAG';

// In your component:
const { query, isLoading, error } = useRAGQuery();

const handleSendMessage = async (content: string, files?: File[]) => {
  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content,
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, userMessage]);

  // Call real API
  const response = await query({
    query: content,
    conversationId: activeConversationId,
    maxSources: 5,
    files,
  });

  if (response) {
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.answer,
      timestamp: new Date(),
      sources: response.sources,
    };
    setMessages((prev) => [...prev, assistantMessage]);
  }
};
```

## Step 3: Backend Requirements

Your backend must implement these endpoints:

### POST `/api/rag/query`

```python
# FastAPI example
@app.post("/api/rag/query")
async def query(request: QueryRequest):
    # 1. Embed the query
    query_embedding = embed_text(request.query)
    
    # 2. Search vector DB
    results = vector_db.similarity_search(query_embedding, k=5)
    
    # 3. Format sources with citation numbers
    sources = []
    for i, result in enumerate(results, 1):
        sources.append({
            "id": result.id,
            "documentName": result.metadata["filename"],
            "pageNumber": result.metadata["page"],
            "content": result.content,
            "score": result.score,
            "citationNumber": i,  # Important!
            "highlights": extract_highlights(result.content, request.query)
        })
    
    # 4. Generate answer with LLM (include citation numbers in answer)
    context = "\n\n".join([s["content"] for s in sources])
    answer = llm.generate(
        query=request.query,
        context=context,
        system_prompt="Include citation numbers [1], [2], etc. in your answer"
    )
    
    return {
        "answer": answer,
        "sources": sources,
        "metadata": {
            "processingTime": 1234,
            "model": "gpt-4"
        }
    }
```

### Response Format

```json
{
  "answer": "Based on the documentation [1], RAG works by [2]...",
  "sources": [
    {
      "id": "doc_123_page_42",
      "documentName": "Technical Guide.pdf",
      "pageNumber": 42,
      "content": "Full text of the relevant section...",
      "score": 0.92,
      "citationNumber": 1,
      "highlights": [
        {
          "text": "the exact matched phrase",
          "startOffset": 145,
          "endOffset": 169
        }
      ]
    }
  ],
  "metadata": {
    "processingTime": 1234,
    "model": "gpt-4"
  }
}
```

## Step 4: Test the Integration

1. Start your backend server:
```bash
cd backend
python main.py  # or uvicorn main:app --reload
```

2. Start the Next.js dev server:
```bash
cd my-app
pnpm dev
```

3. Open http://localhost:3001 and send a message!

## Alternative: Use Streaming

For real-time token streaming, use `useRAGStream`:

```typescript
import { useRAGStream } from '@/lib/hooks/useRAG';

const { streamQuery, isStreaming, accumulatedText } = useRAGStream({
  onToken: (token) => {
    // Update message in real-time
    setMessages((prev) => {
      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage?.role === 'assistant') {
        lastMessage.content += token;
      }
      return newMessages;
    });
  },
  onSource: (source) => {
    console.log('Received source:', source);
  },
  onComplete: () => {
    console.log('Stream complete!');
  },
});

// Use it:
await streamQuery({
  query: content,
  conversationId: activeConversationId,
});
```

## Troubleshooting

### CORS Issues

Add CORS headers in your backend:

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

### API Not Found

Check:
1. `NEXT_PUBLIC_API_URL` is set correctly
2. Backend is running on the correct port
3. Endpoint paths match exactly

### No Sources Returned

Ensure your backend:
1. Returns `sources` array
2. Each source has `citationNumber` field
3. Highlights are properly formatted

## Next Steps

1. Implement document upload endpoint
2. Add conversation persistence
3. Implement user authentication
4. Add error boundaries and retry logic
5. Set up monitoring and logging
