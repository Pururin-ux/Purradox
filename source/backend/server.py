from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, StrictInt
from typing import Dict, List, Optional, Union

from content import CT_SECTIONS, CT_TASKS, CT_DEMO
from curriculum import COURSE, QUIZ_BY_ID as COURSE_QUIZ, TASK_BY_ID, TASK_LESSON, catalog, without_audit
from exams import EXAMS
from ct_feedback import feedback_for
from assessment import Assessment, answered, canonical_id

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Подключение держим ради будущего серверного хранения, но прогресс сейчас
# живёт только в браузере (localStorage + файл переноса): API stateless,
# ни одной операции чтения/записи в db нет. Убирать клиент пока рано —
# пригодится для кабинетов и телеметрии, если они появятся.
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

HIDDEN = ("answer", "solution", "explanation", "audit")
CT_BY_ID = {t["id"]: t for t in CT_TASKS}
LESSON_ASSESSMENTS = {slug: Assessment(f"lesson:{slug}", row["quiz"]) for slug, row in COURSE.items()}
TRAINER_ASSESSMENTS = {slug: Assessment(f"trainer:{slug}", row["tasks"]) for slug, row in COURSE.items()}
CT_ASSESSMENTS = {ident: Assessment(f"ct:{ident}", form["tasks"]) for ident, form in EXAMS.items()}

Answer = Union[StrictInt, List[StrictInt], str, None]


class CheckIn(BaseModel):
    id: str
    answer: Answer = None
    revision: Optional[str] = None


class CtSubmitIn(BaseModel):
    answers: Dict[str, Answer] = {}
    elapsed_sec: int = 0
    revision: Optional[str] = None


def public(item: dict) -> dict:
    return without_audit({k: v for k, v in item.items() if k not in HIDDEN})


def is_correct(item: dict, answer: Answer) -> bool:
    kind = item["kind"]
    if answer is None or answer == "" or answer == []:
        return False
    if kind == "single":
        return isinstance(answer, int) and not isinstance(answer, bool) and answer == item["answer"]
    if kind == "multi":
        return isinstance(answer, list) and all(isinstance(i, int) and not isinstance(i, bool) for i in answer) and sorted(set(answer)) == sorted(item["answer"])
    try:
        value = float(str(answer).strip().replace(",", ".").replace("−", "-"))
    except ValueError:
        return False
    return value == item["answer"]


def correct_ct_answer(task: dict, answer: Answer) -> bool:
    if task["part"] != "B":
        return is_correct(task, answer)
    written = str(answer)
    return len(written) <= 8 and re.fullmatch(r"[−-]?[0-9]+", written) is not None and int(written.replace("−", "-")) == task["answer"]


def require_slug(slug: str):
    if slug not in COURSE:
        raise HTTPException(status_code=404, detail="Тема не найдена")


@api_router.get("/health")
async def health():
    return {"ok": True}


@api_router.get("/lessons/{slug}")
async def get_lesson(slug: str):
    require_slug(slug)
    row = COURSE[slug]
    return {**without_audit(row["lesson"]), "quiz": [public(q) for q in row["quiz"]],
            "_assessment": LESSON_ASSESSMENTS[slug].public()}


@api_router.post("/lessons/{slug}/check")
async def check_lesson(slug: str, body: CheckIn):
    require_slug(slug)
    found = COURSE_QUIZ.get(canonical_id(body.id))
    if not found or found[0] != slug:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    item = found[1]
    LESSON_ASSESSMENTS[slug].check(body.revision, (body.id,))
    return {"correct": is_correct(item, body.answer), "answer": item["answer"], "explanation": item["explanation"]}


@api_router.get("/trainer/{slug}")
async def get_trainer(slug: str):
    require_slug(slug)
    row = COURSE[slug]
    return {
        "slug": slug,
        "title": row["lesson"]["title"],
        "grade": row["lesson"]["grade"],
        "tasks": [public(t) for t in row["tasks"]],
        "_assessment": TRAINER_ASSESSMENTS[slug].public(),
    }


@api_router.post("/trainer/check")
async def check_task(body: CheckIn):
    ident = canonical_id(body.id)
    item = TASK_BY_ID.get(ident)
    if not item:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    TRAINER_ASSESSMENTS[TASK_LESSON[ident]].check(body.revision, (body.id,))
    return {"correct": is_correct(item, body.answer), "answer": item["answer"], "solution": item["solution"]}


@api_router.get("/catalog")
async def get_catalog():
    data = catalog()
    for row in data["lessons"]:
        slug = row["slug"]
        row["draftVersions"] = {
            "lesson": LESSON_ASSESSMENTS[slug].public(),
            "trainer": TRAINER_ASSESSMENTS[slug].public(),
        }
    return data


class ReviewIn(BaseModel):
    ids: List[str] = Field(default_factory=list, max_length=500)


def review_version(assessment, item):
    result = {"revision": assessment.revision}
    order = assessment.freebuff_positions.get(item["id"])
    if order and item["kind"] != "number":
        result["legacyPositions"] = order
    return result


