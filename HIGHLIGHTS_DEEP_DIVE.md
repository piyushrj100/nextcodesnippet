# RAG Highlights and Source Attribution - Deep Dive

## Overview

In a RAG system, when you query your documents, the backend performs several steps to provide not just an answer, but also **precise attribution** to source documents with **exact text highlights**.

## The Complete Flow

### 1. User Query
```
User asks: "How does the authentication system work?"
```

### 2. Backend Processing Steps

#### Step 2.1: Query Embedding
```python
# Convert user query to vector embedding
query_embedding = embedding_model.encode("How does the authentication system work?")
# Result: [0.123, 0.456, 0.789, ...] (768-dimensional vector)
```

#### Step 2.2: Vector Database Search
```python
# Search for similar chunks in your vector database
results = vector_db.similarity_search(
    query_embedding=query_embedding,
    k=5,  # Return top 5 most relevant chunks
    threshold=0.7  # Only return chunks with similarity > 0.7
)

# Each result contains:
# - document_id: "doc_123"
# - chunk_id: "chunk_456"
# - text: "The authentication system uses JWT tokens..."
# - metadata: { filename, page_number, chunk_index, ... }
# - score: 0.92 (cosine similarity score)
```

#### Step 2.3: Extract Highlights (Most Important!)

This is where highlights come from - you need to find the **exact phrases** in the retrieved chunks that match the user's query:

```python
def extract_highlights(chunk_text: str, query: str) -> List[Highlight]:
    """
    Find exact text spans in chunk that are relevant to the query
    Multiple approaches:
    """
    
    # APPROACH 1: Keyword Matching
    # Extract keywords from query and find them in text
    keywords = extract_keywords(query)  # ["authentication", "system", "work"]
    highlights = []
    
    for keyword in keywords:
        # Find all occurrences of keyword in chunk_text
        start = 0
        while True:
            pos = chunk_text.lower().find(keyword.lower(), start)
            if pos == -1:
                break
            
            # Expand to include surrounding context (e.g., full sentence)
            sentence_start = chunk_text.rfind('.', 0, pos) + 1
            sentence_end = chunk_text.find('.', pos) + 1
            
            highlights.append({
                "text": chunk_text[sentence_start:sentence_end].strip(),
                "startOffset": sentence_start,
                "endOffset": sentence_end
            })
            start = pos + 1
    
    # APPROACH 2: Semantic Similarity (Better!)
    # Split chunk into sentences and find most relevant ones
    sentences = split_into_sentences(chunk_text)
    query_embedding = embed_text(query)
    
    for sentence in sentences:
        sentence_embedding = embed_text(sentence)
        similarity = cosine_similarity(query_embedding, sentence_embedding)
        
        if similarity > 0.75:  # Threshold for relevance
            start_offset = chunk_text.find(sentence)
            highlights.append({
                "text": sentence,
                "startOffset": start_offset,
                "endOffset": start_offset + len(sentence)
            })
    
    # APPROACH 3: LLM-based Extraction (Most Accurate!)
    # Use LLM to identify relevant passages
    prompt = f"""
    Given this text: "{chunk_text}"
    And this query: "{query}"
    
    Identify 1-3 most relevant sentences or phrases that directly answer the query.
    Return as JSON with exact text and character positions.
    """
    
    llm_highlights = llm.generate(prompt)
    
    return highlights
```

### 3. Backend Response Structure

Here's what your backend should return:

