const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { sourceModule, frontend } = require('./learning-load.cjs');
const { createCompanionRenderer } = sourceModule(path.join(frontend, 'src/lib/companionRenderer.js'));
const { COMPANION_RIGS } = sourceModule(path.join(frontend, 'src/lib/companionRig.js'));

function rendererSurface() {
  let active = 0;
  let width = 330, measured = 0;
  const units = new Map();
  const samplers = new Map();
  const frames = [];
  const viewports = [];
  const gl = {
    TEXTURE0: 0, TEXTURE1: 1, COMPILE_STATUS: 10, LINK_STATUS: 11,
    createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}),
    createTexture: () => ({ image: null, deleted: false }),
    getShaderParameter: () => true, getProgramParameter: () => true,
    getAttribLocation: () => 0, getUniformLocation: (_program, name) => name,
    activeTexture: unit => { active = unit; },
    bindTexture: (_target, texture) => { units.set(active, texture); },
    texImage2D: (...args) => { units.get(active).image = args.at(-1); },
    uniform1i: (name, unit) => { samplers.set(name, unit); },
    deleteTexture: texture => { texture.deleted = true; },
    isContextLost: () => false,
    viewport: (...rect) => viewports.push(rect),
    drawArrays: () => frames.push(Object.fromEntries(['u_image', 'u_lids'].map(name => {
      const texture = units.get(samplers.get(name));
      return [name, texture && !texture.deleted ? texture.image : null];
    }))),
  };
  for (const method of ['shaderSource', 'compileShader', 'attachShader', 'linkProgram', 'useProgram',
    'bindBuffer', 'bufferData', 'enableVertexAttribArray', 'vertexAttribPointer', 'pixelStorei',
    'texParameteri', 'uniform2fv', 'uniform4fv', 'uniform4f', 'uniform2f',
    'deleteBuffer', 'deleteProgram', 'deleteShader']) gl[method] = () => {};
  const canvas = { dataset: {}, getContext: () => gl, getBoundingClientRect: () => {
    measured++;
    return { width };
  } };
  return { canvas, frames, viewports, measureCount: () => measured, resize: next => { width = next; } };
}

// A canvas keeps its WebGL texture-unit state between renderer instances.
// Model that boundary rather than mocking a successful renderer.
test('responsive portrait replacement samples the new artwork and lids on the same canvas', () => {
  const { canvas, frames } = rendererSurface();
  const desktop = { id: 'approved-desktop' }, desktopLids = { id: 'desktop-lids' };
  const mobile = { id: 'approved-mobile' }, mobileLids = { id: 'mobile-lids' };
  const first = createCompanionRenderer(canvas, desktop, COMPANION_RIGS.desktop, desktopLids);
  assert.equal(first.render(1), true);
  assert.deepEqual(frames.at(-1), { u_image: desktop, u_lids: desktopLids });
  first.dispose();
  const second = createCompanionRenderer(canvas, mobile, COMPANION_RIGS.mobile, mobileLids);
  assert.equal(second.render(2), true);
  assert.deepEqual(frames.at(-1), { u_image: mobile, u_lids: mobileLids });
  second.dispose();
});

test('the portrait updates its drawing buffer for layout and display-density changes', () => {
  const { canvas, frames, viewports, measureCount, resize } = rendererSurface();
  const originalObserver = window.ResizeObserver, originalRatio = window.devicePixelRatio;
  let resized, disconnects = 0, renderer;
  window.devicePixelRatio = 1;
  window.ResizeObserver = class {
    constructor(listener) { resized = listener; }
    observe(target) { assert.equal(target, canvas); }
    disconnect() { disconnects++; }
  };
  try {
    renderer = createCompanionRenderer(canvas, {}, COMPANION_RIGS.mobile, {});
    assert.equal(renderer.render(0), true);
    assert.equal(renderer.render(2.89), true);
    assert.equal(frames.length, 2);
    assert.equal(canvas.dataset.phase, '2.89');
    assert.equal(canvas.dataset.blink, '1.00,0.00');
    assert.equal(measureCount(), 1);
    assert.equal(viewports.length, 1);
    assert.equal(canvas.width, 330);

    resize(260);
    resized([{ contentRect: { width: 260 } }]);
    renderer.render(3);
    assert.equal(canvas.width, 260);
    assert.deepEqual(viewports.at(-1), [0, 0, canvas.width, canvas.height]);

    window.devicePixelRatio = 2;
    renderer.render(4);
    assert.equal(canvas.width, 520);
    assert.equal(viewports.length, 3);
    assert.equal(measureCount(), 3);
  } finally {
    renderer?.dispose();
    window.ResizeObserver = originalObserver;
    window.devicePixelRatio = originalRatio;
  }
  assert.equal(disconnects, 1);
});
