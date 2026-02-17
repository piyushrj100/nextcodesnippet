"""
Complete Backend Example for RAG with Highlights
FastAPI + Qdrant + OpenAI
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import openai
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
import PyPDF2
import io
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import re

app = FastAPI()

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
vector_db = QdrantClient("localhost", port=6333)
openai.api_key = "your-api-key"

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class QueryRequest(BaseModel):
    query: str
    conversationId: Optional[str] = None
    maxSources: int = 5

class Highlight(BaseModel):
    text: str
    startOffset: int
    endOffset: int

class DocumentSource(BaseModel):
    id: str
    documentName: str
    pageNumber: int
    content: str
    score: float
    citationNumber: int
    highlights: List[Highlight]

class QueryResponse(BaseModel):
    answer: str
    sources: List[DocumentSource]
    metadata: Dict

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences"""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip() and len(s.strip()) > 20]

def extract_highlights(chunk_text: str, query: str, max_highlights: int = 3) -> List[Dict]:
    """
    Extract most relevant sentences from chunk based on semantic similarity to query
    Returns list of highlights with exact character positions
    """
    # Split chunk into sentences
    sentences = split_into_sentences(chunk_text)
    
    if not sentences:
        return []
    
    # Encode query and sentences
    query_embedding = embedding_model.encode(query)
    sentence_embeddings = embedding_model.encode(sentences)
    
    # Calculate cosine similarity between query and each sentence
    similarities = cosine_similarity([query_embedding], sentence_embeddings)[0]
    
    # Get indices of top N most similar sentences
    top_indices = np.argsort(similarities)[-max_highlights:][::-1]
    
    highlights = []
    for idx in top_indices:
        # Only include if similarity is above threshold
        if similarities[idx] > 0.5:
            sentence = sentences[idx]
            
            # Find exact position of this sentence in the original chunk text
            start_offset = chunk_text.find(sentence)
            
            if start_offset != -1:  # Sentence found in chunk
                highlights.append({
                    "text": sentence,
                    "startOffset": start_offset,
                    "endOffset": start_offset + len(sentence)
                })
    
    return highlights

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks"""
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        chunks.append(chunk)
    
    return chunks

# ============================================================================
# DOCUMENT PROCESSING
# ============================================================================

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a PDF document
    Steps:
    1. Extract text from PDF page by page
    2. Chunk text into smaller pieces
    3. Generate embeddings for each chunk
    4. Store in vector database with metadata
    """
    
    # Read PDF
    pdf_content = await file.read()
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
    
    chunks_with_metadata = []
    
    # Process each page
    for page_num, page in enumerate(pdf_reader.pages, 1):
        page_text = page.extract_text()
        
        # Split page into chunks
        page_chunks = chunk_text(page_text, chunk_size=500, overlap=50)
        
        # Store each chunk with metadata
        for chunk_idx, chunk in enumerate(page_chunks):
            chunk_id = f"{file.filename}_page{page_num}_chunk{chunk_idx}"
            
            # Generate embedding
            embedding = embedding_model.encode(chunk).tolist()
            
            chunks_with_metadata.append({
                "id": chunk_id,
                "vector": embedding,
                "payload": {
                    "document_name": file.filename,
                    "page_number": page_num,
                    "chunk_index": chunk_idx,
                    "chunk_text": chunk,
                    "total_chunks_in_page": len(page_chunks)
                }
            })
    
    # Store in Qdrant
    vector_db.upsert(
        collection_name="documents",
        points=chunks_with_metadata
    )
    
    return {
        "success": True,
        "document": {
            "id": file.filename,
            "name": file.filename,
            "pages": len(pdf_reader.pages),
            "chunks": len(chunks_with_metadata),
            "status": "ready"
        }
    }

# ============================================================================
# RAG QUERY
# ============================================================================

