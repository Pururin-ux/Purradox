const assert = require("node:assert/strict");
const { test } = require("node:test");

test("the screenshot intersection is credited independently from either reflection", async () => {
  const { makeRayScene, opticLessons, gradeDrawing, rayCrossing } = await import("../source/frontend/src/lib/rayOptics.js");
  const mirror = makeRayScene(opticLessons["sfericheskie-zerkala"][0], 0);
  const result = gradeDrawing(mirror, ["-2","-2","-2","-2"]);
  assert.deepEqual(result.crossing, [-2,-2]);
  assert.equal(result.atCrossing, true);
  assert.deepEqual(result.rays, [false,false]);
  assert.equal(result.correct, false);
  assert.equal(rayCrossing(mirror, 2, 0), null);
  const missedImage = gradeDrawing(mirror, ["0","-1","-2","-2"]);
  assert.deepEqual(missedImage.rays, [true,true]);
  assert.equal(missedImage.atCrossing, false);
});

test("each optic offers fresh solvable data and both measured rays meet the conjugate image", async () => {
  const { makeRayScene, opticLessons, gradeDrawing, onBoard, rayCrossing, readCoordinate } = await import("../source/frontend/src/lib/rayOptics.js");
  for (const instrument of Object.values(opticLessons).flat()) {
    const answers = new Set();
    for (let turn=0; turn<instrument.tasks.length; turn++) {
      const scene = makeRayScene(instrument,turn);
      const values = [...scene.rays,...scene.image];
      assert(values.every(Number.isInteger), scene.name);
      assert(onBoard(scene.source) && onBoard(scene.image));
      scene.rays.forEach(y => assert(onBoard([scene.rail,y])));
      assert(gradeDrawing(scene,values.map(String)).correct);
      const [sourceX,sourceY] = scene.source;
      if (scene.optic === "plane") {
        assert.deepEqual(scene.image,[-sourceX,sourceY]);
      } else {
        const focalPoint = scene.direction > 0
          ? (scene.optic === "convex-glass" ? scene.foci[1] : scene.foci[0])
          : scene.foci[0];
        const yAtFocus = scene.hits[0] + focalPoint * (scene.rays[0]-scene.hits[0]) / scene.rail;
        assert(Math.abs(yAtFocus) < 1e-9, scene.name);
      }
      const incomingSlope = sourceY/sourceX;
      const outgoingSlope = scene.rays[1]/scene.rail;
      assert.equal(outgoingSlope, scene.direction * incomingSlope);
      const crossed = rayCrossing(scene,...scene.rays);
      crossed.forEach((n,i) => assert(Math.abs(n-scene.image[i]) < 1e-9));
      answers.add(JSON.stringify(values));
    }
    assert.equal(answers.size,instrument.tasks.length,instrument.name);
  }
  assert.equal(readCoordinate("−1,25","y"), -1.25);
  assert.equal(readCoordinate("", "y"), null);
  assert.equal(readCoordinate("6", "y"), null);
});
