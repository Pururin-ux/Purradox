"""Saved positions only mean something in the assessment that displayed them."""
import asyncio

import pytest
from fastapi import HTTPException

from server import (
    COURSE, COURSE_QUIZ, TASK_BY_ID, TASK_LESSON, CheckIn, CtSubmitIn, ReviewIn, check_lesson, check_task,
    get_ct_demo, get_lesson, get_review, get_trainer, get_variant, submit_ct, submit_variant,
)


def test_ct_old_order_conflicts_but_new_revision_grades_and_demo_is_unchanged():
    async def scenario():
        current = await get_variant("01")
        assert current["tasks"][0]["options"][4] == "13 м"
        with pytest.raises(HTTPException) as err:
            await submit_variant("01", CtSubmitIn(answers={"A1": 4}))
        assert err.value.status_code == 409
        with pytest.raises(HTTPException) as err:
            await submit_variant("01", CtSubmitIn(answers={"A1": 4}, revision="outdated"))
        assert err.value.status_code == 409
        result = await submit_variant("01", CtSubmitIn(answers={"A1": 5}, revision=current["_assessment"]["revision"]))
        assert result["correct"] == 1
        assert result["review"][0]["given"] == 5
        assert current["_assessment"]["legacy"]["a1147cbb.4cb808d1"]["options"]["A1"][3] == 5
        assert "_assessment" not in await get_ct_demo()
        assert (await submit_ct(CtSubmitIn(answers={"A1": 2})))["correct"] == 1
    asyncio.run(scenario())


def test_review_can_return_the_whole_course_in_one_request():
    ids = [*TASK_BY_ID, *("quiz:" + key for key in COURSE_QUIZ)]
    assert len(ids) == 447
    response = asyncio.run(get_review(ReviewIn(ids=ids)))
    assert [item["id"] for item in response["items"]] == ids
    assert all(item["revision"] for item in response["items"])
    assert all(item["code"] == TASK_BY_ID[item["id"]]["code"] for item in response["items"][:len(TASK_BY_ID)])
    assert all(item["chapter"] == COURSE[TASK_LESSON[item["id"]]]["lesson"]["chapter"] for item in response["items"][:len(TASK_BY_ID)])


def test_review_keeps_legacy_keys_and_supplies_task_card_metadata():
    slug = "ravnouskorennoe-dvizhenie"
    ids = ["t1", "quiz:q2", "retired-id"]
    task, quiz = asyncio.run(get_review(ReviewIn(ids=ids)))["items"]
    assert task["id"] == "t1" and task["lessonSlug"] == slug
    assert task["code"] == TASK_BY_ID[f"{slug}:t1"]["code"]
    assert task["chapter"] == COURSE[slug]["lesson"]["chapter"]
    assert task["graph"] == TASK_BY_ID[f"{slug}:t1"].get("graph")
    assert quiz["id"] == "quiz:q2" and quiz["lessonSlug"] == slug


def test_lesson_and_trainer_only_accept_unversioned_requests_with_unchanged_interpretation():
    async def scenario():
        slug = "ravnomernoe-dvizhenie"
        lesson = await get_lesson(slug)
        changed = lesson["quiz"][0]
        with pytest.raises(HTTPException) as err:
            await check_lesson(slug, CheckIn(id=changed["id"], answer=1))
        assert err.value.status_code == 409
        trainer = await get_trainer(slug)
        task = trainer["tasks"][1]
        assert task["options"][4] == "13 м"
        with pytest.raises(HTTPException) as err:
            await check_task(CheckIn(id=task["id"], answer=4))
        assert err.value.status_code == 409
        assert (await check_task(CheckIn(id=task["id"], answer=5, revision=trainer["_assessment"]["revision"])))["correct"]
        legacy = "ravnouskorennoe-dvizhenie"
        assert (await check_lesson(legacy, CheckIn(id="q1", answer=2)))["correct"]
        assert (await check_task(CheckIn(id="t6", answer="135")))["correct"]
    asyncio.run(scenario())
