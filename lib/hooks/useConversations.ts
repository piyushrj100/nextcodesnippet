'use client';

import { useState, useCallback, useEffect } from 'react';
import { ragService } from '../services/rag.service';
import { ConversationSaveRequest } from '@/types/api';
import { Conversation } from '@/components/layout/Sidebar';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const convs = await ragService.getConversations();
      setConversations(convs);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveConversation = useCallback(async (request: ConversationSaveRequest) => {
    try {
      const response = await ragService.saveConversation(request);
      await fetchConversations(); // Refresh list
      return response;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save conversation');
    }
  }, [fetchConversations]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await ragService.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete conversation');
    }
  }, []);

  const getConversation = useCallback(async (conversationId: string) => {
    try {
      return await ragService.getConversation(conversationId);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to get conversation');
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    fetchConversations,
    saveConversation,
    deleteConversation,
    getConversation,
    isLoading,
    error,
  };
}