@api_router.post("/review")
async def get_review(body: ReviewIn):
    items = []
    for ident in dict.fromkeys(body.ids):
        # Ошибки квизов хранятся с неймспейсом quiz:, сам вопрос — без него.
        quiz_entry = ident.startswith("quiz:")
        key = canonical_id(ident[5:] if quiz_entry else ident)
        if not quiz_entry and key in TASK_BY_ID:
            task = TASK_BY_ID[key]
            slug = TASK_LESSON[key]
            lesson = COURSE[slug]["lesson"]
            items.append({"id": ident, "kind": task["kind"], "lessonSlug": slug,
                          "lessonTitle": lesson["title"], "chapter": lesson["chapter"],
                          "code": task["code"], "graph": without_audit(task.get("graph")),
                          "text": task.get("text"), "options": task.get("options"), "unit": task.get("unit"),
                          "answer": task["answer"], "hint": task.get("hint"), "solution": task.get("solution"),
                          **review_version(TRAINER_ASSESSMENTS[slug], task)})
        elif quiz_entry and key in COURSE_QUIZ:
            slug, quiz = COURSE_QUIZ[key]
            items.append({"id": ident, "kind": quiz["kind"], "lessonSlug": slug,
                          "lessonTitle": COURSE[slug]["lesson"]["title"],
                          "text": quiz.get("text"), "options": quiz.get("options"), "unit": quiz.get("unit"),
                          "answer": quiz["answer"], "explanation": quiz.get("explanation"),
                          **review_version(LESSON_ASSESSMENTS[slug], quiz)})
    return {"items": items}


@api_router.get("/tasks")
async def get_all_tasks():
    return {"tasks": [{**public(task), "lessonSlug": TASK_LESSON[task["id"]],
                       "lessonTitle": COURSE[TASK_LESSON[task["id"]]]["lesson"]["title"],
                       "chapter": COURSE[TASK_LESSON[task["id"]]]["lesson"]["chapter"]}
                      for task in TASK_BY_ID.values()]}


@api_router.get("/ct/variants")
async def get_variants():
    return {"variants": [{**{key: value for key, value in exam.items() if key not in ("tasks", "sections")},
                          "_assessment": CT_ASSESSMENTS[exam["variantId"]].public()}
                         for exam in EXAMS.values()]}


@api_router.get("/ct/variants/{variant_id}")
async def get_variant(variant_id: str):
    if variant_id not in EXAMS:
        raise HTTPException(status_code=404, detail="Вариант не найден")
    exam = EXAMS[variant_id]
    return {**{key: value for key, value in exam.items() if key != "tasks"},
            "tasks": [public(task) for task in exam["tasks"]], "_assessment": CT_ASSESSMENTS[variant_id].public()}


@api_router.post("/ct/variants/{variant_id}/submit")
async def submit_variant(variant_id: str, body: CtSubmitIn):
    if variant_id not in EXAMS:
        raise HTTPException(status_code=404, detail="Вариант не найден")
    exam = EXAMS[variant_id]
    CT_ASSESSMENTS[variant_id].check(body.revision, (ident for ident, value in body.answers.items() if answered(value)))
    review = []
    sections = {s["id"]: {"id": s["id"], "title": s["title"], "correct": 0, "total": 0} for s in exam["sections"]}
    for task in exam["tasks"]:
        given = body.answers.get(task["id"])
        ok = correct_ct_answer(task, given)
        sections[task["section"]]["total"] += 1
        sections[task["section"]]["correct"] += int(ok)
        review.append({key: task.get(key) for key in
                       ("id", "code", "section", "answer", "unit", "solution", "trainerTaskId", "lessonSlug", "lessonTitle")})
        if task.get("trainerTaskId"):
            review[-1]["trainerRevision"] = TRAINER_ASSESSMENTS[task["lessonSlug"]].revision
        review[-1].update(correct=ok, given=given, guide=feedback_for(variant_id, task, given, ok))
    total = len(exam["tasks"])
    return {"variantId": variant_id, "correct": sum(item["correct"] for item in review), "total": total,
            "full_total": total, "elapsed_sec": min(exam["minutes"] * 60, max(0, body.elapsed_sec)),
            "by_section": list(sections.values()), "review": review}


@api_router.get("/ct/demo")
async def get_ct_demo():
    return {**CT_DEMO, "sections": CT_SECTIONS, "tasks": [public(t) for t in CT_TASKS]}


@api_router.post("/ct/demo/submit")
async def submit_ct(body: CtSubmitIn):
    review = []
    by_section = {s["id"]: {"id": s["id"], "title": s["title"], "correct": 0, "total": 0} for s in CT_SECTIONS}
    for task in CT_TASKS:
        given = body.answers.get(task["id"])
        ok = correct_ct_answer(task, given)
        sec = by_section[task["section"]]
        sec["total"] += 1
        sec["correct"] += int(ok)
        review.append({
            "id": task["id"], "code": task["code"], "section": task["section"], "correct": ok,
            "given": given, "answer": task["answer"], "unit": task.get("unit"), "solution": task["solution"],
            "guide": feedback_for("demo", task, given, ok),
        })
    correct = sum(1 for r in review if r["correct"])
    return {
        "correct": correct,
        "total": len(CT_TASKS),
        "full_total": CT_DEMO["total"],
        "elapsed_sec": min(CT_DEMO["minutes"] * 60, max(0, body.elapsed_sec)),
        "by_section": [s for s in by_section.values() if s["total"]],
        "review": review,
    }


app.include_router(api_router)

app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=3)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[origin.strip() for origin in os.environ.get('CORS_ORIGINS', '').split(',') if origin.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
