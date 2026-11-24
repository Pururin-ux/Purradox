"""Release checks for the full curriculum, without executing content expressions."""
import ast
import asyncio
from collections import Counter
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "source/backend"))
from curriculum import COURSE, QUIZ_BY_ID, TASK_BY_ID, catalog
from exams import EXAMS
from http_release import verify_short_demo
from server import (CheckIn, CtSubmitIn, check_lesson, check_task, get_all_tasks,
                    get_ct_demo, get_lesson, get_trainer, get_variant, submit_variant)

ALLOWED_BIN = {ast.Add:lambda a,b:a+b, ast.Sub:lambda a,b:a-b, ast.Mult:lambda a,b:a*b,
               ast.Div:lambda a,b:a/b, ast.Pow:lambda a,b:a**b}
CALLS = {"round":round, "sqrt":math.sqrt, "sin":math.sin, "cos":math.cos}
def number(expression):
    def visit(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int,float):
            return node.value
        if isinstance(node, ast.Name) and node.id == "pi":
            return math.pi
        if isinstance(node, ast.UnaryOp) and isinstance(node.op,(ast.UAdd,ast.USub)):
            value=visit(node.operand)
            return -value if isinstance(node.op,ast.USub) else value
        if isinstance(node,ast.BinOp) and type(node.op) in ALLOWED_BIN:
            return ALLOWED_BIN[type(node.op)](visit(node.left),visit(node.right))
        if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id in CALLS and len(node.args)==1 and not node.keywords:
            return CALLS[node.func.id](visit(node.args[0]))
        raise ValueError("Forbidden audit expression")
    return visit(ast.parse(expression,mode="eval").body)

audits = 0


def check_expression(audit, label):
    global audits
    actual = number(audit["expression"])
    assert math.isfinite(actual) and math.isclose(actual, audit["expected"], rel_tol=1e-7, abs_tol=1e-7), (label, actual, audit)
    audits += 1
    return actual


def walk(value):
    if isinstance(value,dict):
        if "audit" in value:
            audit=value["audit"]
            if "expression" in audit:
                actual = check_expression(audit, value.get("id"))
                if value.get("kind")=="number":
                    assert value["answer"]==audit["expected"] and value["unit"]==audit["unit"], value["id"]
                if value.get("kind")=="single" and "optionValues" in audit:
                    assert len(audit["optionValues"]) == len(value["options"]), value["id"]
                    assert math.isclose(audit["optionValues"][value["answer"]-1],actual,rel_tol=1e-7,abs_tol=1e-7),value["id"]
                for extra in audit.get("additional",[]):
                    check_expression(extra, value.get("id"))
            else:
                assert audit.get("rationale"), value.get("id")
        for item in value.values(): walk(item)
    elif isinstance(value,list):
        for item in value: walk(item)

def no_audit(value):
    if isinstance(value,dict):
        assert "audit" not in value
        for item in value.values(): no_audit(item)
    elif isinstance(value,list):
        for item in value:no_audit(item)

def public_questions(items):
    for item in items:
        assert not {"answer","solution","explanation","audit"}.intersection(item)
        no_audit(item)

def check_question(item, feedback):
    ident = item["id"]
    kind = item["kind"]
    answer = item["answer"]
    assert item["text"].strip() and item[feedback], ident
    assert kind in {"single", "multi", "number"}, ident
    if kind == "number":
        assert type(answer) in (int, float) and math.isfinite(answer), ident
        assert item["unit"].strip(), ident
        return

    options = [option.strip() for option in item["options"]]
    assert len(options) >= 2 and len(set(options)) == len(options) and all(options), ident
    if kind == "multi":
        assert isinstance(answer, list), ident
    selected = answer if kind == "multi" else [answer]
    assert selected and all(type(i) is int and 1 <= i <= len(options) for i in selected), ident
    assert len(set(selected)) == len(selected), ident


async def check_legacy(first_topic):
    lesson = await get_lesson(first_topic)
    trainer = await get_trainer(first_topic)
    for prefix, count, metadata in (("q", 5, lesson["_assessment"]), ("t", 10, trainer["_assessment"])):
        aliases = {f"{prefix}{i}": f"{first_topic}:{prefix}{i}" for i in range(1, count + 1)}
        assert any(plan.get("ids") == aliases for plan in metadata["legacy"].values()), prefix

    assert (await check_lesson(first_topic, CheckIn(id="q1", answer=2)))["correct"]
    assert (await check_task(CheckIn(id="t6", answer="135")))["correct"]
    return verify_short_demo(await get_ct_demo())