```json
{
  "answer": "The authentication system works using JWT tokens [1]. Users authenticate via OAuth 2.0 [2], and sessions are managed through Redis [1].",
  
  "sources": [
    {
      // Unique identifier for this source
      "id": "doc_123_page_42_chunk_5",
      
      // Document metadata
      "documentName": "Authentication Guide.pdf",
      "pageNumber": 42,
      
      // The complete chunk text retrieved from vector DB
      "content": "The authentication system is built on modern security principles. It uses JWT (JSON Web Tokens) for stateless authentication. When a user logs in, the server generates a JWT containing user claims and signs it with a secret key. This token is then sent to the client and must be included in subsequent requests. The system also implements refresh tokens to maintain security while providing a good user experience. Session data is cached in Redis for performance.",
      
      // Relevance score from vector search (0-1)
      "score": 0.92,
      
      // Citation number for inline references
      "citationNumber": 1,
      
      // ⭐ THE HIGHLIGHTS - Exact text spans relevant to the query
      "highlights": [
        {
          // The exact text to highlight
          "text": "It uses JWT (JSON Web Tokens) for stateless authentication.",
          
          // Character position where this text starts in 'content'
          "startOffset": 67,
          
          // Character position where this text ends in 'content'
          "endOffset": 127
        },
        {
          "text": "The system also implements refresh tokens to maintain security",
          "startOffset": 289,
          "endOffset": 351
        },
        {
          "text": "Session data is cached in Redis for performance.",
          "startOffset": 405,
          "endOffset": 453
        }
      ]
    },
    {
      "id": "doc_456_page_15_chunk_3",
      "documentName": "OAuth Integration.pdf",
      "pageNumber": 15,
      "content": "OAuth 2.0 is the industry-standard protocol for authorization. Our system supports multiple OAuth flows including authorization code flow and client credentials flow. Third-party applications can integrate using OAuth providers like Google, GitHub, and Microsoft. The authorization server validates credentials and issues access tokens with appropriate scopes.",
      "score": 0.87,
      "citationNumber": 2,
      "highlights": [
        {
          "text": "OAuth 2.0 is the industry-standard protocol for authorization.",
          "startOffset": 0,
          "endOffset": 62
        },
        {
          "text": "Third-party applications can integrate using OAuth providers like Google, GitHub, and Microsoft.",
          "startOffset": 167,
          "endOffset": 263
        }
      ]
    }
  ],
  
  "metadata": {
    "processingTime": 1234,
    "model": "gpt-4",
    "tokensUsed": 450,
    "retrievalMethod": "hybrid_search",  // dense + sparse retrieval
    "numChunksRetrieved": 5,
    "reranked": true
  }
}
```

## Why startOffset and endOffset?

These character positions allow the frontend to:

1. **Highlight text in the document viewer**
```typescript
// Frontend can programmatically highlight exact sections
const fullText = source.content;
const beforeHighlight = fullText.substring(0, highlight.startOffset);
const highlightedText = fullText.substring(highlight.startOffset, highlight.endOffset);
const afterHighlight = fullText.substring(highlight.endOffset);

return (
  <>
    {beforeHighlight}
    <mark className="bg-yellow-200">{highlightedText}</mark>
    {afterHighlight}
  </>
);
```

2. **Scroll to relevant section** when user clicks on a source

3. **Show preview of relevant parts** in source citation cards

## PageIndex RAG System Flow

### Database Schema (Vector DB + Metadata)

```python
# When documents are uploaded and processed:

class DocumentChunk:
    id: str                    # "doc_123_page_42_chunk_5"
    document_id: str           # "doc_123"
    document_name: str         # "Authentication Guide.pdf"
    page_number: int           # 42
    chunk_index: int           # 5 (chunk number within page)
    chunk_text: str            # The actual text content
    embedding: List[float]     # [0.123, 0.456, ...] (vector)
    
    # Metadata for reconstruction
    start_char_in_page: int    # Where this chunk starts in the page
    end_char_in_page: int      # Where this chunk ends in the page
    
    # For PDF rendering
    bbox: Dict                 # Bounding box coordinates on PDF page
                              # { "x": 100, "y": 200, "width": 400, "height": 50 }
```

### Complete Backend Implementation Example

