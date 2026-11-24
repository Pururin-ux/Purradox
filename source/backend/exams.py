"""Practice forms linked to the course, including an independent assessment."""
from copy import deepcopy
import json
from pathlib import Path
from curriculum import COURSE, TASK_BY_ID, SECTIONS
from ct_diagnostic_2026 import QUESTIONS

# Four mechanics, two thermal, two electric, one optics and one modern A task.
# B tasks complete the official section allocation 10 / 7 / 9 / 2 / 1 / 1.
FORMS = {
    "01": {
        "title": "Вариант 1", "description": "Движение, тепловые процессы, поля и свет.",
        "A": [
            ("ravnomernoe-dvizhenie", 2), ("srednyaya-i-otnositelnaya-skorost", 3),
            ("zakony-nyutona-i-plotnost", 2), ("davlenie-i-arhimed", 3),
            ("idealnyj-gaz-i-mkt", 3), ("gazovye-zakony", 2),
            ("elektricheskoe-pole", 2), ("magnitnoe-pole-i-sila-ampera", 3),
            ("prelomlenie-i-polnoe-otrazhenie", 2), ("fotoeffekt", 3),
        ],
        "B": [
            ("tyagotenie-ves-i-nevesomost", 5), ("svobodnoe-padenie", 6),
            ("dvizhenie-po-okruzhnosti", 6), ("rabota-moshchnost-i-energiya", 6),
            ("ravnovesie-i-prostye-mehanizmy", 6), ("mehanicheskie-volny", 5),
            ("temperatura-i-rasshirenie", 4), ("vnutrennyaya-energiya-i-rabota-gaza", 6),
            ("pervyj-zakon-i-teplovye-dvigateli", 6), ("teplovoj-balans-i-fazovye-perehody", 6),
            ("par-i-vlazhnost", 6), ("zaryad-i-zakon-kulona", 6),
            ("potencial-i-rabota-polya", 5), ("kondensatory", 6),
            ("soedineniya-provodnikov", 6), ("polnaya-cep-i-eds", 6),
            ("rabota-i-moshchnost-toka", 4), ("magnitnyj-potok-i-indukciya", 6),
            ("tonkie-linzy", 6), ("radioaktivnost-i-poluraspad", 6),
        ],
    },
    "02": {
        "title": "Вариант 2", "description": "Импульс, колебания, электрические цепи и атом.",
        "A": [
            ("zakony-nyutona-i-plotnost", 3), ("uprugost-i-trenie", 2),
            ("impuls-i-stolknoveniya", 2), ("mehanicheskie-kolebaniya", 3),
            ("temperatura-i-rasshirenie", 2), ("par-i-vlazhnost", 3),
            ("tok-i-soprotivlenie", 2), ("magnitnyj-potok-i-indukciya", 3),
            ("interferenciya-i-difrakciya", 3), ("yadernye-reakcii", 2),
        ],
        "B": [
            ("ravnomernoe-dvizhenie", 6), ("srednyaya-i-otnositelnaya-skorost", 6),
            ("tyagotenie-ves-i-nevesomost", 6), ("svobodnoe-padenie", 5),
            ("dvizhenie-po-okruzhnosti", 5), ("rabota-moshchnost-i-energiya", 5),
            ("idealnyj-gaz-i-mkt", 6), ("gazovye-zakony", 6),
            ("vnutrennyaya-energiya-i-rabota-gaza", 5), ("pervyj-zakon-i-teplovye-dvigateli", 5),
            ("teplovoj-balans-i-fazovye-perehody", 5), ("elektricheskoe-pole", 6),
            ("potencial-i-rabota-polya", 6), ("kondensatory", 5),
            ("soedineniya-provodnikov", 5), ("polnaya-cep-i-eds", 5),
            ("sila-lorenca", 6), ("samoindukciya", 6),
            ("otnositelnost-i-energiya-pokoya", 6), ("stroenie-atoma-i-postulaty-bora", 6),
        ],
    },
}


def make_exam(variant_id):
    form = FORMS[variant_id]
    tasks = []
    for part in ("A", "B"):
        for index, (slug, number) in enumerate(form[part], 1):
            source_id = f"{slug}:t{number}"
            source = TASK_BY_ID[source_id]
            if source["part"] != part:
                raise ValueError(f"Wrong exam part: {source_id}")
            task = deepcopy(source)
            task.update(id=f"{part}{index}", code=f"{'А' if part == 'A' else 'В'}{index}",
                        trainerTaskId=source_id, lessonSlug=slug, lessonTitle=COURSE[slug]["lesson"]["title"])
            tasks.append(task)
    return {"variantId": variant_id, "title": form["title"], "description": form["description"],
            "minutes": 210, "total": 30, "part_a": 10, "part_b": 20, "sections": SECTIONS, "tasks": tasks}


EXAMS = {variant_id: make_exam(variant_id) for variant_id in FORMS}


DIAGNOSTIC_BLOCKS = {
    "A1": "vectors",
    "A2": "graph",
    "A3": "third",
    "A4": "energy",
    "A5": "pressure",
    "A6": "phase",
    "A7": "parallel",
    "A8": "flux",
    "A9": "snell",
    "A10": "quantum",
    "B1": "reference",
    "B2": "graph",
    "B3": "vertical",
    "B4": "collision",
    "B5": "work",
    "B6": "speed",
    "B7": "expansion",
    "B8": "work",
    "B9": "processes",
    "B10": "balance",
    "B11": "cycle",
    "B12": "force",
    "B13": "addition",
    "B14": "work",
    "B15": "power",
    "B16": "whole",
    "B17": "conditions",
    "B18": "orbit",
    "B19": "signs",
    "B20": "random"
}


def make_diagnostic(variant_id, title, description, questions):
    tasks = deepcopy(questions)
    for part in ("A", "B"):
        part_tasks = (task for task in tasks if task["part"] == part)
        for index, task in enumerate(part_tasks, 1):
            lesson = COURSE[task["lessonSlug"]]["lesson"]
            if variant_id == "03":
                task["lessonBlock"] = DIAGNOSTIC_BLOCKS[f"{part}{index}"]
            task.update(id=f"{part}{index}", code=f"{'А' if part == 'A' else 'В'}{index}",
                        section=lesson["section"], lessonTitle=lesson["title"])
    return {"variantId": variant_id, "title": title, "description": description,
            "independent": True, "minutes": 210, "total": 30, "part_a": 10, "part_b": 20,
            "sections": SECTIONS, "tasks": tasks}


EXAMS["03"] = make_diagnostic("03", "Диагностический вариант",
                              "30 заданий для самостоятельной диагностики по всем разделам.", QUESTIONS)
FOLLOWUP = json.loads(Path(__file__).with_name("ct_diagnostic_followup.json").read_text(encoding="utf-8"))
EXAMS["04"] = make_diagnostic("04", "Повторная диагностика",
                              "Другие 30 заданий по тем же разделам. Можно пройти после первого разбора.", FOLLOWUP)
