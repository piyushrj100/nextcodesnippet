'use client';

import { useState, useCallback } from 'react';
import { ragService } from '../services/rag.service';
import { RAGQueryRequest, RAGQueryResponse } from '@/types/api';
import { Message } from '@/components/chat/ChatMessage';

interface UseRAGQueryOptions {
  onSuccess?: (response: RAGQueryResponse) => void;
  onError?: (error: any) => void;
}

export function useRAGQuery(options?: UseRAGQueryOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(
    async (request: RAGQueryRequest): Promise<RAGQueryResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await ragService.query(request);
        options?.onSuccess?.(response);
        return response;
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to query RAG system';
        setError(errorMessage);
        options?.onError?.(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  return { query, isLoading, error };
}

/**
 * Hook for streaming RAG queries with PageIndex SSE support.
 * 
 * Handles PageIndex-specific streaming events:
 *   - tool_start: "Searching document..." (PageIndex traversing tree)
 *   - tool_result: "Found relevant content" (PageIndex located sections)
 *   - token: Answer text
 *   - source: Document source with nodeId, title, pageIndex, highlights
 *   - done: Stream complete
 */
interface UseRAGStreamOptions {
  onToken?: (token: string) => void;
  onSource?: (source: any) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onToolStart?: (metadata: { toolName: string; type: string }) => void;
  onToolResult?: (metadata: { type: string }) => void;
}

export function useRAGStream(options?: UseRAGStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSearching, setIsSearching] = useState(false); // PageIndex tree search phase
  const [error, setError] = useState<string | null>(null);
  const [accumulatedText, setAccumulatedText] = useState('');

  const streamQuery = useCallback(
    async (request: RAGQueryRequest) => {
      setIsStreaming(true);
      setIsSearching(false);
      setError(null);
      setAccumulatedText('');

      try {
        for await (const chunk of ragService.streamQuery(request)) {
          switch (chunk.type) {
            case 'token':
              if (chunk.content) {
                setIsSearching(false); // Search phase is done once tokens arrive
                setAccumulatedText((prev) => prev + chunk.content);
                options?.onToken?.(chunk.content);
              }
              break;
            case 'source':
              if (chunk.source) {
                options?.onSource?.(chunk.source);
              }
              break;
            case 'tool_start':
              // PageIndex is searching the document tree
              setIsSearching(true);
              options?.onToolStart?.(chunk.metadata as any);
              break;
            case 'tool_result':
              // PageIndex found relevant content
              options?.onToolResult?.(chunk.metadata as any);
              break;
            case 'done':
              options?.onComplete?.();
              break;
            case 'error':
              throw new Error(chunk.error || 'Stream error');
          }
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to stream query';
        setError(errorMessage);
        options?.onError?.(errorMessage);
      } finally {
        setIsStreaming(false);
        setIsSearching(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setAccumulatedText('');
    setError(null);
    setIsSearching(false);
  }, []);

  return { streamQuery, isStreaming, isSearching, error, accumulatedText, reset };
}

/**
 * Hook for managing chat messages with PageIndex RAG.
 */
interface UseChatOptions {
  useStreaming?: boolean;
  conversationId?: string;
  docId?: string | string[]; // PageIndex document ID(s) to query against
  enableCitations?: boolean;
}

export function useChat(options?: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchingDoc, setIsSearchingDoc] = useState(false);

  const { query } = useRAGQuery();
  const { streamQuery, isStreaming, isSearching, accumulatedText, reset } = useRAGStream({
    onToken: (token) => {
      // Update the last message with streaming content
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content += token;
        }
        return newMessages;
      });
    },
    onToolStart: () => {
      setIsSearchingDoc(true);
    },
    onToolResult: () => {
      setIsSearchingDoc(false);
    },
    onSource: (source) => {
      // Add source to the last assistant message
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          if (!lastMessage.sources) lastMessage.sources = [];
          lastMessage.sources.push(source);
        }
        return newMessages;
      });
    },
  });

  const sendMessage = useCallback(
    async (content: string, files?: File[]) => {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      try {
        const request: RAGQueryRequest = {
          query: content,
          conversationId: options?.conversationId,
          docId: options?.docId,
          enableCitations: options?.enableCitations ?? true,
          files,
        };

        if (options?.useStreaming) {
          // Create placeholder for assistant message
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Stream the response — sources arrive via onSource callback
          await streamQuery(request);
        } else {
          // Regular query
          const response = await query(request);
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
        }
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setIsProcessing(false);
        setIsSearchingDoc(false);
      }
    },
    [options, query, streamQuery]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    reset();
  }, [reset]);

  return {
    messages,
    sendMessage,
    clearMessages,
    isProcessing: isProcessing || isStreaming,
    isSearchingDoc: isSearchingDoc || isSearching,
  };
}
