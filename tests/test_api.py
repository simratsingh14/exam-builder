"""Integration tests for FastAPI endpoints."""

import io
import struct
import zlib

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _make_png() -> bytes:
    """Build a minimal valid 1×1 white PNG in pure Python."""

    def chunk(name: bytes, data: bytes) -> bytes:
        length = struct.pack(">I", len(data))
        crc = struct.pack(">I", zlib.crc32(name + data) & 0xFFFFFFFF)
        return length + name + data + crc

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    idat = chunk(b"IDAT", zlib.compress(b"\x00\xff\xff\xff"))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


# ── Health ────────────────────────────────────────────────────────────────────


def test_health_check() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ── Image upload ──────────────────────────────────────────────────────────────


def test_upload_valid_png() -> None:
    response = client.post(
        "/api/uploads/image",
        files={"file": ("photo.png", io.BytesIO(_make_png()), "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "filename" in data
    assert "url" in data
    assert data["filename"].endswith(".png")


def test_upload_returns_unique_filenames() -> None:
    png = _make_png()
    r1 = client.post("/api/uploads/image", files={"file": ("a.png", io.BytesIO(png), "image/png")})
    r2 = client.post("/api/uploads/image", files={"file": ("a.png", io.BytesIO(png), "image/png")})
    assert r1.json()["filename"] != r2.json()["filename"]


def test_upload_rejects_pdf() -> None:
    response = client.post(
        "/api/uploads/image",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
    )
    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"].lower()


def test_upload_rejects_fake_png_with_wrong_magic() -> None:
    """File claims to be PNG but has wrong magic bytes — must be rejected."""
    response = client.post(
        "/api/uploads/image",
        files={"file": ("evil.png", io.BytesIO(b"not a real png content here"), "image/png")},
    )
    assert response.status_code == 400


def test_upload_rejects_oversized_file() -> None:
    big = b"\x89PNG" + b"X" * (11 * 1024 * 1024)  # 11 MB, over the 10 MB limit
    response = client.post(
        "/api/uploads/image",
        files={"file": ("big.png", io.BytesIO(big), "image/png")},
    )
    assert response.status_code == 400
    assert "large" in response.json()["detail"].lower()


def test_get_uploaded_image() -> None:
    upload = client.post(
        "/api/uploads/image",
        files={"file": ("photo.png", io.BytesIO(_make_png()), "image/png")},
    )
    filename = upload.json()["filename"]
    response = client.get(f"/api/uploads/{filename}")
    assert response.status_code == 200


def test_get_missing_image_returns_404() -> None:
    response = client.get("/api/uploads/nonexistent.png")
    assert response.status_code == 404
