"""
Documents Router
----------------
GET /documents              - List all indexed documents
GET /page-image             - Serve a rendered page PNG
GET /documents/{id}         - Get metadata for one document
DELETE /documents/{id}      - Remove a document
POST /documents/{id}/reindex - Re-process and re-index a document
"""
import json
import logging
import asyncio
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)
router = APIRouter()

STORAGE_DIR = Path(__file__).parent.parent / "storage"
METADATA_DIR = STORAGE_DIR / "metadata"
PAGES_DIR = STORAGE_DIR / "pages"
UPLOADS_DIR = STORAGE_DIR / "uploads"


def _load_all_metadata() -> list[dict]:
    """Load all document metadata from disk."""
    docs = []
    if not METADATA_DIR.exists():
        return docs

    for meta_file in METADATA_DIR.glob("*.json"):
        try:
            data = json.loads(meta_file.read_text())
            docs.append(data)
        except Exception as e:
            logger.error(f"Failed to load metadata {meta_file}: {e}")

    # Sort by upload_time desc
    docs.sort(key=lambda d: d.get("upload_time", ""), reverse=True)
    return docs


@router.get("/documents")
async def list_documents():
    """Return all indexed documents with their metadata and classifications."""
    docs = _load_all_metadata()
    return {
        "documents": docs,
        "total": len([d for d in docs if d.get("status") == "indexed"])
    }


@router.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    """Get metadata for a specific document."""
    # Security: validate doc_id is a valid hex hash (no path traversal)
    if not all(c in "0123456789abcdef" for c in doc_id) or len(doc_id) != 64:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    meta_path = METADATA_DIR / f"{doc_id}.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        return json.loads(meta_path.read_text())
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to load document metadata")


@router.get("/page-image")
async def get_page_image(
    doc_id: str = Query(..., description="Document ID (SHA-256 hash)"),
    page: int = Query(..., ge=1, le=1000, description="Page number")
):
    """
    Serve a rendered page PNG.
    Images are ONLY served through this endpoint - never from direct disk path.
    Validates doc_id to prevent path traversal.
    """
    # Security: validate doc_id format (hex only)
    if not all(c in "0123456789abcdef" for c in doc_id) or len(doc_id) != 64:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    image_path = PAGES_DIR / f"{doc_id}_{page}.png"

    # Verify the resolved path is inside PAGES_DIR (prevent traversal)
    try:
        resolved = image_path.resolve()
        if not str(resolved).startswith(str(PAGES_DIR.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
    except Exception:
        raise HTTPException(status_code=403, detail="Access denied")

    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Page image not found: page {page}")

    return FileResponse(
        str(image_path),
        media_type="image/png",
        headers={
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        }
    )


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Remove a document and all its associated data."""
    if not all(c in "0123456789abcdef" for c in doc_id) or len(doc_id) != 64:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    from services.vector_store import delete_document as vs_delete

    # Remove from vector store
    vs_delete(doc_id)

    # Remove metadata
    meta_path = METADATA_DIR / f"{doc_id}.json"
    if meta_path.exists():
        meta_path.unlink()

    # Remove page images
    for img_file in PAGES_DIR.glob(f"{doc_id}_*.png"):
        img_file.unlink()

    # Remove uploaded file
    for up_file in UPLOADS_DIR.glob(f"{doc_id}.*"):
        up_file.unlink()

    return {"message": "Document deleted successfully", "doc_id": doc_id}


@router.post("/documents/{doc_id}/reindex")
async def reindex_document(doc_id: str, background_tasks: BackgroundTasks):
    """
    Re-process and re-index an existing document.
    Reads the original stored file, deletes old vectors, and runs the full
    parse → classify → embed pipeline again in the background.
    """
    if not all(c in "0123456789abcdef" for c in doc_id) or len(doc_id) != 64:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    # Load existing metadata to get original filename and file extension
    meta_path = METADATA_DIR / f"{doc_id}.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        meta = json.loads(meta_path.read_text())
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to read document metadata")

    original_filename = meta.get("original_filename", "unknown")

    # Find the stored file
    file_path = None
    for ext in [".pdf", ".txt", ".png", ".jpg", ".jpeg"]:
        candidate = UPLOADS_DIR / f"{doc_id}{ext}"
        if candidate.exists():
            file_path = candidate
            break

    if file_path is None:
        raise HTTPException(
            status_code=404,
            detail="Original file not found on disk. Cannot reindex."
        )

    async def _do_reindex():
        from services.parser import parse_document
        from services.classifier import classify_document
        from services.vector_store import index_document, delete_document as vs_delete
        import json as _json
        from datetime import datetime
        from models.document import DocumentMetadata

        try:
            # Delete old vectors
            vs_delete(doc_id)

            # Parse
            pages = await asyncio.get_event_loop().run_in_executor(
                None, parse_document, str(file_path), doc_id
            )
            if not pages:
                raise ValueError("No content extracted")

            # Classify
            classification = await asyncio.get_event_loop().run_in_executor(
                None, classify_document, pages
            )

            # Embed + store
            chunk_count = await asyncio.get_event_loop().run_in_executor(
                None, index_document, doc_id, original_filename, pages
            )

            # Update metadata
            updated_meta = DocumentMetadata(
                doc_id=doc_id,
                original_filename=original_filename,
                upload_time=meta.get("upload_time", datetime.utcnow().isoformat()),
                page_count=len(pages),
                file_size=file_path.stat().st_size,
                classification=classification,
                status="indexed",
            )
            meta_path.write_text(_json.dumps(updated_meta.model_dump(), indent=2))
            logger.info(f"Reindex complete: {original_filename} ({chunk_count} chunks)")

        except Exception as e:
            logger.error(f"Reindex failed for {doc_id}: {e}")

    background_tasks.add_task(_do_reindex)

    return {
        "message": "Reindexing started",
        "doc_id": doc_id,
        "filename": original_filename,
    }
