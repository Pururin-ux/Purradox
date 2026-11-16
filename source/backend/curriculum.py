"""Authored course content. Legacy response objects stay byte-compatible."""
import json
from pathlib import Path

SECTIONS = [
    {"id": "mechanics", "title": "Механика", "short": "Движение и силы", "art": "cradle"},
    {"id": "thermal", "title": "Молекулярная физика и термодинамика", "short": "Тепло и вещество", "art": "stirling"},
    {"id": "electricity", "title": "Электродинамика", "short": "Заряд и поле", "art": "tesla"},
    {"id": "optics", "title": "Оптика и теория относительности", "short": "Свет и пространство", "art": "prism"},
    {"id": "quantum", "title": "Квантовая физика", "short": "Фотоны и атомы", "art": "quark"},
    {"id": "nucleus", "title": "Физика атомного ядра", "short": "Ядро и превращения", "art": "cloud"},
]


def load_course(root=None):
    root = root or Path(__file__).with_name("curriculum")
    records = {}
    used = set()
    for path in sorted(root.rglob("*.json")):
        record = json.loads(path.read_text(encoding="utf-8"))
        slug = record["lesson"]["slug"]
        if slug in records:
            raise ValueError(f"Duplicate lesson: {slug}")
        for item in [*record["quiz"], *record["tasks"]]:
            if item["id"] in used:
                raise ValueError(f"Duplicate question: {item['id']}")
            used.add(item["id"])
        records[slug] = record
    return records


COURSE = load_course()
QUIZ_BY_ID = {item["id"]: (slug, item) for slug, row in COURSE.items() for item in row["quiz"]}
TASK_BY_ID = {item["id"]: item for row in COURSE.values() for item in row["tasks"]}
TASK_LESSON = {item["id"]: slug for slug, row in COURSE.items() for item in row["tasks"]}


def without_audit(value):
    if isinstance(value, dict):
        return {key: without_audit(item) for key, item in value.items() if key != "audit"}
    if isinstance(value, list):
        return [without_audit(item) for item in value]
    return value


def catalog():
    lessons = []
    for slug, row in COURSE.items():
        lesson = row["lesson"]
        lessons.append({
            "slug": slug, "title": lesson["title"], "grade": lesson["grade"],
            "section": lesson["section"],
            "order": lesson["order"],
            "minutes": lesson.get("minutes", 18),
            "description": lesson.get("description", ""),
            "coverage": lesson.get("coverage", []),
            "taskIds": [item["id"] for item in row["tasks"]],
            "taskCount": len(row["tasks"]), "quizCount": len(row["quiz"]),
        })
    return {"sections": SECTIONS, "lessons": sorted(lessons, key=lambda item: item["order"]),
            "basis": {"year": 2026, "total": 30, "partA": 10, "partB": 20, "durationMinutes": 210,
                      "source": "https://phys_ct.sdamgia.ru/doc/spec/spec_ct26_phys.pdf"}}
