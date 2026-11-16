"""Check that reading cues still match the questions learners see."""
import asyncio

from content import CT_TASKS
from ct_feedback import FORMS, feedback_for
from exams import EXAMS
from server import CtSubmitIn, get_ct_demo, get_variant, submit_ct, submit_variant


def test_cues_match_all_four_forms():
    for form, tasks in {"demo": CT_TASKS, **{key: value["tasks"] for key, value in EXAMS.items()}}.items():
        assert FORMS[form].keys() == {task["id"] for task in tasks}
        for task in tasks:
            title, intro, *details = FORMS[form][task["id"]]
            figure, notes, _ = (details + [None] * 3)[:3]
            label = (form, task["id"])
            fallback = feedback_for(form, task, None, False)
            assert title and intro and fallback["note"] == intro, label
            assert "note" not in feedback_for(form, task, task["answer"], True), label
            if figure == "area":
                assert len(task["graph"]["points"]) == 2 and fallback["caption"], label
            correct = task["answer"] if task["kind"] == "multi" else [task["answer"]]
            for value, note in (notes or {}).items():
                selection = value if task["kind"] == "number" else task["options"].index(value) + 1
                assert selection not in correct, (label, value)
                given = str(selection) if task["kind"] == "number" else [selection] if task["kind"] == "multi" else selection
                assert feedback_for(form, task, given, False)["note"] == note, (label, value)


def test_feedback_follows_submission_and_stays_out_of_the_answer_sheet():
    async def verify():
        for form in FORMS:
            is_demo = form == "demo"
            public = await get_ct_demo() if is_demo else await get_variant(form)
            assert all(not {"guide", "answer", "solution"}.intersection(task) for task in public["tasks"])
            attempt = CtSubmitIn(answers={"A1": 4}, revision=public.get("_assessment", {}).get("revision"))
            report = await submit_ct(attempt) if is_demo else await submit_variant(form, attempt)
            assert report["correct"] == 0
            assert all(row["guide"]["note"] for row in report["review"])
    asyncio.run(verify())
