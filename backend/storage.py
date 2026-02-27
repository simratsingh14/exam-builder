"""JSON file storage utilities for papers, templates, and uploads."""

import os
from pathlib import Path
from typing import TypeVar, Type

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def _data_dir() -> Path:
    """Return the configured data directory (reads DATA_DIR env var at call time)."""
    return Path(os.getenv("DATA_DIR", "/data"))


def save_item(directory: str, item_id: str, data: BaseModel) -> None:
    """Serialise a Pydantic model to JSON and write it to the storage directory.

    Args:
        directory: Subdirectory name ("papers", "templates", "uploads").
        item_id: Unique identifier used as the filename stem.
        data: Pydantic model instance to persist.
    """
    path = _data_dir() / directory / f"{item_id}.json"
    path.write_text(data.model_dump_json())


def load_item(directory: str, item_id: str, model: Type[T]) -> T | None:
    """Load and deserialise a single JSON file.

    Args:
        directory: Subdirectory name.
        item_id: Filename stem to look up.
        model: Pydantic model class to validate against.

    Returns:
        Validated model instance, or ``None`` if the file does not exist.
    """
    path = _data_dir() / directory / f"{item_id}.json"
    if not path.exists():
        return None
    return model.model_validate_json(path.read_text())


def list_items(directory: str, model: Type[T]) -> list[T]:
    """Return all valid items from a storage directory, newest first.

    Silently skips files that fail validation (e.g. corrupt JSON).

    Args:
        directory: Subdirectory name.
        model: Pydantic model class to validate against.

    Returns:
        List of validated model instances ordered by file modification time
        (most recent first).
    """
    path = _data_dir() / directory
    items: list[T] = []
    for file in sorted(path.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True):
        try:
            items.append(model.model_validate_json(file.read_text()))
        except Exception:  # noqa: BLE001 — skip corrupt files gracefully
            pass
    return items


def delete_item(directory: str, item_id: str) -> bool:
    """Delete a stored item.

    Args:
        directory: Subdirectory name.
        item_id: Filename stem to delete.

    Returns:
        ``True`` if the file was deleted, ``False`` if it did not exist.
    """
    path = _data_dir() / directory / f"{item_id}.json"
    if path.exists():
        path.unlink()
        return True
    return False
