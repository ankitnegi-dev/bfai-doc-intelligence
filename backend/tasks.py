"""
Background Tasks
-----------------
Job functions run by the arq worker (see worker.py). These must be plain
async functions — arq serializes their arguments through Redis, so keep
parameters to simple JSON-safe types (str, int, bool, None).
"""
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

STORAGE_DIR = Path(__file__).parent / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
PAGES_DIR = STORAGE_DIR / "pages"


async def process_document_task(
    ctx,
    doc_id: str,
    file_path_str: str,
    original_filename: str,
    user_id: Optional[str] = None,
):
    """
    arq job: parse -> classify -> index -> persist a document.
    This is the same pipeline that used to run via FastAPI BackgroundTasks,
    now running in a separate worker process so it survives API restarts.
    """
    from services.parser import parse_document
    from services.classifier import classify_document
    from services.vector_store import index_document
    from services.document_repo import upsert_document
    from services import object_storage

    file_path = Path(file_path_str)

    ORIGINALS_PREFIX = "originals/"
    PAGES_PREFIX = "pages/"

    def _persist_to_object_storage(doc_id: str, file_path: Path, page_count: int) -> None:
        try:
            if file_path.exists():
                content = file_path.read_bytes()
                key = f"{ORIGINALS_PREFIX}{file_path.name}"
                object_storage.upload_bytes(key, content)
                file_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to persist original file for {doc_id} to object storage: {e}")

        for page_num in range(1, page_count + 1):
            local_image = PAGES_DIR / f"{doc_id}_{page_num}.png"
            if not local_image.exists():
                continue
            try:
                content = local_image.read_bytes()
                key = f"{PAGES_PREFIX}{doc_id}_{page_num}.png"
                object_storage.upload_bytes(key, content, content_type="image/png")
                local_image.unlink()
            except Exception as e:
                logger.warning(f"Failed to persist page image {page_num} for {doc_id}: {e}")

    try:
        # --- PARSING ---
        logger.info(f"[{doc_id}] Parsing...")
        pages = parse_document(str(file_path), doc_id)

        if not pages:
            raise ValueError("No content could be extracted from the document")

        # --- CLASSIFYING ---
        logger.info(f"[{doc_id}] Classifying...")
        classification = classify_document(pages)

        # --- INDEXING ---
        logger.info(f"[{doc_id}] Indexing...")
        chunk_count = index_document(doc_id, original_filename, pages)

        final_status = "indexed" if chunk_count > 0 else "error"
        error_msg = None if chunk_count > 0 else "No extractable text found (scanned PDF without OCR support)"

        # --- PERSIST FILES TO OBJECT STORAGE ---
        if chunk_count > 0:
            logger.info(f"[{doc_id}] Persisting to object storage...")
            _persist_to_object_storage(doc_id, file_path, len(pages))

        # --- SAVE METADATA (Postgres) ---
        upsert_document(
            doc_id=doc_id,
            filename=original_filename,
            file_ext=Path(original_filename).suffix.lower(),
            file_size=file_path.stat().st_size if file_path.exists() else 0,
            status=final_status,
            page_count=len(pages),
            classification=classification,
            chunk_count=chunk_count,
            error_message=error_msg,
            user_id=user_id,
        )

        if chunk_count > 0:
            logger.info(f"[{doc_id}] Successfully indexed: {original_filename}")
        else:
            logger.warning(f"[{doc_id}] Indexed with 0 chunks: {original_filename}")

        return {"doc_id": doc_id, "status": final_status, "chunk_count": chunk_count}

    except Exception as e:
        logger.error(f"[{doc_id}] Processing failed: {e}")
        try:
            from services.document_repo import upsert_document as _upsert
            _upsert(
                doc_id=doc_id,
                filename=original_filename,
                file_ext=Path(original_filename).suffix.lower(),
                file_size=file_path.stat().st_size if file_path.exists() else 0,
                status="error",
                error_message=str(e),
                user_id=user_id,
            )
        except Exception:
            pass
        return {"doc_id": doc_id, "status": "error", "error": str(e)}