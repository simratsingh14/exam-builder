# Exam Builder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-user, Docker-hosted web tool for creating formatted exam question papers with a polished editor UI and one-click `.docx` export.

**Architecture:** FastAPI backend serves both the REST API and the React SPA as static files from a single Docker container. All data (papers, templates, uploaded images) persists in a `/data` volume mounted from the NAS. The frontend uses TipTap for rich text editing and python-docx handles `.docx` generation server-side.

**Tech Stack:** Python 3.12, FastAPI, python-docx, UV, React 19, TypeScript, TipTap v2, Tailwind CSS v4, Vite, @dnd-kit, Docker (multi-stage build)

**Skills to invoke during implementation** (from `fullstack-dev-skills` plugin):

| Task(s) | Skill to invoke |
|---------|----------------|
| 1–2 (project init, FastAPI skeleton) | `fullstack-dev-skills:fastapi-expert` |
| 3 (Dockerfile, docker-compose) | `fullstack-dev-skills:devops-engineer` |
| 4–5 (models, storage) | `fullstack-dev-skills:python-pro` |
| 6–8 (API routes) | `fullstack-dev-skills:fastapi-expert` + `fullstack-dev-skills:api-designer` |
| 6 (image upload security) | `fullstack-dev-skills:secure-code-guardian` |
| 9 (write tests first) | `fullstack-dev-skills:test-master` |
| 10 (DOCX builder) | `fullstack-dev-skills:python-pro` |
| 11 (export endpoint) | `fullstack-dev-skills:fastapi-expert` |
| 12 (Vite + React scaffold) | `fullstack-dev-skills:react-expert` |
| 13 (TypeScript types + API client) | `fullstack-dev-skills:typescript-pro` |
| 14–18 (UI components) | `fullstack-dev-skills:react-expert` |
| 19–21 (template, style, export panels) | `fullstack-dev-skills:react-expert` + `fullstack-dev-skills:fullstack-guardian` |
| 22 (final verification) | `fullstack-dev-skills:devops-engineer` |

---

## Project Structure (final target)

```
exam-builder/
├── pyproject.toml
├── uv.lock
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── docs/plans/
├── backend/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py
│   ├── storage.py
│   └── routers/
│       ├── __init__.py
│       ├── papers.py
│       ├── templates.py
│       ├── uploads.py
│       └── export.py
│   └── docx_builder/
│       ├── __init__.py
│       └── builder.py
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── types.ts
│       ├── api.ts
│       └── components/
│           ├── Layout.tsx
│           ├── Sidebar.tsx
│           ├── PaperEditor.tsx
│           ├── PaperHeaderForm.tsx
│           ├── QuestionList.tsx
│           ├── QuestionCard.tsx
│           ├── questions/
│           │   ├── TextQuestion.tsx
│           │   ├── MCQQuestion.tsx
│           │   ├── TableQuestion.tsx
│           │   └── ImageQuestion.tsx
│           ├── TemplatePanel.tsx
│           ├── StylePanel.tsx
│           └── ExportPanel.tsx
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── test_models.py
    ├── test_storage.py
    ├── test_docx_builder.py
    └── test_api.py
```

---

## Phase 1: Foundation

### Task 1: Initialize UV project + directory structure

> **Skill:** invoke `fullstack-dev-skills:python-pro` before starting this task.

**Files:**
- Create: `pyproject.toml`
- Create: `backend/__init__.py`
- Create: `backend/routers/__init__.py`
- Create: `backend/docx_builder/__init__.py`
- Create: `tests/__init__.py`
- Create: `.gitignore`

**Step 1: Initialize UV project**

```bash
cd /path/to/exam-builder
uv init --no-workspace
```

**Step 2: Replace generated `pyproject.toml` with this:**

```toml
[project]
name = "exam-builder"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.32",
    "python-docx>=1.1",
    "python-multipart>=0.0.12",
    "pydantic>=2.9",
    "pillow>=11.0",
]

[tool.uv]
dev-dependencies = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "httpx>=0.28",
]
```

**Step 3: Install dependencies**

```bash
uv sync
```

Expected: creates `uv.lock`, installs all deps into `.venv/`

**Step 4: Create directory structure**

```bash
mkdir -p backend/routers backend/docx_builder tests frontend
touch backend/__init__.py backend/routers/__init__.py backend/docx_builder/__init__.py tests/__init__.py
```

**Step 5: Create `.gitignore`**

```
.venv/
__pycache__/
*.pyc
.pytest_cache/
frontend/node_modules/
frontend/dist/
.env
```

**Step 6: Commit**

```bash
git add pyproject.toml uv.lock backend/ tests/ .gitignore
git commit -m "chore: initialize UV project with directory structure"
```

---

### Task 2: FastAPI app skeleton

> **Skill:** invoke `fullstack-dev-skills:fastapi-expert` before starting this task.

**Files:**
- Create: `backend/main.py`

**Step 1: Write the failing test**

Create `tests/test_api.py`:

```python
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

**Step 2: Run to verify it fails**

```bash
uv run pytest tests/test_api.py::test_health_check -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'backend.main'`

**Step 3: Create `backend/main.py`**

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import os

DATA_DIR = Path(os.getenv("DATA_DIR", "/data"))
for sub in ("papers", "templates", "uploads"):
    (DATA_DIR / sub).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Exam Builder")

@app.get("/api/health")
async def health():
    return {"status": "ok"}

# Serve React SPA static files in production
STATIC_DIR = Path(__file__).parent.parent / "frontend" / "dist"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        return FileResponse(STATIC_DIR / "index.html")
```

**Step 4: Run test to verify it passes**

```bash
uv run pytest tests/test_api.py::test_health_check -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/main.py tests/test_api.py
git commit -m "feat: add FastAPI app skeleton with health check"
```

---

### Task 3: Dockerfile + docker-compose

> **Skill:** invoke `fullstack-dev-skills:devops-engineer` before starting this task.

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Step 1: Create `Dockerfile`**

```dockerfile
# Stage 1: Build React frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.12-slim
WORKDIR /app

# Install UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install Python dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 2: Create `docker-compose.yml`**

```yaml
services:
  exam-builder:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - exam-data:/data
    restart: unless-stopped
    environment:
      - DATA_DIR=/data

volumes:
  exam-data:
```

**Step 3: Create `.dockerignore`**

```
.venv/
__pycache__/
*.pyc
.pytest_cache/
frontend/node_modules/
frontend/dist/
.git/
docs/
tests/
```

**Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "chore: add multi-stage Dockerfile and docker-compose"
```

---

## Phase 2: Backend Models & Storage

### Task 4: Pydantic models

> **Skill:** invoke `fullstack-dev-skills:python-pro` before starting this task.

**Files:**
- Create: `backend/models.py`

**Step 1: Write failing test**

Create `tests/test_models.py`:

```python
from backend.models import Paper, PaperHeader, PaperStyle, TextQuestion, MCQQuestion, MCQOption, TableQuestion, ImageQuestion, Template

def test_paper_has_default_id():
    paper = Paper()
    assert paper.id is not None
    assert len(paper.id) == 36  # UUID format

def test_mcq_question_has_four_options():
    q = MCQQuestion(
        stem={"type": "doc", "content": []},
        options=[
            MCQOption(label="A", text="Option A"),
            MCQOption(label="B", text="Option B"),
            MCQOption(label="C", text="Option C"),
            MCQOption(label="D", text="Option D"),
        ]
    )
    assert len(q.options) == 4

def test_paper_serializes_question_union():
    paper = Paper(questions=[
        TextQuestion(content={"type": "doc", "content": []}),
        MCQQuestion(stem={"type": "doc", "content": []}, options=[]),
    ])
    data = paper.model_dump()
    assert data["questions"][0]["type"] == "text"
    assert data["questions"][1]["type"] == "mcq"
```

**Step 2: Run to verify it fails**

```bash
uv run pytest tests/test_models.py -v
```

Expected: FAIL — `ModuleNotFoundError`

**Step 3: Create `backend/models.py`**

