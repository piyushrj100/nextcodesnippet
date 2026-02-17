import { apiClient } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import {
  RAGQueryRequest,
  RAGQueryResponse,
  StreamChunk,
  DocumentUploadRequest,
  DocumentUploadResponse,
  ConversationSaveRequest,
  PageIndexTreeResponse,
} from '@/types/api';

export class RAGService {
  // ==================================================================
  // RAG Query
  // ==================================================================

  /**
   * Send a query to the RAG system (non-streaming).
   * Backend internally calls PageIndex Chat API, parses citations,
   * and returns normalized response with sources.
   */
  async query(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    return apiClient.post<RAGQueryResponse>(API_ENDPOINTS.query, request);
  }

  /**
   * Stream a query response (SSE).
   * 
   * PageIndex streaming events:
   *   - tool_start: PageIndex is searching the document tree
   *   - tool_result: PageIndex found relevant content
   *   - token: Answer text token
   *   - source: Document source (sent after streaming completes)
   *   - done: Stream finished
   */
  async *streamQuery(request: RAGQueryRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const stream = apiClient.stream(API_ENDPOINTS.streamQuery, request);

    for await (const data of stream) {
      try {
        const chunk: StreamChunk = JSON.parse(data);
        yield chunk;
      } catch (error) {
        console.error('Failed to parse stream chunk:', error);
      }
    }
  }

  // ==================================================================
  // Document Management (PageIndex-backed)
  // ==================================================================

  /**
   * Upload a document for PageIndex tree generation.
   * PageIndex processes async — poll status until "completed".
   */
  async uploadDocuments(request: DocumentUploadRequest): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    
    request.files.forEach((file) => {
      formData.append('files', file);
    });

    if (request.metadata) {
      formData.append('metadata', JSON.stringify(request.metadata));
    }

    return apiClient.postFormData<DocumentUploadResponse>(
      API_ENDPOINTS.uploadDocument,
      formData
    );
  }

  /**
   * Check document processing status.
   * Returns "queued" | "processing" | "completed" | "failed".
   * Frontend should poll this until status is "completed" before querying.
   */
  async getDocumentStatus(docId: string): Promise<{
    id: string;
    name: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    pages?: number;
  }> {
    const endpoint = API_ENDPOINTS.documentStatus.replace(':id', docId);
    return apiClient.get(endpoint);
  }

  /**
   * Get the PageIndex tree structure for a document.
   * The tree contains: node_id, title, page_index, text, summary, prefix_summary, nodes[]
   * Can be used for tree visualization or direct tree-search approach.
   */
  async getDocumentTree(docId: string): Promise<PageIndexTreeResponse> {
    const endpoint = API_ENDPOINTS.documentTree.replace(':id', docId);
    return apiClient.get(endpoint);
  }

  /**
   * List all uploaded documents.
   */
  async listDocuments(): Promise<any[]> {
    return apiClient.get(API_ENDPOINTS.listDocuments);
  }

  /**
   * Delete a document from PageIndex.
   */
  async deleteDocument(documentId: string): Promise<void> {
    const endpoint = API_ENDPOINTS.deleteDocument.replace(':id', documentId);
    return apiClient.delete(endpoint);
  }

  // ==================================================================
  // Conversations
  // ==================================================================

  async saveConversation(request: ConversationSaveRequest): Promise<{ id: string }> {
    return apiClient.post(API_ENDPOINTS.saveConversation, request);
  }

  async getConversations(): Promise<any[]> {
    return apiClient.get(API_ENDPOINTS.getConversations);
  }

  async getConversation(conversationId: string): Promise<any> {
    const endpoint = API_ENDPOINTS.getConversation.replace(':id', conversationId);
    return apiClient.get(endpoint);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const endpoint = API_ENDPOINTS.deleteConversation.replace(':id', conversationId);
    return apiClient.delete(endpoint);
  }
}

// Singleton instance
export const ragService = new RAGService();
