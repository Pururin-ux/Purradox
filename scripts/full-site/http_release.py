"""One stateless HTTP release pass against the local PhysicsLab API.

Uses only Python's standard library. Source imports load authored data, never
server.py, Mongo clients, browser storage, or frontend code.
"""
from collections import Counter
from datetime import datetime, timezone
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, ProxyHandler, build_opener

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "source/backend"
BASELINE_REPORT = ROOT / "evidence/full-site-20261107/http-release.json"
HIDDEN = {"answer", "solution", "explanation", "audit"}
SECTION_COUNTS = dict(mechanics=15, thermal=7, electricity=14, optics=7, quantum=3, nucleus=3)
EXAM_COUNTS = dict(mechanics=10, thermal=7, electricity=9, optics=2, quantum=1, nucleus=1)


def expect(condition, message):
    if not condition:
        raise AssertionError(message)


def compact(value):
    # Preserve key order as well as values: learning drafts fingerprint JSON.
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def digest(value):
    return hashlib.sha256(compact(value).encode("utf-8")).hexdigest()


def verify_short_demo(demo):
    pinned = json.loads(BASELINE_REPORT.read_text(encoding="utf-8"))
    expected = pinned["observed"]["legacy_payloads"]["ct_demo"]["canonical_json_sha256"]
    actual = digest(demo)
    expect(actual == expected, f"Short CT demo changed: expected {expected}, got {actual}")
    return actual


def strip_audit(value):
    if isinstance(value, dict):
        return {key: strip_audit(item) for key, item in value.items() if key != "audit"}
    if isinstance(value, list):
        return [strip_audit(item) for item in value]
    return value


def public_question(item):
    return strip_audit({key: value for key, value in item.items() if key not in HIDDEN})


def no_hidden(value, path="$", example=False):
    if isinstance(value, dict):
        example = example or value.get("kind") == "example"
        for key, item in value.items():
            expect(key not in HIDDEN or (example and key == "answer"), "Hidden field at " + path + "." + key)
            no_hidden(item, path + "." + key, example)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            no_hidden(item, path + "[" + str(index) + "]", example)


def same(actual, expected, label):
    expect(compact(actual) == compact(expected), label + " differs (actual SHA " + digest(actual) + ", expected SHA " + digest(expected) + ")")


def source_hashes():
    files = [*BACKEND.glob("*.py"), *BACKEND.glob("*.json"), *(BACKEND / "curriculum").rglob("*.json")]
    return {str(path.relative_to(ROOT)).replace("\\", "/"): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in sorted(files)}


def verify_assessment(metadata, label):
    expect(isinstance(metadata, dict) and set(metadata) == {"revision", "draftRevision", "legacy"},
           "Assessment metadata shape: " + label)
    for key in ("revision", "draftRevision"):
        expect(isinstance(metadata[key], str) and re.fullmatch(r"[0-9a-f]{20}", metadata[key]),
               "Invalid assessment " + key + ": " + label)
    expect(isinstance(metadata["legacy"], dict), "Invalid migration plans: " + label)