@app.post("/api/rag/query", response_model=QueryResponse)
async def rag_query(request: QueryRequest):
    """
    Main RAG query endpoint
    
    Flow:
    1. Embed user query
    2. Search vector DB for similar chunks
    3. Extract highlights from each chunk
    4. Generate answer using LLM with context
    5. Insert citation numbers in answer
    6. Return answer with sources and highlights
    """
    
    # Step 1: Embed the query
    query_embedding = embedding_model.encode(request.query).tolist()
    
    # Step 2: Search vector database
    search_results = vector_db.search(
        collection_name="documents",
        query_vector=query_embedding,
        limit=request.maxSources,
        score_threshold=0.5  # Only return chunks with similarity > 0.5
    )
    
    if not search_results:
        return QueryResponse(
            answer="I couldn't find any relevant information in the documents.",
            sources=[],
            metadata={"processingTime": 0, "model": "none"}
        )
    
    # Step 3: Format sources with highlights
    sources = []
    context_for_llm = []
    
    for idx, result in enumerate(search_results, 1):
        payload = result.payload
        chunk_text = payload["chunk_text"]
        
        # Extract highlights - most relevant sentences within this chunk
        highlights = extract_highlights(chunk_text, request.query, max_highlights=3)
        
        source = DocumentSource(
            id=payload.get("id", f"chunk_{idx}"),
            documentName=payload["document_name"],
            pageNumber=payload["page_number"],
            content=chunk_text,
            score=result.score,
            citationNumber=idx,
            highlights=[Highlight(**h) for h in highlights]
        )
        
        sources.append(source)
        
        # Prepare context for LLM with citation number
        context_for_llm.append(f"[{idx}] (from {payload['document_name']}, page {payload['page_number']})\n{chunk_text}")
    
    # Step 4: Generate answer with LLM
    context = "\n\n".join(context_for_llm)
    
    system_prompt = """You are a helpful AI assistant that answers questions based on provided documents.

IMPORTANT INSTRUCTIONS:
1. Base your answer ONLY on the provided context
2. Include citation numbers [1], [2], [3] etc. after statements to reference sources
3. Use multiple citations if information comes from multiple sources
4. Be specific and cite sources for each claim
5. If the context doesn't contain enough information, say so

Example format:
"The system uses JWT tokens for authentication [1]. This approach provides stateless authentication [1] and integrates with OAuth 2.0 providers [2]."
"""
    
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context from documents:\n\n{context}\n\nQuestion: {request.query}"}
        ],
        temperature=0.3,  # Lower temperature for more factual responses
    )
    
    answer = response.choices[0].message.content
    
    return QueryResponse(
        answer=answer,
        sources=sources,
        metadata={
            "processingTime": response.response_ms if hasattr(response, 'response_ms') else 0,
            "model": "gpt-4",
            "tokensUsed": response.usage.total_tokens,
            "numChunksRetrieved": len(sources)
        }
    )

# ============================================================================
# STREAMING VERSION (Optional)
# ============================================================================

from fastapi.responses import StreamingResponse
import json
import asyncio

@app.post("/api/rag/stream")
async def rag_stream(request: QueryRequest):
    """
    Streaming version - sends tokens as they're generated
    """
    
    async def generate():
        # Step 1 & 2: Search (same as above)
        query_embedding = embedding_model.encode(request.query).tolist()
        search_results = vector_db.search(
            collection_name="documents",
            query_vector=query_embedding,
            limit=request.maxSources,
        )
        
        # Step 3: Format sources
        sources = []
        context_for_llm = []
        
        for idx, result in enumerate(search_results, 1):
            payload = result.payload
            chunk_text = payload["chunk_text"]
            highlights = extract_highlights(chunk_text, request.query)
            
            source = {
                "id": payload.get("id"),
                "documentName": payload["document_name"],
                "pageNumber": payload["page_number"],
                "content": chunk_text,
                "score": result.score,
                "citationNumber": idx,
                "highlights": highlights
            }
            
            sources.append(source)
            context_for_llm.append(f"[{idx}] {chunk_text}")
            
            # Send source immediately
            yield f"data: {json.dumps({'type': 'source', 'source': source})}\n\n"
        
        # Step 4: Stream LLM response
        context = "\n\n".join(context_for_llm)
        
        stream = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Answer based on context. Include citations [1], [2], etc."},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {request.query}"}
            ],
            stream=True
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.get("content"):
                token = chunk.choices[0].delta.content
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        
        # Send completion
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

# ============================================================================
# RUN SERVER
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

"""
To run:
1. Install dependencies:
   pip install fastapi uvicorn qdrant-client sentence-transformers openai PyPDF2 scikit-learn

2. Start Qdrant:
   docker run -p 6333:6333 qdrant/qdrant

3. Run server:
   python backend.py

4. Test:
   curl -X POST http://localhost:8000/api/rag/query \
     -H "Content-Type: application/json" \
     -d '{"query": "How does authentication work?", "maxSources": 3}'
"""