```python
from pydantic import BaseModel, Field
from typing import Literal, Union, Optional, Annotated
from uuid import uuid4
from datetime import datetime


def _uuid() -> str:
    return str(uuid4())


def _now() -> str:
    return datetime.now().isoformat()


class TextQuestion(BaseModel):
    type: Literal["text"] = "text"
    id: str = Field(default_factory=_uuid)
    section: str = ""
    marks: float = 0
    content: dict  # TipTap JSON


class MCQOption(BaseModel):
    label: str  # "A", "B", "C", "D"
    text: str
    is_correct: bool = False


class MCQQuestion(BaseModel):
    type: Literal["mcq"] = "mcq"
    id: str = Field(default_factory=_uuid)
    section: str = ""
    marks: float = 0
    stem: dict  # TipTap JSON
    options: list[MCQOption] = Field(default_factory=list)


class TableQuestion(BaseModel):
    type: Literal["table"] = "table"
    id: str = Field(default_factory=_uuid)
    section: str = ""
    marks: float = 0
    content: dict  # TipTap JSON containing a table node


class ImageQuestion(BaseModel):
    type: Literal["image"] = "image"
    id: str = Field(default_factory=_uuid)
    section: str = ""
    marks: float = 0
    filename: str
    caption: str = ""


Question = Annotated[
    Union[TextQuestion, MCQQuestion, TableQuestion, ImageQuestion],
    Field(discriminator="type"),
]


class PaperStyle(BaseModel):
    font_family: str = "Times New Roman"
    font_size: int = 12
    logo_filename: Optional[str] = None
    header_text: str = ""
    footer_text: str = ""
    margin_top: float = 1.0    # inches
    margin_bottom: float = 1.0
    margin_left: float = 1.25
    margin_right: float = 1.25
    accent_color: str = "#000000"


class PaperHeader(BaseModel):
    institution: str = ""
    title: str = ""
    subject: str = ""
    date: str = ""
    duration: str = ""
    total_marks: float = 0


class Paper(BaseModel):
    id: str = Field(default_factory=_uuid)
    created_at: str = Field(default_factory=_now)
    updated_at: str = Field(default_factory=_now)
    header: PaperHeader = Field(default_factory=PaperHeader)
    questions: list[Question] = Field(default_factory=list)
    style: PaperStyle = Field(default_factory=PaperStyle)


class PaperSummary(BaseModel):
    id: str
    title: str
    subject: str
    updated_at: str


class Template(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    created_at: str = Field(default_factory=_now)
    header: PaperHeader = Field(default_factory=PaperHeader)
    questions: list[Question] = Field(default_factory=list)
    style: PaperStyle = Field(default_factory=PaperStyle)


class TemplateSummary(BaseModel):
    id: str
    name: str
    created_at: str
```

**Step 4: Run tests to verify they pass**

```bash
uv run pytest tests/test_models.py -v
```

Expected: 3 PASS

**Step 5: Commit**

```bash
git add backend/models.py tests/test_models.py
git commit -m "feat: add Pydantic models for Paper, Template, and Question types"
```

---

### Task 5: Storage utilities

> **Skill:** invoke `fullstack-dev-skills:python-pro` before starting this task.

**Files:**
- Create: `backend/storage.py`
- Create: `tests/conftest.py`
- Modify: `tests/test_storage.py`

**Step 1: Create `tests/conftest.py`** (sets up temp data dir for all tests)

```python
import pytest
from pathlib import Path


@pytest.fixture(autouse=True)
def temp_data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    for sub in ("papers", "templates", "uploads"):
        (tmp_path / sub).mkdir()
    # Reload storage module so it picks up the new DATA_DIR
    import importlib
    import backend.storage as storage_mod
    importlib.reload(storage_mod)
    return tmp_path
```

**Step 2: Write failing tests in `tests/test_storage.py`**

```python
from backend.models import Paper, PaperHeader, Template
from backend.storage import save_item, load_item, list_items


def test_save_and_load_paper():
    paper = Paper(header=PaperHeader(title="Math Test"))
    save_item("papers", paper.id, paper)
    loaded = load_item("papers", paper.id, Paper)
    assert loaded is not None
    assert loaded.header.title == "Math Test"
    assert loaded.id == paper.id


def test_load_missing_returns_none():
    result = load_item("papers", "nonexistent", Paper)
    assert result is None


def test_list_items_empty():
    items = list_items("papers", Paper)
    assert items == []


def test_list_items_returns_all():
    p1 = Paper(header=PaperHeader(title="Paper 1"))
    p2 = Paper(header=PaperHeader(title="Paper 2"))
    save_item("papers", p1.id, p1)
    save_item("papers", p2.id, p2)
    items = list_items("papers", Paper)
    assert len(items) == 2
```

**Step 3: Run to verify they fail**

```bash
uv run pytest tests/test_storage.py -v
```

Expected: FAIL — `ModuleNotFoundError`

**Step 4: Create `backend/storage.py`**

```python
import json
from pathlib import Path
from typing import TypeVar, Type
from pydantic import BaseModel
import os

T = TypeVar("T", bound=BaseModel)


def _data_dir() -> Path:
    return Path(os.getenv("DATA_DIR", "/data"))


def save_item(directory: str, item_id: str, data: BaseModel) -> None:
    path = _data_dir() / directory / f"{item_id}.json"
    path.write_text(data.model_dump_json())


def load_item(directory: str, item_id: str, model: Type[T]) -> T | None:
    path = _data_dir() / directory / f"{item_id}.json"
    if not path.exists():
        return None
    return model.model_validate_json(path.read_text())


def list_items(directory: str, model: Type[T]) -> list[T]:
    path = _data_dir() / directory
    items = []
    for file in sorted(path.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True):
        try:
            items.append(model.model_validate_json(file.read_text()))
        except Exception:
            pass
    return items


def delete_item(directory: str, item_id: str) -> bool:
    path = _data_dir() / directory / f"{item_id}.json"
    if path.exists():
        path.unlink()
        return True
    return False
```

**Step 5: Run tests to verify they pass**

```bash
uv run pytest tests/test_storage.py -v
```

Expected: 4 PASS

**Step 6: Commit**

```bash
git add backend/storage.py tests/test_storage.py tests/conftest.py
git commit -m "feat: add JSON storage utilities with CRUD operations"
```

---

## Phase 3: API Routes

### Task 6: Image upload route

> **Skills:** invoke `fullstack-dev-skills:fastapi-expert` + `fullstack-dev-skills:secure-code-guardian` before starting this task (upload validation is a security boundary).

**Files:**
- Create: `backend/routers/uploads.py`

**Step 1: Write failing tests — add to `tests/test_api.py`**

```python
import io

def test_upload_image_valid(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    for sub in ("papers", "templates", "uploads"):
        (tmp_path / sub).mkdir(exist_ok=True)

    # Create a minimal 1x1 PNG in memory
    import struct, zlib
    def make_png():
        sig = b'\x89PNG\r\n\x1a\n'
        def chunk(name, data):
            c = struct.pack('>I', len(data)) + name + data
            return c + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
        ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
        idat = chunk(b'IDAT', zlib.compress(b'\x00\xff\xff\xff'))
        iend = chunk(b'IEND', b'')
        return sig + ihdr + idat + iend

    png_bytes = make_png()
    response = client.post(
        "/api/uploads/image",
        files={"file": ("test.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert response.status_code == 200
    assert "filename" in response.json()


def test_upload_image_invalid_type(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    for sub in ("papers", "templates", "uploads"):
        (tmp_path / sub).mkdir(exist_ok=True)

    response = client.post(
        "/api/uploads/image",
        files={"file": ("test.pdf", io.BytesIO(b"%PDF"), "application/pdf")},
    )
    assert response.status_code == 400
```

**Step 2: Run to verify they fail**

```bash
uv run pytest tests/test_api.py -v
```

Expected: new tests FAIL — router not registered

**Step 3: Create `backend/routers/uploads.py`**

```python
from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import uuid
import os

router = APIRouter()

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


def _uploads_dir() -> Path:
    return Path(os.getenv("DATA_DIR", "/data")) / "uploads"


@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            400,
            detail=f"File type '{file.content_type}' not allowed. Use PNG, JPG, GIF, or WebP.",
        )
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, detail="File too large. Maximum size is 10 MB.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    (_uploads_dir() / filename).write_bytes(content)
    return {"filename": filename, "url": f"/api/uploads/{filename}"}


@router.get("/{filename}")
async def get_image(filename: str):
    from fastapi.responses import FileResponse
    path = _uploads_dir() / filename
    if not path.exists():
        raise HTTPException(404, detail="Image not found")
    return FileResponse(path)
```

**Step 4: Register the router in `backend/main.py`**

Add after the existing imports and before the health check:

```python
from .routers import uploads

app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])
```

**Step 5: Run tests**

```bash
uv run pytest tests/test_api.py -v
```

Expected: all PASS

**Step 6: Commit**