class Release:
    def __init__(self, base, prefix):
        self.base = base.rstrip("/")
        self.prefix = prefix
        self.started = datetime.now(timezone.utc).isoformat()
        self.start_time = time.monotonic()
        self.opener = build_opener(ProxyHandler({}))
        self.groups = {}
        self.failures = []
        self.requests = Counter()
        self.statuses = Counter()
        self.notes = []
        self.observed = {}
        self.log = ["Stateless HTTP release pass " + self.started, "Target: " + self.base]

    def request(self, path, body=None, status=200):
        method = "GET" if body is None else "POST"
        payload = None if body is None else compact(body).encode("utf-8")
        request = Request(self.base + "/api" + path, data=payload, method=method,
                          headers={"Accept": "application/json", "Content-Type": "application/json"})
        self.requests[method] += 1
        try:
            response = self.opener.open(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            code = response.status
            raw = response.read()
        self.statuses[str(code)] += 1
        expect(code == status, method + " " + path + ": HTTP " + str(code) + ", expected " + str(status)
               + "; " + raw.decode("utf-8", "replace")[:180])
        return json.loads(raw)

    def case(self, group, label, run):
        count = self.groups.setdefault(group, {"checks": 0, "passed": 0, "failed": 0})
        count["checks"] += 1
        try:
            value = run()
        except Exception as error:
            count["failed"] += 1
            failure = {"group": group, "check": label, "error": type(error).__name__ + ": " + str(error)}
            self.failures.append(failure)
            self.log.append("FAIL " + group + " / " + label + ": " + failure["error"])
            return None
        count["passed"] += 1
        return value

    def finish(self, before):
        after = source_hashes()
        changed = [name for name in sorted(set(before) | set(after)) if before.get(name) != after.get(name)]
        self.case("source_stability", "backend inputs unchanged during HTTP pass",
                  lambda: expect(not changed, "Changed sources: " + ", ".join(changed)))
        report = {
            "target": self.base, "started_utc": self.started,
            "duration_sec": round(time.monotonic() - self.start_time, 3),
            "passed": not self.failures, "groups": self.groups,
            "http_requests": dict(self.requests), "http_statuses": dict(self.statuses),
            "observed": self.observed, "source_file_count": len(before),
            "source_manifest_sha256": digest(before), "source_changed": changed,
            "failures": self.failures, "notes": self.notes,
            "limits": ["Local HTTP and authored data only; no browser or rendered UI.",
                       "No build, dependency install, service restart, or user-game writes.",
                       "This pass checks delivery/grading contracts, not an independent scientific review of all content."],
        }
        for name, count in self.groups.items():
            self.log.append(name + ": " + str(count["passed"]) + "/" + str(count["checks"])
                            + " pass, " + str(count["failed"]) + " fail")
        self.log.extend(self.notes)
        self.log.append("RESULT " + ("PASS" if report["passed"] else "FAIL") + "; requests " + compact(dict(self.requests)))
        self.prefix.parent.mkdir(parents=True, exist_ok=True)
        self.prefix.with_suffix(".json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        self.prefix.with_suffix(".log").write_text("\n".join(self.log) + "\n", encoding="utf-8")
        print(json.dumps({"passed": report["passed"], "requests": dict(self.requests),
                          "checks": sum(x["checks"] for x in self.groups.values()),
                          "failures": self.failures, "evidence": str(self.prefix.with_suffix(".json"))}, ensure_ascii=True))
        return 0 if report["passed"] else 1


def run_release(check, curriculum, exams):
    course = curriculum.COURSE
    source_tasks = curriculum.TASK_BY_ID
    observed_lessons = {}
    observed_trainers = {}
    catalog_versions = {}

    def catalog_check():
        data = check.request("/catalog")
        rows = data["lessons"]
        public_rows = [{key: value for key, value in row.items() if key != "draftVersions"} for row in rows]
        same({**data, "lessons": public_rows}, curriculum.catalog(), "Catalog / loader")
        expect(len(rows) == 49 and len(data["sections"]) == 6, "Expected 49 lessons and 6 sections")
        expect(Counter(row["section"] for row in rows) == SECTION_COUNTS, "Section allocation")
        expect([row["order"] for row in rows] == list(range(1, 50)), "Catalog order must be 1..49")
        expect(len({row["slug"] for row in rows}) == 49, "Duplicate lesson slugs")
        for row in rows:
            expect(row["grade"] in (9, 10, 11) and row["minutes"] > 0, "Invalid grade/minutes: " + row["slug"])
            expect(row["title"] and row["description"] and row["coverage"], "Missing metadata: " + row["slug"])
            expect(row["taskCount"] == len(row["taskIds"]) == len(course[row["slug"]]["tasks"]), "Task count: " + row["slug"])
            expect(row["quizCount"] == len(course[row["slug"]]["quiz"]), "Quiz count: " + row["slug"])
            versions = row["draftVersions"]
            expect(set(versions) == {"lesson", "trainer"}, "Catalog draft versions: " + row["slug"])
            for label, version in versions.items():
                verify_assessment(version, label + " " + row["slug"])
            catalog_versions[row["slug"]] = versions
        no_hidden(data)
        check.observed["catalog"] = {"lessons": len(rows), "sections": len(data["sections"]), "section_counts": dict(Counter(row["section"] for row in rows))}
    check.case("catalog", "49 lessons / metadata / source loader", catalog_check)

    for slug, row in course.items():
        def lesson_check(slug=slug, row=row):
            data = check.request("/lessons/" + quote(slug, safe=""))
            no_hidden(data)
            version = catalog_versions[slug]["lesson"]
            expected = {**strip_audit(row["lesson"]), "quiz": [public_question(q) for q in row["quiz"]],
                        "_assessment": version}
            same(data, expected, "Lesson " + slug)
            observed_lessons[slug] = data
        check.case("public_lessons", slug, lesson_check)

        def trainer_check(slug=slug, row=row):
            data = check.request("/trainer/" + quote(slug, safe=""))
            no_hidden(data)
            expected = {"slug": slug, "title": row["lesson"]["title"], "grade": row["lesson"]["grade"],
                        "tasks": [public_question(task) for task in row["tasks"]],
                        "_assessment": catalog_versions[slug]["trainer"]}
            same(data, expected, "Trainer " + slug)
            observed_trainers[slug] = data
        check.case("public_trainers", slug, trainer_check)

    def all_tasks_check():
        data = check.request("/tasks")
        no_hidden(data)
        tasks = data["tasks"]
        expected = [{**public_question(task), "lessonSlug": curriculum.TASK_LESSON[task["id"]],
                     "lessonTitle": course[curriculum.TASK_LESSON[task["id"]]]["lesson"]["title"],
                     "chapter": course[curriculum.TASK_LESSON[task["id"]]]["lesson"]["chapter"]}
                    for task in source_tasks.values()]
        expect(len(tasks) == 298 and len({task["id"] for task in tasks}) == 298, "Expected 298 unique public tasks")
        same(tasks, expected, "All-tasks payload / loader")
        quiz_ids = [q["id"] for lesson in observed_lessons.values() for q in lesson["quiz"]]
        task_ids = [task["id"] for trainer in observed_trainers.values() for task in trainer["tasks"]]
        expect(len(quiz_ids) == 149 and len(task_ids) == 298, "Incomplete lesson/trainer traversal")
        expect(len(set(quiz_ids + task_ids)) == 447, "Duplicate quiz/task IDs across lessons")
        expect(set(task_ids) == {task["id"] for task in tasks}, "Trainer / all-tasks ID mismatch")
        check.observed["questions"] = {"quiz": len(quiz_ids), "tasks": len(tasks), "unique_combined_ids": 447}
    check.case("all_tasks", "298 tasks / metadata / global ID uniqueness", all_tasks_check)

    def short_demo_check():
        demo = check.request("/ct/demo")
        no_hidden(demo)
        check.observed["legacy_payloads"] = {
            "ct_demo": {"exact": True, "canonical_json_sha256": verify_short_demo(demo)},
        }
    check.case("legacy", "short CT demo matches the pinned public payload", short_demo_check)

    for slug, row in course.items():
        for question in row["quiz"]:
            def grade_quiz(slug=slug, item=question):
                revision = observed_lessons[slug]["_assessment"]["revision"]
                data = check.request("/lessons/" + quote(slug, safe="") + "/check",
                                     {"id": item["id"], "answer": item["answer"], "revision": revision})
                same(data, {"correct": True, "answer": item["answer"], "explanation": item["explanation"]}, "Quiz grading " + item["id"])
            check.case("authored_quiz_grading", question["id"], grade_quiz)
        for task in row["tasks"]:
            def grade_task(slug=slug, item=task):
                revision = observed_trainers[slug]["_assessment"]["revision"]
                data = check.request("/trainer/check", {"id": item["id"], "answer": item["answer"], "revision": revision})
                same(data, {"correct": True, "answer": item["answer"], "solution": item["solution"]}, "Task grading " + item["id"])
            check.case("authored_task_grading", task["id"], grade_task)

    trainer_revisions = {slug: data["_assessment"]["revision"] for slug, data in observed_trainers.items()}
    check_variants(check, curriculum, exams, trainer_revisions)
    check_errors_and_types(check, curriculum, trainer_revisions)
    check_version_boundaries(check)


def assert_no_audit(value):
    if isinstance(value, dict):
        expect("audit" not in value, "Audit leaked in grading feedback")
        for item in value.values():
            assert_no_audit(item)
    elif isinstance(value, list):
        for item in value:
            assert_no_audit(item)


def check_variants(check, curriculum, exams, trainer_revisions):
    from ct_feedback import feedback_for

    roster_versions = {}
    form_versions = {}

    def roster_check():
        data = check.request("/ct/variants")
        no_hidden(data)
        expect([row["variantId"] for row in data["variants"]] == ["01", "02", "03"], "Expected two practice forms and the independent form")
        expected = []
        for variant, exam in zip(data["variants"], exams.EXAMS.values()):
            version = variant["_assessment"]
            verify_assessment(version, variant["variantId"])
            roster_versions[variant["variantId"]] = version
            expected.append({**{key: value for key, value in exam.items() if key not in ("tasks", "sections")},
                             "_assessment": version})
        same(data, {"variants": expected}, "Variant roster / source")
    check.case("ct_forms", "practice forms and the independent variant", roster_check)

    for variant_id, exam in exams.EXAMS.items():
        def form_check(variant_id=variant_id, exam=exam):
            data = check.request("/ct/variants/" + quote(variant_id, safe=""))
            no_hidden(data)
            version = roster_versions[variant_id]
            expected = {**{key: value for key, value in exam.items() if key != "tasks"},
                        "tasks": [public_question(task) for task in exam["tasks"]], "_assessment": version}
            same(data, expected, "CT form " + variant_id + " / source")
            form_versions[variant_id] = version["revision"]
            expect(data["minutes"] == 210 and data["total"] == 30, "CT timing/total")
            expect(data["part_a"] == 10 and data["part_b"] == 20, "CT part metadata")
            expect(len(data["tasks"]) == 30 and Counter(task["part"] for task in data["tasks"]) == {"A": 10, "B": 20}, "CT 10A/20B")
            expect(Counter(task["section"] for task in data["tasks"]) == EXAM_COUNTS, "CT section allocation")
            expect([task["id"] for task in data["tasks"]] == ["A" + str(i) for i in range(1, 11)] + ["B" + str(i) for i in range(1, 21)], "CT IDs/order")
            for task in data["tasks"]:
                expect(task["lessonTitle"] == curriculum.COURSE[task["lessonSlug"]]["lesson"]["title"], "CT lesson title " + task["id"])
                if exam.get("independent"):
                    expect("trainerTaskId" not in task, "An independent question cannot attach its answer to a trainer task")
                else:
                    source = curriculum.TASK_BY_ID[task["trainerTaskId"]]
                    expect(task["lessonSlug"] == curriculum.TASK_LESSON[source["id"]], "CT lesson mapping " + task["id"])
                    expect(task["text"] == source["text"] and task["kind"] == source["kind"], "CT source content " + task["id"])
                    expect(task.get("unit") == source.get("unit"), "CT source unit " + task["id"])
            if exam.get("independent"):
                expect(Counter(task["level"] for task in data["tasks"]) == {1: 5, 2: 10, 3: 10, 4: 4, 5: 1}, "Independent form difficulty labels")
                expect([task["id"] for task in data["tasks"] if task.get("graph")] == ["A2", "B8"], "Graphs needed during the exam")
            check.observed.setdefault("ct_forms", {})[variant_id] = {
                "total": 30, "part_a": 10, "part_b": 20, "minutes": 210,
                "multi": sum(task["kind"] == "multi" for task in data["tasks"]),
                "unique_ids": len({task["id"] for task in data["tasks"]}),
            }
        check.case("ct_forms", variant_id + " public form / 30 / 10A20B / 210", form_check)

        tasks = exam["tasks"]
        all_ids = {task["id"] for task in tasks}
        answers = {task["id"]: task["answer"] for task in tasks}

        def submission(label, sent, elapsed, correct_ids, variant_id=variant_id, exam=exam):
            def verify():
                data = check.request("/ct/variants/" + quote(variant_id, safe="") + "/submit",
                                     {"answers": sent, "elapsed_sec": elapsed, "revision": form_versions[variant_id]})
                assert_no_audit(data)
                expect(data["variantId"] == variant_id and data["total"] == data["full_total"] == 30, "CT report metadata")
                expect(data["correct"] == len(correct_ids), "CT score " + label + ": " + str(data["correct"]))
                expect(data["elapsed_sec"] == min(exam["minutes"] * 60, max(0, elapsed)), "CT elapsed clamp " + label)
                expected_review = []
                for task in exam["tasks"]:
                    item = {key: task.get(key) for key in ("id", "code", "section", "answer", "unit", "solution", "trainerTaskId", "lessonSlug", "lessonTitle")}
                    if task.get("trainerTaskId"):
                        item["trainerRevision"] = trainer_revisions[task["lessonSlug"]]
                    correct = task["id"] in correct_ids
                    given = sent.get(task["id"])
                    guide = feedback_for(variant_id, task, given, correct)
                    expect(bool(guide.get("title")) and ("note" not in guide if correct else bool(guide.get("note"))),
                           "CT reading cue " + variant_id + " / " + task["id"])
                    item.update(correct=correct, given=given, guide=guide)
                    expected_review.append(item)
                same(data["review"], expected_review, "CT review " + variant_id + " / " + label)
                expected_sections = [{"id": section["id"], "title": section["title"],
                                      "correct": sum(task["id"] in correct_ids and task["section"] == section["id"] for task in exam["tasks"]),
                                      "total": sum(task["section"] == section["id"] for task in exam["tasks"])}
                                     for section in exam["sections"]]
                same(data["by_section"], expected_sections, "CT section report " + variant_id)
            check.case("ct_submissions", variant_id + " / " + label, verify)

        submission("all authored answers / upper elapsed clamp", answers, 99999, all_ids)
        submission("empty / lower elapsed clamp", {}, -100, set())
        # A multi answer is order-independent. B uses integers, including a
        # Unicode minus and leading zeroes when they fit on the answer sheet.
        alternate = {task["id"]: list(reversed(task["answer"])) if task["kind"] == "multi"
                     else str(task["answer"]).zfill(8).replace("-", "−") if task["part"] == "B"
                     else task["answer"] for task in tasks}
        submission("multi order / numeric spelling / exact elapsed", alternate, 123, all_ids)
        multi = next((task for task in tasks if task["kind"] == "multi"), None)
        if multi:
            incomplete = {**answers, multi["id"]: multi["answer"][:-1]}
            submission("incomplete multi loses exactly one point", incomplete, 42, all_ids - {multi["id"]})
        numeric = next(task for task in tasks if task["part"] == "B")
        submission("malformed numeric loses exactly one point", {**answers, numeric["id"]: "12x"}, 0, all_ids - {numeric["id"]})
        submission("unknown answer ID cannot earn a point", {"not-an-exam-task": 1}, 1, set())

    def electric_b17():
        source_id = "rabota-i-moshchnost-toka:t4"
        source = curriculum.TASK_BY_ID[source_id]
        expect(source["answer"] == 12 * 2 * 30 == 720 and source["unit"] == "Дж", "Electrical-work source must be 720 J")
        task = next(task for task in exams.EXAMS["01"]["tasks"] if task["id"] == "B17")
        expect(task["trainerTaskId"] == source_id and task["answer"] == 720, "Form 01 B17 must use electrical-work t4")
        data = check.request("/ct/variants/01/submit",
                             {"answers": {"B17": "720"}, "elapsed_sec": 33, "revision": form_versions["01"]})
        expect(data["correct"] == 1, "B17-only sheet must score exactly 1")
        item = next(item for item in data["review"] if item["id"] == "B17")
        expect(item["correct"] is True and item["answer"] == 720 and item["unit"] == "Дж" and item["trainerTaskId"] == source_id, "B17 HTTP feedback")
        check.observed["form_01_B17"] = {"trainerTaskId": source_id, "answer": 720, "unit": "Дж", "calculation": "12*2*30"}
    check.case("ct_source_spotlight", "form 01 B17 electrical-work t4", electric_b17)


def check_errors_and_types(check, curriculum, trainer_revisions):
    source = curriculum.TASK_BY_ID
    single = next(task for task in source.values() if task["kind"] == "single")
    multi = next(task for task in source.values() if task["kind"] == "multi")
    numeric = source["rabota-i-moshchnost-toka:t4"]
    quiz_slug, quiz = next((slug, item) for slug, row in curriculum.COURSE.items() for item in row["quiz"] if item["kind"] == "single")
    other_slug = next(slug for slug in curriculum.COURSE if slug != quiz_slug)
    quiz_path = "/lessons/" + quote(quiz_slug, safe="") + "/check"
    multi_path = "/trainer/check"

    bad_routes = [
        ("/lessons/no-such-release-topic", None),
        ("/trainer/no-such-release-topic", None),
        ("/ct/variants/no-such-release-form", None),
        ("/no-such-release-route", None),
        ("/ct/variants/no-such-release-form/submit", {"answers": {}}),
        ("/lessons/no-such-release-topic/check", {"id": quiz["id"], "answer": quiz["answer"]}),
        ("/lessons/" + quote(other_slug, safe="") + "/check", {"id": quiz["id"], "answer": quiz["answer"]}),
        (quiz_path, {"id": "not-a-quiz-id", "answer": 1}),
        ("/trainer/check", {"id": "not-a-task-id", "answer": 1}),
    ]
    for path, body in bad_routes:
        check.case("unknown_404", path + (" POST" if body is not None else " GET"),
                   lambda path=path, body=body: expect(bool(check.request(path, body, 404).get("detail")), "Missing 404 detail"))

    rejected = [
        ("scalar true", "/trainer/check", {"id": single["id"], "answer": True}),
        ("scalar false", "/trainer/check", {"id": numeric["id"], "answer": False}),
        ("boolean in multi", multi_path, {"id": multi["id"], "answer": [True]}),
        ("quiz boolean", quiz_path, {"id": quiz["id"], "answer": True}),
        ("missing task ID", "/trainer/check", {"answer": 1}),
        ("invalid task ID type", "/trainer/check", {"id": None, "answer": 1}),
        ("CT boolean answer", "/ct/variants/01/submit", {"answers": {"A1": True}}),
        ("CT boolean list", "/ct/variants/02/submit", {"answers": {"A1": [True]}}),
        ("CT fractional JSON number", "/ct/variants/01/submit", {"answers": {"B1": 1.5}}),
        ("CT invalid elapsed type", "/ct/variants/01/submit", {"answers": {}, "elapsed_sec": "bad"}),
    ]
    for label, path, body in rejected:
        check.case("strict_input_422", label, lambda path=path, body=body: check.request(path, body, 422))

    samples = [
        ("single string is not an option index", single, str(single["answer"]), False),
        ("single zero", single, 0, False),
        ("single out of range", single, len(single["options"]) + 1, False),
        ("multi reversed order", multi, list(reversed(multi["answer"])), True),
        ("multi incomplete", multi, multi["answer"][:-1], False),
        ("multi scalar wrong type", multi, multi["answer"][0], False),
        ("numeric comma integer", numeric, "720,0", True),
        ("numeric unequal fraction", numeric, "720,5", False),
        ("numeric malformed", numeric, "720 Дж", False),
        ("numeric NaN", numeric, "NaN", False),
        ("numeric infinity", numeric, "Infinity", False),
        ("numeric empty", numeric, "", False),
    ]
    for label, item, answer, correct in samples:
        def sample(item=item, answer=answer, correct=correct):
            revision = trainer_revisions[curriculum.TASK_LESSON[item["id"]]]
            data = check.request("/trainer/check", {"id": item["id"], "answer": answer, "revision": revision})
            expect(data["correct"] is correct, "Incorrect accepted/rejected result")
            expect(data["answer"] == item["answer"], "Feedback changed the answer")
            assert_no_audit(data)
        check.case("grading_boundaries", label, sample)
    check.notes.append("Unknown CT answer-map keys were ignored and earned 0 points; check endpoints reject unknown IDs with HTTP 404.")
    check.notes.append("Strict-boolean checks apply to answers, including list items; elapsed checks cover integer clamping and malformed text.")


def check_version_boundaries(check):
    stale = "stale-revision"
    conflicts = [
        ("lesson", "/lessons/ravnomernoe-dvizhenie/check", {"id": "ravnomernoe-dvizhenie:q1", "answer": 1}),
        ("trainer", "/trainer/check", {"id": "ravnomernoe-dvizhenie:t2", "answer": 4}),
        ("CT 01", "/ct/variants/01/submit", {"answers": {"A1": 4}}),
    ]
    for label, path, body in conflicts:
        def reject(path=path, body=body):
            for sent in (body, {**body, "revision": stale}):
                result = check.request(path, sent, 409)
                expect(isinstance(result.get("detail"), str) and bool(result["detail"].strip()),
                       "Expected a revision conflict with a recovery message")
        check.case("grading_revision", label + " rejects conflicting unversioned and stale requests", reject)

    def accept_old_ids():
        lesson = check.request("/lessons/ravnouskorennoe-dvizhenie/check", {"id": "q1", "answer": 2})
        trainer = check.request("/trainer/check", {"id": "t6", "answer": "135"})
        expect(lesson["correct"] and trainer["correct"], "Equivalent legacy lesson/trainer IDs must still grade")
    check.case("grading_revision", "legacy lesson/trainer IDs with equivalent meanings still grade", accept_old_ids)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:4183")
    parser.add_argument("--output-prefix", type=Path, default=ROOT / "local/runtime-release/http-release")
    args = parser.parse_args()
    check = Release(args.base_url, args.output_prefix)
    before = source_hashes()
    sys.path.insert(0, str(BACKEND))
    try:
        import curriculum
        import exams
        expect(len(curriculum.COURSE) == 49 and len(curriculum.TASK_BY_ID) == 298, "Source loader counts differ from release contract")
        def health():
            result = check.request("/health")
            same(result, {"ok": True}, "Health payload")
            return result
        if check.case("transport", "real HTTP health", health) is not None:
            run_release(check, curriculum, exams)
        else:
            check.notes.append("Health did not pass: remaining HTTP checks were not attempted; no service was started or changed.")
    except Exception as error:
        def fail():
            raise RuntimeError(str(error))
        check.case("setup", "source import / release driver", fail)
    return check.finish(before)


if __name__ == "__main__":
    raise SystemExit(main())

