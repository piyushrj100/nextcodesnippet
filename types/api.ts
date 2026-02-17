import { DocumentSource, PageIndexCitation } from '@/types/message';

// RAG Query Request
export interface RAGQueryRequest {
  query: string;
  conversationId?: string;
  docId?: string | string[]; // PageIndex document ID(s)
  maxSources?: number;
  files?: File[];
  enableCitations?: boolean; // PageIndex enable_citations flag
}

// RAG Query Response
export interface RAGQueryResponse {
  answer: string;
  sources: DocumentSource[];
  conversationId?: string;
  metadata?: {
    processingTime: number;
    model: string;
    tokensUsed?: number;
    // PageIndex-specific metadata
    nodesTraversed?: number;
    retrievalMethod?: 'pageindex' | 'vector' | 'hybrid';
  };
}

// Stream Response Chunk (updated for PageIndex SSE format)
export interface StreamChunk {
  type: 'token' | 'source' | 'done' | 'error' | 'tool_start' | 'tool_result';
  content?: string;
  source?: DocumentSource;
  error?: string;
  // PageIndex streaming metadata
  metadata?: {
    type?: string; // 'mcp_tool_use_start' | 'mcp_tool_result_start' | 'text_block_start' etc.
    toolName?: string;
    blockIndex?: number;
  };
}

// PageIndex-specific: Chat completions request (matches PageIndex Chat API)
export interface PageIndexChatRequest {
  messages: Array<{ role: string; content: string }>;
  doc_id?: string | string[];
  stream?: boolean;
  stream_metadata?: boolean;
  enable_citations?: boolean;
  temperature?: number;
}

// PageIndex-specific: Chat completions response
export interface PageIndexChatResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// PageIndex-specific: Tree node structure (matches cookbook output exactly)
export interface PageIndexTreeNode {
  node_id: string;
  title: string;
  page_index: number;
  text: string;
  summary?: string;
  prefix_summary?: string; // Markdown-formatted summary with heading prefixes
  nodes?: PageIndexTreeNode[]; // child nodes (recursive)
}

// Flattened node from utils.create_node_mapping(tree, include_page_ranges=True)
export interface PageIndexNodeMapEntry {
  node: PageIndexTreeNode;
  start_index: number; // first page of this section
  end_index: number; // last page of this section
}

// PageIndex-specific: Tree response
export interface PageIndexTreeResponse {
  doc_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  retrieval_ready?: boolean;
  result?: PageIndexTreeNode[];
}

// PageIndex Tree Search: LLM's response when reasoning over the tree
export interface PageIndexTreeSearchResult {
  thinking: string; // LLM reasoning about which nodes to pick
  node_list: string[]; // Array of node_id strings (e.g., ["0006", "0007"])
}

// Document Upload Request
export interface DocumentUploadRequest {
  files: File[];
  metadata?: {
    tags?: string[];
    description?: string;
  };
}

// Document Upload Response (updated for PageIndex)
export interface DocumentUploadResponse {
  success: boolean;
  documents: Array<{
    id: string; // PageIndex doc_id (e.g., "pi-abc123def456")
    name: string;
    pages?: number;
    status: 'queued' | 'processing' | 'completed' | 'failed';
  }>;
}

// Conversation Save Request
export interface ConversationSaveRequest {
  id?: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    sources?: DocumentSource[];
    timestamp: string;
  }>;
}

// API Error Response
export interface APIError {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}
