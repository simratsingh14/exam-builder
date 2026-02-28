"""Papers CRUD endpoints."""

from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..models import Paper, PaperSummary
from ..storage import delete_item, list_items, load_item, save_item

router = APIRouter()


@router.get("", response_model=list[PaperSummary])
async def list_papers() -> list[PaperSummary]:
    """Return a lightweight summary of all saved papers, newest first."""
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
async def save_paper(paper: Paper) -> Paper:
    """Create or update a paper. Always bumps ``updated_at``."""
    paper.updated_at = datetime.now().isoformat()
    save_item("papers", paper.id, paper)
    return paper


@router.get("/{paper_id}", response_model=Paper)
async def get_paper(paper_id: str) -> Paper:
    """Fetch a single paper by ID.

    Raises:
        404: Paper not found.
    """
    paper = load_item("papers", paper_id, Paper)
    if paper is None:
        raise HTTPException(status_code=404, detail="Paper not found.")
    return paper


@router.delete("/{paper_id}")
async def delete_paper(paper_id: str) -> dict[str, str]:
    """Delete a paper by ID.

    Raises:
        404: Paper not found.
    """
    if not delete_item("papers", paper_id):
        raise HTTPException(status_code=404, detail="Paper not found.")
    return {"deleted": paper_id}
