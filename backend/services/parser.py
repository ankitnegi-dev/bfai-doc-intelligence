"""
Document Parser Service
-----------------------
Handles: digital PDFs, PDFs with tables, scanned/handwritten PDFs via OCR, plain text.
Uses PyMuPDF (fitz) for page image rendering and pdfplumber for text/table extraction.
Falls back to EasyOCR for scanned pages when text layer is empty.
"""
import os
import io
import logging
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF - renders PDF pages without needing poppler
import pdfplumber
from PIL import Image

from models.document import PageData

logger = logging.getLogger(__name__)

# Storage paths
STORAGE_DIR = Path(__file__).parent.parent / "storage"
PAGES_DIR = STORAGE_DIR / "pages"
PAGES_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)

# OCR reader (lazy init to avoid startup delay)
_ocr_reader = None

MAX_PAGES = 50          # Safety limit to prevent memory exhaustion
OCR_THRESHOLD = 50      # Min chars to consider a page "has text"
DPI = 150               # Page rendering resolution


def _get_ocr_reader():
    """Lazy-load EasyOCR reader (downloads model on first call)."""
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
            _ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            logger.info("EasyOCR reader initialized")
        except Exception as e:
            logger.warning(f"EasyOCR init failed: {e}")
            _ocr_reader = None
    return _ocr_reader


def _tables_to_markdown(tables: list) -> list[str]:
    """Convert pdfplumber table data (list of lists) to markdown-formatted strings."""
    result = []
    for table in tables:
        if not table:
            continue
        # Filter None values
        cleaned = [[str(cell) if cell is not None else "" for cell in row] for row in table]
        if not cleaned:
            continue

        # Build markdown table
        header = cleaned[0]
        divider = ["---"] * len(header)
        rows = cleaned[1:] if len(cleaned) > 1 else []

        lines = []
        lines.append("| " + " | ".join(header) + " |")
        lines.append("| " + " | ".join(divider) + " |")
        for row in rows:
            # Pad row if shorter than header
            padded = row + [""] * (len(header) - len(row))
            lines.append("| " + " | ".join(padded[:len(header)]) + " |")

        result.append("\n".join(lines))
    return result


def render_page_image(doc_hash: str, page_num: int, fitz_page) -> str:
    """
    Render a single PDF page to PNG using PyMuPDF.
    Returns the saved file path.
    """
    try:
        mat = fitz.Matrix(DPI / 72, DPI / 72)  # scale factor for DPI
        pix = fitz_page.get_pixmap(matrix=mat, alpha=False)
        image_filename = f"{doc_hash}_{page_num}.png"
        image_path = PAGES_DIR / image_filename
        pix.save(str(image_path))
        return str(image_path)
    except Exception as e:
        logger.error(f"Failed to render page {page_num}: {e}")
        return ""


def extract_text_with_ocr(image_path: str) -> tuple[str, float]:
    """Use EasyOCR to extract text from a page image. Returns (text, confidence)."""
    reader = _get_ocr_reader()
    if reader is None:
        return "", 0.0

    try:
        results = reader.readtext(image_path)
        if not results:
            return "", 0.0

        texts = []
        confidences = []
        for (_, text, conf) in results:
            texts.append(text)
            confidences.append(conf)

        avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
        return " ".join(texts), avg_conf
    except Exception as e:
        logger.error(f"OCR failed on {image_path}: {e}")
        return "", 0.0


def parse_document(file_path: str, doc_hash: str) -> list[PageData]:
    """
    Main entry point. Parses a document and returns a list of PageData.
    Handles: PDF (digital, scanned, tables), plain text.
    """
    file_path = Path(file_path)
    ext = file_path.suffix.lower()

    if ext == ".txt":
        return _parse_text_file(file_path, doc_hash)
    elif ext == ".pdf":
        return _parse_pdf(file_path, doc_hash)
    else:
        logger.warning(f"Unsupported extension: {ext}, attempting text read")
        return _parse_text_file(file_path, doc_hash)


def _parse_text_file(file_path: Path, doc_hash: str) -> list[PageData]:
    """Parse a plain text file as a single page."""
    try:
        text = file_path.read_text(encoding="utf-8", errors="replace")
        # Sanitize text
        text = _sanitize_text(text)

        # Create a simple placeholder image (white 800x1100)
        img = Image.new("RGB", (800, 1100), color=(255, 255, 255))
        image_filename = f"{doc_hash}_1.png"
        image_path = PAGES_DIR / image_filename
        img.save(str(image_path))

        return [PageData(
            page_num=1,
            text=text,
            tables=[],
            image_path=str(image_path),
            extraction_method="text",
            word_count=len(text.split()),
            has_tables=False,
        )]
    except Exception as e:
        logger.error(f"Failed to parse text file {file_path}: {e}")
        return []


def _parse_pdf(file_path: Path, doc_hash: str) -> list[PageData]:
    """
    Parse a PDF file page by page.
    - Uses pdfplumber for text and table extraction
    - Uses PyMuPDF for page image rendering
    - Falls back to EasyOCR for scanned pages
    """
    pages_data = []

    try:
        # Open with both pdfplumber and PyMuPDF
        fitz_doc = fitz.open(str(file_path))
        total_pages = min(len(fitz_doc), MAX_PAGES)

        with pdfplumber.open(str(file_path)) as plumber_doc:
            for page_idx in range(total_pages):
                page_num = page_idx + 1
                try:
                    plumber_page = plumber_doc.pages[page_idx]
                    fitz_page = fitz_doc[page_idx]

                    # 1. Render page image using PyMuPDF
                    image_path = render_page_image(doc_hash, page_num, fitz_page)

                    # 2. Extract text via pdfplumber
                    raw_text = plumber_page.extract_text() or ""
                    raw_text = _sanitize_text(raw_text)

                    # 3. Extract tables via pdfplumber
                    raw_tables = plumber_page.extract_tables() or []
                    tables = _tables_to_markdown(raw_tables)

                    # 4. If text is too short (scanned page), try OCR
                    method = "pdfplumber"
                    confidence = 1.0

                    if len(raw_text.strip()) < OCR_THRESHOLD and image_path:
                        logger.info(f"Page {page_num} has sparse text, attempting OCR")
                        ocr_text, confidence = extract_text_with_ocr(image_path)
                        if ocr_text.strip():
                            raw_text = ocr_text
                            method = "ocr"

                    # 5. Combine text with table text
                    full_text = raw_text
                    if tables:
                        full_text += "\n\n" + "\n\n".join(tables)

                    pages_data.append(PageData(
                        page_num=page_num,
                        text=full_text.strip(),
                        tables=tables,
                        image_path=image_path,
                        extraction_method=method,
                        word_count=len(full_text.split()),
                        has_tables=len(tables) > 0,
                        ocr_confidence=confidence,
                    ))

                except Exception as e:
                    logger.error(f"Error parsing page {page_num}: {e}")
                    continue

        fitz_doc.close()

    except Exception as e:
        logger.error(f"Failed to parse PDF {file_path}: {e}")

    return pages_data


def _sanitize_text(text: str) -> str:
    """Strip null bytes and non-UTF-8 artifacts from extracted text."""
    if not text:
        return ""
    # Remove null bytes
    text = text.replace("\x00", "")
    # Encode/decode to strip invalid UTF-8
    text = text.encode("utf-8", errors="replace").decode("utf-8")
    # Limit to 4000 chars for LLM processing safety
    return text.strip()
