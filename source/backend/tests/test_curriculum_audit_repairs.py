"""Verify the draft and grading compatibility of the November curriculum repairs."""

import asyncio
from copy import deepcopy

import pytest

from assessment import Assessment
from curriculum import COURSE
from exams import EXAMS
from server import CtSubmitIn, ReviewIn, get_review, get_trainer, get_variant, submit_variant


@pytest.mark.parametrize(("slug", "draft_revision", "grading_revision"), [
    ("interferenciya-i-difrakciya", "3109d56fea8d0c9f46e6", "4868c2b6511f3cd68334"),
    ("idealnyj-gaz-i-mkt", "4280c9f5e6c31911adca", "06e6fb97fc612ed03313"),
    ("vnutrennyaya-energiya-i-rabota-gaza", "7f37fad02dca741a652b", "4c536255742b334e6ef7"),
])
def test_trainer_keeps_saved_positions_after_the_audit(slug, draft_revision, grading_revision):
    async def scenario():
        trainer = await get_trainer(slug)
        metadata = trainer["_assessment"]
        assert metadata["draftRevision"] != draft_revision
        assert metadata["legacy"]["r" + draft_revision] == {}
        ident = slug + ":t2"
        review = (await get_review(ReviewIn(ids=[ident])))["items"][0]
        assert grading_revision in review["compatibleRevisions"]
        if slug == "interferenciya-i-difrakciya":
            legacy = metadata["legacy"]["c85a3046.cf028b4"]
            assert legacy["options"][ident] == [1, 5, 4, 3, 2]
    asyncio.run(scenario())


def test_copy_edits_keep_previous_review_choices():
    response = asyncio.run(get_review(ReviewIn(ids=[
        "quiz:ravnouskorennoe-dvizhenie:q1", "ravnovesie-i-prostye-mehanizmy:t4",
    ])))
    assert [item["compatibleRevisions"] for item in response["items"]] == [
        ["8c91c2431aa1024cdb75"], ["ae4e9d9f937afc6fa853", "fe463706b0774d5ab6c7"],
    ]


def test_diagnostic_keeps_previous_draft_and_the_b8_answer():
    prior = "3f40f0c85e2f377b36aa"

    async def scenario():
        form = await get_variant("03")
        metadata = form["_assessment"]
        assert metadata["draftRevision"] != prior
        assert metadata["legacy"]["r" + prior] == {}
        report = await submit_variant("03", CtSubmitIn(
            answers={"A1": [1, 3], "B8": "800"}, revision=metadata["revision"],
        ))
        assert report["correct"] == 2
        assert [row["id"] for row in report["review"] if row["correct"]] == ["A1", "B8"]
    asyncio.run(scenario())

    tasks = deepcopy(EXAMS["03"]["tasks"])
    tasks[0]["options"][0], tasks[0]["options"][1] = tasks[0]["options"][1], tasks[0]["options"][0]
    assert "r" + prior not in Assessment("ct:03", tasks).legacy


@pytest.mark.parametrize(("variant", "ident", "given", "advice"), [
    ("01", "B8", "1200", "1200 Дж"),
    ("03", "A1", [1, 2], "перпендикулярны"),
])
def test_revised_archive_feedback_keeps_the_specific_advice(variant, ident, given, advice):
    async def scenario():
        task, = [item for item in (await get_variant(variant))["tasks"] if item["id"] == ident]
        result, = (await get_review(ReviewIn(ids=[ident, "A2"], variantId=variant, priorAnswers={ident: given})))["items"]
        assert "solution" not in task and "answer" not in task
        assert result["id"] == ident and result["feedbackVersion"] == task["feedbackVersion"]
        assert advice in result["guide"]["note"]
        assert result["solution"]
        assert "correct" not in result and "answer" not in result

    asyncio.run(scenario())


def test_worked_example_has_different_data_and_answer_than_diagnostic_b8():
    blocks = COURSE["vnutrennyaya-energiya-i-rabota-gaza"]["lesson"]["blocks"]
    example = next(block for block in blocks if block["id"] == "ex2")
    diagnostic = next(item for item in EXAMS["03"]["tasks"] if item["id"] == "B8")
    assert example["audit"]["expected"] != diagnostic["answer"]
    assert example["figure"]["points"] != diagnostic["graph"]["points"]
