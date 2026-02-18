/**
 * Example: How to integrate streaming chat with tool calls
 * 
 * This file shows how to use the useStreamingChat hook to display
 * tool calling steps in your chat UI.
 * 
 * Copy the relevant parts into your page.tsx to enable real backend streaming.
 */

'use client';

import { useState, useEffect } from 'react';
import ChatWindow from '@/components/chat/ChatWindow';
import ChatInput from '@/components/chat/ChatInput';
import { Message } from '@/components/chat/ChatMessage';
import { useStreamingChat } from '@/lib/hooks/useStreamingChat';

export default function StreamingChatExample() {
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Initialize the streaming chat hook
  const { 
    sendMessage, 
    currentMessage, 
    isStreaming, 
    error,
    abort 
  } = useStreamingChat({
    endpoint: '/api/chat', // Your backend endpoint
    onMessageComplete: (message) => {
      // Add completed message to the list
      // (currentMessage is already showing it, this finalizes it)
    },
  });

  // Combine completed messages with the current streaming message
  const displayMessages = currentMessage 
    ? [...messages, currentMessage]
    : messages;

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Start streaming response
    await sendMessage(content);
    
    // When complete, finalize the message
    if (currentMessage) {
      setMessages(prev => [...prev, currentMessage]);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <ChatWindow 
        messages={displayMessages} 
        isTyping={isStreaming && (!currentMessage?.content)} 
      />
      
      {error && (
        <div className="bg-red-500/10 text-red-400 px-4 py-2 text-sm">
          Error: {error.message}
        </div>
      )}
      
      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={isStreaming}
      />
      
      {isStreaming && (
        <button 
          onClick={abort}
          className="absolute bottom-20 right-4 px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm"
        >
          Stop generating
        </button>
      )}
    </div>
  );
}


/**
 * ============================================
 * INTEGRATION GUIDE
 * ============================================
 * 
 * 1. BACKEND REQUIREMENTS
 *    Your backend needs to send Server-Sent Events (SSE) in this format:
 * 
 *    data: {"type": "tool_start", "data": {"tool_call_id": "123", "tool_name": "search", "input": {...}}}
 *    data: {"type": "tool_end", "data": {"tool_call_id": "123", "output": "Found 3 results"}}
 *    data: {"type": "content_delta", "data": {"delta": "Here is "}}
 *    data: {"type": "content_delta", "data": {"delta": "the answer..."}}
 *    data: {"type": "sources", "data": {"sources": [...]}}
 *    data: {"type": "content_done", "data": {"content": "Full response text"}}
 *    data: [DONE]
 * 
 * 2. SUPPORTED EVENT TYPES
 *    - tool_start: Tool begins execution (shows spinner)
 *    - tool_end: Tool completes (shows checkmark)
 *    - tool_error: Tool failed (shows X icon)
 *    - content_delta: Streaming text chunk
 *    - content_done: Final complete content
 *    - sources: RAG source documents
 * 
 * 3. TOOL CALL OBJECT STRUCTURE
 *    {
 *      id: string,           // Unique ID
 *      name: string,         // Tool name (e.g., "search_documents")
 *      status: 'pending' | 'running' | 'completed' | 'error',
 *      input?: object,       // Tool input parameters
 *      output?: string,      // Tool result
 *      error?: string,       // Error message if failed
 *      startTime?: Date,     // When tool started
 *      endTime?: Date,       // When tool finished
 *    }
 * 
 * 4. COMMON TOOL NAMES (automatically formatted in UI)
 *    - search_documents → "Searching documents"
 *    - retrieve_context → "Retrieving context"  
 *    - analyze_content → "Analyzing content"
 *    - generate_summary → "Generating summary"
 *    - fetch_data → "Fetching data"
 *    (Custom names are auto-formatted: my_custom_tool → "My Custom Tool")
 * 
 * 5. EXAMPLE PYTHON BACKEND
 *    See: examples/backend_streaming.py
 */