async def main():
    assert len(COURSE) >= 49 and len(TASK_BY_ID) == sum(len(row["tasks"]) for row in COURSE.values())
    counts=Counter(item["section"] for item in catalog()["lessons"])
    assert counts >= Counter(mechanics=15, thermal=7, electricity=14, optics=7, quantum=3, nucleus=3), counts
    assert sorted(row["order"] for row in catalog()["lessons"])==list(range(1, len(COURSE) + 1))
    first_topic = "ravnouskorennoe-dvizhenie"
    assert len(COURSE[first_topic]["quiz"]) >= 5 and len(COURSE[first_topic]["tasks"]) >= 10
    demo_sha = await check_legacy(first_topic)
    for slug,row in COURSE.items():
        tasks = row["tasks"]
        assert len(row["quiz"]) >= 3 and len(tasks) >= 6, slug
        assert len({t["code"] for t in tasks}) == len(tasks), slug
        assert {t["part"] for t in tasks} == {"A", "B"}, slug
        assert {t["level"] for t in tasks} == {1, 2, 3}, slug
        for task in tasks:
            assert any(b["id"] == task["lessonBlock"] and b["kind"] != "check" for b in row["lesson"]["blocks"]), task["id"]
        walk(row)
        public_lesson=await get_lesson(slug)
        public_trainer = await get_trainer(slug)
        no_audit(public_lesson)
        no_audit(public_trainer)
        public_questions(public_lesson["quiz"])
        public_questions(public_trainer["tasks"])
        for question in row["quiz"]:
            check_question(question, "explanation")
            body = CheckIn(id=question["id"], answer=question["answer"], revision=public_lesson["_assessment"]["revision"])
            assert (await check_lesson(slug, body))["correct"], question["id"]
        for task in row["tasks"]:
            check_question(task, "solution")
            body = CheckIn(id=task["id"], answer=task["answer"], revision=public_trainer["_assessment"]["revision"])
            assert (await check_task(body))["correct"], task["id"]
            if task["part"]=="B": assert type(task["answer"]) is int
            else:
                assert len(task["options"])==5
                selected=task["answer"] if task["kind"]=="multi" else [task["answer"]]
                assert all(type(i) is int and 1<=i<=len(task["options"]) for i in selected)
        for block in row["lesson"]["blocks"]:
            assert block["kind"] in {"hook","text","model","lab","formulas","example","check"}
            if block["kind"] == "example":
                assert block["given"] and block["steps"], (slug, block["id"])
    public_questions((await get_all_tasks())["tasks"])
    for key,exam in EXAMS.items():
        assert len(exam["tasks"])==30
        assert Counter(t["part"] for t in exam["tasks"])=={"A":10,"B":20}
        assert Counter(t["section"] for t in exam["tasks"])==dict(mechanics=10,thermal=7,electricity=9,optics=2,quantum=1,nucleus=1)
        if exam.get("independent"):
            trainer_prompts = {task["text"] for task in TASK_BY_ID.values()}
            other_prompts = {t["text"] for other in EXAMS.values() if other is not exam for t in other["tasks"]}
            assert not any(t["text"] in other_prompts for t in exam["tasks"]), key
            assert all(t["lessonBlock"] in {b["id"] for b in COURSE[t["lessonSlug"]]["lesson"]["blocks"]} for t in exam["tasks"])
            assert not any(t["text"] in trainer_prompts or "trainerTaskId" in t for t in exam["tasks"])
            assert Counter(t["level"] for t in exam["tasks"]) == {1:5,2:10,3:10,4:4,5:1}
            for task in exam["tasks"]:
                check_question(task, "solution")
            walk(exam)
        public_exam = await get_variant(key)
        public_questions(public_exam["tasks"])
        revision = public_exam["_assessment"]["revision"]
        result = await submit_variant(key, CtSubmitIn(answers={t["id"]: t["answer"] for t in exam["tasks"]},
                                                     elapsed_sec=99999, revision=revision))
        assert result["correct"]==30 and result["elapsed_sec"]==12600
        empty=await submit_variant(key,CtSubmitIn())
        assert empty["correct"]==0 and empty["total"]==30
    assert sum(len(row["quiz"]) for row in COURSE.values()) == len(QUIZ_BY_ID) >= 149
    print(json.dumps({"lessons":len(COURSE),"quiz":len(QUIZ_BY_ID),"tasks":len(TASK_BY_ID),"numeric_audits":audits,"variants":len(EXAMS),
                      "variant_tasks":sum(len(exam["tasks"]) for exam in EXAMS.values()),"legacy_lesson_trainer_ids":"verified",
                      "short_ct_demo_sha256":demo_sha,"api_checks":"passed"},ensure_ascii=True))

if __name__=="__main__":asyncio.run(main())
