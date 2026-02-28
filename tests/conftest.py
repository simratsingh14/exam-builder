"""Shared pytest fixtures."""

import importlib
from pathlib import Path

import pytest


@pytest.fixture(autouse=True)
def temp_data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Redirect DATA_DIR to a temp directory for every test.

    Also reloads backend.storage so it picks up the patched env var.
    """
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    for sub in ("papers", "templates", "uploads"):
        (tmp_path / sub).mkdir()

    import backend.storage as storage_mod
    importlib.reload(storage_mod)

    return tmp_path
