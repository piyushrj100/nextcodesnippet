# PageIndex Integration Analysis – Deep Dive

## 🔍 What I Found After Analyzing PageIndex

After thoroughly studying the PageIndex GitHub repo, HN discussion, SDK docs, API endpoints, blog post, and tutorials, here's the complete picture and what it means for our app.

---

## 1. PageIndex Is FUNDAMENTALLY Different from Vector DB RAG

### What We Assumed (Vector DB RAG):
```
User Query → Embed Query → Search Vector DB → Get Chunks → LLM Generates Answer
```

### What PageIndex Actually Does:
```
PDF Upload → PageIndex Builds Hierarchical Tree (ToC) → Tree is Stored
User Query → LLM Reads Tree → LLM "Reasons" Which Section to Check → 
  Reads Section Content → Decides If Enough → If No, Goes Back to Tree → 
  Repeat Until Sufficient → LLM Generates Answer with Section References
```

### Key Difference:
- **No vector DB** - No Qdrant, Pinecone, Chroma
- **No embeddings** - No sentence-transformers, no cosine_similarity
- **No chunking** - Documents are organized by natural sections (chapters, pages, paragraphs)
- **No similarity scores** - Instead, the LLM *reasons* about which section is relevant
- **Tree-based** - Document is a hierarchical JSON tree, LLM traverses it like a human reading a table of contents

---

## 2. The PageIndex Tree Structure

When you upload a PDF to PageIndex, it generates this:

```json
{
  "title": "2023 Annual Report",
  "node_id": "0001",
  "page_index": 1,
  "text": "Full text content of this section...",
  "summary": "LLM-generated summary of this section",
  "nodes": [
    {
      "title": "Financial Stability",
      "node_id": "0006",
      "page_index": 21,
      "text": "The Federal Reserve maintains financial stability...",
      "summary": "The Federal Reserve ...",
      "nodes": [
        {
          "title": "Monitoring Financial Vulnerabilities",
          "node_id": "0007",
          "page_index": 22,
          "text": "The Federal Reserve's monitoring focuses on..."
        },
        {
          "title": "Domestic and International Cooperation",
          "node_id": "0008",
          "page_index": 28,
          "text": "In 2023, the Federal Reserve collaborated..."
        }
      ]
    }
  ]
}
```

### Important Fields:
- **`node_id`**: Unique identifier (e.g., "0006") – maps to raw content
- **`title`**: Section heading (human-readable)
- **`page_index`**: The starting page number (1-based)
- **`text`**: The actual content of that section
- **`summary`**: LLM-generated summary (optional, via `node_summary=true`)
- **`nodes`**: Child sections (recursive tree)

### What This Means for `highlights`:
PageIndex doesn't return "highlights" in the way we designed. The retrieval is at the **node/section level**, not the sentence level. When the LLM finds a relevant node, it returns the **entire node's text** plus its **page_index** and **title**.

---

## 3. The PageIndex Chat API Response (What Backend Actually Returns)

PageIndex has TWO ways to use it:

### Option A: PageIndex Chat API (Recommended by them)
This is an all-in-one API where PageIndex does everything - retrieval + answer generation.

**Request:**
```json
POST https://api.pageindex.ai/chat/completions
{
  "doc_id": "pi-abc123def456",
  "messages": [{"role": "user", "content": "What are the key findings?"}],
  "stream": false,
  "enable_citations": true
}
```

**Response:**
```json
{
  "id": "chatcmpl-xyz789",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "The key findings are... <doc=report.pdf;page=42> ... and the financial stability <doc=report.pdf;page=21>"
    },
    "finish_reason": "end_turn"
  }],
  "usage": {
    "prompt_tokens": 1234,
    "completion_tokens": 567,
    "total_tokens": 1801
  }
}
```