```bash
git add backend/routers/uploads.py backend/main.py tests/test_api.py
git commit -m "feat: add image upload endpoint with type and size validation"
```

---

### Task 7: Papers CRUD routes

> **Skills:** invoke `fullstack-dev-skills:fastapi-expert` + `fullstack-dev-skills:api-designer` before starting this task.

**Files:**
- Create: `backend/routers/papers.py`

**Step 1: Write failing tests — add to `tests/test_api.py`**

```python
from backend.models import Paper, PaperHeader

def test_list_papers_empty():
    response = client.get("/api/papers")
    assert response.status_code == 200
    assert response.json() == []

def test_save_and_get_paper():
    paper = Paper(header=PaperHeader(title="History Final"))
    response = client.post("/api/papers", content=paper.model_dump_json(),
                           headers={"Content-Type": "application/json"})
    assert response.status_code == 200
    saved = response.json()
    assert saved["header"]["title"] == "History Final"

    response2 = client.get(f"/api/papers/{saved['id']}")
    assert response2.status_code == 200
    assert response2.json()["id"] == saved["id"]

def test_get_paper_not_found():
    response = client.get("/api/papers/nonexistent-id")
    assert response.status_code == 404
```

**Step 2: Run to verify they fail**

```bash
uv run pytest tests/test_api.py::test_list_papers_empty tests/test_api.py::test_save_and_get_paper -v
```

Expected: FAIL — route not found

**Step 3: Create `backend/routers/papers.py`**

```python
from fastapi import APIRouter, HTTPException
from datetime import datetime
from ..models import Paper, PaperSummary
from ..storage import save_item, load_item, list_items

router = APIRouter()


@router.get("", response_model=list[PaperSummary])
async def list_papers():
    papers = list_items("papers", Paper)
    return [
        PaperSummary(
            id=p.id,
            title=p.header.title or "Untitled",
            subject=p.header.subject,
            updated_at=p.updated_at,
        )
        for p in papers
    ]


@router.post("", response_model=Paper)
async def save_paper(paper: Paper):
    paper.updated_at = datetime.now().isoformat()
    save_item("papers", paper.id, paper)
    return paper


@router.get("/{paper_id}", response_model=Paper)
async def get_paper(paper_id: str):
    paper = load_item("papers", paper_id, Paper)
    if not paper:
        raise HTTPException(404, detail="Paper not found")
    return paper


@router.delete("/{paper_id}")
async def delete_paper(paper_id: str):
    from ..storage import delete_item
    if not delete_item("papers", paper_id):
        raise HTTPException(404, detail="Paper not found")
    return {"deleted": paper_id}
```

**Step 4: Register router in `backend/main.py`**

```python
from .routers import uploads, papers

app.include_router(papers.router, prefix="/api/papers", tags=["papers"])
```

**Step 5: Run all tests**

```bash
uv run pytest tests/ -v
```

Expected: all PASS

**Step 6: Commit**

```bash
git add backend/routers/papers.py backend/main.py tests/test_api.py
git commit -m "feat: add papers CRUD API endpoints"
```

---

### Task 8: Templates CRUD routes

> **Skills:** invoke `fullstack-dev-skills:fastapi-expert` + `fullstack-dev-skills:api-designer` before starting this task.

**Files:**
- Create: `backend/routers/templates.py`

**Step 1: Create `backend/routers/templates.py`**

```python
from fastapi import APIRouter, HTTPException
from ..models import Template, TemplateSummary
from ..storage import save_item, load_item, list_items, delete_item

router = APIRouter()


@router.get("", response_model=list[TemplateSummary])
async def list_templates():
    templates = list_items("templates", Template)
    return [TemplateSummary(id=t.id, name=t.name, created_at=t.created_at) for t in templates]


@router.post("", response_model=Template)
async def save_template(template: Template):
    save_item("templates", template.id, template)
    return template


@router.get("/{template_id}", response_model=Template)
async def get_template(template_id: str):
    template = load_item("templates", template_id, Template)
    if not template:
        raise HTTPException(404, detail="Template not found")
    return template


@router.delete("/{template_id}")
async def delete_template(template_id: str):
    if not delete_item("templates", template_id):
        raise HTTPException(404, detail="Template not found")
    return {"deleted": template_id}
```

**Step 2: Register router in `backend/main.py`**

```python
from .routers import uploads, papers, templates

app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
```

**Step 3: Run tests**

```bash
uv run pytest tests/ -v
```

Expected: all PASS

**Step 4: Commit**

```bash
git add backend/routers/templates.py backend/main.py
git commit -m "feat: add templates CRUD API endpoints"
```

---

## Phase 4: DOCX Generation

### Task 9: DOCX builder — write tests first

> **Skill:** invoke `fullstack-dev-skills:test-master` before starting this task.

**Files:**
- Create: `tests/test_docx_builder.py`

**Step 1: Write failing tests**

```python
from io import BytesIO
from docx import Document as DocxDocument
from backend.models import Paper, PaperHeader, PaperStyle, TextQuestion, MCQQuestion, MCQOption, TableQuestion, ImageQuestion
from backend.docx_builder.builder import build_docx, build_answer_key


def _open(docx_bytes: bytes) -> DocxDocument:
    return DocxDocument(BytesIO(docx_bytes))


def test_build_docx_returns_bytes():
    paper = Paper(header=PaperHeader(title="Test"), questions=[])
    result = build_docx(paper)
    assert isinstance(result, bytes)
    assert len(result) > 0


def test_docx_contains_title():
    paper = Paper(header=PaperHeader(title="Science Midterm"))
    doc = _open(build_docx(paper))
    full_text = " ".join(p.text for p in doc.paragraphs)
    assert "Science Midterm" in full_text


def test_docx_contains_text_question():
    paper = Paper(
        header=PaperHeader(title="Quiz"),
        questions=[
            TextQuestion(content={
                "type": "doc",
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": "What is gravity?"}]}]
            })
        ]
    )
    doc = _open(build_docx(paper))
    full_text = " ".join(p.text for p in doc.paragraphs)
    assert "What is gravity?" in full_text


def test_docx_contains_mcq_options():
    paper = Paper(
        header=PaperHeader(title="Quiz"),
        questions=[
            MCQQuestion(
                stem={"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "What is 2+2?"}]}]},
                options=[
                    MCQOption(label="A", text="3"),
                    MCQOption(label="B", text="4", is_correct=True),
                    MCQOption(label="C", text="5"),
                    MCQOption(label="D", text="6"),
                ]
            )
        ]
    )
    doc = _open(build_docx(paper))
    full_text = " ".join(p.text for p in doc.paragraphs)
    assert "(B) 4" in full_text


def test_answer_key_contains_correct_answer():
    paper = Paper(
        header=PaperHeader(title="Quiz"),
        questions=[
            MCQQuestion(
                stem={"type": "doc", "content": []},
                options=[
                    MCQOption(label="A", text="Wrong"),
                    MCQOption(label="B", text="Right", is_correct=True),
                    MCQOption(label="C", text="Wrong"),
                    MCQOption(label="D", text="Wrong"),
                ]
            )
        ]
    )
    doc = _open(build_answer_key(paper))
    full_text = " ".join(p.text for p in doc.paragraphs)
    assert "Q1: B" in full_text
```

**Step 2: Run to verify they fail**

```bash
uv run pytest tests/test_docx_builder.py -v
```

Expected: FAIL — `ModuleNotFoundError`

---

### Task 10: DOCX builder implementation

> **Skill:** invoke `fullstack-dev-skills:python-pro` before starting this task.

**Files:**
- Create: `backend/docx_builder/builder.py`

**Step 1: Create `backend/docx_builder/builder.py`**

