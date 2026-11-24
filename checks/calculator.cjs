const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const source = readFileSync(path.join(__dirname, '../source/frontend/src/lib/calc.js'));
const calculator = import(`data:text/javascript;base64,${source.toString('base64')}`);

test('Ans reuses large, small and negative results as single operands', async () => {
  const { evaluate, formatResult } = await calculator;
  assert.equal(formatResult(evaluate('Ans×2', evaluate('6,02×10^23'))), '1,204000e+24');
  assert.equal(formatResult(evaluate('Ans×2', evaluate('10^−7'))), '2,000000e−7');
  assert.equal(evaluate('2Ans', -3), -6);
  assert.equal(evaluate('Ans^2', -3), 9);
});

test('scientific keyboard input and power precedence', async () => {
  const { evaluate } = await calculator;
  assert.equal(evaluate('1,25e−8×4'), 5e-8);
  assert.equal(evaluate('6.02E+23'), 6.02e23);
  assert.equal(evaluate('−2^2'), -4);
  assert.equal(evaluate('2^−3'), 0.125);
  assert.equal(evaluate('2(3+4)'), 14);
});

test('tan and tg reject undefined angles without rejecting nearby values', async () => {
  const { evaluate, formatResult } = await calculator;
  for (const name of ['tan', 'tg']) {
    for (const angle of [90, 270, -90, -270, 450]) {
      assert.throws(() => evaluate(`${name}(${angle})`), /Тангенс не определён/);
    }
    assert.ok(evaluate(`${name}(89.999999999)`) > 1e9);
    assert.ok(Math.abs(evaluate(`${name}(45)`) - 1) < 1e-12);
  }
  assert.equal(formatResult(evaluate('sin(180)')), '0');
  assert.equal(formatResult(evaluate('cos(270)')), '0');
  assert.ok(evaluate('sin(1e−7)') > 0);
});
