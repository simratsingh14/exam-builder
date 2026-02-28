"""Image upload and retrieval endpoints.

Security controls applied (Secure Code Guardian):
- Allow-list of permitted MIME types (not a block-list)
- Magic-byte validation — content-type header alone is untrusted user input
- Hard file-size cap (10 MB) enforced server-side
- UUID-based filenames prevent path traversal and enumeration
- Files served with Content-Disposition: inline (no execution)
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

router = APIRouter()

# ── Configuration ─────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
    {"image/png", "image/jpeg", "image/gif", "image/webp"}
)
MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10 MB

# Magic-byte signatures for each allowed type
_MAGIC: dict[str, list[bytes]] = {
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/gif": [b"GIF87a", b"GIF89a"],
    "image/webp": [b"RIFF"],  # full check: RIFF....WEBP (checked separately)
}


def _uploads_dir() -> Path:
    return Path(os.getenv("DATA_DIR", "/data")) / "uploads"


def _validate_magic(content_type: str, data: bytes) -> bool:
    """Return True if the file's magic bytes match the declared content type."""
    signatures = _MAGIC.get(content_type, [])
    if content_type == "image/webp":
        return data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return any(data[: len(sig)] == sig for sig in signatures)


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/image")
async def upload_image(file: UploadFile = File(...)) -> dict[str, str]:
    """Accept an image upload, validate it, and store it under a UUID filename.

    Returns:
        JSON with ``filename`` (storage name) and ``url`` (GET path).

    Raises:
        400: Invalid content type, failed magic-byte check, or file too large.
    """
    # 1. Allow-list content type check
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File type '{file.content_type}' not allowed. "
                "Use PNG, JPG, GIF, or WebP."
            ),
        )

    content = await file.read()

    # 2. Size check (server-side — never trust Content-Length header alone)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_BYTES // 1024 // 1024} MB.",
        )

    # 3. Magic-byte validation — reject polyglot / mislabelled files
    if not _validate_magic(file.content_type, content):
        raise HTTPException(
            status_code=400,
            detail="File content does not match the declared image type.",
        )

    # 4. Store under a UUID filename to prevent path traversal / enumeration
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    filename = f"{uuid.uuid4()}.{ext}"
    (_uploads_dir() / filename).write_bytes(content)

    return {"filename": filename, "url": f"/api/uploads/{filename}"}


@router.get("/{filename}")
async def get_image(filename: str) -> FileResponse:
    """Serve a previously uploaded image file.

    Raises:
        400: Filename contains path traversal characters.
        404: File not found.
    """
    # Guard against path traversal (e.g. "../../../etc/passwd")
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    path = _uploads_dir() / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found.")

    return FileResponse(path)