```python
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from pathlib import Path
from io import BytesIO
import os

from ..models import Paper, PaperStyle, PaperHeader, TextQuestion, MCQQuestion, TableQuestion, ImageQuestion


def _data_dir() -> Path:
    return Path(os.getenv("DATA_DIR", "/data"))


# ── Public API ──────────────────────────────────────────────────────────────

def build_docx(paper: Paper) -> bytes:
    doc = Document()
    _apply_margins(doc, paper.style)
    _apply_default_font(doc, paper.style)
    _add_header_footer(doc, paper.style)
    _add_paper_header(doc, paper.header, paper.style)
    _add_questions(doc, paper.questions, paper.style)
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


def build_answer_key(paper: Paper) -> bytes:
    doc = Document()
    _apply_margins(doc, paper.style)
    _apply_default_font(doc, paper.style)
    title = paper.header.title or "Exam"
    doc.add_heading(f"Answer Key: {title}", 0)
    mcq_questions = [q for q in paper.questions if q.type == "mcq"]
    for i, q in enumerate(mcq_questions, 1):
        correct = next((opt.label for opt in q.options if opt.is_correct), "N/A")
        doc.add_paragraph(f"Q{i}: {correct}")
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _apply_margins(doc: Document, style: PaperStyle) -> None:
    for section in doc.sections:
        section.top_margin = Inches(style.margin_top)
        section.bottom_margin = Inches(style.margin_bottom)
        section.left_margin = Inches(style.margin_left)
        section.right_margin = Inches(style.margin_right)


def _apply_default_font(doc: Document, style: PaperStyle) -> None:
    normal = doc.styles["Normal"]
    normal.font.name = style.font_family
    normal.font.size = Pt(style.font_size)


def _add_header_footer(doc: Document, style: PaperStyle) -> None:
    section = doc.sections[0]
    if style.header_text:
        para = section.header.paragraphs[0]
        para.text = style.header_text
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if style.footer_text:
        para = section.footer.paragraphs[0]
        para.text = style.footer_text
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER


def _add_paper_header(doc: Document, header: PaperHeader, style: PaperStyle) -> None:
    # Logo
    if style.logo_filename:
        logo_path = _data_dir() / "uploads" / style.logo_filename
        if logo_path.exists():
            para = doc.add_paragraph()
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            para.add_run().add_picture(str(logo_path), width=Inches(1.5))

    # Institution name
    if header.institution:
        para = doc.add_paragraph(header.institution)
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = para.runs[0]
        run.bold = True
        run.font.size = Pt(style.font_size + 4)

    # Exam title
    if header.title:
        para = doc.add_paragraph(header.title)
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = para.runs[0]
        run.bold = True
        run.font.size = Pt(style.font_size + 2)

    # Details row
    details = []
    if header.subject:
        details.append(f"Subject: {header.subject}")
    if header.date:
        details.append(f"Date: {header.date}")
    if header.duration:
        details.append(f"Duration: {header.duration}")
    if header.total_marks:
        details.append(f"Total Marks: {header.total_marks}")
    if details:
        para = doc.add_paragraph("   |   ".join(details))
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Horizontal rule
    para = doc.add_paragraph()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "1")
    pBdr.append(bottom)
    para._p.get_or_add_pPr().append(pBdr)

    doc.add_paragraph()  # spacer


def _add_questions(doc: Document, questions, style: PaperStyle) -> None:
    current_section = None
    for num, q in enumerate(questions, 1):
        if q.section and q.section != current_section:
            current_section = q.section
            doc.add_heading(current_section, level=2)

        marks_str = f"[{q.marks} mark{'s' if q.marks != 1 else ''}]" if q.marks else ""

        if q.type == "text":
            _write_question_prefix(doc, num, marks_str)
            _tiptap_to_doc(doc, q.content, style)

        elif q.type == "mcq":
            _write_question_prefix(doc, num, marks_str)
            _tiptap_to_doc(doc, q.stem, style)
            for opt in q.options:
                doc.add_paragraph(f"    ({opt.label}) {opt.text}")

        elif q.type == "table":
            _write_question_prefix(doc, num, marks_str)
            _tiptap_to_doc(doc, q.content, style)

        elif q.type == "image":
            _write_question_prefix(doc, num, marks_str)
            img_path = _data_dir() / "uploads" / q.filename
            if img_path.exists():
                para = doc.add_paragraph()
                para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                para.add_run().add_picture(str(img_path), width=Inches(4))
            if q.caption:
                cap = doc.add_paragraph(q.caption)
                cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                cap.runs[0].italic = True

        doc.add_paragraph()  # spacer


def _write_question_prefix(doc: Document, num: int, marks_str: str) -> None:
    para = doc.add_paragraph()
    run = para.add_run(f"Q{num}.")
    run.bold = True
    if marks_str:
        run2 = para.add_run(f"  {marks_str}")
        run2.italic = True


def _tiptap_text(node: dict) -> str:
    if node.get("type") == "text":
        return node.get("text", "")
    return "".join(_tiptap_text(c) for c in node.get("content", []))


def _tiptap_to_doc(doc: Document, node: dict, style: PaperStyle) -> None:
    node_type = node.get("type")

    if node_type == "doc":
        for child in node.get("content", []):
            _tiptap_to_doc(doc, child, style)

    elif node_type == "paragraph":
        para = doc.add_paragraph()
        for child in node.get("content", []):
            if child.get("type") == "text":
                run = para.add_run(child.get("text", ""))
                for mark in child.get("marks", []):
                    if mark["type"] == "bold":
                        run.bold = True
                    elif mark["type"] == "italic":
                        run.italic = True
                    elif mark["type"] == "underline":
                        run.underline = True
            elif child.get("type") == "image":
                src = child.get("attrs", {}).get("src", "")
                if "/api/uploads/" in src:
                    fname = src.rsplit("/", 1)[-1]
                    img_path = _data_dir() / "uploads" / fname
                    if img_path.exists():
                        para.add_run().add_picture(str(img_path), width=Inches(3))

    elif node_type in ("heading",):
        level = node.get("attrs", {}).get("level", 1)
        doc.add_heading(_tiptap_text(node), level)

    elif node_type == "bulletList":
        for item in node.get("content", []):
            doc.add_paragraph(_tiptap_text(item), style="List Bullet")

    elif node_type == "orderedList":
        for item in node.get("content", []):
            doc.add_paragraph(_tiptap_text(item), style="List Number")

    elif node_type == "table":
        rows = node.get("content", [])
        if not rows:
            return
        n_rows = len(rows)
        n_cols = max(len(row.get("content", [])) for row in rows)
        table = doc.add_table(rows=n_rows, cols=n_cols)
        table.style = "Table Grid"
        for i, row in enumerate(rows):
            for j, cell in enumerate(row.get("content", [])):
                table.cell(i, j).text = _tiptap_text(cell)
```

**Step 2: Run tests**

```bash
uv run pytest tests/test_docx_builder.py -v
```

Expected: all 5 PASS

**Step 3: Run full test suite**

```bash
uv run pytest tests/ -v
```

Expected: all PASS

**Step 4: Commit**

```bash
git add backend/docx_builder/builder.py tests/test_docx_builder.py
git commit -m "feat: implement DOCX builder for all question types"
```

---

### Task 11: Export endpoint

> **Skill:** invoke `fullstack-dev-skills:fastapi-expert` before starting this task.

**Files:**
- Create: `backend/routers/export.py`

**Step 1: Create `backend/routers/export.py`**

```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..models import Paper
from ..docx_builder.builder import build_docx, build_answer_key

router = APIRouter()


def _safe_filename(title: str) -> str:
    return "".join(c if c.isalnum() or c in " _-" else "_" for c in title).strip() or "exam"


DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@router.post("/export")
async def export_paper(paper: Paper):
    try:
        content = build_docx(paper)
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to generate document: {e}")
    filename = _safe_filename(paper.header.title) + ".docx"
    return Response(
        content=content,
        media_type=DOCX_MIME,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export-answer-key")
async def export_answer_key(paper: Paper):
    has_answers = any(
        opt.is_correct for q in paper.questions if q.type == "mcq" for opt in q.options
    )
    if not has_answers:
        raise HTTPException(400, detail="No MCQ correct answers marked.")
    try:
        content = build_answer_key(paper)
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to generate answer key: {e}")
    filename = _safe_filename(paper.header.title) + "_answer_key.docx"
    return Response(
        content=content,
        media_type=DOCX_MIME,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

**Step 2: Register router in `backend/main.py`**

```python
from .routers import uploads, papers, templates, export

app.include_router(export.router, prefix="/api/papers", tags=["export"])
```

**Step 3: Run tests**

```bash
uv run pytest tests/ -v
```

Expected: all PASS

**Step 4: Commit**

```bash
git add backend/routers/export.py backend/main.py
git commit -m "feat: add export endpoints for .docx paper and answer key"
```

---

## Phase 5: Frontend Foundation

### Task 12: Scaffold Vite + React + TipTap + Tailwind

> **Skill:** invoke `fullstack-dev-skills:react-expert` before starting this task.

**Files:**
- Create: `frontend/` (all files)

**Step 1: Scaffold with Vite**

```bash
cd /path/to/exam-builder
npm create vite@latest frontend -- --template react-ts
cd frontend
```

**Step 2: Install dependencies**

```bash
npm install \
  @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-image @tiptap/extension-placeholder \
  @tiptap/extension-table @tiptap/extension-table-row \
  @tiptap/extension-table-cell @tiptap/extension-table-header \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  lucide-react sonner uuid

