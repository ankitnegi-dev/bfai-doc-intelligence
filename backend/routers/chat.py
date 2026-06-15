"""
Chat Router
-----------
POST /chat        - Agentic RAG query (non-streaming, JSON response)
POST /chat/stream - Streaming SSE variant: yields text deltas + done event
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from limiter import limiter
from models.chat import ChatRequest, ChatResponse
from services.rag_agent import answer_query, stream_answer

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("60/hour")
async def chat(request: Request, body: ChatRequest):
    """
    Process a chat query using the Agentic RAG pipeline.
    Returns answer with inline citations and page image paths.
    """
    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        response = answer_query(query, body.history)
        return response
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail="An error occurred processing your query")


@router.post("/chat/stream")
@limiter.limit("60/hour")
async def chat_stream(request: Request, body: ChatRequest):
    """
    Streaming SSE chat endpoint.
    Yields:
      data: {"type":"text","delta":"..."}
      data: {"type":"done","citations":[...],"follow_ups":[...],"sources_found":bool}
      data: {"type":"error","message":"..."}
    """
    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    return StreamingResponse(
        stream_answer(query, body.history),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
