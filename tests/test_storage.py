"""Tests for the JSON file storage layer."""

from backend.models import Paper, PaperHeader, Template
from backend.storage import delete_item, list_items, load_item, save_item


def test_save_and_load_paper() -> None:
    paper = Paper(header=PaperHeader(title="Math Test"))
    save_item("papers", paper.id, paper)
    loaded = load_item("papers", paper.id, Paper)
    assert loaded is not None
    assert loaded.header.title == "Math Test"
    assert loaded.id == paper.id


def test_load_missing_returns_none() -> None:
    result = load_item("papers", "nonexistent-id", Paper)
    assert result is None


def test_list_items_empty() -> None:
    items = list_items("papers", Paper)
    assert items == []


def test_list_items_returns_all() -> None:
    p1 = Paper(header=PaperHeader(title="Paper 1"))
    p2 = Paper(header=PaperHeader(title="Paper 2"))
    save_item("papers", p1.id, p1)
    save_item("papers", p2.id, p2)
    items = list_items("papers", Paper)
    assert len(items) == 2


def test_list_items_sorted_newest_first(tmp_path) -> None:
    import time

    p1 = Paper(header=PaperHeader(title="Old"))
    save_item("papers", p1.id, p1)
    time.sleep(0.01)  # ensure different mtime
    p2 = Paper(header=PaperHeader(title="New"))
    save_item("papers", p2.id, p2)
    items = list_items("papers", Paper)
    assert items[0].header.title == "New"


def test_delete_existing_item() -> None:
    paper = Paper()
    save_item("papers", paper.id, paper)
    assert load_item("papers", paper.id, Paper) is not None
    result = delete_item("papers", paper.id)
    assert result is True
    assert load_item("papers", paper.id, Paper) is None


def test_delete_missing_item_returns_false() -> None:
    result = delete_item("papers", "does-not-exist")
    assert result is False


def test_save_overwrites_existing() -> None:
    paper = Paper(header=PaperHeader(title="Original"))
    save_item("papers", paper.id, paper)
    paper.header.title = "Updated"
    save_item("papers", paper.id, paper)
    loaded = load_item("papers", paper.id, Paper)
    assert loaded is not None
    assert loaded.header.title == "Updated"


def test_storage_works_for_templates() -> None:
    template = Template(name="My Template")
    save_item("templates", template.id, template)
    loaded = load_item("templates", template.id, Template)
    assert loaded is not None
    assert loaded.name == "My Template"
