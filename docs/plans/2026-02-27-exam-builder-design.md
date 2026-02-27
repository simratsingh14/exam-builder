# Exam Builder — Design Document

**Date:** 2026-02-27
**Status:** Approved

---

## Overview

A single-user, locally-hosted web tool for creating formatted exam question papers. The primary pain point is the time-consuming manual formatting required to produce professional-looking papers. The tool provides a polished editor UI and exports directly to `.docx`.

---

## Architecture

Single Docker container hosting both the React SPA (as static files) and the FastAPI backend on port 8000. A persistent `/data` volume (mounted from the NAS) stores all papers, templates, and uploaded images across container restarts.

```
┌─────────────────────────────────────────────────────┐
│                  Docker Container                    │
│                                                     │
│  ┌─────────────────────┐   ┌─────────────────────┐  │
│  │   React + TipTap    │   │   FastAPI Backend   │  │
│  │   (Vite build,      │◄──►   (served on :8000) │  │
│  │   served as static) │   │                     │  │
│  └─────────────────────┘   └──────────┬──────────┘  │
│                                       │             │
│                            ┌──────────▼──────────┐  │
│                            │   /data volume       │  │
│                            │  - papers/           │  │
│                            │  - templates/        │  │
│                            │  - uploads/          │  │
│                            └─────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Key technology choices:**
- **UV** — Python package manager
- **FastAPI** — backend API + static file serving
- **python-docx** — server-side `.docx` generation (no LibreOffice dependency)
- **React + Vite** — frontend SPA
- **TipTap** — rich text editor with first-class support for tables, images, and custom extensions
- **Multi-stage Dockerfile** — Node stage for frontend build, Python/UV stage for backend

---

## Features

### Paper Editor (main screen)
- Header form: exam title, subject, date, duration, total marks, institution name
- Question builder with per-question type selector:
  - **Text** — rich text (bold/italic/underline), inline images, sub-questions
  - **MCQ** — question stem + 4 options (A–D), optional correct answer marking for answer key generation
  - **Table** — insertable/editable tables with resizable columns
  - **Image** — standalone image with caption
- Per-question marks field and optional section label (e.g. "Section A")
- Drag-and-drop question reordering
- Live preview panel showing approximate final layout

### Template Manager
- Save current paper structure as a reusable template (question types, sections, marks scheme)
- Load a template to pre-populate the editor
- Per-template styling configuration:
  - Font family and size
  - Logo upload
  - Header and footer text
  - Page margins
  - Color accents

### Export
- One-click "Download .docx" button
- Optional answer key export as a separate `.docx` (available when MCQ correct answers are marked)

---

## Data Flow

```
User action in editor
        │
        ▼
React state (TipTap JSON + form fields)
        │
        ▼ on "Download"
POST /api/papers/export
  { title, subject, questions: [...], style: {...} }
        │
        ▼
FastAPI → python-docx builds .docx in memory
        │
        ▼
StreamingResponse → browser downloads file
```

**Persistence:**
- Papers auto-saved to `/data/papers/<id>.json` every 30 seconds and on explicit save
- Templates stored as `/data/templates/<id>.json`
- Uploaded images stored in `/data/uploads/`, referenced by filename in paper JSON
- Sidebar lists all saved papers and templates loaded from the API on app start

**Image input:**
- Upload from device (file picker)
- Paste from clipboard
- Validated server-side: PNG/JPG/GIF/WebP, max 10MB

**API Endpoints:**
```
GET  /api/papers          → list saved papers
POST /api/papers          → save paper
GET  /api/papers/{id}     → load paper
GET  /api/templates       → list templates
POST /api/templates       → save template
POST /api/papers/export   → generate + download .docx
POST /api/uploads/image   → upload image, returns filename
```

---

## Error Handling

- Image upload validation (file type + size) server-side with clear UI error messages
- `.docx` export failures surface as a toast notification with a brief reason
- Auto-save failures shown as a non-blocking warning badge; work stays in-memory
- All API errors return structured JSON `{ "detail": "..." }` displayed consistently by the frontend

---

## Testing

- **Backend:** pytest (via UV) covering docx generation logic and API endpoints
- **Frontend:** Vitest for utility functions (question numbering, marks totalling)
- No E2E tests (single-user local tool, overkill)
- `sample_paper.json` fixture used for both tests and manual development

---

## Deployment

- `docker-compose.yml` with a single service, port mapping `8000:8000`, and a named volume for `/data`
- Build args to configure the port if needed
- No external services, databases, or internet access required at runtime
