"""
Embedder Service
----------------
Generates vector embeddings using sentence-transformers.
Uses the lightweight all-MiniLM-L6-v2 model (80MB).
"""
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

# Lazy global model instance
_model = None


def _get_model():
    """Lazy-load the sentence transformer model."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading sentence-transformers model (all-MiniLM-L6-v2)...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Model loaded successfully")
    return _model


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of text chunks.
    Returns a list of embedding vectors.
    """
    if not chunks:
        return []
    try:
        model = _get_model()
        embeddings = model.encode(
            chunks,
            batch_size=32,
            show_progress_bar=False,
            normalize_embeddings=True
        )
        return embeddings.tolist()
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise


def embed_query(query: str) -> list[float]:
    """Embed a single query string."""
    results = embed_chunks([query])
    return results[0] if results else []