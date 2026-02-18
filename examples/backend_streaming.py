"""
Example FastAPI backend that streams tool call events to the frontend.

This shows how to emit Server-Sent Events (SSE) that the frontend
streaming service can consume to show tool calling steps in the UI.

Install: pip install fastapi uvicorn sse-starlette

Run: uvicorn backend_streaming:app --reload
"""

import asyncio
import json
import uuid
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

app = FastAPI()

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_sse_event(event_type: str, data: dict) -> str:
    """Create a properly formatted SSE event."""
    return json.dumps({"type": event_type, "data": data})


async def process_chat_with_tools(message: str) -> AsyncGenerator[str, None]:
    """
    Generator that yields SSE events as the LLM processes the request.
    
    Event types:
    - tool_start: When a tool begins execution
    - tool_end: When a tool completes successfully
    - tool_error: When a tool fails
    - content_delta: Streaming text chunks
    - content_done: Final complete content
    - sources: RAG source documents
    """
    
    # ===========================================
    # STEP 1: Search Documents Tool
    # ===========================================
    tool_id_1 = str(uuid.uuid4())
    
    # Emit tool_start
    yield create_sse_event("tool_start", {
        "tool_call_id": tool_id_1,
        "tool_name": "search_documents",
        "input": {"query": message, "limit": 5}
    })
    
    # Simulate tool execution time
    await asyncio.sleep(1.0)
    
    # Emit tool_end with results
    yield create_sse_event("tool_end", {
        "tool_call_id": tool_id_1,
        "output": "Found 3 relevant documents: 'Technical Guide.pdf', 'API Reference.pdf', 'Best Practices.pdf'"
    })
    
    # ===========================================
    # STEP 2: Retrieve Context Tool
    # ===========================================
    tool_id_2 = str(uuid.uuid4())
    
    yield create_sse_event("tool_start", {
        "tool_call_id": tool_id_2,
        "tool_name": "retrieve_context",
        "input": {"document_ids": ["doc-1", "doc-2", "doc-3"], "max_chunks": 10}
    })
    
    await asyncio.sleep(0.8)
    
    yield create_sse_event("tool_end", {
        "tool_call_id": tool_id_2,
        "output": "Retrieved 8 relevant passages from 3 documents"
    })
    
    # ===========================================
    # STEP 3: Analyze Content Tool (optional)
    # ===========================================
    tool_id_3 = str(uuid.uuid4())
    
    yield create_sse_event("tool_start", {
        "tool_call_id": tool_id_3,
        "tool_name": "analyze_content",
        "input": {"task": "summarize_and_answer"}
    })
    
    await asyncio.sleep(0.6)
    
    yield create_sse_event("tool_end", {
        "tool_call_id": tool_id_3,
        "output": "Analysis complete. Generating response..."
    })
    
    # ===========================================
    # STEP 4: Stream the response content
    # ===========================================
    response_text = f"""Based on my analysis of the documents, here's what I found:

## Summary

The documents contain detailed information about your query: "{message}"

### Key Points

1. **First finding**: The technical guide explains the core concepts [1]
2. **Second finding**: The API reference provides implementation details [2]  
3. **Third finding**: Best practices recommend specific approaches [3]

### Conclusion

Based on all sources [1][2][3], the recommended approach is to follow the established patterns while adapting to your specific use case.
"""
    
    # Stream content in chunks (simulating LLM token streaming)
    chunk_size = 20
    for i in range(0, len(response_text), chunk_size):
        chunk = response_text[i:i + chunk_size]
        yield create_sse_event("content_delta", {"delta": chunk})
        await asyncio.sleep(0.05)  # Small delay between chunks
    
    # ===========================================
    # STEP 5: Send sources
    # ===========================================
    sources = [
        {
            "id": "source-1",
            "documentName": "Technical Guide.pdf",
            "pageIndex": 42,
            "title": "Core Concepts",
            "content": "This section explains the fundamental concepts...",
            "citationNumber": 1,
        },
        {
            "id": "source-2", 
            "documentName": "API Reference.pdf",
            "pageIndex": 15,
            "title": "Implementation Details",
            "content": "The API provides several methods for...",
            "citationNumber": 2,
        },
        {
            "id": "source-3",
            "documentName": "Best Practices.pdf", 
            "pageIndex": 8,
            "title": "Recommended Approaches",
            "content": "When implementing this feature, consider...",
            "citationNumber": 3,
        },
    ]
    
    yield create_sse_event("sources", {"sources": sources})
    
    # ===========================================
    # STEP 6: Signal completion
    # ===========================================
    yield create_sse_event("content_done", {"content": response_text})


@app.post("/api/chat")
async def chat_endpoint(request: Request):
    """
    SSE endpoint for streaming chat responses with tool calls.
    
    The frontend should call this with:
    POST /api/chat
    Content-Type: application/json
    Accept: text/event-stream
    
    Body: {"message": "user question", "conversation_id": "optional-id"}
    """
    body = await request.json()
    message = body.get("message", "")
    
    async def event_generator():
        async for event in process_chat_with_tools(message):
            yield {"data": event}
        yield {"data": "[DONE]"}
    
    return EventSourceResponse(event_generator())


# ===========================================
# Example with error handling
# ===========================================
async def process_with_error_example(message: str) -> AsyncGenerator[str, None]:
    """Example showing how to handle tool errors."""
    
    tool_id = str(uuid.uuid4())
    
    yield create_sse_event("tool_start", {
        "tool_call_id": tool_id,
        "tool_name": "search_database",
        "input": {"query": message}
    })
    
    await asyncio.sleep(0.5)
    
    # Simulate an error
    yield create_sse_event("tool_error", {
        "tool_call_id": tool_id,
        "error": "Database connection timeout after 30s"
    })
    
    # Continue with fallback content
    yield create_sse_event("content_delta", {
        "delta": "I encountered an error searching the database, but I can still help based on my training..."
    })
    
    yield create_sse_event("content_done", {
        "content": "I encountered an error searching the database, but I can still help based on my training..."
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
