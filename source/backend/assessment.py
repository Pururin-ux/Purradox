"""Compatibility at the boundary between option numbers and their meaning."""
from hashlib import sha256
from pathlib import Path
import json
import re

from fastapi import HTTPException

HISTORY = json.loads(Path(__file__).with_name("draft_history_v1.json").read_text(encoding="utf-8"))
FIRST_TOPIC = "ravnouskorennoe-dvizhenie"
OLD_IDS = {f"{prefix}{i}": f"{FIRST_TOPIC}:{prefix}{i}"
           for prefix, count in (("q", 5), ("t", 10)) for i in range(1, count + 1)}
STALE_MESSAGE = "Задания обновились. Перезагрузи страницу, чтобы проверить ответы в актуальном порядке."

# Both pairs were reviewed against the authored questions. The first is a
# wording correction to a distractor; the second is the same fraction.
OPTION_ALIASES = {
    "yadernye-reakcii:q2": {
        "Правильный баланс A и Z гарантирует любую скорость реакции":
            "Правильный баланс A и Z гарантирует быстрое протекание реакции",
    },
    "polnaya-cep-i-eds:t1": {r"$\mathcal E/r$": r"$\frac{\mathcal{E}}{r}$"},
}


def canonical_id(ident):
    return OLD_IDS.get(ident, ident)


def normalized_option(ident, option):
    option = re.sub(r"\s+", " ", option).strip().rstrip(".")
    return OPTION_ALIASES.get(ident, {}).get(option, option)


def positions(old, new):
    """Positions are 1-based. None indicates no proven one-to-one match."""
    if (old["kind"] != new["kind"] or old.get("unit") != new.get("unit")
            or old.get("graph") != new.get("graph")
            or old.get("source") != new.get("trainerTaskId")):
        return None
    ident = new.get("trainerTaskId", new["id"])
    before = [normalized_option(ident, value) for value in old.get("options", [])]
    after = [normalized_option(ident, value) for value in new.get("options", [])]
    if len(set(before)) != len(before) or sorted(before) != sorted(after):
        return None
    return [after.index(value) + 1 for value in before]


def identity(order):
    return order is not None and order == list(range(1, len(order) + 1))


def revision(items, *, for_draft=False):
    # Bind grading to the displayed questions, diagrams, option order and key,
    # but leave unrelated prose/lesson art out of this version.
    fields = ("id", "kind", "text", "options", "graph", "unit", "trainerTaskId", "answer")
    if for_draft:
        # For lessons/trainer, question IDs identify the prompt across copy
        # edits. A materially different question must get a new ID.
        fields = tuple(field for field in fields if field != "text")
    ordered = [[item.get(field) for field in fields] for item in items]
    return sha256(json.dumps(ordered, ensure_ascii=True, separators=(",", ":"), sort_keys=True).encode()).hexdigest()[:20]


class Assessment:
    def __init__(self, route, items):
        self.revision = revision(items)
        self.draft_revision = revision(items, for_draft=not route.startswith("ct:"))
        self.legacy = {}
        self.unversioned_unsafe = set()
        self.freebuff_positions = {}
        current = {item["id"]: item for item in items}
        current_ids = list(current)
        for entry in HISTORY.get(route, []):
            ids, options, blocked, old_order = {}, {}, [], []
            for old in entry["shape"]["items"]:
                original = old["id"]
                ident = canonical_id(original)
                old_order.append(ident)
                if original != ident:
                    ids[original] = ident
                order = positions(old, current[ident]) if ident in current else None
                if order is None:
                    blocked.append(original)
                elif not identity(order):
                    options[original] = order
                if "freebuff-worktree" in entry["versions"]:
                    self.freebuff_positions[ident] = order
                if not identity(order):
                    self.unversioned_unsafe.add(original)
            plan = {}
            if ids:
                plan["ids"] = ids
            if options:
                plan["options"] = options
            if blocked:
                plan["blocked"] = blocked
            if route.startswith("lesson:") and old_order != current_ids:
                plan["quizOrder"] = old_order
            self.legacy.update({key: plan for key in entry["keys"]})

    def public(self):
        return {"revision": self.revision, "draftRevision": self.draft_revision, "legacy": self.legacy}

    def check(self, received, answered):
        if ((received is not None and received != self.revision)
                or (received is None and self.unversioned_unsafe.intersection(answered))):
            raise HTTPException(status_code=409, detail=STALE_MESSAGE)


def answered(value):
    return value is not None and value != "" and value != []

