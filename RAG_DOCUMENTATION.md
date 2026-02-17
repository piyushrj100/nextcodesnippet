# RAG Document Annotation System

## Overview

This RAG (Retrieval-Augmented Generation) app includes a complete document annotation and source citation system. The frontend components support:

- **Source Citations**: Display referenced documents with relevance scores
- **Document Highlighting**: Highlight specific text sections from source documents
- **Multi-Page Navigation**: Navigate through multiple document sources
- **Interactive Document Viewer**: Modal viewer with full document content and highlights

## Components

### 1. **SourceCitation Component**
Location: `/components/document/SourceCitation.tsx`

Displays source documents below AI responses with:
- Collapsible source cards
- Document name and page number
- Relevance score (0-100%)
- Highlighted text excerpts
- "View in document" button to open full viewer

**Usage:**
```tsx
<SourceCitation 
  sources={documentSources} 
  onSourceClick={handleSourceClick} 
/>
```

### 2. **DocumentViewer Component**
Location: `/components/document/DocumentViewer.tsx`

Full-screen modal for viewing document sources with:
- Complete document content
- Yellow highlighting for relevant sections
- Navigation between multiple sources
- Highlighted sections summary
- Document metadata (ID, page, relevance)

**Usage:**
```tsx
{selectedSources && (
  <DocumentViewer
    sources={selectedSources}
    initialSourceIndex={0}
    onClose={() => setSelectedSources(null)}
  />
)}
```

### 3. **Type Definitions**
Location: `/types/message.ts`

```typescript
interface DocumentSource {
  id: string;
  documentName: string;
  pageNumber: number;
  content: string;
  score?: number;
  highlights?: HighlightRegion[];
}

interface HighlightRegion {
  text: string;
  startOffset: number;
  endOffset: number;
}
```

## Features

### Source Citation Display
- **Numbered badges** (1, 2, 3...) for each source
- **Expandable cards** to view content previews
- **Relevance scores** showing how well the source matches the query
- **Yellow highlighting** for exact matched text

### Document Viewer
- **Full-screen modal** for immersive reading
- **Multi-source navigation** with Previous/Next buttons
- **Counter display** (e.g., "2 of 5")
- **Inline highlights** with yellow background
- **Highlights summary** section at the bottom

### Interactive Features
- Click source citation to open full document
- Navigate between multiple sources in viewer
- Expand/collapse source previews
- Hover effects on interactive elements

## Integration with Backend

### Expected Data Format

When your RAG backend returns results, format them as:

```typescript
{
  answer: "AI generated response...",
  sources: [
    {
      id: "doc_123_page_42",
      documentName: "Technical Documentation.pdf",
      pageNumber: 42,
      content: "Full text content of the relevant section...",
      score: 0.92, // Relevance score 0-1
      highlights: [
        {
          text: "the exact matched phrase",
          startOffset: 145,
          endOffset: 169
        }
      ]
    }
  ]
}
```

### Backend Integration Points

1. **Vector Search Results**: Your vector DB returns similar chunks
2. **Reranking**: Calculate relevance scores (cosine similarity, etc.)
3. **Highlight Extraction**: Identify specific text spans that match the query
4. **Metadata Enrichment**: Add document names, page numbers, IDs

## Example Usage in Page

```typescript
const handleSendMessage = async (content: string) => {
  // 1. Send query to backend
  const response = await fetch('/api/rag/query', {
    method: 'POST',
    body: JSON.stringify({ query: content })
  });
  
  const data = await response.json();
  
  // 2. Create message with sources
  const assistantMessage: Message = {
    id: generateId(),
    role: 'assistant',
    content: data.answer,
    timestamp: new Date(),
    sources: data.sources // Backend provides this
  };
  
  setMessages(prev => [...prev, assistantMessage]);
};
```

## Styling

### Theme Support
- Full dark mode support
- Yellow highlights (`bg-yellow-200` / `bg-yellow-600/40`)
- Smooth transitions and hover effects

### Responsive Design
- Modal is responsive (90vh height)
- Source cards adapt to screen size
- Works on mobile and desktop

## Advanced Features

### Multi-Document Support
The system handles multiple documents per response:
- Navigate with Previous/Next buttons
- Each source maintains its own highlights
- Counter shows current position

### Highlight Rendering
Intelligent text highlighting:
- Multiple highlights per document
- Non-overlapping regions
- Preserves original text formatting
- Yellow background with proper contrast

### User Experience
- **Expandable sources**: Click to see preview
- **External link icon**: Visual indicator for opening full view
- **Smooth animations**: Transitions and hover states
- **Keyboard accessible**: Focus states on interactive elements

## Future Enhancements

Potential additions for your RAG system:

1. **PDF Rendering**: Use `react-pdf` to show actual PDF pages
2. **Image Support**: Display images from documents
3. **Citation Export**: Copy citations in various formats
4. **Bookmark Sources**: Save useful sources for later
5. **Search Within Source**: Find text within the document viewer
6. **Side-by-side View**: Show chat and document simultaneously
7. **Annotation Tools**: Allow users to add their own highlights/notes

## API Example

Here's how your backend might structure the response:

```python
# Backend example (Python/FastAPI)
@app.post("/api/rag/query")
async def query(request: QueryRequest):
    # 1. Embed query
    query_embedding = embed_text(request.query)
    
    # 2. Vector search
    results = vector_db.similarity_search(
        query_embedding, 
        k=5
    )
    
    # 3. Rerank and extract highlights
    sources = []
    for result in results:
        highlights = extract_highlights(
            text=result.content,
            query=request.query
        )
        sources.append({
            "id": result.id,
            "documentName": result.metadata["filename"],
            "pageNumber": result.metadata["page"],
            "content": result.content,
            "score": result.score,
            "highlights": highlights
        })
    
    # 4. Generate answer with LLM
    answer = llm.generate(
        query=request.query,
        context="\n\n".join([s["content"] for s in sources])
    )
    
    return {
        "answer": answer,
        "sources": sources
    }
```

## Testing the Feature

Try asking questions like:
- "What does the documentation say about X?"
- "How do I implement Y according to the guide?"
- "Where is Z mentioned in the manual?"

Each response will show sources with highlights automatically! 🎉
