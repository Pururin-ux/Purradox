import { lensState } from "./studyModels.js";

const converging = [
  { distance: 4, height: 2, focal: 2, rail: 2 },
  { distance: 3, height: -2, focal: 2, rail: 3 },
  { distance: 6, height: 3, focal: 3, rail: 2 },
  { distance: 3, height: 2, focal: 6, rail: 3 },
];
const diverging = [
  { distance: 4, height: 2, focal: -4, rail: 2 },
  { distance: 3, height: -3, focal: -6, rail: 2 },
  { distance: 6, height: 3, focal: -3, rail: 2 },
  { distance: 6, height: -2, focal: -6, rail: 3 },
];
const plane = [
  { distance: 4, height: 2, firstHit: 4, rail: 2 },
  { distance: 3, height: -2, firstHit: -3, rail: 3 },
  { distance: 4, height: -2, firstHit: 2, rail: 2 },
  { distance: 6, height: 2, firstHit: 4, rail: 3 },
];

export const opticLessons = {
  "tonkie-linzy": [
    { name: "Собирающая линза", short: "Собирающая", optic: "convex-glass", direction: 1, tasks: converging },
    { name: "Рассеивающая линза", short: "Рассеивающая", optic: "concave-glass", direction: 1, tasks: diverging },
  ],
  "svet-i-otrazhenie": [
    { name: "Плоское зеркало", short: "Плоское", optic: "plane", direction: -1, tasks: plane },
  ],
  "sfericheskie-zerkala": [
    { name: "Вогнутое зеркало", short: "Вогнутое", optic: "concave-mirror", direction: -1, tasks: converging },
    { name: "Выпуклое зеркало", short: "Выпуклое", optic: "convex-mirror", direction: -1, tasks: diverging },
  ],
};

export function makeRayScene(instrument, turn) {
  const { distance, height, focal, rail, firstHit = height } = instrument.tasks[turn % instrument.tasks.length];
  const { direction } = instrument;
  const hits = [firstHit, 0];
  // u increases along the outgoing light, also for a mirror (where world x decreases).
  const rays = hits.map(hit => hit + rail * ((hit - height) / distance - (focal ? hit / focal : 0)));
  const conjugate = focal ? lensState(focal, distance) : { b: -distance, magnification: 1 };
  const image = [direction * conjugate.b, conjugate.magnification * height];
  const foci = !focal ? [] : direction < 0 ? [-focal] : [-Math.abs(focal), Math.abs(focal)];
  return { ...instrument, source: [-distance, height], rail: direction * rail, hits, rays, image, foci, virtual: conjugate.b < 0 };
}

export const grid = { left: -6, right: 6, bottom: -4, top: 5 };
export function readCoordinate(value, axis) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().replace("−", "-").replace(",", ".");
  if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return null;
  const n = Number(text);
  const [min, max] = axis === "x" ? [grid.left, grid.right] : [grid.bottom, grid.top];
  return n >= min && n <= max ? n : null;
}
export function rayCrossing(scene, first, second) {
  if (first == null || second == null) return null;
  const slopes = [first, second].map((value, i) => (value - scene.hits[i]) / scene.rail);
  if (Math.abs(slopes[0] - slopes[1]) < 1e-8) return null;
  const x = (scene.hits[1] - scene.hits[0]) / (slopes[0] - slopes[1]);
  return [x, scene.hits[0] + slopes[0] * x];
}
export function onBoard(point) {
  return point && point[0] >= grid.left && point[0] <= grid.right && point[1] >= grid.bottom && point[1] <= grid.top;
}
export function readStep(values, step) {
  if (step < 2) {
    const y = readCoordinate(values[step], "y");
    return y === null ? null : [y];
  }
  const x = readCoordinate(values[2], "x"), y = readCoordinate(values[3], "y");
  return x === null || y === null ? null : [x, y];
}
const near = (a, b) => Math.abs(a - b) <= 0.011;
export function gradeDrawing(scene, values) {
  const ys = [readCoordinate(values[0], "y"), readCoordinate(values[1], "y")];
  const point = readStep(values, 2);
  const rays = ys.map((y, i) => y !== null && near(y, scene.rays[i]));
  const crossing = rayCrossing(scene, ...ys);
  const matches = target => Boolean(point && target && point.every((n, i) => near(n, target[i])));
  const atCrossing = matches(crossing), imageCorrect = matches(scene.image);
  return { rays, crossing, atCrossing, imageCorrect, correct: rays.every(Boolean) && imageCorrect };
}

const rules = {
  "convex-glass": "Первый луч падает параллельно оси. После линзы он проходит через дальний фокус F.",
  "concave-glass": "Первый луч падает параллельно оси. Его обратное продолжение проходит через фокус F со стороны источника.",
  "concave-mirror": "Первый луч падает параллельно оси. После отражения он проходит через фокус F перед зеркалом.",
  "convex-mirror": "Первый луч падает параллельно оси. За зеркалом через фокус F проходит обратное продолжение отражённого луча.",
  plane: "В точке падения первого луча нормаль горизонтальна. Отражённый луч составляет с ней тот же угол, что и падающий.",
};
export function rayRule(scene, i) {
  if (i === 0) return rules[scene.optic];
  return scene.direction > 0
    ? "Второй луч проходит через оптический центр тонкой линзы и сохраняет направление."
    : "Второй луч падает в полюс зеркала. Нормаль здесь совпадает с осью. После отражения угол с осью сохраняется.";
}
export function numberText(n) {
  return Number(n).toLocaleString("ru", { maximumFractionDigits: 2, useGrouping: false }).replace("-", "−");
}
export function pointText(point) {
  return "(" + point.map(numberText).join("; ") + ")";
}