```python
from typing import List, Dict
import openai
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

class RAGSystem:
    def __init__(self):
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.vector_db = QdrantClient("localhost", port=6333)
        self.llm = openai.ChatCompletion
    
    async def query(self, user_query: str, max_sources: int = 5) -> Dict:
        # Step 1: Embed the query
        query_embedding = self.embedding_model.encode(user_query)
        
        # Step 2: Search vector database
        search_results = self.vector_db.search(
            collection_name="documents",
            query_vector=query_embedding,
            limit=max_sources
        )
        
        # Step 3: Format sources with highlights
        sources = []
        context_for_llm = []
        
        for idx, result in enumerate(search_results, 1):
            chunk_text = result.payload["chunk_text"]
            
            # Extract highlights using semantic similarity
            highlights = self.extract_highlights(chunk_text, user_query)
            
            source = {
                "id": result.payload["id"],
                "documentName": result.payload["document_name"],
                "pageNumber": result.payload["page_number"],
                "content": chunk_text,
                "score": result.score,
                "citationNumber": idx,
                "highlights": highlights
            }
            
            sources.append(source)
            context_for_llm.append(f"[{idx}] {chunk_text}")
        
        # Step 4: Generate answer with LLM
        context = "\n\n".join(context_for_llm)
        
        answer = await self.llm.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": """You are a helpful assistant. Answer based on the provided context.
                    IMPORTANT: Include citation numbers [1], [2], etc. after statements to reference sources.
                    Example: "The system uses JWT tokens [1] for authentication."
                    """
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {user_query}"
                }
            ]
        )
        
        return {
            "answer": answer.choices[0].message.content,
            "sources": sources,
            "metadata": {
                "processingTime": 1234,
                "model": "gpt-4",
                "tokensUsed": answer.usage.total_tokens
            }
        }
    
    def extract_highlights(self, text: str, query: str, max_highlights: int = 3) -> List[Dict]:
        """
        Extract most relevant sentences from text based on query
        """
        # Split into sentences
        sentences = self._split_sentences(text)
        
        # Embed query and sentences
        query_emb = self.embedding_model.encode(query)
        sentence_embeddings = self.embedding_model.encode(sentences)
        
        # Calculate similarity scores
        from sklearn.metrics.pairwise import cosine_similarity
        similarities = cosine_similarity([query_emb], sentence_embeddings)[0]
        
        # Get top N most similar sentences
        top_indices = similarities.argsort()[-max_highlights:][::-1]
        
        highlights = []
        for idx in top_indices:
            if similarities[idx] > 0.5:  # Threshold
                sentence = sentences[idx]
                start_pos = text.find(sentence)
                
                highlights.append({
                    "text": sentence,
                    "startOffset": start_pos,
                    "endOffset": start_pos + len(sentence)
                })
        
        return highlights
    
    def _split_sentences(self, text: str) -> List[str]:
        # Simple sentence splitting (use spacy or nltk for better results)
        import re
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]
```

## Advanced: PDF Coordinate Highlighting

For actual PDF rendering with highlights:

```python
# When chunking PDFs, store bounding box coordinates
class PDFChunk:
    text: str
    page_num: int
    bbox: Dict[str, float]  # { "x0": 100, "y0": 200, "x1": 500, "y1": 250 }
    
# Extract with PyMuPDF
import fitz  # PyMuPDF

def extract_chunks_with_coords(pdf_path: str):
    doc = fitz.open(pdf_path)
    chunks = []
    
    for page_num, page in enumerate(doc):
        blocks = page.get_text("blocks")
        for block in blocks:
            x0, y0, x1, y1, text, block_no, block_type = block
            chunks.append({
                "text": text,
                "page_number": page_num + 1,
                "bbox": {
                    "x0": x0, "y0": y0,
                    "x1": x1, "y1": y1
                }
            })
    
    return chunks

# Frontend can then render PDF with react-pdf and overlay highlights
```

## Summary

### What goes in highlights array:
1. **text**: The exact sentence/phrase relevant to the query
2. **startOffset**: Character position where it starts in the full chunk
3. **endOffset**: Character position where it ends

### How it's generated:
1. **Vector search** finds relevant chunks
2. **Semantic analysis** identifies specific sentences within chunks
3. **Character positions** calculated by finding text location in chunk
4. **Sent to frontend** for highlighting in UI

### Why it's important:
- **Trust**: Users see exactly which part of the document answers their question
- **Verification**: Users can click to see full context
- **Transparency**: Clear attribution to sources
- **UX**: Quick visual scanning of relevant information

The frontend components I built support all of this automatically - just ensure your backend returns the proper highlight structure!
