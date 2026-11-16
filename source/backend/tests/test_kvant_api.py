"""Kvant physics platform API regression tests (Stage 1a: lesson, trainer, CT demo)."""
import os
import re
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "http://127.0.0.1:4183").rstrip("/")
SLUG = "ravnouskorennoe-dvizhenie"
S = requests.Session()


@pytest.fixture(scope="module")
def assessment_revision():
    def get(path):
        response = S.get(f"{BASE_URL}/api/{path}", timeout=5)
        assert response.status_code == 200
        metadata = response.json()["_assessment"]
        assert re.fullmatch(r"[0-9a-f]{20}", metadata["revision"])
        assert re.fullmatch(r"[0-9a-f]{20}", metadata["draftRevision"])
        assert isinstance(metadata["legacy"], dict)
        return metadata["revision"]
    return get


@pytest.fixture(scope="module")
def lesson_revision(assessment_revision):
    return assessment_revision(f"lessons/{SLUG}")


@pytest.fixture(scope="module")
def trainer_revision(assessment_revision):
    return assessment_revision(f"trainer/{SLUG}")


# Health
def test_health():
    r = S.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200 and r.json() == {"ok": True}


# Lesson content
def test_lesson_no_quiz_answers():
    r = S.get(f"{BASE_URL}/api/lessons/{SLUG}")
    assert r.status_code == 200
    d = r.json()
    assert len(d["cards"]) == 10 if "cards" in d else True
    assert len(d["quiz"]) == 5
    for q in d["quiz"]:
        assert "answer" not in q and "explanation" not in q and "solution" not in q


def test_lesson_unknown_slug_404():
    assert S.get(f"{BASE_URL}/api/lessons/unknown").status_code == 404
    assert S.post(f"{BASE_URL}/api/lessons/unknown/check", json={"id": "q1", "answer": 2}).status_code == 404
    assert S.get(f"{BASE_URL}/api/trainer/unknown").status_code == 404


@pytest.mark.parametrize("qid,right,wrong", [("ravnouskorennoe-dvizhenie:q1", 2, 1), ("ravnouskorennoe-dvizhenie:q2", 2, 3), ("ravnouskorennoe-dvizhenie:q3", "10", "9"), ("ravnouskorennoe-dvizhenie:q4", 3, 1), ("ravnouskorennoe-dvizhenie:q5", "10", "11")])
def test_lesson_check(qid, right, wrong, lesson_revision):
    endpoint = f"{BASE_URL}/api/lessons/{SLUG}/check"
    r = S.post(endpoint, json={"id": qid, "answer": right, "revision": lesson_revision})
    assert r.status_code == 200
    d = r.json()
    assert d["correct"] is True and "explanation" in d
    r = S.post(endpoint, json={"id": qid, "answer": wrong, "revision": lesson_revision})
    assert r.json()["correct"] is False


def test_lesson_check_unknown_question():
    assert S.post(f"{BASE_URL}/api/lessons/{SLUG}/check", json={"id": "qX", "answer": 1}).status_code == 404


# Trainer
def test_trainer_no_answers():
    r = S.get(f"{BASE_URL}/api/trainer/{SLUG}")
    assert r.status_code == 200
    tasks = r.json()["tasks"]
    assert len(tasks) == 10
    for t in tasks:
        assert "answer" not in t and "solution" not in t


@pytest.mark.parametrize("tid,ans", [(f"{SLUG}:t1", 2), (f"{SLUG}:t2", 3), (f"{SLUG}:t3", 4), (f"{SLUG}:t4", [1, 2, 4]), (f"{SLUG}:t5", 3), (f"{SLUG}:t6", "135"),
                                     (f"{SLUG}:t7", "24"), (f"{SLUG}:t8", "25"), (f"{SLUG}:t9", "50"), (f"{SLUG}:t10", "6")])
def test_trainer_check_correct(tid, ans, trainer_revision):
    r = S.post(f"{BASE_URL}/api/trainer/check", json={"id": tid, "answer": ans, "revision": trainer_revision})
    assert r.status_code == 200
    d = r.json()
    assert d["correct"] is True
    assert d["solution"]


def test_trainer_check_wrong_and_edge(trainer_revision):
    endpoint = f"{BASE_URL}/api/trainer/check"
    for task, answer, correct in (("t4", [1, 2], False), ("t4", [4, 2, 1], True),
                                  ("t6", "abc", False), ("t6", None, False)):
        r = S.post(endpoint, json={"id": f"{SLUG}:{task}", "answer": answer, "revision": trainer_revision})
        assert r.status_code == 200 and r.json()["correct"] is correct
    assert S.post(f"{BASE_URL}/api/trainer/check", json={"id": "nope", "answer": 1}).status_code == 404