**Key observations:**
- When `enable_citations: true`, citations appear as `<doc=filename;page=N>` inline in the text
- There is **NO separate `sources` array** in the response
- There is **NO `highlights` array** 
- There is **NO `score` field** (no similarity scores since there's no vector search)
- The answer itself contains page references embedded in the text

### Option B: Use PageIndex Tree + Your Own LLM (Self-hosted)
You fetch the tree, do your own LLM tree search, retrieve node text, and generate the answer yourself.

```python
# 1. Get the tree
tree = pi_client.get_tree(doc_id)["result"]

# 2. LLM decides which nodes are relevant
prompt = f"""
Query: {query}
Document tree structure: {tree_without_text}
Reply: {{ "thinking": "...", "node_list": [node_id1, node_id2] }}
"""

# 3. Retrieve text from selected nodes
for node_id in selected_nodes:
    node_text = find_node(tree, node_id)["text"]
    
# 4. Generate answer with your own LLM using the retrieved text
```

---

## 4. What This Means for Our Frontend (CRITICAL CHANGES)

### What We Have Now (Designed for Vector DB):
```typescript
interface DocumentSource {
  id: string;
  documentName: string;
  pageNumber: number;
  content: string;           // chunk text
  score?: number;            // cosine similarity score (0-1)
  highlights?: HighlightRegion[];  // sentence-level highlights
  citationNumber?: number;
}

interface HighlightRegion {
  text: string;
  startOffset: number;       // character position
  endOffset: number;
}
```

### What PageIndex Actually Provides:
```typescript
interface PageIndexSource {
  nodeId: string;             // "0006" - tree node ID
  title: string;              // "Financial Stability" - section title
  documentName: string;       // "2023-annual-report.pdf"
  pageIndex: number;          // 21 - starting page (1-based)
  content: string;            // Full section text (NOT a chunk)
  summary?: string;           // LLM-generated section summary
  
  // These DON'T EXIST in PageIndex:
  // score - no similarity scores
  // highlights - no sentence-level highlights
  // citationNumber - no automatic numbering
}
```

### The `highlights` Reality:
**PageIndex does NOT provide sentence-level highlights.** The retrieval granularity is at the **section/node level**, not the sentence level. When PageIndex finds relevant content, it returns the entire section text.

For highlights to exist, your backend would need to:
1. Get the retrieved section text from PageIndex
2. **Post-process** it to extract relevant sentences (using your own logic)
3. Send those as highlights to the frontend

OR, more practically:
- **Skip highlights entirely** and show the full section text
- Let the frontend do lightweight keyword highlighting based on query terms

---

## 5. Recommended Changes for Our App

### 5.1 Updated Type System

```typescript
// Updated to match PageIndex reality
interface DocumentSource {
  // Core PageIndex fields
  nodeId: string;              // PageIndex node_id
  title: string;               // Section title from tree
  documentName: string;        // PDF filename
  pageIndex: number;           // Starting page number (1-based)
  content: string;             // Full section text
  summary?: string;            // Node summary (if available)
  
  // Backend-enriched fields (your backend adds these)
  citationNumber?: number;     // Assigned by your backend for [1], [2], [3]
  highlights?: HighlightRegion[];  // Optional: backend can extract these
  
  // NOT from PageIndex but could be computed:
  // score - could be LLM confidence or relevance ranking
}

// Citation format from PageIndex Chat API
// When enable_citations=true: <doc=filename.pdf;page=42>
interface PageIndexCitation {
  documentName: string;
  pageNumber: number;
}
```

### 5.2 Two Architecture Options

#### OPTION A: Use PageIndex Chat API Directly (Simpler)
```
Frontend → Your Backend (thin proxy) → PageIndex Chat API → Response
```
- Your backend is just a proxy that forwards to PageIndex
- PageIndex handles retrieval + answer generation
- Citations come as `<doc=file;page=N>` in the text
- You need to parse these on frontend and convert to clickable citations
- **No separate sources array** - need to extract from citations

#### OPTION B: Use PageIndex Tree + Your Own LLM (More Control)
```
Frontend → Your Backend → PageIndex Tree API + Your LLM → Response
```
- Your backend fetches the tree from PageIndex
- Your backend does LLM tree search to find relevant nodes
- Your backend uses retrieved node text to generate answer with your own LLM
- Your backend constructs the sources array with node info
- **You control the response format** - can add highlights, scores, etc.
- **More expensive** (LLM calls for both search + answer)

### 5.3 Citation Format Change

**Current (what we built):**
```
"The system uses JWT tokens [1] and OAuth [2]."
```

**PageIndex Chat API (when enable_citations=true):**
```
"The system uses JWT tokens <doc=auth-guide.pdf;page=42> and OAuth <doc=oauth-spec.pdf;page=15>."
```

The frontend MarkdownRenderer needs to handle BOTH formats, or your backend should convert PageIndex citations to `[N]` format before sending to frontend.

---

## 6. Concrete Recommendations

### 🔴 HIGH Priority Changes

1. **Update backend example** - Remove all vector DB, embeddings, cosine_similarity code. Replace with PageIndex SDK calls.

2. **Update `types/message.ts`** - Add `nodeId`, `title`, `summary` fields. Make `score` optional/remove. Make `highlights` truly optional.

3. **Citation parsing** - Either:
   - Backend converts `<doc=file;page=N>` → `[1]` format (easier for frontend)
   - OR frontend learns to parse `<doc=...;page=...>` format too

4. **Highlights strategy** - Since PageIndex doesn't provide sentence-level highlights:
   - **Option A**: Backend post-processes to extract highlights (use simple keyword matching from query terms within the section text)
   - **Option B**: Frontend does client-side highlighting (search for query keywords in section content)
   - **Option C**: Show full section text without highlights (simpler, still useful)

### 🟡 MEDIUM Priority Changes

5. **Document Viewer** - Update to work with full sections instead of chunks. Show section title + page number prominently.

6. **Source Citation cards** - Show section `title` instead of just document name. Add `summary` field display.

7. **Streaming support** - PageIndex SSE format is standard OpenAI-compatible:
   ```
   data: {"choices":[{"delta":{"content":"The"}}]}
   data: {"choices":[{"delta":{"content":" key"}}]}
   data: [DONE]
   ```
   Plus metadata events for tool calls (`mcp_tool_use_start`, `mcp_tool_result_start`)

### 🟢 LOW Priority (Nice to Have)

8. **Tree Visualization** - Show the PageIndex tree structure in UI so users can navigate document structure.

9. **Tool call indicators** - During streaming, show "Searching document..." when `mcp_tool_use_start` event fires.

10. **Multi-document support** - PageIndex natively supports querying across multiple docs with `doc_id: ["pi-123", "pi-456"]`.

---

## 7. Updated Backend Example (Using PageIndex)

```python
from fastapi import FastAPI
from pageindex import PageIndexClient
import re

app = FastAPI()
pi_client = PageIndexClient(api_key="YOUR_PAGEINDEX_API_KEY")

@app.post("/api/rag/query")
async def rag_query(request: QueryRequest):
    """
    Your backend wraps PageIndex Chat API and normalizes the response
    for our frontend
    """
    
    # Call PageIndex Chat API
    response = pi_client.chat_completions(
        messages=[{"role": "user", "content": request.query}],
        doc_id=request.doc_id,
        enable_citations=True  # Get <doc=file;page=N> citations
    )
    
    raw_answer = response["choices"][0]["message"]["content"]
    
    # Parse PageIndex citations: <doc=filename.pdf;page=42>
    citation_pattern = r'<doc=([^;]+);page=(\d+)>'
    citations_found = re.findall(citation_pattern, raw_answer)
    
    # Build sources from citations
    sources = []
    seen = set()
    citation_num = 1
    
    for doc_name, page_num in citations_found:
        key = f"{doc_name}_p{page_num}"
        if key not in seen:
            seen.add(key)
            
            # Get the section text from PageIndex tree
            tree = pi_client.get_tree(request.doc_id)
            node = find_node_by_page(tree["result"], int(page_num))
            
            sources.append({
                "nodeId": node["node_id"] if node else f"page_{page_num}",
                "title": node["title"] if node else f"Page {page_num}",
                "documentName": doc_name,
                "pageIndex": int(page_num),
                "content": node["text"] if node else "",
                "summary": node.get("summary", ""),
                "citationNumber": citation_num,
                "highlights": extract_query_highlights(
                    node["text"] if node else "", 
                    request.query
                )
            })
            citation_num += 1
    
    # Replace PageIndex citations with [N] format for frontend
    normalized_answer = raw_answer
    citation_map = {}
    for doc_name, page_num in citations_found:
        key = f"{doc_name}_p{page_num}"
        if key not in citation_map:
            citation_map[key] = len(citation_map) + 1
        num = citation_map[key]
        normalized_answer = normalized_answer.replace(
            f"<doc={doc_name};page={page_num}>", 
            f"[{num}]"
        )
    
    return {
        "answer": normalized_answer,
        "sources": sources,
        "metadata": {
            "model": "pageindex",
            "tokensUsed": response.get("usage", {}).get("total_tokens", 0)
        }
    }


def extract_query_highlights(text: str, query: str) -> list:
    """
    Simple keyword-based highlight extraction since PageIndex 
    doesn't provide sentence-level highlights.
    
    Find sentences that contain query keywords.
    """
    if not text:
        return []
    
    # Extract meaningful keywords from query (skip stop words)
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "what", 
                  "how", "why", "when", "where", "which", "who", "do", 
                  "does", "did", "in", "on", "at", "to", "for", "of",
                  "and", "or", "but", "not", "this", "that", "it"}
    
    keywords = [w.lower() for w in query.split() 
                if w.lower() not in stop_words and len(w) > 2]
    
    if not keywords:
        return []
    
    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    highlights = []
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) < 20:
            continue
            
        # Check if sentence contains any query keyword
        sentence_lower = sentence.lower()
        if any(kw in sentence_lower for kw in keywords):
            start = text.find(sentence)
            if start != -1:
                highlights.append({
                    "text": sentence,
                    "startOffset": start,
                    "endOffset": start + len(sentence)
                })
    
    # Return top 3 most relevant
    return highlights[:3]


def find_node_by_page(tree_nodes, page_num):
    """Find the tree node that contains the given page number"""
    for node in tree_nodes:
        if node.get("page_index") == page_num:
            return node
        if "nodes" in node:
            result = find_node_by_page(node["nodes"], page_num)
            if result:
                return result
    return None
```

---

## 8. Summary: Vector DB vs PageIndex Comparison

| Aspect | Vector DB (Old Backend) | PageIndex (New Backend) |
|--------|------------------------|------------------------|
| **Storage** | Vector embeddings in Qdrant | Hierarchical tree JSON |
| **Retrieval** | Cosine similarity search | LLM reasoning over tree |
| **Granularity** | Fixed-size chunks (500 tokens) | Natural sections (pages, chapters) |
| **Scores** | Cosine similarity 0-1 | No scores (reasoning-based) |
| **Highlights** | Semantic sentence extraction | ❌ Not provided natively |
| **Citations** | Backend assigns [1], [2] | `<doc=file;page=N>` format |
| **Multi-turn** | Each query isolated | Conversation-aware |
| **Cross-refs** | Can't follow "see Appendix G" | ✅ Follows document references |
| **Cost** | Embedding once + cheap search | LLM calls per query |
| **Accuracy** | ~70-80% on FinanceBench | 98.7% on FinanceBench |

---

## 9. What Stays the Same in Our Frontend

✅ **ChatMessage component** - Works as-is
✅ **ChatInput component** - Works as-is  
✅ **ChatWindow component** - Works as-is
✅ **Sidebar component** - Works as-is
✅ **TypingIndicator** - Works as-is
✅ **InlineCitation** - Works as-is (backend converts to [N] format)
✅ **MarkdownRenderer** - Works as-is (processes [N] citations)
✅ **Overall UI layout** - Works as-is

## What Needs Updates:

⚠️ **types/message.ts** - Add `nodeId`, `title`, `summary`; make `score` optional
⚠️ **SourceCitation component** - Show section title + summary
⚠️ **DocumentViewer component** - Handle sections (not chunks); highlight strategy
⚠️ **Backend example** - Complete rewrite to use PageIndex SDK
⚠️ **types/api.ts** - Update stream chunk types for PageIndex SSE format
⚠️ **lib/services/rag.service.ts** - Update to match new API contract

The good news: **~80% of the frontend we built is already compatible.** The main changes are in the data layer and source display components.
