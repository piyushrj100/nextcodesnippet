import { useState, useCallback, useRef } from 'react';
import { Message } from '@/components/chat/ChatMessage';
import { ToolCall, DocumentSource } from '@/types/message';
import {
  streamChatResponse,
  createToolCallFromEvent,
  updateToolCallCompleted,
  updateToolCallError,
} from '@/lib/services/streaming.service';

interface UseStreamingChatOptions {
  endpoint: string;
  onMessageComplete?: (message: Message) => void;
}

interface UseStreamingChatReturn {
  sendMessage: (content: string, conversationId?: string) => Promise<void>;
  currentMessage: Message | null;
  isStreaming: boolean;
  error: Error | null;
  abort: () => void;
}

/**
 * Hook for handling streaming chat responses with tool call UI updates
 * 
 * Usage:
 * ```tsx
 * const { sendMessage, currentMessage, isStreaming } = useStreamingChat({
 *   endpoint: '/api/chat',
 *   onMessageComplete: (msg) => setMessages(prev => [...prev, msg])
 * });
 * ```
 */
export function useStreamingChat({
  endpoint,
  onMessageComplete,
}: UseStreamingChatOptions): UseStreamingChatReturn {
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async (content: string, conversationId?: string) => {
    // Reset state
    setError(null);
    setIsStreaming(true);
    
    // Create abort controller
    abortControllerRef.current = new AbortController();

    // Initialize empty assistant message
    const messageId = Date.now().toString();
    const initialMessage: Message = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolCalls: [],
      sources: [],
    };
    setCurrentMessage(initialMessage);

    // Track state for updates
    let toolCalls: ToolCall[] = [];
    let contentBuffer = '';
    let sources: DocumentSource[] = [];

    try {
      await streamChatResponse(
        endpoint,
        content,
        conversationId,
        {
          onToolStart: (toolCallId, toolName, input) => {
            const newToolCall = createToolCallFromEvent(toolCallId, toolName, input);
            toolCalls = [...toolCalls, newToolCall];
            setCurrentMessage(prev => prev ? { ...prev, toolCalls: [...toolCalls] } : prev);
          },

          onToolEnd: (toolCallId, output) => {
            toolCalls = updateToolCallCompleted(toolCalls, toolCallId, output);
            setCurrentMessage(prev => prev ? { ...prev, toolCalls: [...toolCalls] } : prev);
          },

          onToolError: (toolCallId, errorMsg) => {
            toolCalls = updateToolCallError(toolCalls, toolCallId, errorMsg);
            setCurrentMessage(prev => prev ? { ...prev, toolCalls: [...toolCalls] } : prev);
          },

          onContentDelta: (delta) => {
            contentBuffer += delta;
            setCurrentMessage(prev => prev ? { ...prev, content: contentBuffer } : prev);
          },

          onContentDone: (finalContent) => {
            contentBuffer = finalContent;
            setCurrentMessage(prev => prev ? { ...prev, content: finalContent } : prev);
          },

          onSources: (newSources) => {
            sources = newSources;
            setCurrentMessage(prev => prev ? { ...prev, sources: newSources } : prev);
          },

          onComplete: () => {
            const finalMessage: Message = {
              id: messageId,
              role: 'assistant',
              content: contentBuffer,
              timestamp: new Date(),
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
              sources: sources.length > 0 ? sources : undefined,
            };
            setCurrentMessage(finalMessage);
            onMessageComplete?.(finalMessage);
            setIsStreaming(false);
          },

          onError: (err) => {
            setError(err);
            setIsStreaming(false);
          },
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
      setIsStreaming(false);
    }
  }, [endpoint, onMessageComplete]);

  return {
    sendMessage,
    currentMessage,
    isStreaming,
    error,
    abort,
  };
}
