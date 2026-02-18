import { ToolCall } from '@/types/message';
import { DocumentSource } from '@/types/message';

// Types for streaming responses
export interface StreamEvent {
  type: 'tool_start' | 'tool_end' | 'tool_error' | 'content_delta' | 'content_done' | 'sources';
  data: ToolStartEvent | ToolEndEvent | ToolErrorEvent | ContentDeltaEvent | ContentDoneEvent | SourcesEvent;
}

export interface ToolStartEvent {
  tool_call_id: string;
  tool_name: string;
  input?: Record<string, unknown>;
}

export interface ToolEndEvent {
  tool_call_id: string;
  output?: string;
}

export interface ToolErrorEvent {
  tool_call_id: string;
  error: string;
}

export interface ContentDeltaEvent {
  delta: string; // Incremental text chunk
}

export interface ContentDoneEvent {
  content: string; // Final full content
}

export interface SourcesEvent {
  sources: DocumentSource[];
}

// Callback types for handling stream events
export interface StreamCallbacks {
  onToolStart?: (toolCallId: string, toolName: string, input?: Record<string, unknown>) => void;
  onToolEnd?: (toolCallId: string, output?: string) => void;
  onToolError?: (toolCallId: string, error: string) => void;
  onContentDelta?: (delta: string) => void;
  onContentDone?: (content: string) => void;
  onSources?: (sources: DocumentSource[]) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

/**
 * Stream a chat response from the backend using Server-Sent Events
 * 
 * Backend should send events in this format:
 * data: {"type": "tool_start", "data": {"tool_call_id": "1", "tool_name": "search_documents", "input": {...}}}
 * data: {"type": "tool_end", "data": {"tool_call_id": "1", "output": "Found 3 documents"}}
 * data: {"type": "content_delta", "data": {"delta": "Here is "}}
 * data: {"type": "content_delta", "data": {"delta": "the response..."}}
 * data: {"type": "sources", "data": {"sources": [...]}}
 * data: {"type": "content_done", "data": {"content": "Here is the full response..."}}
 * data: [DONE]
 */
export async function streamChatResponse(
  endpoint: string,
  message: string,
  conversationId?: string,
  callbacks?: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
    }),
    signal: abortSignal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        callbacks?.onComplete?.();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          if (data === '[DONE]') {
            callbacks?.onComplete?.();
            return;
          }

          try {
            const event: StreamEvent = JSON.parse(data);
            handleStreamEvent(event, callbacks);
          } catch (e) {
            console.warn('Failed to parse SSE event:', data, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function handleStreamEvent(event: StreamEvent, callbacks?: StreamCallbacks) {
  switch (event.type) {
    case 'tool_start': {
      const data = event.data as ToolStartEvent;
      callbacks?.onToolStart?.(data.tool_call_id, data.tool_name, data.input);
      break;
    }
    case 'tool_end': {
      const data = event.data as ToolEndEvent;
      callbacks?.onToolEnd?.(data.tool_call_id, data.output);
      break;
    }
    case 'tool_error': {
      const data = event.data as ToolErrorEvent;
      callbacks?.onToolError?.(data.tool_call_id, data.error);
      break;
    }
    case 'content_delta': {
      const data = event.data as ContentDeltaEvent;
      callbacks?.onContentDelta?.(data.delta);
      break;
    }
    case 'content_done': {
      const data = event.data as ContentDoneEvent;
      callbacks?.onContentDone?.(data.content);
      break;
    }
    case 'sources': {
      const data = event.data as SourcesEvent;
      callbacks?.onSources?.(data.sources);
      break;
    }
  }
}

/**
 * Helper to create/update tool calls array based on stream events
 */
export function createToolCallFromEvent(
  toolCallId: string,
  toolName: string,
  input?: Record<string, unknown>
): ToolCall {
  return {
    id: toolCallId,
    name: toolName,
    status: 'running',
    input,
    startTime: new Date(),
  };
}

export function updateToolCallCompleted(
  toolCalls: ToolCall[],
  toolCallId: string,
  output?: string
): ToolCall[] {
  return toolCalls.map(tc =>
    tc.id === toolCallId
      ? { ...tc, status: 'completed' as const, output, endTime: new Date() }
      : tc
  );
}

export function updateToolCallError(
  toolCalls: ToolCall[],
  toolCallId: string,
  error: string
): ToolCall[] {
  return toolCalls.map(tc =>
    tc.id === toolCallId
      ? { ...tc, status: 'error' as const, error, endTime: new Date() }
      : tc
  );
}
