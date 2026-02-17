# Understanding Highlights in RAG Systems

## Quick Reference

### What highlights contain:
```typescript
highlights: [
  {
    text: "The exact sentence or phrase relevant to the query",
    startOffset: 145,  // Character position where it starts in full chunk
    endOffset: 213     // Character position where it ends in full chunk
  }
]
```

### Example with actual data:

**Full chunk text:**
```
"The authentication system is designed for security. It uses JWT tokens for 
stateless authentication. Each token contains user claims. The tokens are 
signed with a secret key to prevent tampering."
```

**Query:** "How are JWT tokens used?"

**Extracted highlights:**
```json
[
  {
    "text": "It uses JWT tokens for stateless authentication.",
    "startOffset": 52,
    "endOffset": 100
  },
  {
    "text": "Each token contains user claims.",
    "startOffset": 101,
    "endOffset": 133
  }
]
```

### How the frontend uses this:

```typescript
// In DocumentViewer.tsx or MarkdownRenderer
const renderWithHighlights = (content: string, highlights: Highlight[]) => {
  let lastIndex = 0;
  const parts = [];
  
  // Sort highlights by position
  const sorted = highlights.sort((a, b) => a.startOffset - b.startOffset);
  
  sorted.forEach((highlight, idx) => {
    // Add text before highlight
    if (highlight.startOffset > lastIndex) {
      parts.push(
        <span key={`text-${idx}`}>
          {content.substring(lastIndex, highlight.startOffset)}
        </span>
      );
    }
    
    // Add highlighted text with yellow background
    parts.push(
      <mark key={`highlight-${idx}`} className="bg-yellow-200 dark:bg-yellow-600/40">
        {content.substring(highlight.startOffset, highlight.endOffset)}
      </mark>
    );
    
    lastIndex = highlight.endOffset;
  });
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(<span key="end">{content.substring(lastIndex)}</span>);
  }
  
  return <>{parts}</>;
};
```

## Visual Example

### Before Highlights:
```
The authentication system is designed for security. It uses JWT tokens for 
stateless authentication. Each token contains user claims. The tokens are 
signed with a secret key to prevent tampering.
```

### After Highlights (Yellow background):
```
The authentication system is designed for security. ⚡It uses JWT tokens for 
stateless authentication.⚡ ⚡Each token contains user claims.⚡ The tokens are 
signed with a secret key to prevent tampering.
```
(⚡ = yellow highlight in actual UI)

## Complete Data Flow

```
1. User Query
   ↓
2. Backend: Vector Search
   → Retrieves relevant chunks
   ↓
3. Backend: Highlight Extraction
   → Finds exact sentences within chunks
   → Calculates character positions
   ↓
4. Backend Response
   → Returns chunks with highlights
   ↓
5. Frontend: Render
   → Shows highlights in yellow
   → Makes them clickable
   ↓
6. User clicks highlight
   → Opens document viewer
   → Scrolls to highlighted section
```

## Key Takeaways

1. **Highlights are extracted ON THE BACKEND** using semantic similarity
2. **startOffset/endOffset** are character positions in the chunk text
3. **Frontend just renders** the highlights - no extraction needed
4. **Multiple highlights per chunk** are common
5. **Highlights should be complete sentences** for better UX
