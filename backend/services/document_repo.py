"""
Document Repository
--------------------
Postgres-backed replacement for the old storage/metadata/*.json files.
Falls back gracefully if DATABASE_URL isn't set (shouldn't happen in prod).
"""
import logging
from datetime import datetime
from typing import Optional

from models.db import get_session, Document

logger = logging.getLogger(__name__)


def get_document(doc_id: str) -> Optional[dict]:
    """Fetch a document record by doc_id. Returns None if not found."""
    session = get_session()
    try:
        doc = session.get(Document, doc_id)
        if doc is None:
            return None
        return {
            "doc_id": doc.doc_id,
            "original_filename": doc.filename,
            "file_ext": doc.file_ext,
            "file_size": doc.file_size_bytes,
            "page_count": doc.page_count,
            "status": doc.status,
            "error_message": doc.error_message,
            "classification": doc.classification,
            "chunk_count": doc.chunk_count,
            "upload_time": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "indexed_at": doc.indexed_at.isoformat() if doc.indexed_at else None,
        }
    finally:
        session.close()


def upsert_document(
    doc_id: str,
    filename: str,
    file_ext: str,
    file_size: int,
    status: str,
    page_count: int = 0,
    classification: dict | None = None,
    chunk_count: int = 0,
    error_message: str | None = None,
) -> None:
    """Insert or update a document record."""
    session = get_session()
    try:
        doc = session.get(Document, doc_id)
        if doc is None:
            doc = Document(doc_id=doc_id, filename=filename, file_ext=file_ext)
            session.add(doc)

        doc.filename = filename
        doc.file_ext = file_ext
        doc.file_size_bytes = file_size
        doc.status = status
        doc.page_count = page_count
        doc.classification = classification
        doc.chunk_count = chunk_count
        doc.error_message = error_message

        if status == "indexed" and doc.indexed_at is None:
            doc.indexed_at = datetime.utcnow()

        session.commit()
    except Exception as e:
        logger.error(f"upsert_document failed for {doc_id}: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def list_documents() -> list[dict]:
    """Return all document records, most recent first."""
    session = get_session()
    try:
        docs = session.query(Document).order_by(Document.uploaded_at.desc()).all()
        return [
            {
                "doc_id": d.doc_id,
                "original_filename": d.filename,
                "page_count": d.page_count,
                "status": d.status,
                "classification": d.classification,
                "chunk_count": d.chunk_count,
                "upload_time": d.uploaded_at.isoformat() if d.uploaded_at else None,
            }
            for d in docs
        ]
    finally:
        session.close()