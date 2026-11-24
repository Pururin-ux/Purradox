"""Independent recalculation of the 21 numerical answers in the current content.

Constants below are transcribed from the problem statements. This is a bounded
content audit, not a general symbolic parser or a test of the API checker.
"""
from fractions import Fraction
import importlib.util
import json
import math
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('lesson_content', root / 'source/backend/content.py')
content = importlib.util.module_from_spec(spec)
spec.loader.exec_module(content)
motion = json.loads((root / 'source/backend/curriculum/mechanics/ravnouskorennoe-dvizhenie.json').read_text(encoding='utf-8'))
quiz = {t['id'].split(':')[-1]: t for t in motion['quiz']}
trainer = {t['id'].split(':')[-1]: t for t in motion['tasks']}
ct = {t['id']: t for t in content.CT_TASKS}

def chosen_value(task):
    if task['kind'] == 'number':
        return task['answer']
    option = task['options'][task['answer'] - 1]
    return float(Fraction(option.split()[0].replace('−', '-').replace(',', '.').rstrip('°')))

checks = [
    ('quiz q1 acceleration', quiz['q1'], (6 - 2) / 4),
    ('quiz q3 initial speed', quiz['q3'], 2 * 5),
    ('quiz q4 third second', quiz['q4'], 1 * (3**2 - 2**2)),
    ('quiz q5 distance', quiz['q5'], 0.8 * 5**2 / 2),
    ('trainer t1 acceleration', trainer['t1'], 15 / 5),
    ('trainer t2 acceleration projection', trainer['t2'], ((4 - 2 * 3) - (4 - 2 * 0)) / 3),
    ('trainer t3 distance ratio', trainer['t3'], (2 * 7**2 / 2) / (1 * 7**2 / 2)),
    ('trainer t5 distance', trainer['t5'], 4 * (6 / 2)**2),
    ('trainer t6 braking distance', trainer['t6'], 1.2 * 15**2 / 2),
    ('trainer t7 graph integral', trainer['t7'], 2 * 4 + ((12 - 2) / 5) * 4**2 / 2),
    ('trainer t8 decimetres per second squared', trainer['t8'], (72 / 3.6)**2 / (2 * 80) * 10),
    ('trainer t9 fifth-second to total distance', trainer['t9'], 18 / (5**2 - 4**2) * 5**2),
    ('trainer t10 halfway distance speed, rounded', trainer['t10'], round(math.sqrt((2**2 + 8**2) / 2))),
    ('CT A1 maximum height, g=10', ct['A1'], 20**2 / (2 * 10)),
    ('CT A3 current', ct['A3'], 12 / 6),
    ('CT A4 angle between incident and reflected rays', ct['A4'], 2 * (90 - 30)),
    ('CT B1 acceleration in decimetres', ct['B1'], (10 - 0.3 * 2 * 10) / 2 * 10),
    ('CT B2 heat in kilojoules', ct['B2'], 4200 * 2 * (70 - 20) / 1000),
    ('CT B3 image distance in centimetres', ct['B3'], 1 / (1 / 20 - 1 / 30)),
    ('CT B4 mean decay time', ct['B4'], 8 * math.log2(800 / 100)),
]
for name, task, value in checks:
    assert math.isclose(chosen_value(task), value, rel_tol=1e-12, abs_tol=1e-12), name
    print(f'PASS {name}: {value:g}')
ratio = Fraction(1, 1) / Fraction(1, 3)
assert ct['A2']['options'][ct['A2']['answer'] - 1] == f'увеличилось в {ratio} раза'
print(f'PASS CT A2 isothermal pressure ratio: {ratio}')
assert len(checks) + 1 == 21
print('21/21 numerical content answers agree with recalculation')
