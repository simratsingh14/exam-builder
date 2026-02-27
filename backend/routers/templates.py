"""Templates CRUD endpoints."""

from fastapi import APIRouter, HTTPException

from ..models import Template, TemplateSummary
from ..storage import delete_item, list_items, load_item, save_item

router = APIRouter()


@router.get("", response_model=list[TemplateSummary])
async def list_templates() -> list[TemplateSummary]:
    """Return a lightweight summary of all saved templates, newest first."""
    templates = list_items("templates", Template)
    return [
        TemplateSummary(id=t.id, name=t.name, created_at=t.created_at)
        for t in templates
    ]


@router.post("", response_model=Template)
async def save_template(template: Template) -> Template:
    """Create or update a template."""
    save_item("templates", template.id, template)
    return template


@router.get("/{template_id}", response_model=Template)
async def get_template(template_id: str) -> Template:
    """Fetch a single template by ID.

    Raises:
        404: Template not found.
    """
    template = load_item("templates", template_id, Template)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found.")
    return template


@router.delete("/{template_id}")
async def delete_template(template_id: str) -> dict[str, str]:
    """Delete a template by ID.

    Raises:
        404: Template not found.
    """
    if not delete_item("templates", template_id):
        raise HTTPException(status_code=404, detail="Template not found.")
    return {"deleted": template_id}