# Review (разбор ошибок: ответы и правила по id)
def test_review_endpoint():
    r = S.post(f"{BASE_URL}/api/review", json={"ids": [f"{SLUG}:t1", f"quiz:{SLUG}:q2", "nope"]})
    assert r.status_code == 200
    items = {item["id"]: item for item in r.json()["items"]}
    assert items[f"{SLUG}:t1"]["answer"] == 2 and items[f"{SLUG}:t1"]["hint"]
    assert items[f"quiz:{SLUG}:q2"]["answer"] == 2 and items[f"quiz:{SLUG}:q2"]["explanation"]
    assert "nope" not in items


# CT demo
def test_ct_demo_no_answers():
    r = S.get(f"{BASE_URL}/api/ct/demo")
    assert r.status_code == 200
    d = r.json()
    assert len(d["tasks"]) == 8
    assert "_assessment" not in d
    for t in d["tasks"]:
        assert "answer" not in t and "solution" not in t


def test_ct_submit_all_correct():
    ans = {"A1": 2, "A2": 3, "A3": 2, "A4": 4, "B1": "20", "B2": "420", "B3": "60", "B4": "24"}
    r = S.post(f"{BASE_URL}/api/ct/demo/submit", json={"answers": ans, "elapsed_sec": 100})
    assert r.status_code == 200
    d = r.json()
    assert d["correct"] == 8 and d["total"] == 8 and d["elapsed_sec"] == 100
    assert len(d["review"]) == 8 and all(x["correct"] for x in d["review"])
    assert sum(s["total"] for s in d["by_section"]) == 8


def test_ct_submit_empty():
    r = S.post(f"{BASE_URL}/api/ct/demo/submit", json={"answers": {}, "elapsed_sec": -5})
    d = r.json()
    assert d["correct"] == 0 and d["elapsed_sec"] == 0


def test_ct_demo_caps_duration_at_the_public_time_limit():
    demo = S.get(f"{BASE_URL}/api/ct/demo", timeout=5).json()
    limit = demo["minutes"] * 60
    response = S.post(f"{BASE_URL}/api/ct/demo/submit", json={"elapsed_sec": limit + 1}, timeout=5)
    assert response.status_code == 200
    assert response.json()["elapsed_sec"] == limit


@pytest.mark.parametrize(("answer", "correct"), [(20, True), ("00000020", True), ("000000020", False),
    ("20.0", False), ("20,0", False), ("2e1", False), ("+20", False), ("2_0", False), ("２０", False)])
def test_ct_demo_uses_the_answer_sheet_integer_format(answer, correct):
    response = S.post(f"{BASE_URL}/api/ct/demo/submit", json={"answers": {"B1": answer}}, timeout=5)
    assert response.status_code == 200
    row = next(row for row in response.json()["review"] if row["id"] == "B1")
    assert row["correct"] is correct
    assert row["given"] == answer


# Вариант ЦТ: total всегда равен числу заданий варианта, а не константе
def test_ct_variant_submit_total_matches_tasks():
    v = S.get(f"{BASE_URL}/api/ct/variants/01").json()
    r = S.post(f"{BASE_URL}/api/ct/variants/01/submit", json={"answers": {}, "elapsed_sec": 10, "revision": v["_assessment"]["revision"]})
    assert r.status_code == 200
    d = r.json()
    assert d["total"] == d["full_total"] == len(v["tasks"]) == len(d["review"])
    assert sum(s["total"] for s in d["by_section"]) == len(v["tasks"])


def test_ct_variant_rejects_old_positions_and_accepts_the_current_revision(assessment_revision):
    endpoint = f"{BASE_URL}/api/ct/variants/01/submit"
    old_answer = {"answers": {"A1": 4}, "elapsed_sec": 10}
    assert S.post(endpoint, json=old_answer).status_code == 409
    assert S.post(endpoint, json={**old_answer, "revision": "outdated"}).status_code == 409

    revision = assessment_revision("ct/variants/01")
    r = S.post(endpoint, json={"answers": {"A1": 5}, "elapsed_sec": 10, "revision": revision})
    assert r.status_code == 200 and r.json()["correct"] == 1
    assert r.json()["review"][0]["given"] == 5


# Каталог для повторения: без спойлеров, с привязкой к уроку и разделу
def test_tasks_catalog_shape():
    r = S.get(f"{BASE_URL}/api/tasks")
    assert r.status_code == 200
    tasks = r.json()["tasks"]
    assert len(tasks) == 298  # 10 демо-урока + 288 курса
    for t in tasks:
        assert "answer" not in t and "audit" not in t and "solution" not in t
        assert t["lessonSlug"] and t["lessonTitle"] and t["chapter"]