npm install -D \
  tailwindcss @tailwindcss/vite \
  @types/uuid \
  vitest @testing-library/react @testing-library/user-event jsdom
```

**Step 3: Replace `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

**Step 4: Create `frontend/src/index.css`**

```css
@import "tailwindcss";
```

**Step 5: Create `frontend/src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

**Step 6: Install jest-dom types**

```bash
npm install -D @testing-library/jest-dom
```

**Step 7: Verify the dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts at `http://localhost:5173`

**Step 8: Commit from project root**

```bash
cd ..
git add frontend/
git commit -m "chore: scaffold Vite + React + TipTap + Tailwind frontend"
```

---

### Task 13: TypeScript types + API client

> **Skills:** invoke `fullstack-dev-skills:typescript-pro` + `fullstack-dev-skills:test-master` before starting this task.

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api.ts`

**Step 1: Write test for API client utility**

Create `frontend/src/api.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createEmptyPaper, createEmptyQuestion } from './api'

describe('createEmptyPaper', () => {
  it('creates a paper with a unique id', () => {
    const p1 = createEmptyPaper()
    const p2 = createEmptyPaper()
    expect(p1.id).toBeTruthy()
    expect(p1.id).not.toBe(p2.id)
  })

  it('has default style', () => {
    const paper = createEmptyPaper()
    expect(paper.style.font_family).toBe('Times New Roman')
    expect(paper.style.font_size).toBe(12)
  })
})

describe('createEmptyQuestion', () => {
  it('creates a text question by default', () => {
    const q = createEmptyQuestion('text')
    expect(q.type).toBe('text')
  })

  it('creates an mcq question with 4 options', () => {
    const q = createEmptyQuestion('mcq')
    expect(q.type).toBe('mcq')
    if (q.type === 'mcq') {
      expect(q.options).toHaveLength(4)
    }
  })
})
```

**Step 2: Run to verify it fails**

```bash
cd frontend && npm run test -- --run
```

Expected: FAIL — `Cannot find module './api'`

**Step 3: Create `frontend/src/types.ts`**

```typescript
export interface PaperStyle {
  font_family: string
  font_size: number
  logo_filename: string | null
  header_text: string
  footer_text: string
  margin_top: number
  margin_bottom: number
  margin_left: number
  margin_right: number
  accent_color: string
}

export interface PaperHeader {
  institution: string
  title: string
  subject: string
  date: string
  duration: string
  total_marks: number
}

export interface TextQuestion {
  type: 'text'
  id: string
  section: string
  marks: number
  content: Record<string, unknown>  // TipTap JSON
}

export interface MCQOption {
  label: string
  text: string
  is_correct: boolean
}

export interface MCQQuestion {
  type: 'mcq'
  id: string
  section: string
  marks: number
  stem: Record<string, unknown>  // TipTap JSON
  options: MCQOption[]
}

export interface TableQuestion {
  type: 'table'
  id: string
  section: string
  marks: number
  content: Record<string, unknown>  // TipTap JSON
}

export interface ImageQuestion {
  type: 'image'
  id: string
  section: string
  marks: number
  filename: string
  caption: string
}

export type Question = TextQuestion | MCQQuestion | TableQuestion | ImageQuestion

export interface Paper {
  id: string
  created_at: string
  updated_at: string
  header: PaperHeader
  questions: Question[]
  style: PaperStyle
}

export interface PaperSummary {
  id: string
  title: string
  subject: string
  updated_at: string
}

export interface Template {
  id: string
  name: string
  created_at: string
  header: PaperHeader
  questions: Question[]
  style: PaperStyle
}

export interface TemplateSummary {
  id: string
  name: string
  created_at: string
}
```

**Step 4: Create `frontend/src/api.ts`**

```typescript
import { v4 as uuidv4 } from 'uuid'
import type { Paper, PaperSummary, Template, TemplateSummary, Question, MCQQuestion } from './types'

// ── Factories ────────────────────────────────────────────────────────────────

export function createEmptyPaper(): Paper {
  return {
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    header: { institution: '', title: '', subject: '', date: '', duration: '', total_marks: 0 },
    questions: [],
    style: {
      font_family: 'Times New Roman',
      font_size: 12,
      logo_filename: null,
      header_text: '',
      footer_text: '',
      margin_top: 1.0,
      margin_bottom: 1.0,
      margin_left: 1.25,
      margin_right: 1.25,
      accent_color: '#000000',
    },
  }
}

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

export function createEmptyQuestion(type: Question['type']): Question {
  const base = { id: uuidv4(), section: '', marks: 0 }
  if (type === 'text') return { ...base, type: 'text', content: EMPTY_DOC }
  if (type === 'mcq') {
    const q: MCQQuestion = {
      ...base,
      type: 'mcq',
      stem: EMPTY_DOC,
      options: [
        { label: 'A', text: '', is_correct: false },
        { label: 'B', text: '', is_correct: false },
        { label: 'C', text: '', is_correct: false },
        { label: 'D', text: '', is_correct: false },
      ],
    }
    return q
  }
  if (type === 'table') return { ...base, type: 'table', content: EMPTY_DOC }
  return { ...base, type: 'image', filename: '', caption: '' }
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Papers ───────────────────────────────────────────────────────────────────

export const listPapers = (): Promise<PaperSummary[]> =>
  request('/api/papers')

export const getPaper = (id: string): Promise<Paper> =>
  request(`/api/papers/${id}`)

export const savePaper = (paper: Paper): Promise<Paper> =>
  request('/api/papers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paper),
  })

export const deletePaper = (id: string): Promise<void> =>
  request(`/api/papers/${id}`, { method: 'DELETE' })

// ── Templates ────────────────────────────────────────────────────────────────

export const listTemplates = (): Promise<TemplateSummary[]> =>
  request('/api/templates')

export const getTemplate = (id: string): Promise<Template> =>
  request(`/api/templates/${id}`)

export const saveTemplate = (template: Template): Promise<Template> =>
  request('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  })

export const deleteTemplate = (id: string): Promise<void> =>
  request(`/api/templates/${id}`, { method: 'DELETE' })

// ── Export ───────────────────────────────────────────────────────────────────

export async function exportPaper(paper: Paper): Promise<void> {
  const res = await fetch('/api/papers/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paper),
  })
  if (!res.ok) throw new Error((await res.json()).detail ?? 'Export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${paper.header.title || 'exam'}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportAnswerKey(paper: Paper): Promise<void> {
  const res = await fetch('/api/papers/export-answer-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paper),
  })
  if (!res.ok) throw new Error((await res.json()).detail ?? 'Export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${paper.header.title || 'exam'}_answer_key.docx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Image upload ─────────────────────────────────────────────────────────────

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/uploads/image', { method: 'POST', body: form })
  if (!res.ok) throw new Error((await res.json()).detail ?? 'Upload failed')
  const data = await res.json()
  return data.filename as string
}
```

**Step 5: Run tests**

```bash
npm run test -- --run
```

Expected: all PASS

**Step 6: Commit**

```bash
cd ..
git add frontend/src/types.ts frontend/src/api.ts frontend/src/api.test.ts
git commit -m "feat: add TypeScript types and API client with factories"
```

---

### Task 14: App layout

> **Skill:** invoke `fullstack-dev-skills:react-expert` before starting this task.

**Files:**
- Create: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/Sidebar.tsx`

**Step 1: Replace `frontend/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="top-right" richColors />
  </StrictMode>,
)
```

**Step 2: Create `frontend/src/App.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import Layout from './components/Layout'
import PaperEditor from './components/PaperEditor'
import { createEmptyPaper, listPapers, getPaper, savePaper, deletePaper } from './api'
import type { Paper, PaperSummary } from './types'

export default function App() {
  const [paper, setPaper] = useState<Paper>(createEmptyPaper)
  const [summaries, setSummaries] = useState<PaperSummary[]>([])
  const [loading, setLoading] = useState(false)

  const refreshList = useCallback(async () => {
    try {
      setSummaries(await listPapers())
    } catch {
      // first load may fail in dev before backend is up
    }
  }, [])

  useEffect(() => { refreshList() }, [refreshList])

  const handleNew = () => setPaper(createEmptyPaper())

  const handleLoad = async (id: string) => {
    setLoading(true)
    try {
      setPaper(await getPaper(id))
    } catch (e) {
      toast.error(`Failed to load paper: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = useCallback(async (p: Paper) => {
    try {
      const saved = await savePaper(p)
      setPaper(saved)
      await refreshList()
      toast.success('Paper saved')
    } catch (e) {
      toast.error(`Save failed: ${e}`)
    }
  }, [refreshList])

  const handleDelete = async (id: string) => {
    try {
      await deletePaper(id)
      await refreshList()
      if (paper.id === id) setPaper(createEmptyPaper())
      toast.success('Paper deleted')
    } catch (e) {
      toast.error(`Delete failed: ${e}`)
    }
  }

  return (
    <Layout
      summaries={summaries}
      currentPaperId={paper.id}
      onNew={handleNew}
      onLoad={handleLoad}
      onDelete={handleDelete}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center text-gray-500">Loading…</div>
      ) : (
        <PaperEditor paper={paper} onChange={setPaper} onSave={handleSave} />
      )}
    </Layout>
  )
}
```

**Step 3: Create `frontend/src/components/Layout.tsx`**

```tsx
import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import type { PaperSummary } from '../types'

