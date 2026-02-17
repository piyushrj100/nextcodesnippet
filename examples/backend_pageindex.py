"""
Backend Example for RAG with PageIndex (Vectorless, Reasoning-based RAG)
FastAPI + PageIndex SDK + Your own answer normalization

This replaces the old Vector DB approach with PageIndex's tree-based retrieval.

Key patterns from PageIndex cookbooks:
  - utils.create_node_mapping(tree)   → O(1) flat lookup by node_id
  - utils.remove_fields(tree, ['text']) → lightweight tree for LLM prompts
  - node_map[node_id]["text"]          → extract text from selected nodes
  - include_page_ranges=True           → get start_index/end_index per node
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Union
import re
import json

# PageIndex SDK
from pageindex import PageIndexClient
import pageindex.utils as utils

app = FastAPI(title="RAG API with PageIndex")

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PageIndex client
pi_client = PageIndexClient(api_key="YOUR_PAGEINDEX_API_KEY")

# ==========================================================================
# IMPORTANT: What changed from Vector DB approach
# ==========================================================================
# 
# REMOVED (not needed with PageIndex):
#   - SentenceTransformer / embedding model
#   - QdrantClient / vector database
#   - cosine_similarity / sklearn
#   - chunk_text() / manual chunking
#   - extract_highlights() via semantic similarity
#   - embedding generation
#
# ADDED:
#   - PageIndexClient (handles tree generation + retrieval)
#   - Citation parsing (convert <doc=file;page=N> to [N] format)
#   - Keyword-based highlight extraction (since PageIndex doesn't
#     provide sentence-level highlights)
#
# KEY DIFFERENCE:
#   PageIndex returns full SECTIONS (not chunks), identified by
#   node_id, title, page_index. The retrieval is done by LLM 
#   reasoning over a tree structure, not by embedding similarity.
# ==========================================================================


# ==========================================================================
# REQUEST/RESPONSE MODELS
# ==========================================================================

class QueryRequest(BaseModel):
    query: str
    docId: Optional[Union[str, List[str]]] = None  # PageIndex doc ID(s)
    conversationId: Optional[str] = None
    enableCitations: bool = True

class HighlightRegion(BaseModel):
    text: str
    startOffset: int
    endOffset: int

class DocumentSource(BaseModel):
    id: str
    nodeId: Optional[str] = None          # PageIndex tree node_id
    title: Optional[str] = None           # Section title from tree
    documentName: str
    pageIndex: int                         # Starting page (1-based)
    endPageIndex: Optional[int] = None     # Ending page of the section (from node mapping)
    content: str                           # Full section text
    summary: Optional[str] = None          # Node summary (or prefix_summary fallback)
    citationNumber: Optional[int] = None   # [1], [2], [3] for frontend
    highlights: List[HighlightRegion] = [] # Keyword-based highlights
    score: Optional[float] = None          # Optional relevance ranking

class QueryResponse(BaseModel):
    answer: str
    sources: List[DocumentSource]
    metadata: Dict


# ==========================================================================
# HELPER FUNCTIONS
# ==========================================================================

def parse_pageindex_citations(text: str) -> List[Dict]:
    """
    Parse PageIndex inline citations from the response text.
    PageIndex format: <doc=filename.pdf;page=42>
    
    Returns list of { documentName, pageNumber, raw }
    """
    pattern = r'<doc=([^;]+);page=(\d+)>'
    matches = re.findall(pattern, text)
    
    citations = []
    for doc_name, page_num in matches:
        citations.append({
            "documentName": doc_name,
            "pageNumber": int(page_num),
            "raw": f"<doc={doc_name};page={page_num}>"
        })
    
    return citations


def normalize_citations(text: str, citations: List[Dict]) -> tuple:
    """
    Convert PageIndex citations to [N] format for frontend.
    
    Input:  "The data shows growth <doc=report.pdf;page=42> and stability <doc=report.pdf;page=21>"
    Output: "The data shows growth [1] and stability [2]"
    
    Also returns a mapping: { "report.pdf_p42": 1, "report.pdf_p21": 2 }
    """
    normalized = text
    citation_map = {}  # "filename_pN" -> citation number
    
    for citation in citations:
        key = f"{citation['documentName']}_p{citation['pageNumber']}"
        if key not in citation_map:
            citation_map[key] = len(citation_map) + 1
        
        num = citation_map[key]
        normalized = normalized.replace(citation["raw"], f"[{num}]")
    
    return normalized, citation_map


def extract_query_highlights(
    text: str, query: str, max_highlights: int = 3
) -> List[Dict]:
    """
    Simple keyword-based highlight extraction.
    
    Since PageIndex doesn't provide sentence-level highlights (it returns 
    full sections), we do lightweight keyword matching to find sentences 
    in the section text that contain query terms.
    
    This is simpler than the old cosine_similarity approach but works well
    enough because PageIndex already found the RIGHT section - we just need
    to find the most relevant sentences WITHIN that section.
    """
    if not text or not query:
        return []
    
    # Extract meaningful keywords (skip stop words)
    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "what", "how", "why",
        "when", "where", "which", "who", "do", "does", "did", "in", "on",
        "at", "to", "for", "of", "and", "or", "but", "not", "this", "that",
        "it", "can", "will", "be", "has", "have", "had", "with", "from",
        "about", "than", "more", "most", "some", "any", "all", "each",
        "would", "could", "should", "may", "might", "much", "many",
    }
    
    keywords = [
        w.lower() for w in re.findall(r'\w+', query)
        if w.lower() not in stop_words and len(w) > 2
    ]
    
    if not keywords:
        return []
    
    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    # Score each sentence by keyword matches
    scored_sentences = []
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) < 20:
            continue
        
        sentence_lower = sentence.lower()
        match_count = sum(1 for kw in keywords if kw in sentence_lower)
        
        if match_count > 0:
            start = text.find(sentence)
            if start != -1:
                scored_sentences.append({
                    "text": sentence,
                    "startOffset": start,
                    "endOffset": start + len(sentence),
                    "score": match_count / len(keywords),  # relevance ratio
                })
    
    # Sort by score (most keyword matches first) and return top N
    scored_sentences.sort(key=lambda x: x["score"], reverse=True)
    
    return [
        {"text": s["text"], "startOffset": s["startOffset"], "endOffset": s["endOffset"]}
        for s in scored_sentences[:max_highlights]
    ]


def find_node_by_page(tree_nodes: list, page_num: int) -> Optional[Dict]:
    """
    Find the PageIndex tree node that contains the given page number.
    Searches recursively through the tree.
    """
    if not tree_nodes:
        return None
    
    for node in tree_nodes:
        node_page = node.get("page_index")
        if node_page == page_num:
            return node
        
        # Check child nodes
        if "nodes" in node and node["nodes"]:
            result = find_node_by_page(node["nodes"], page_num)
            if result:
                return result
    
    return None


def find_closest_node(tree_nodes: list, page_num: int) -> Optional[Dict]:
    """
    Find the closest tree node to a given page number.
    Useful when exact page match isn't found.
    """
    closest = None
    min_distance = float('inf')
    
    def search(nodes):
        nonlocal closest, min_distance
        for node in nodes:
            node_page = node.get("page_index", 0)
            distance = abs(node_page - page_num)
            if distance < min_distance:
                min_distance = distance
                closest = node
            if "nodes" in node and node["nodes"]:
                search(node["nodes"])
    
    search(tree_nodes)
    return closest


def build_node_map(tree: list, total_pages: Optional[int] = None) -> Dict:
    """
    Build a flat node_id→node mapping using PageIndex SDK utility.
    
    From cookbook: utils.create_node_mapping(tree, include_page_ranges=True)
    Returns: { "0006": { "node": {...}, "start_index": 3, "end_index": 4 }, ... }
    
    This gives O(1) lookup by node_id instead of tree traversal.
    Also provides start/end page range for each section.
    """
    return utils.create_node_mapping(tree, include_page_ranges=True, max_page=total_pages)


def find_node_by_page_in_map(node_map: Dict, page_num: int) -> Optional[Dict]:
    """
    Find a node containing a given page number using the flat node map.
    Checks if page_num falls within [start_index, end_index] for each node.
    """
    best_match = None
    smallest_range = float('inf')
    
    for node_id, entry in node_map.items():
        start = entry.get("start_index", 0)
        end = entry.get("end_index", 0)
        if start <= page_num <= end:
            page_range = end - start
            if page_range < smallest_range:
                smallest_range = page_range
                best_match = entry["node"]
    
    return best_match


# ==========================================================================
# DOCUMENT MANAGEMENT (PageIndex handles storage + tree generation)
# ==========================================================================

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a PDF to PageIndex for tree generation.
    
    PageIndex will:
    1. Process the PDF
    2. Build a hierarchical tree structure (ToC)
    3. Make it available for reasoning-based retrieval
    
    No embeddings, no chunking, no vector DB needed!
    """
    # Save file temporarily
    import tempfile, os
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Submit to PageIndex
        result = pi_client.submit_document(tmp_path)
        doc_id = result["doc_id"]
        
        return {
            "success": True,
            "documents": [{
                "id": doc_id,  # e.g., "pi-abc123def456"
                "name": file.filename,
                "status": "processing",  # PageIndex processes async
            }]
        }
    finally:
        os.unlink(tmp_path)


