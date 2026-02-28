from backend.models import (
    Paper,
    PaperHeader,
    PaperStyle,
    TextQuestion,
    MCQQuestion,
    MCQOption,
    TableQuestion,
    ImageQuestion,
    Template,
)


def test_paper_has_default_id() -> None:
    paper = Paper()
    assert paper.id is not None
    assert len(paper.id) == 36  # UUID format


def test_two_papers_have_different_ids() -> None:
    p1 = Paper()
    p2 = Paper()
    assert p1.id != p2.id


def test_mcq_question_stores_options() -> None:
    q = MCQQuestion(
        stem={"type": "doc", "content": []},
        options=[
            MCQOption(label="A", text="Option A"),
            MCQOption(label="B", text="Option B"),
            MCQOption(label="C", text="Option C"),
            MCQOption(label="D", text="Option D"),
        ],
    )
    assert len(q.options) == 4
    assert q.options[1].label == "B"


def test_paper_serializes_question_discriminated_union() -> None:
    paper = Paper(
        questions=[
            TextQuestion(content={"type": "doc", "content": []}),
            MCQQuestion(stem={"type": "doc", "content": []}, options=[]),
            TableQuestion(content={"type": "doc", "content": []}),
            ImageQuestion(filename="test.png"),
        ]
    )
    data = paper.model_dump()
    types = [q["type"] for q in data["questions"]]
    assert types == ["text", "mcq", "table", "image"]


def test_paper_round_trips_json() -> None:
    paper = Paper(header=PaperHeader(title="Chemistry Final", total_marks=100))
    json_str = paper.model_dump_json()
    restored = Paper.model_validate_json(json_str)
    assert restored.id == paper.id
    assert restored.header.title == "Chemistry Final"
    assert restored.header.total_marks == 100


def test_paper_style_defaults() -> None:
    style = PaperStyle()
    assert style.font_family == "Times New Roman"
    assert style.font_size == 12
    assert style.logo_filename is None
    assert style.margin_left == 1.25


def test_template_requires_name() -> None:
    t = Template(name="Midterm Template")
    assert t.name == "Midterm Template"
    assert t.id is not None


def test_mcq_option_correct_flag_defaults_false() -> None:
    opt = MCQOption(label="A", text="Paris")
    assert opt.is_correct is False
