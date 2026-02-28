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


# ── Papers ────────────────────────────────────────────────────────────────────


def test_list_papers_empty() -> None:
    response = client.get("/api/papers")
    assert response.status_code == 200
    assert response.json() == []


def test_save_and_list_paper() -> None:
    paper = {"header": {"title": "History Final", "subject": "History", "institution": "",
                        "date": "", "duration": "", "total_marks": 0},
             "questions": [], "style": {}}
    save_resp = client.post("/api/papers", json=paper)
    assert save_resp.status_code == 200
    saved = save_resp.json()
    assert saved["header"]["title"] == "History Final"
    assert "id" in saved

    list_resp = client.get("/api/papers")
    assert list_resp.status_code == 200
    summaries = list_resp.json()
    assert len(summaries) == 1
    assert summaries[0]["title"] == "History Final"
    assert summaries[0]["subject"] == "History"


def test_get_paper_by_id() -> None:
    paper = {"header": {"title": "Physics Mid", "subject": "Physics", "institution": "",
                        "date": "", "duration": "", "total_marks": 50},
             "questions": [], "style": {}}
    saved = client.post("/api/papers", json=paper).json()
    fetched = client.get(f"/api/papers/{saved['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == saved["id"]
    assert fetched.json()["header"]["total_marks"] == 50


def test_get_paper_not_found() -> None:
    response = client.get("/api/papers/nonexistent-id")
    assert response.status_code == 404


def test_delete_paper() -> None:
    saved = client.post("/api/papers", json={"header": {"title": "Delete Me",
                        "subject": "", "institution": "", "date": "", "duration": "",
                        "total_marks": 0}, "questions": [], "style": {}}).json()
    del_resp = client.delete(f"/api/papers/{saved['id']}")
    assert del_resp.status_code == 200
    assert client.get(f"/api/papers/{saved['id']}").status_code == 404


def test_delete_paper_not_found() -> None:
    response = client.delete("/api/papers/nonexistent-id")
    assert response.status_code == 404


# ── Templates ─────────────────────────────────────────────────────────────────


def test_list_templates_empty() -> None:
    response = client.get("/api/templates")
    assert response.status_code == 200
    assert response.json() == []


def test_save_and_get_template() -> None:
    template = {"name": "Midterm Layout", "header": {"title": "", "subject": "",
                "institution": "", "date": "", "duration": "", "total_marks": 0},
                "questions": [], "style": {}}
    saved = client.post("/api/templates", json=template).json()
    assert saved["name"] == "Midterm Layout"
    assert "id" in saved

    fetched = client.get(f"/api/templates/{saved['id']}").json()
    assert fetched["id"] == saved["id"]
    assert fetched["name"] == "Midterm Layout"


def test_list_templates_returns_summary() -> None:
    client.post("/api/templates", json={"name": "T1", "header": {"title": "", "subject": "",
                "institution": "", "date": "", "duration": "", "total_marks": 0},
                "questions": [], "style": {}})
    summaries = client.get("/api/templates").json()
    assert len(summaries) == 1
    assert summaries[0]["name"] == "T1"
    assert "created_at" in summaries[0]


def test_get_template_not_found() -> None:
    assert client.get("/api/templates/missing").status_code == 404


def test_delete_template() -> None:
    saved = client.post("/api/templates", json={"name": "Bye", "header": {"title": "",
                "subject": "", "institution": "", "date": "", "duration": "",
                "total_marks": 0}, "questions": [], "style": {}}).json()
    assert client.delete(f"/api/templates/{saved['id']}").status_code == 200
    assert client.get(f"/api/templates/{saved['id']}").status_code == 404


def test_save_paper_updates_updated_at() -> None:
    """Re-saving a paper should bump its updated_at timestamp."""
    paper = {"header": {"title": "Evolving Paper", "subject": "", "institution": "",
                        "date": "", "duration": "", "total_marks": 0},
             "questions": [], "style": {}}
    first = client.post("/api/papers", json=paper).json()
    import time; time.sleep(0.01)
    first["header"]["title"] = "Evolved"
    second = client.post("/api/papers", json=first).json()
    assert second["updated_at"] >= first["updated_at"]
    assert second["header"]["title"] == "Evolved"


# ── Export ────────────────────────────────────────────────────────────────────

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

_PAPER_PAYLOAD = {
    "header": {"title": "Final Exam", "subject": "Math", "institution": "",
               "date": "", "duration": "", "total_marks": 0},
    "questions": [],
    "style": {},
}

_MCQ_PAPER_PAYLOAD = {
    "header": {"title": "Quiz", "subject": "", "institution": "",
               "date": "", "duration": "", "total_marks": 0},
    "questions": [
        {
            "type": "mcq",
            "id": "q1",
            "section": "",
            "marks": 1,
            "stem": {"type": "doc", "content": []},
            "options": [
                {"label": "A", "text": "Wrong", "is_correct": False},
                {"label": "B", "text": "Right", "is_correct": True},
                {"label": "C", "text": "Wrong", "is_correct": False},
                {"label": "D", "text": "Wrong", "is_correct": False},
            ],
        }
    ],
    "style": {},
}


def test_export_paper_returns_docx() -> None:
    response = client.post("/api/papers/export", json=_PAPER_PAYLOAD)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(DOCX_MIME)
    assert len(response.content) > 0


def test_export_paper_content_disposition_filename() -> None:
    response = client.post("/api/papers/export", json=_PAPER_PAYLOAD)
    assert response.status_code == 200
    cd = response.headers.get("content-disposition", "")
    assert "attachment" in cd
    assert ".docx" in cd


def test_export_paper_filename_sanitized() -> None:
    """Titles with special chars must not produce path-traversal filenames."""
    payload = dict(_PAPER_PAYLOAD)
    payload["header"] = {**_PAPER_PAYLOAD["header"], "title": "../../../etc/passwd"}
    response = client.post("/api/papers/export", json=payload)
    assert response.status_code == 200
    cd = response.headers.get("content-disposition", "")
    assert ".." not in cd
    assert "/" not in cd.split("filename=")[-1]


def test_export_answer_key_returns_docx_when_answers_marked() -> None:
    response = client.post("/api/papers/export-answer-key", json=_MCQ_PAPER_PAYLOAD)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(DOCX_MIME)
    assert len(response.content) > 0


def test_export_answer_key_returns_400_when_no_answers_marked() -> None:
    payload = dict(_MCQ_PAPER_PAYLOAD)
    # All options have is_correct=False
    no_answers = {**_MCQ_PAPER_PAYLOAD["questions"][0]}
    no_answers["options"] = [
        {"label": l, "text": "x", "is_correct": False} for l in ("A", "B", "C", "D")
    ]
    payload = {**_MCQ_PAPER_PAYLOAD, "questions": [no_answers]}
    response = client.post("/api/papers/export-answer-key", json=payload)
    assert response.status_code == 400


def test_export_answer_key_filename_includes_answer_key() -> None:
    response = client.post("/api/papers/export-answer-key", json=_MCQ_PAPER_PAYLOAD)
    assert response.status_code == 200
    cd = response.headers.get("content-disposition", "")
    assert "answer_key" in cd or "answer-key" in cd