@app.get("/api/documents/{doc_id}/status")
async def get_document_status(doc_id: str):
    """
    Check if PageIndex has finished processing the document.
    Frontend should poll this until status is "completed".
    """
    doc_metadata = pi_client.get_document(doc_id)
    
    return {
        "id": doc_metadata["id"],
        "name": doc_metadata["name"],
        "status": doc_metadata["status"],  # "queued" | "processing" | "completed" | "failed"
        "pages": doc_metadata.get("pageNum"),
    }


@app.get("/api/documents/{doc_id}/tree")
async def get_document_tree(doc_id: str):
    """
    Get the PageIndex tree structure for a document.
    Can be used for tree visualization in the frontend.
    """
    tree_result = pi_client.get_tree(doc_id, node_summary=True)
    return tree_result


@app.get("/api/documents")
async def list_documents(limit: int = 50, offset: int = 0):
    """List all uploaded documents"""
    result = pi_client.list_documents(limit=limit, offset=offset)
    return result


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document from PageIndex"""
    pi_client.delete_document(doc_id)
    return {"success": True}


# ==========================================================================
# RAG QUERY (Using PageIndex Chat API)
# ==========================================================================

@app.post("/api/rag/query", response_model=QueryResponse)
async def rag_query(request: QueryRequest):
    """
    Main RAG query endpoint.
    
    Flow with PageIndex:
    1. Send query to PageIndex Chat API with enable_citations=True
    2. PageIndex internally:
       a. Reads the document's tree structure (ToC)
       b. LLM reasons about which sections are relevant
       c. Navigates to those sections, reads content
       d. If not enough info, goes back and checks more sections
       e. Generates answer with <doc=file;page=N> citations
    3. Our backend:
       a. Parses the <doc=file;page=N> citations
       b. Fetches corresponding tree nodes for section text
       c. Extracts keyword-based highlights within sections
       d. Converts citations to [1], [2], [3] format
       e. Returns normalized response for frontend
    """
    
    # Step 1: Call PageIndex Chat API
    response = pi_client.chat_completions(
        messages=[{"role": "user", "content": request.query}],
        doc_id=request.docId,
        enable_citations=request.enableCitations,
    )
    
    raw_answer = response["choices"][0]["message"]["content"]
    
    # Step 2: Parse PageIndex citations
    citations = parse_pageindex_citations(raw_answer)
    
    # Step 3: Normalize citations to [N] format
    normalized_answer, citation_map = normalize_citations(raw_answer, citations)
    
    # Step 4: Build sources array
    sources = []
    
    if citations:
        # Get tree structure and build flat node map for O(1) lookups
        tree = None
        node_map = {}
        
        if request.docId:
            doc_id = request.docId if isinstance(request.docId, str) else request.docId[0]
            try:
                tree_response = pi_client.get_tree(doc_id, node_summary=True)
                if tree_response.get("status") == "completed":
                    tree = tree_response.get("result", [])
                    if tree:
                        # Cookbook pattern: build flat node map for fast lookup
                        node_map = build_node_map(tree)
            except Exception:
                tree = None
        
        seen_keys = set()
        for citation in citations:
            key = f"{citation['documentName']}_p{citation['pageNumber']}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            
            citation_num = citation_map[key]
            
            # Try to find the tree node for this page
            node = None
            node_entry = None
            if node_map:
                node = find_node_by_page_in_map(node_map, citation["pageNumber"])
            elif tree:
                node = find_node_by_page(tree, citation["pageNumber"])
                if not node:
                    node = find_closest_node(tree, citation["pageNumber"])
            
            # Get page range from node map if available
            end_page = citation["pageNumber"]
            if node and node_map:
                node_id = node.get("node_id", "")
                if node_id in node_map:
                    end_page = node_map[node_id].get("end_index", citation["pageNumber"])
            
            # Extract the section text and metadata
            section_text = node.get("text", "") if node else ""
            section_title = node.get("title", f"Page {citation['pageNumber']}") if node else f"Page {citation['pageNumber']}"
            # Prefer summary, fall back to prefix_summary
            section_summary = node.get("summary", node.get("prefix_summary", "")) if node else ""
            node_id = node.get("node_id", f"page_{citation['pageNumber']}") if node else f"page_{citation['pageNumber']}"
            
            # Extract keyword-based highlights within the section
            highlights = extract_query_highlights(section_text, request.query)
            
            sources.append(DocumentSource(
                id=f"{citation['documentName']}_{node_id}",
                nodeId=node_id,
                title=section_title,
                documentName=citation["documentName"],
                pageIndex=citation["pageNumber"],
                endPageIndex=end_page,
                content=section_text,
                summary=section_summary,
                citationNumber=citation_num,
                highlights=[HighlightRegion(**h) for h in highlights],
            ))
    
    return QueryResponse(
        answer=normalized_answer,
        sources=sources,
        metadata={
            "model": "pageindex",
            "tokensUsed": response.get("usage", {}).get("total_tokens", 0),
            "retrievalMethod": "pageindex",
        }
    )


# ==========================================================================
# STREAMING (Using PageIndex SSE)
# ==========================================================================

@app.post("/api/rag/stream")
async def rag_stream(request: QueryRequest):
    """
    Streaming version using PageIndex Chat API.
    
    PageIndex streams in OpenAI-compatible SSE format:
      data: {"choices":[{"delta":{"content":"The"}}]}
      data: {"choices":[{"delta":{"content":" key"}}]}
      data: [DONE]
    
    With stream_metadata=True, also sends:
      - mcp_tool_use_start (PageIndex is searching the document)
      - mcp_tool_result_start (PageIndex found relevant content)
      - text_block_start / text_stop (text content blocks)
    """
    
    async def generate():
        full_answer = ""
        
        # Stream from PageIndex
        for chunk in pi_client.chat_completions(
            messages=[{"role": "user", "content": request.query}],
            doc_id=request.docId,
            stream=True,
            stream_metadata=True,
            enable_citations=request.enableCitations,
        ):
            # Handle metadata events (tool calls)
            metadata = chunk.get("block_metadata", {}) if isinstance(chunk, dict) else {}
            if metadata:
                block_type = metadata.get("type")
                
                if block_type == "mcp_tool_use_start":
                    # PageIndex is searching the document tree
                    yield f"data: {json.dumps({'type': 'tool_start', 'metadata': {'toolName': metadata.get('tool_name', 'search'), 'type': block_type}})}\n\n"
                    continue
                
                elif block_type == "mcp_tool_result_start":
                    # PageIndex found relevant content
                    yield f"data: {json.dumps({'type': 'tool_result', 'metadata': {'type': block_type}})}\n\n"
                    continue
            
            # Handle content tokens
            content = ""
            if isinstance(chunk, str):
                content = chunk
            elif isinstance(chunk, dict):
                content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
            
            if content:
                full_answer += content
                yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
        
        # After streaming is done, parse citations and send sources
        if request.enableCitations:
            citations = parse_pageindex_citations(full_answer)
            
            if citations:
                # Get tree and build flat node map for fast lookups
                tree = None
                node_map = {}
                if request.docId:
                    doc_id = request.docId if isinstance(request.docId, str) else request.docId[0]
                    try:
                        tree_response = pi_client.get_tree(doc_id, node_summary=True)
                        if tree_response.get("status") == "completed":
                            tree = tree_response.get("result", [])
                            if tree:
                                node_map = build_node_map(tree)
                    except Exception:
                        pass
                
                seen_keys = set()
                citation_num = 0
                
                for citation in citations:
                    key = f"{citation['documentName']}_p{citation['pageNumber']}"
                    if key in seen_keys:
                        continue
                    seen_keys.add(key)
                    citation_num += 1
                    
                    # Use flat node map for O(1) lookup
                    node = None
                    end_page = citation["pageNumber"]
                    if node_map:
                        node = find_node_by_page_in_map(node_map, citation["pageNumber"])
                        if node and node.get("node_id") in node_map:
                            end_page = node_map[node["node_id"]].get("end_index", end_page)
                    elif tree:
                        node = find_node_by_page(tree, citation["pageNumber"])
                        if not node:
                            node = find_closest_node(tree, citation["pageNumber"])
                    
                    section_text = node.get("text", "") if node else ""
                    highlights = extract_query_highlights(section_text, request.query)
                    
                    source = {
                        "id": f"{citation['documentName']}_{node.get('node_id', 'unknown') if node else 'unknown'}",
                        "nodeId": node.get("node_id") if node else None,
                        "title": node.get("title", f"Page {citation['pageNumber']}") if node else f"Page {citation['pageNumber']}",
                        "documentName": citation["documentName"],
                        "pageIndex": citation["pageNumber"],
                        "endPageIndex": end_page,
                        "content": section_text,
                        "summary": node.get("summary", node.get("prefix_summary", "")) if node else "",
                        "citationNumber": citation_num,
                        "highlights": highlights,
                    }
                    
                    yield f"data: {json.dumps({'type': 'source', 'source': source})}\n\n"
        
        # Send done signal
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


# ==========================================================================
# RUN SERVER
# ==========================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


"""
==========================================================================
SETUP INSTRUCTIONS
==========================================================================

