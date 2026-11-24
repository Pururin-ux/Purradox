const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const source = fs.readFileSync(path.resolve("source/frontend/src/lib/mathLayout.js"));
const modulePromise = import(`data:text/javascript;base64,${source.toString("base64")}`);
const frontendRequire = createRequire(path.resolve("source/frontend/package.json"));
const katex = frontendRequire("katex");

const actualA4 = String.raw`x_0 = 5\ \text{м},\quad \upsilon_{0x} = 3\ \text{м/с},\quad \dfrac{a_x}{2} = 1\ \text{м/с}^2`;
const actualB1 = String.raw`\upsilon_0 = |a| t = 18\ \text{м/с},\quad s = \dfrac{\upsilon_0}{2}\,t = 9 \cdot 15 = 135\ \text{м}`;

const gasProcesses = String.raw`pV=\text{const};\quad V/T=\text{const};\quad p/T=\text{const}`;

test("independent equations wrap without losing source characters", async () => {
  const { splitMathStatements } = await modulePromise;
  for (const [tex, count] of [[actualA4, 3], [actualB1, 2], [gasProcesses, 3]]) {
    const parts = splitMathStatements(tex);
    assert.equal(parts.length, count);
    assert.equal(parts.map(p => p.tex + p.separator).join(""), tex);
    for (const part of parts) assert.doesNotThrow(() => katex.renderToString(part.tex, { throwOnError: true, strict: "ignore" }));
  }
});

test("nested text, tuples and environments stay intact", async () => {
  const { splitMathStatements } = await modulePromise;
  const complete = [
    String.raw`f(x,\quad y)=0`,
    String.raw`\{x=1,\quad y=2\}`,
    String.raw`\left(x=1,\quad y=2\right)`,
    String.raw`\begin{aligned}x&=1,\quad y&=2\end{aligned}`,
  ];
  for (const tex of complete) assert.deepEqual(splitMathStatements(tex), [{ tex, separator: "" }]);
});

test("spacing inside text is preserved while outer independent equations wrap", async () => {
  const { splitMathStatements } = await modulePromise;
  const tex = String.raw`x = \text{a,\quad b},  \qquad y = 2`;
  const parts = splitMathStatements(tex);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].tex, String.raw`x = \text{a,\quad b}`);
  assert.equal(parts.map(p => p.tex + p.separator).join(""), tex);
  for (const part of parts) assert.doesNotThrow(() => katex.renderToString(part.tex, { throwOnError: true, strict: "ignore" }));
});

test("single expressions, escaped commas and non-independent fragments are not fragmented", async () => {
  const { splitMathStatements } = await modulePromise;
  for (const tex of [String.raw`a = \dfrac{v-v_0}{t} = 3\ \text{м/с}^2`, String.raw`x=1\,\quad y=2`, String.raw`x=1,\quad y`, String.raw`x=1,\quadruple y=2`]) {
    assert.deepEqual(splitMathStatements(tex), [{ tex, separator: "" }]);
  }
});

test("unbalanced grouping falls back to the original expression instead of partial output", async () => {
  const { splitMathStatements } = await modulePromise;
  for (const tex of [String.raw`x=1,\quad y={2`, String.raw`x=1,\quad y=2)`, ""]) {
    assert.deepEqual(splitMathStatements(tex), [{ tex, separator: "" }]);
  }
});
