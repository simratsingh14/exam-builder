"""Pydantic V2 models for exam builder domain objects."""

from datetime import datetime
from typing import Annotated, Literal, Union
from uuid import uuid4

from pydantic import BaseModel, Field


def _uuid() -> str:
    return str(uuid4())


def _now() -> str:
    return datetime.now().isoformat()


# ── Question types ────────────────────────────────────────────────────────────


class TextQuestion(BaseModel):
    """A rich-text question (TipTap JSON content)."""

    type: Literal["text"] = "text"
    id: str = Field(default_factory=_uuid)
    section: str = ""
    marks: float = 0
    content: dict  # TipTap JSON document


class MCQOption(BaseModel):
    """A single option in a multiple-choice question."""

    label: str  # "A", "B", "C", "D"
    text: str
    is_correct: bool = False


class MCQQuestion(BaseModel):
    """Multiple-choice question with stem and four options."""

    type: Literal["mcq"] = "mcq"
    id: str = Field(default_factory=_uuid)
    section: str = ""
    marks: float = 0
    stem: dict  # TipTap JSON document
    options: list[MCQOption] = Field(default_factory=list)


class TableQuestion(BaseModel):
    """A question whose body contains a TipTap table node."""

    type: Literal["table"] = "table"
    id: str = Field(default_factory=_uuid)
    section: str = ""
    marks: float = 0
    content: dict  # TipTap JSON document (contains table node)


class ImageQuestion(BaseModel):
    """A question that displays an uploaded image with optional caption."""

    type: Literal["image"] = "image"
    id: str = Field(default_factory=_uuid)
    section: str = ""
    marks: float = 0
    filename: str
    caption: str = ""


# Discriminated union — Pydantic V2 uses the `type` literal for fast dispatch
Question = Annotated[
    Union[TextQuestion, MCQQuestion, TableQuestion, ImageQuestion],
    Field(discriminator="type"),
]


# ── Styling & header ──────────────────────────────────────────────────────────


class PaperStyle(BaseModel):
    """Per-paper / per-template styling configuration."""

    font_family: str = "Times New Roman"
    font_size: int = 12
    logo_filename: str | None = None
    header_text: str = ""
    footer_text: str = ""
    margin_top: float = 1.0  # inches
    margin_bottom: float = 1.0
    margin_left: float = 1.25
    margin_right: float = 1.25
    accent_color: str = "#000000"


class PaperHeader(BaseModel):
    """Metadata shown in the formatted paper header block."""

    institution: str = ""
    title: str = ""
    subject: str = ""
    date: str = ""
    duration: str = ""
    total_marks: float = 0


# ── Top-level documents ───────────────────────────────────────────────────────


class Paper(BaseModel):
    """A complete exam paper with questions and styling."""

    id: str = Field(default_factory=_uuid)
    created_at: str = Field(default_factory=_now)
    updated_at: str = Field(default_factory=_now)
    header: PaperHeader = Field(default_factory=PaperHeader)
    questions: list[Question] = Field(default_factory=list)
    style: PaperStyle = Field(default_factory=PaperStyle)


class PaperSummary(BaseModel):
    """Lightweight view used in the sidebar paper list."""

    id: str
    title: str
    subject: str
    updated_at: str


class Template(BaseModel):
    """A reusable paper structure with saved styling."""

    id: str = Field(default_factory=_uuid)
    name: str
    created_at: str = Field(default_factory=_now)
    header: PaperHeader = Field(default_factory=PaperHeader)
    questions: list[Question] = Field(default_factory=list)
    style: PaperStyle = Field(default_factory=PaperStyle)


class TemplateSummary(BaseModel):
    """Lightweight view used in the template picker."""

    id: str
    name: str
    created_at: str