1. Install dependencies:
   pip install fastapi uvicorn pageindex

2. Get your PageIndex API key:
   Visit https://dash.pageindex.ai/ and generate an API key

3. Set your API key:
   Replace "YOUR_PAGEINDEX_API_KEY" above, or use environment variable

4. Run server:
   python backend_pageindex.py

5. Test upload:
   curl -X POST http://localhost:8000/api/documents/upload \
     -F "file=@your-document.pdf"

6. Check processing status:
   curl http://localhost:8000/api/documents/{doc_id}/status

7. Test query (after document is "completed"):
   curl -X POST http://localhost:8000/api/rag/query \
     -H "Content-Type: application/json" \
     -d '{"query": "What are the key findings?", "docId": "pi-abc123"}'

==========================================================================
COMPARISON: What Changed from Vector DB Backend
==========================================================================

OLD (Vector DB):                         NEW (PageIndex):
----------------------------------------------
pip install qdrant-client              → pip install pageindex
pip install sentence-transformers      → (not needed)
pip install scikit-learn               → (not needed)
embedding_model.encode(query)          → pi_client.chat_completions(...)
vector_db.search(query_vector=...)     → (PageIndex does retrieval internally)
cosine_similarity(...)                 → (not needed)
chunk_text(text, chunk_size=500)       → (PageIndex uses natural sections)
Fixed-size chunks                      → Full document sections with titles
Similarity score 0-1                   → No scores (reasoning-based)
Manual highlight extraction            → Keyword-based post-processing
[1], [2] assigned by backend           → <doc=file;page=N> → converted to [1], [2]

==========================================================================
"""
