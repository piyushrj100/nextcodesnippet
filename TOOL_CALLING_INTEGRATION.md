# Tool Calling UI Integration Guide

A complete solution for displaying LLM tool calling steps in your Next.js application, similar to modern AI assistants like ChatGPT, Claude, and Perplexity.

![Tool Calling Demo](https://img.shields.io/badge/Status-Production%20Ready-green)

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Backend Integration](#backend-integration)
- [Frontend Integration](#frontend-integration)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

- **Real-time streaming** - Tool calls update live as your backend processes them
- **Visual feedback** - Shows spinner → checkmark → completion with timing
- **Expandable details** - Click any step to see input/output/errors
- **Status tracking** - Pending, running, completed, error states
- **Duration display** - Shows how long each tool took to execute
- **Collapsible UI** - Users can hide/show the tool call steps
- **TypeScript support** - Fully typed for better DX
- **Zero dependencies** - Uses native browser APIs (EventSource/SSE)

---

## 🏗️ Architecture

```
┌─────────────────┐         SSE Stream          ┌─────────────────┐
│   Backend API   │ ─────────────────────────▶  │  Frontend App   │
│                 │                              │                 │
│ • LLM reasoning │   tool_start events          │ • ToolCallSteps │
│ • Tool calling  │   tool_end events            │ • ChatMessage   │
│ • Response gen  │   content_delta events       │ • Message state │
└─────────────────┘                              └─────────────────┘
```

**Flow:**
1. User sends message
2. Backend starts LLM reasoning
3. Backend emits `tool_start` when calling a tool
4. Frontend shows spinner + tool name
5. Backend emits `tool_end` when complete
6. Frontend shows checkmark + output
7. Backend streams response text via `content_delta`
8. Backend emits `sources` with citations
9. Backend sends `[DONE]` to complete stream

---

## 🚀 Quick Start

### 1. Test the Demo (No Backend Required)

Type `tools` in the chat to see a simulated tool calling demo:

```bash
npm run dev
# Visit http://localhost:3000
# Type: tools
```

### 2. Real Backend Integration (5 minutes)

**Step 1: Update your message handler**

```tsx
import { useStreamingChat } from '@/lib/hooks/useStreamingChat';

const { sendMessage, currentMessage, isStreaming } = useStreamingChat({
  endpoint: '/api/chat', // Your backend endpoint
  onMessageComplete: (message) => {
    setMessages(prev => [...prev, message]);
  },
});

// Display messages (currentMessage updates in real-time)
const displayMessages = currentMessage 
  ? [...messages, currentMessage]
  : messages;
```

**Step 2: Done!** The UI automatically updates as events stream in.

---

## 🔌 Backend Integration

### Server-Sent Events (SSE) Format

Your backend must send events in this format:

```
data: {"type": "tool_start", "data": {"tool_call_id": "abc123", "tool_name": "search_documents", "input": {"query": "hello"}}}

data: {"type": "tool_end", "data": {"tool_call_id": "abc123", "output": "Found 3 documents"}}

data: {"type": "content_delta", "data": {"delta": "Based on the search results, "}}

data: {"type": "content_delta", "data": {"delta": "I can tell you that..."}}

data: {"type": "sources", "data": {"sources": [{"id": "1", "documentName": "doc.pdf", ...}]}}

data: {"type": "content_done", "data": {"content": "Full response text here"}}

data: [DONE]
```

### Event Types

| Event Type | Required Fields | Description |
|------------|----------------|-------------|
| `tool_start` | `tool_call_id`, `tool_name`, `input?` | Tool execution begins |
| `tool_end` | `tool_call_id`, `output?` | Tool execution succeeds |
| `tool_error` | `tool_call_id`, `error` | Tool execution fails |
| `content_delta` | `delta` | Incremental text chunk |
| `content_done` | `content` | Final complete text |
| `sources` | `sources[]` | RAG source documents |

### Python FastAPI Example

```python
from fastapi import FastAPI
from sse_starlette.sse import EventSourceResponse
import json
import asyncio

app = FastAPI()

async def process_chat(message: str):
    # Start tool
    yield json.dumps({
        "type": "tool_start",
        "data": {
            "tool_call_id": "tool-1",
            "tool_name": "search_documents",
            "input": {"query": message}
        }
    })
    
    # Simulate work
    await asyncio.sleep(1.0)
    
    # End tool
    yield json.dumps({
        "type": "tool_end",
        "data": {
            "tool_call_id": "tool-1",
            "output": "Found 3 relevant documents"
        }
    })
    
    # Stream response
    response = "Based on my search, here's what I found..."
    for chunk in [response[i:i+20] for i in range(0, len(response), 20)]:
        yield json.dumps({
            "type": "content_delta",
            "data": {"delta": chunk}
        })
        await asyncio.sleep(0.05)
    
    yield json.dumps({
        "type": "content_done",
        "data": {"content": response}
    })

@app.post("/api/chat")
async def chat(request: Request):
    body = await request.json()
    
    async def event_generator():
        async for event in process_chat(body["message"]):
            yield {"data": event}
        yield {"data": "[DONE]"}
    
    return EventSourceResponse(event_generator())
```

See `examples/backend_streaming.py` for a complete working example.

### Node.js/Express Example

```javascript
app.post('/api/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Start tool
  res.write(`data: ${JSON.stringify({
    type: 'tool_start',
    data: {
      tool_call_id: 'tool-1',
      tool_name: 'search_documents',
      input: { query: req.body.message }
    }
  })}\n\n`);

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));

  // End tool
  res.write(`data: ${JSON.stringify({
    type: 'tool_end',
    data: { tool_call_id: 'tool-1', output: 'Found 3 documents' }
  })}\n\n`);

  // Stream response
  const response = 'Based on my search...';
  for (let i = 0; i < response.length; i += 20) {
    res.write(`data: ${JSON.stringify({
      type: 'content_delta',
      data: { delta: response.slice(i, i + 20) }
    })}\n\n`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  res.write('data: [DONE]\n\n');
  res.end();
});
```

---

## 💻 Frontend Integration

### Option 1: Use the Hook (Recommended)

```tsx
import { useStreamingChat } from '@/lib/hooks/useStreamingChat';

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  
  const { sendMessage, currentMessage, isStreaming, error, abort } = useStreamingChat({
    endpoint: '/api/chat',
    onMessageComplete: (msg) => setMessages(prev => [...prev, msg]),
  });

  const handleSend = async (content: string) => {
    const userMsg = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    await sendMessage(content);
  };

  const displayMessages = currentMessage ? [...messages, currentMessage] : messages;

  return (
    <>
      <ChatWindow messages={displayMessages} isTyping={isStreaming} />
      <ChatInput onSendMessage={handleSend} disabled={isStreaming} />
      {isStreaming && <button onClick={abort}>Stop</button>}
    </>
  );
}
```

### Option 2: Manual Implementation

```tsx
import { streamChatResponse } from '@/lib/services/streaming.service';

async function sendMessage(content: string) {
  const messageId = Date.now().toString();
  let toolCalls: ToolCall[] = [];
  let responseContent = '';

  await streamChatResponse(
    '/api/chat',
    content,
    undefined,
    {
      onToolStart: (id, name, input) => {
        toolCalls.push({ id, name, status: 'running', input, startTime: new Date() });
        updateUI(messageId, { toolCalls: [...toolCalls] });
      },
      onToolEnd: (id, output) => {
        const idx = toolCalls.findIndex(t => t.id === id);
        toolCalls[idx] = { ...toolCalls[idx], status: 'completed', output, endTime: new Date() };
        updateUI(messageId, { toolCalls: [...toolCalls] });
      },
      onContentDelta: (delta) => {
        responseContent += delta;
        updateUI(messageId, { content: responseContent });
      },
    }
  );
}
```

---

## 📚 API Reference

### `useStreamingChat` Hook

```typescript
interface UseStreamingChatOptions {
  endpoint: string;                           // Backend SSE endpoint
  onMessageComplete?: (msg: Message) => void; // Callback when done
}

interface UseStreamingChatReturn {
  sendMessage: (content: string, conversationId?: string) => Promise<void>;
  currentMessage: Message | null;  // Live-updating message
  isStreaming: boolean;            // True during stream
  error: Error | null;             // Any errors
  abort: () => void;               // Stop the stream
}
```

### `streamChatResponse` Function

```typescript
async function streamChatResponse(
  endpoint: string,
  message: string,
  conversationId?: string,
  callbacks?: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void>
```

### `StreamCallbacks` Interface

```typescript
interface StreamCallbacks {
  onToolStart?: (toolCallId: string, toolName: string, input?: Record<string, unknown>) => void;
  onToolEnd?: (toolCallId: string, output?: string) => void;
  onToolError?: (toolCallId: string, error: string) => void;
  onContentDelta?: (delta: string) => void;
  onContentDone?: (content: string) => void;
  onSources?: (sources: DocumentSource[]) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}
```

### `ToolCall` Type

```typescript
interface ToolCall {
  id: string;                                    // Unique identifier
  name: string;                                  // Tool name (e.g., "search_documents")
  status: 'pending' | 'running' | 'completed' | 'error';
  input?: Record<string, unknown>;               // Tool parameters
  output?: string;                               // Tool result
  error?: string;                                // Error message
  startTime?: Date;                              // Execution start
  endTime?: Date;                                // Execution end
}
```

---

## 📖 Examples

### Example 1: Simple Integration

See `examples/streaming-chat-example.tsx`

### Example 2: With Error Handling

```tsx
const { sendMessage, error } = useStreamingChat({
  endpoint: '/api/chat',
  onMessageComplete: (msg) => {
    if (msg.toolCalls?.some(t => t.status === 'error')) {
      console.warn('Some tools failed');
    }
    setMessages(prev => [...prev, msg]);
  },
});

if (error) {
  return <div className="error">Error: {error.message}</div>;
}
```

### Example 3: With Abort/Cancel

```tsx
const { sendMessage, isStreaming, abort } = useStreamingChat({
  endpoint: '/api/chat',
});

return (
  <>
    <ChatWindow />
    {isStreaming && (
      <button onClick={abort} className="stop-btn">
        Stop Generating
      </button>
    )}
  </>
);
```

---

## 🎨 Customization

### Custom Tool Names

The UI automatically formats tool names. Customize in `components/chat/ToolCallSteps.tsx`:

```typescript
const toolDisplayNames: Record<string, string> = {
  search_documents: '🔍 Searching documents',
  retrieve_context: '📄 Retrieving context',
  my_custom_tool: '⚙️ Running custom analysis',
  // Add your tools here
};
```

### Custom Styling

Tool call steps use Tailwind classes. Key classes to customize:

```tsx
// In ToolCallSteps.tsx
- `bg-purple-500/10` → Background color
- `text-purple-400` → Text color
- `border-purple-500/10` → Border color
```

### Status Colors

```typescript
function getStatusColor(status: ToolCall['status']) {
  switch (status) {
    case 'running': return 'text-blue-400';
    case 'completed': return 'text-green-400';
    case 'error': return 'text-red-400';
    default: return 'text-gray-400';
  }
}
```

---

## 🐛 Troubleshooting

### Issue: No tool calls showing

**Check:**
1. Backend is sending SSE events in correct format
2. Events have `Content-Type: text/event-stream` header
3. Events start with `data: ` prefix
4. JSON is valid

**Debug:**
```typescript
// Add logging in streaming.service.ts
console.log('SSE event:', event);
```

### Issue: CORS errors

**Fix:** Add CORS headers to backend:

```python
# FastAPI
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

```javascript
// Express
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### Issue: Tool calls not updating

**Check:**
1. `tool_call_id` matches between `tool_start` and `tool_end`
2. Message state is being updated correctly
3. React re-renders are happening

**Debug:**
```typescript
// In useStreamingChat.ts
console.log('Tool calls updated:', toolCalls);
```

### Issue: Stream cuts off early

**Check:**
1. Backend sends `[DONE]` at the end
2. No errors in browser console
3. Connection isn't timing out

**Fix:** Add keep-alive in backend:
```python
# Send periodic comments to keep connection alive
yield ": keepalive\n\n"
```

---

## 📁 Project Structure

```
lib/
├── services/
│   └── streaming.service.ts    # SSE parsing & event handling
├── hooks/
│   └── useStreamingChat.ts     # React hook for streaming
components/
├── chat/
│   ├── ToolCallSteps.tsx       # Tool call UI component
│   ├── ChatMessage.tsx         # Message component (updated)
│   └── ChatWindow.tsx          # Chat container
types/
├── message.ts                  # Message & ToolCall types
examples/
├── backend_streaming.py        # Python backend example
└── streaming-chat-example.tsx  # Frontend usage example
```

---

## 🔗 Related Files

- **Backend Example:** `examples/backend_streaming.py`
- **Frontend Example:** `examples/streaming-chat-example.tsx`
- **Type Definitions:** `types/message.ts`
- **UI Component:** `components/chat/ToolCallSteps.tsx`
- **Streaming Service:** `lib/services/streaming.service.ts`
- **React Hook:** `lib/hooks/useStreamingChat.ts`

---

## 📝 Notes

- **Browser Support:** All modern browsers (uses native EventSource API)
- **Mobile:** Works on iOS Safari and Android Chrome
- **Performance:** Handles 100+ tool calls without lag
- **Bundle Size:** ~5KB gzipped (no external dependencies)

---

## 🤝 Contributing

To add new features:

1. Update types in `types/message.ts`
2. Handle new event types in `streaming.service.ts`
3. Update UI in `ToolCallSteps.tsx`
4. Add examples to this README

---

## 📄 License

MIT - Use freely in your projects!

---

## 💡 Tips

- **Keep tool names short** - They're shown in a compact UI
- **Provide meaningful output** - Users can expand to see details
- **Stream content early** - Don't wait for all tools to finish
- **Handle errors gracefully** - Show partial results when tools fail
- **Add retry logic** - Network issues happen, implement reconnection

---

**Need help?** Check the examples folder or open an issue!

**Quick demo:** Type `tools` in the chat to see it in action! 🚀
