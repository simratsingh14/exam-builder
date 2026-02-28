"""Export endpoints: generate .docx paper and answer key from a Paper model."""

import re

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ..docx_builder.builder import build_answer_key, build_docx
from ..models import Paper

router = APIRouter()

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _safe_filename(title: str) -> str:
    """Sanitise an exam title into a safe filename stem.

    Strips path-traversal characters and collapses whitespace/special chars
    into underscores.

    Args:
        title: Raw paper title from user input.

    Returns:
        A filesystem-safe stem (no path separators, no ``..``).
    """
    # Replace any char that isn't alphanumeric, space, hyphen, or underscore
    stem = re.sub(r"[^\w\s-]", "", title)
    # Collapse whitespace and hyphens into underscores
    stem = re.sub(r"[\s-]+", "_", stem).strip("_")
    return stem or "exam"


@router.post("/export")
async def export_paper(paper: Paper) -> Response:
    """Generate a formatted exam paper and stream it as a ``.docx`` download.

    Args:
        paper: Complete paper model with questions and styling.

    Returns:
        ``.docx`` file as a streaming attachment.

    Raises:
        500: If document generation fails unexpectedly.
    """
    try:
        content = build_docx(paper)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate document: {exc}",
        ) from exc

    filename = _safe_filename(paper.header.title) + ".docx"
    return Response(
        content=content,
        media_type=DOCX_MIME,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export-answer-key")
async def export_answer_key(paper: Paper) -> Response:
    """Generate an answer-key ``.docx`` for all MCQ questions with marked answers.

    Args:
        paper: Paper whose MCQ questions have ``is_correct`` set on at least one option.

    Returns:
        Answer-key ``.docx`` file as a streaming attachment.

    Raises:
        400: No MCQ correct answers have been marked.
        500: If document generation fails unexpectedly.
    """
    has_answers = any(
        opt.is_correct
        for q in paper.questions
        if q.type == "mcq"
        for opt in q.options  # type: ignore[union-attr]
    )
    if not has_answers:
        raise HTTPException(
            status_code=400,
            detail="No MCQ correct answers marked. Mark at least one correct answer to export an answer key.",
        )

    try:
        content = build_answer_key(paper)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer key: {exc}",
        ) from exc

    filename = _safe_filename(paper.header.title) + "_answer_key.docx"
    return Response(
        content=content,
        media_type=DOCX_MIME,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