interface Props {
  summaries: PaperSummary[]
  currentPaperId: string
  onNew: () => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  children: ReactNode
}

export default function Layout({ summaries, currentPaperId, onNew, onLoad, onDelete, children }: Props) {
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar
        summaries={summaries}
        currentPaperId={currentPaperId}
        onNew={onNew}
        onLoad={onLoad}
        onDelete={onDelete}
      />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          {children}
        </div>
      </main>
    </div>
  )
}
```

**Step 4: Create `frontend/src/components/Sidebar.tsx`**

```tsx
import { FilePlus, FileText, Trash2 } from 'lucide-react'
import type { PaperSummary } from '../types'

interface Props {
  summaries: PaperSummary[]
  currentPaperId: string
  onNew: () => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}

export default function Sidebar({ summaries, currentPaperId, onNew, onLoad, onDelete }: Props) {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Exam Builder</h1>
      </div>

      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <FilePlus size={16} />
          New Paper
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {summaries.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No saved papers yet</p>
        )}
        {summaries.map((s) => (
          <div
            key={s.id}
            className={`group flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              s.id === currentPaperId ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
            }`}
            onClick={() => onLoad(s.id)}
          >
            <FileText size={16} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{s.title || 'Untitled'}</div>
              <div className="text-xs text-gray-400 truncate">{s.subject}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
```

**Step 5: Verify dev server renders without errors**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` — should show two-column layout with sidebar.

**Step 6: Commit**

```bash
cd ..
git add frontend/src/
git commit -m "feat: add app layout with sidebar for paper navigation"
```

---

## Phase 6: Paper Editor

### Task 15: Paper header form + PaperEditor shell

> **Skill:** invoke `fullstack-dev-skills:react-expert` before starting this task.

**Files:**
- Create: `frontend/src/components/PaperEditor.tsx`
- Create: `frontend/src/components/PaperHeaderForm.tsx`

**Step 1: Create `frontend/src/components/PaperHeaderForm.tsx`**

```tsx
import type { PaperHeader } from '../types'

interface Props {
  header: PaperHeader
  onChange: (header: PaperHeader) => void
}

const fields: { key: keyof PaperHeader; label: string; type?: string }[] = [
  { key: 'institution', label: 'Institution / School Name' },
  { key: 'title', label: 'Exam Title' },
  { key: 'subject', label: 'Subject' },
  { key: 'date', label: 'Date' },
  { key: 'duration', label: 'Duration (e.g. 2 hours)' },
  { key: 'total_marks', label: 'Total Marks', type: 'number' },
]

export default function PaperHeaderForm({ header, onChange }: Props) {
  const update = (key: keyof PaperHeader, value: string | number) =>
    onChange({ ...header, [key]: value })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Paper Details</h2>
      <div className="grid grid-cols-2 gap-4">
        {fields.map(({ key, label, type }) => (
          <div key={key} className={key === 'institution' || key === 'title' ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type ?? 'text'}
              value={header[key] as string | number}
              onChange={(e) => update(key, type === 'number' ? Number(e.target.value) : e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Create `frontend/src/components/PaperEditor.tsx`** (shell — questions added in next tasks)

```tsx
import type { Paper } from '../types'
import PaperHeaderForm from './PaperHeaderForm'

interface Props {
  paper: Paper
  onChange: (paper: Paper) => void
  onSave: (paper: Paper) => Promise<void>
}

export default function PaperEditor({ paper, onChange, onSave }: Props) {
  const update = (partial: Partial<Paper>) => onChange({ ...paper, ...partial })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {paper.header.title || 'New Paper'}
        </h2>
        <button
          onClick={() => onSave(paper)}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Save
        </button>
      </div>

      <PaperHeaderForm
        header={paper.header}
        onChange={(header) => update({ header })}
      />

      {/* QuestionList, ExportPanel, etc. added in subsequent tasks */}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/PaperEditor.tsx frontend/src/components/PaperHeaderForm.tsx
git commit -m "feat: add paper editor shell and header form"
```

---

### Task 16: Text and MCQ question components

> **Skill:** invoke `fullstack-dev-skills:react-expert` before starting this task.

**Files:**
- Create: `frontend/src/components/questions/TextQuestion.tsx`
- Create: `frontend/src/components/questions/MCQQuestion.tsx`

**Step 1: Create `frontend/src/components/questions/TextQuestion.tsx`**

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline } from 'lucide-react'
import type { TextQuestion as TTextQuestion } from '../../types'

interface Props {
  question: TTextQuestion
  onChange: (q: TTextQuestion) => void
}

export default function TextQuestionEditor({ question, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Type question here…' }),
    ],
    content: question.content as Record<string, unknown>,
    onUpdate: ({ editor }) => onChange({ ...question, content: editor.getJSON() }),
  })

  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
    >
      {icon}
    </button>
  )

  return (
    <div>
      <div className="flex gap-1 mb-2 p-1 border-b border-gray-100">
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold size={14} />)}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic size={14} />)}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline?.().run?.(), <Underline size={14} />)}
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[60px] px-2 py-1 focus-within:outline-none"
      />
    </div>
  )
}
```

**Step 2: Create `frontend/src/components/questions/MCQQuestion.tsx`**

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { MCQQuestion as TMCQQuestion, MCQOption } from '../../types'

interface Props {
  question: TMCQQuestion
  onChange: (q: TMCQQuestion) => void
}

export default function MCQQuestionEditor({ question, onChange }: Props) {
  const stemEditor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Type question stem here…' }),
    ],
    content: question.stem as Record<string, unknown>,
    onUpdate: ({ editor }) => onChange({ ...question, stem: editor.getJSON() }),
  })

  const updateOption = (index: number, patch: Partial<MCQOption>) => {
    const options = question.options.map((o, i) => i === index ? { ...o, ...patch } : o)
    onChange({ ...question, options })
  }

  const setCorrect = (index: number) => {
    const options = question.options.map((o, i) => ({ ...o, is_correct: i === index }))
    onChange({ ...question, options })
  }

  if (!stemEditor) return null

  return (
    <div>
      <EditorContent
        editor={stemEditor}
        className="prose prose-sm max-w-none min-h-[48px] px-2 py-1 border border-gray-100 rounded mb-3"
      />
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <div key={opt.label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCorrect(i)}
              title="Mark as correct answer"
              className={`w-6 h-6 rounded-full border-2 text-xs font-bold shrink-0 transition-colors ${
                opt.is_correct
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 text-gray-500 hover:border-green-400'
              }`}
            >
              {opt.label}
            </button>
            <input
              type="text"
              value={opt.text}
              onChange={(e) => updateOption(i, { text: e.target.value })}
              placeholder={`Option ${opt.label}`}
              className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">Click a letter to mark the correct answer (for answer key)</p>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/questions/
git commit -m "feat: add Text and MCQ question editor components"
```

---

### Task 17: Table and Image question components

> **Skills:** invoke `fullstack-dev-skills:react-expert` + `fullstack-dev-skills:secure-code-guardian` before starting this task (image paste/upload is a user input boundary).

**Files:**
- Create: `frontend/src/components/questions/TableQuestion.tsx`
- Create: `frontend/src/components/questions/ImageQuestion.tsx`

**Step 1: Create `frontend/src/components/questions/TableQuestion.tsx`**

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import { Grid3x3 } from 'lucide-react'
import type { TableQuestion as TTableQuestion } from '../../types'

interface Props {
  question: TTableQuestion
  onChange: (q: TTableQuestion) => void
}

export default function TableQuestionEditor({ question, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: 'Type question here, or insert a table below…' }),
    ],
    content: question.content as Record<string, unknown>,
    onUpdate: ({ editor }) => onChange({ ...question, content: editor.getJSON() }),
  })

  if (!editor) return null

  const insertTable = () =>
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()

  return (
    <div>
      <div className="flex gap-1 mb-2 p-1 border-b border-gray-100">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); insertTable() }}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <Grid3x3 size={12} />
          Insert Table
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[80px] px-2 py-1 [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:p-1 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:p-1 [&_.ProseMirror_th]:bg-gray-100"
      />
    </div>
  )
}
```

**Step 2: Create `frontend/src/components/questions/ImageQuestion.tsx`**

```tsx
import { useRef, useCallback } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadImage } from '../../api'
import type { ImageQuestion as TImageQuestion } from '../../types'

interface Props {
  question: TImageQuestion
  onChange: (q: TImageQuestion) => void
}

export default function ImageQuestionEditor({ question, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }
    try {
      const filename = await uploadImage(file)
      onChange({ ...question, filename })
    } catch (e) {
      toast.error(`Upload failed: ${e}`)
    }
  }, [question, onChange])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) {
      const file = item.getAsFile()
      if (file) handleFile(file)
    }
  }, [handleFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div onPaste={handlePaste}>
      {!question.filename ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={24} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">Click to upload, drag & drop, or paste from clipboard</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WebP — max 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
      ) : (
        <div className="relative">
          <img
            src={`/api/uploads/${question.filename}`}
            alt="Question image"
            className="max-w-full max-h-64 rounded border border-gray-200"
          />
          <button
            type="button"
            onClick={() => onChange({ ...question, filename: '' })}
            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50 transition-colors"
          >
            <X size={14} className="text-red-500" />
          </button>
          <div className="mt-2">
            <input
              type="text"
              value={question.caption}
              onChange={(e) => onChange({ ...question, caption: e.target.value })}
              placeholder="Caption (optional)"
              className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/questions/TableQuestion.tsx frontend/src/components/questions/ImageQuestion.tsx
git commit -m "feat: add Table and Image question editor components"
```

---

### Task 18: Question list with drag-and-drop

> **Skill:** invoke `fullstack-dev-skills:react-expert` before starting this task.

**Files:**
- Create: `frontend/src/components/QuestionCard.tsx`
- Create: `frontend/src/components/QuestionList.tsx`

**Step 1: Create `frontend/src/components/QuestionCard.tsx`**

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import TextQuestionEditor from './questions/TextQuestion'
import MCQQuestionEditor from './questions/MCQQuestion'
import TableQuestionEditor from './questions/TableQuestion'
import ImageQuestionEditor from './questions/ImageQuestion'
import type { Question } from '../types'

const TYPE_LABELS = { text: 'Text', mcq: 'MCQ', table: 'Table', image: 'Image' }
const TYPE_COLORS = { text: 'bg-blue-100 text-blue-700', mcq: 'bg-purple-100 text-purple-700', table: 'bg-orange-100 text-orange-700', image: 'bg-green-100 text-green-700' }

interface Props {
  question: Question
  index: number
  onChange: (q: Question) => void
  onDelete: () => void
}

export default function QuestionCard({ question, index, onChange, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <button className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-600">Q{index + 1}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[question.type]}`}>
          {TYPE_LABELS[question.type]}
        </span>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={question.section}
            onChange={(e) => onChange({ ...question, section: e.target.value } as Question)}
            placeholder="Section (optional)"
            className="text-xs border border-gray-200 rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={question.marks}
              onChange={(e) => onChange({ ...question, marks: Number(e.target.value) } as Question)}
              placeholder="Marks"
              className="text-xs border border-gray-200 rounded px-2 py-0.5 w-16 focus:outline-none focus:ring-1 focus:ring-blue-400"
              min={0}
            />
            <span className="text-xs text-gray-400">marks</span>
          </div>
        </div>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Card body */}
      <div className="px-4 py-4">
        {question.type === 'text' && <TextQuestionEditor question={question} onChange={onChange} />}
        {question.type === 'mcq' && <MCQQuestionEditor question={question} onChange={onChange} />}
        {question.type === 'table' && <TableQuestionEditor question={question} onChange={onChange} />}
        {question.type === 'image' && <ImageQuestionEditor question={question} onChange={onChange} />}
      </div>
    </div>
  )
}
```

**Step 2: Create `frontend/src/components/QuestionList.tsx`**

```tsx
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Plus, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import QuestionCard from './QuestionCard'
import { createEmptyQuestion } from '../api'
import type { Question } from '../types'

interface Props {
  questions: Question[]
  onChange: (questions: Question[]) => void
}

const QUESTION_TYPES: { type: Question['type']; label: string }[] = [
  { type: 'text', label: 'Text Question' },
  { type: 'mcq', label: 'Multiple Choice (MCQ)' },
  { type: 'table', label: 'Table Question' },
  { type: 'image', label: 'Image Question' },
]

export default function QuestionList({ questions, onChange }: Props) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id)
      const newIndex = questions.findIndex((q) => q.id === over.id)
      onChange(arrayMove(questions, oldIndex, newIndex))
    }
  }

  const addQuestion = (type: Question['type']) => {
    onChange([...questions, createEmptyQuestion(type)])
    setShowAddMenu(false)
  }

  const updateQuestion = (index: number, q: Question) => {
    const next = [...questions]
    next[index] = q
    onChange(next)
  }

  const deleteQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index))
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4 mb-4">
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                onChange={(updated) => updateQuestion(i, updated)}
                onDelete={() => deleteQuestion(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add question button */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <Plus size={16} />
          Add Question
          <ChevronDown size={14} className={`transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
        </button>

        {showAddMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 overflow-hidden">
            {QUESTION_TYPES.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => addQuestion(type)}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Wire QuestionList into PaperEditor — modify `frontend/src/components/PaperEditor.tsx`**

Replace the comment `{/* QuestionList... */}` with:

```tsx
import QuestionList from './QuestionList'

// inside the return, after PaperHeaderForm:
<QuestionList
  questions={paper.questions}
  onChange={(questions) => update({ questions })}
/>
```

(Add the import at the top and add the component in the JSX)

**Step 4: Commit**

```bash
git add frontend/src/components/QuestionCard.tsx frontend/src/components/QuestionList.tsx frontend/src/components/PaperEditor.tsx
git commit -m "feat: add question list with drag-and-drop reordering"
```

---

## Phase 7: Features

### Task 19: Template panel

> **Skills:** invoke `fullstack-dev-skills:react-expert` + `fullstack-dev-skills:fullstack-guardian` before starting this task.

**Files:**
- Create: `frontend/src/components/TemplatePanel.tsx`

**Step 1: Create `frontend/src/components/TemplatePanel.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { BookTemplate, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { listTemplates, getTemplate, saveTemplate, deleteTemplate } from '../api'
import type { Paper, Template, TemplateSummary } from '../types'

interface Props {
  paper: Paper
  onLoad: (template: Template) => void
}

export default function TemplatePanel({ paper, onLoad }: Props) {
  const [summaries, setSummaries] = useState<TemplateSummary[]>([])
  const [name, setName] = useState('')
  const [open, setOpen] = useState(false)

  const refresh = async () => {
    try { setSummaries(await listTemplates()) } catch {}
  }

  useEffect(() => { if (open) refresh() }, [open])

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Enter a template name'); return }
    const template: Template = {
      id: uuidv4(),
      name: name.trim(),
      created_at: new Date().toISOString(),
      header: paper.header,
      questions: paper.questions,
      style: paper.style,
    }
    try {
      await saveTemplate(template)
      setName('')
      await refresh()
      toast.success('Template saved')
    } catch (e) {
      toast.error(`Failed: ${e}`)
    }
  }

  const handleLoad = async (id: string) => {
    try {
      const t = await getTemplate(id)
      onLoad(t)
      setOpen(false)
      toast.success(`Template "${t.name}" loaded`)
    } catch (e) {
      toast.error(`Failed: ${e}`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id)
      await refresh()
    } catch (e) {
      toast.error(`Failed: ${e}`)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full"
      >
        <BookTemplate size={16} />
        Templates
        <span className="ml-auto text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Save current as template */}
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name…"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700"
            >
              <Save size={14} />
              Save
            </button>
          </div>

          {/* Template list */}
          {summaries.length === 0 ? (
            <p className="text-sm text-gray-400">No templates saved yet</p>
          ) : (
            <ul className="space-y-1">
              {summaries.map((t) => (
                <li key={t.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => handleLoad(t.id)}
                    className="flex-1 text-left text-sm text-blue-600 hover:underline truncate"
                  >
                    {t.name}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Wire into PaperEditor**

In `PaperEditor.tsx`, add `TemplatePanel` below the header form:

```tsx
import TemplatePanel from './TemplatePanel'

// in JSX, between PaperHeaderForm and QuestionList:
<TemplatePanel
  paper={paper}
  onLoad={(template) => update({
    header: template.header,
    questions: template.questions,
    style: template.style,
  })}
/>
```

**Step 3: Commit**

```bash
git add frontend/src/components/TemplatePanel.tsx frontend/src/components/PaperEditor.tsx
git commit -m "feat: add template save/load panel"
```

---

### Task 20: Style configurator panel

> **Skills:** invoke `fullstack-dev-skills:react-expert` + `fullstack-dev-skills:fullstack-guardian` before starting this task.

**Files:**
- Create: `frontend/src/components/StylePanel.tsx`

**Step 1: Create `frontend/src/components/StylePanel.tsx`**

```tsx
import { useRef } from 'react'
import { Palette, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadImage } from '../api'
import type { PaperStyle } from '../types'

const FONTS = ['Times New Roman', 'Arial', 'Calibri', 'Georgia', 'Helvetica']

interface Props {
  style: PaperStyle
  onChange: (style: PaperStyle) => void
}

export default function StylePanel({ style, onChange }: Props) {
  const logoRef = useRef<HTMLInputElement>(null)

  const update = <K extends keyof PaperStyle>(key: K, value: PaperStyle[K]) =>
    onChange({ ...style, [key]: value })

  const handleLogoUpload = async (file: File) => {
    try {
      const filename = await uploadImage(file)
      update('logo_filename', filename)
      toast.success('Logo uploaded')
    } catch (e) {
      toast.error(`Upload failed: ${e}`)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        <Palette size={14} />
        Styling
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Font family */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Font</label>
          <select
            value={style.font_family}
            onChange={(e) => update('font_family', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FONTS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>

        {/* Font size */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Font Size (pt)</label>
          <input
            type="number"
            value={style.font_size}
            onChange={(e) => update('font_size', Number(e.target.value))}
            min={8} max={16}
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Margins */}
        {(['margin_top', 'margin_bottom', 'margin_left', 'margin_right'] as const).map((key) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
              {key.replace('_', ' ')} (in)
            </label>
            <input
              type="number"
              value={style[key]}
              onChange={(e) => update(key, Number(e.target.value))}
              min={0.5} max={3} step={0.25}
              className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}

        {/* Header text */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Header Text</label>
          <input
            type="text"
            value={style.header_text}
            onChange={(e) => update('header_text', e.target.value)}
            placeholder="e.g. Confidential — Do not distribute"
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Footer text */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Footer Text</label>
          <input
            type="text"
            value={style.footer_text}
            onChange={(e) => update('footer_text', e.target.value)}
            placeholder="e.g. Page {page} of {pages}"
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Logo */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Logo</label>
          {style.logo_filename ? (
            <div className="flex items-center gap-2">
              <img
                src={`/api/uploads/${style.logo_filename}`}
                alt="Logo"
                className="h-12 rounded border border-gray-200"
              />
              <button
                onClick={() => update('logo_filename', null)}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => logoRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <Upload size={14} />
                Upload Logo
              </button>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Wire into PaperEditor**

In `PaperEditor.tsx`, add after TemplatePanel:

```tsx
import StylePanel from './StylePanel'

// in JSX:
<StylePanel style={paper.style} onChange={(style) => update({ style })} />
```

**Step 3: Commit**

```bash
git add frontend/src/components/StylePanel.tsx frontend/src/components/PaperEditor.tsx
git commit -m "feat: add style configurator (font, margins, logo, header/footer)"
```

---

### Task 21: Auto-save + export panel

> **Skills:** invoke `fullstack-dev-skills:react-expert` + `fullstack-dev-skills:fullstack-guardian` before starting this task.

**Files:**
- Create: `frontend/src/components/ExportPanel.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create `frontend/src/components/ExportPanel.tsx`**

```tsx
import { useState } from 'react'
import { Download, FileKey } from 'lucide-react'
import { toast } from 'sonner'
import { exportPaper, exportAnswerKey } from '../api'
import type { Paper } from '../types'

interface Props {
  paper: Paper
}

export default function ExportPanel({ paper }: Props) {
  const [exporting, setExporting] = useState(false)
  const [exportingKey, setExportingKey] = useState(false)

  const hasAnswers = paper.questions.some(
    (q) => q.type === 'mcq' && q.options.some((o) => o.is_correct)
  )

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportPaper(paper)
    } catch (e) {
      toast.error(`Export failed: ${e}`)
    } finally {
      setExporting(false)
    }
  }

  const handleExportKey = async () => {
    setExportingKey(true)
    try {
      await exportAnswerKey(paper)
    } catch (e) {
      toast.error(`Export failed: ${e}`)
    } finally {
      setExportingKey(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Export</h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Download size={16} />
          {exporting ? 'Generating…' : 'Download .docx'}
        </button>

        {hasAnswers && (
          <button
            onClick={handleExportKey}
            disabled={exportingKey}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <FileKey size={16} />
            {exportingKey ? 'Generating…' : 'Download Answer Key'}
          </button>
        )}
      </div>
      {hasAnswers && (
        <p className="text-xs text-gray-400 mt-2">Answer key is available because MCQ correct answers are marked</p>
      )}
    </div>
  )
}
```

**Step 2: Add auto-save to App.tsx**

In `App.tsx`, add a `useEffect` that auto-saves every 30 seconds:

```tsx
// Add after the handleSave definition:
useEffect(() => {
  const interval = setInterval(() => {
    savePaper(paper).then(() => refreshList()).catch(() => {})
  }, 30_000)
  return () => clearInterval(interval)
}, [paper, refreshList])
```

**Step 3: Add ExportPanel to PaperEditor**

In `PaperEditor.tsx`, add at the bottom of the JSX (after QuestionList):

```tsx
import ExportPanel from './ExportPanel'

// at the bottom of the return:
<div className="mt-6">
  <ExportPanel paper={paper} />
</div>
```

**Step 4: Commit**

```bash
git add frontend/src/components/ExportPanel.tsx frontend/src/components/PaperEditor.tsx frontend/src/App.tsx
git commit -m "feat: add export panel and auto-save every 30 seconds"
```

---

## Final Verification

### Task 22: End-to-end smoke test

> **Skills:** invoke `fullstack-dev-skills:test-master` + `fullstack-dev-skills:devops-engineer` before starting this task.

**Step 1: Run backend tests**

```bash
uv run pytest tests/ -v
```

Expected: all PASS

**Step 2: Run frontend tests**

```bash
cd frontend && npm run test -- --run
```

Expected: all PASS

**Step 3: Start backend and frontend together**

Terminal 1:
```bash
DATA_DIR=/tmp/exam-builder-dev uv run uvicorn backend.main:app --reload --port 8000
```

Terminal 2:
```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` and verify:
- [ ] Sidebar renders with "New Paper" button
- [ ] Paper header form fills in correctly
- [ ] Can add Text, MCQ, Table, Image questions
- [ ] Questions can be dragged to reorder
- [ ] Marks and section fields work per-question
- [ ] Style panel updates font/logo/margins
- [ ] Template can be saved and loaded
- [ ] Save button persists paper (appears in sidebar)
- [ ] "Download .docx" generates and downloads a file
- [ ] Marking MCQ correct answers reveals "Download Answer Key" button

**Step 4: Test Docker build**

```bash
cd frontend && npm run build && cd ..
docker build -t exam-builder .
docker run -p 8000:8000 -v exam-builder-data:/data exam-builder
```

Open `http://localhost:8000` — full app should work from the Docker container.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete exam builder — all features implemented and verified"
```

---

## Running the App

**Development:**
```bash
# Backend
DATA_DIR=/tmp/exam-dev uv run uvicorn backend.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm run dev
```

**Production (Docker):**
```bash
docker compose up --build
# Access at http://<NAS-IP>:8000
```

**Tests:**
```bash
uv run pytest tests/ -v          # backend
cd frontend && npm run test -- --run  # frontend
```
