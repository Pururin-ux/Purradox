const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { sourceModule, frontend } = require('./learning-load.cjs');
const { companionPose, COMPANION_RIGS } = sourceModule(path.join(frontend, 'src/lib/companionRig.js'));

test('the independent performance still breathes after the former 13.6-second stop', () => {
  const first = companionPose(120);
  const second = companionPose(122);
  assert.ok(Math.abs(first.girlBreath - second.girlBreath) > 0.3);
  assert.notEqual(first.girlBreath, first.catBreath);
  assert.ok(companionPose(2.89).girlBlink > 0.95);
  assert.equal(companionPose(2.89).catBlink, 0);
  assert.ok(companionPose(5.65).catBlink > 0.95);
  assert.equal(companionPose(5.65).girlBlink, 0);
  assert.ok(companionPose(9.05).ear > 0.9);
  assert.ok(companionPose(11.6).tail > 0.5);
});

test('all channels remain finite and bounded, with a continuous long-cycle seam', () => {
  for (let seconds = 0; seconds < 120; seconds += 0.025) {
    const pose = companionPose(seconds, [1, -1]);
    for (const key of ['girlBreath', 'catBreath', 'girlBlink', 'catBlink']) assert.ok(pose[key] >= 0 && pose[key] <= 1);
    for (const value of Object.values(pose).flat()) assert.ok(Number.isFinite(value));
    assert.ok(Math.abs(pose.ear) <= 1 && Math.abs(pose.tail) <= 1);
  }
  const before = companionPose(59-0.00001), after = companionPose(59+0.00001);
  for (const key of Object.keys(before)) {
    const a = [before[key]].flat(), b = [after[key]].flat();
    a.forEach((value, index) => assert.ok(Math.abs(value-b[index]) < 0.001, key));
  }
  for (const rig of Object.values(COMPANION_RIGS)) for (const [x,y] of rig.eyes) {
    assert.ok(x > 0 && x < rig.size[0] && y > 0 && y < rig.size[1]);
  }
});
