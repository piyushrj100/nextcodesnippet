export interface DocumentSource {
  // Core identification
  id: string;
  documentName: string;

  // PageIndex tree fields
  nodeId?: string; // PageIndex tree node_id (e.g., "0006")
  title?: string; // Section title from PageIndex tree (e.g., "Financial Stability")
  pageIndex: number; // Starting page number (1-based), replaces pageNumber
  endPageIndex?: number; // Ending page of the section (from node mapping)
  summary?: string; // LLM-generated section summary from PageIndex
  prefixSummary?: string; // Markdown-formatted summary with heading prefix

  // Content
  content: string; // Full section text (PageIndex returns whole sections, not chunks)

  // Backend-enriched fields
  citationNumber?: number; // Assigned by backend for [1], [2], [3] inline references
  highlights?: HighlightRegion[]; // Optional: backend can extract via keyword matching
  score?: number; // Optional: only if backend computes relevance ranking

  // Legacy compatibility alias
  /** @deprecated Use pageIndex instead */
  pageNumber?: number;
}

export interface HighlightRegion {
  text: string;
  startOffset: number;
  endOffset: number;
}

// PageIndex citation format: <doc=filename.pdf;page=42>
export interface PageIndexCitation {
  documentName: string;
  pageNumber: number;
  raw: string; // Original citation string
}

export interface MessageWithSources extends Message {
  sources?: DocumentSource[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: DocumentSource[];
  toolCalls?: ToolCall[];
}

// Tool Call types for showing LLM tool usage steps
export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  input?: Record<string, unknown>;
  output?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}
