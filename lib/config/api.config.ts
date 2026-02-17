// API Configuration
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 60000, // 60 seconds (PageIndex tree search + answer generation can take time)
  headers: {
    'Content-Type': 'application/json',
  },
};

// PageIndex API Configuration (direct PageIndex API calls, if needed)
export const PAGEINDEX_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_PAGEINDEX_URL || 'https://api.pageindex.ai',
  apiKey: process.env.NEXT_PUBLIC_PAGEINDEX_API_KEY || '',
};

// API Endpoints (your backend wraps PageIndex)
export const API_ENDPOINTS = {
  // RAG query endpoints
  query: '/api/rag/query',
  streamQuery: '/api/rag/stream',

  // Document endpoints (PageIndex-backed)
  uploadDocument: '/api/documents/upload',
  listDocuments: '/api/documents',
  getDocument: '/api/documents/:id',
  deleteDocument: '/api/documents/:id',
  documentStatus: '/api/documents/:id/status', // Poll until "completed"
  documentTree: '/api/documents/:id/tree', // Get PageIndex tree structure

  // Conversation endpoints
  saveConversation: '/api/conversations',
  getConversations: '/api/conversations',
  getConversation: '/api/conversations/:id',
  deleteConversation: '/api/conversations/:id',
};
