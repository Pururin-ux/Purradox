const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');

const frontend = path.resolve(__dirname, '../source/frontend');
const frontendRequire = createRequire(path.join(frontend, 'package.json'));
const { JSDOM } = frontendRequire('jsdom');
const dom = new JSDOM('<div id="root"></div>');
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.ResizeObserver = class { observe() {} unobserve() {} };

let now = 0;
let nextFrameId = 0;
let reduce = false;
const frames = new Map();
window.matchMedia = () => ({ matches: reduce });
const { transformSync } = frontendRequire('@babel/core');
const React = frontendRequire('react');
const { act } = React;
const { createRoot } = frontendRequire('react-dom/client');
const modules = new Map();

function loadSource(input) {
  const filename = [input, input + '.jsx', input + '.js'].find(file => fs.existsSync(file));
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const code = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    presets: [[frontendRequire.resolve('@babel/preset-react'), { runtime: 'automatic' }]],
    plugins: [frontendRequire.resolve('@babel/plugin-transform-modules-commonjs')],
  }).code;
  vm.runInNewContext(code, {
    module, exports: module.exports, window,
    performance: { now: () => now },
    requestAnimationFrame: callback => { frames.set(++nextFrameId, callback); return nextFrameId; },
    cancelAnimationFrame: id => frames.delete(id),
    require: name => {
      if (name.endsWith(".css")) return {};
      if (name === '@/lib/game') return { trackUnique() {} };
      if (name === '@/components/shared/Tex') return { Rich: ({ text }) => text };
      if (name === 'framer-motion') return { useReducedMotion: () => reduce };
      if (name.startsWith('@/')) return loadSource(path.join(frontend, 'src', name.slice(2)));
      if (name.startsWith('.')) return loadSource(path.resolve(path.dirname(filename), name));
      return frontendRequire(name);
    },
  }, { filename });
  return module.exports;
}

const { StudyLab } = loadSource(path.join(frontend, 'src/variants/a/StudyLab.jsx'));

async function withLab(run, reduced = false) {
  now = 0;
  reduce = reduced;
  const host = document.getElementById('root');
  const root = createRoot(host);
  await act(() => root.render(React.createElement(StudyLab, {
    block: { lab: 'motion', id: 'lab', title: 'Проверь формулу пути' },
    lesson: { slug: 'ravnouskorennoe-dvizhenie' },
  })));
  try {
    await run({
      host,
      slider: index => host.querySelectorAll('[role="slider"]')[index],
      readout: index => host.querySelectorAll('.lab-readouts dd')[index].firstChild.textContent,
      async press(index, key, count = 1) {
        const slider = this.slider(index);
        for (let i = 0; i < count; i++) {
          await act(() => slider.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true })));
        }
      },
      async click(index) { await act(() => host.querySelectorAll('.lab-playback button')[index].click()); },
      async frame(milliseconds) {
        now = milliseconds;
        const scheduled = [...frames.values()];
        frames.clear();
        await act(() => { for (const callback of scheduled) callback(now); });
      },
    });
  } finally {
    await act(() => root.unmount());
    frames.clear();
  }
}

test('motion lab advances, pauses, resumes, holds its final measurement, then restarts', async () => {
  await withLab(async lab => {
    await lab.click(0);
    await lab.frame(100);
    await lab.frame(1100);
    const playingTime = Number(lab.slider(2).getAttribute('aria-valuenow'));
    assert.equal(playingTime, 2.2, 'the clock advances at twice real time');
    await lab.click(0);
    await lab.frame(2100);
    assert.equal(Number(lab.slider(2).getAttribute('aria-valuenow')), playingTime);
    await lab.click(0);
    await lab.frame(2600);
    assert.equal(lab.slider(2).getAttribute('aria-valuenow'), '3.2');
    await lab.frame(8000);
    await lab.frame(13000);
    assert.equal(lab.slider(2).getAttribute('aria-valuenow'), '10');
    assert.equal(frames.size, 0);
    await lab.click(0);
    assert.equal(lab.slider(2).getAttribute('aria-valuenow'), '0');
    await lab.frame(13500);
    await lab.press(2, 'PageUp');
    await lab.frame(14000);
    assert.equal(lab.slider(2).getAttribute('aria-valuenow'), '2', 'manual seeking holds the selected time');
    assert.equal(frames.size, 0);
    await lab.click(1);
    assert.equal(lab.slider(2).getAttribute('aria-valuenow'), '0');
    assert.equal(frames.size, 0);
  });
});

test('braking then reversing stays inside the track, with a zero and a signed velocity', async () => {
  await withLab(async lab => {
    await lab.press(0, 'ArrowRight', 10);
    await lab.press(1, 'ArrowLeft', 8);
    await lab.press(2, 'PageUp', 5);
    assert.equal(lab.readout(0), '25');
    assert.equal(lab.readout(1), '0');
    const point = lab.host.querySelector('.lab-point');
    const plot = point.ownerSVGElement;
    const turningX = Number(point.getAttribute('cx'));
    assert.ok(turningX > 0 && turningX < Number(plot.getAttribute('viewBox').split(' ')[2]));
    assert.equal(plot.querySelector('.lab-direction').getAttribute('visibility'), 'hidden', 'zero velocity has no visible arrow');
    const labels = [...plot.querySelectorAll('text')].map(label => label.textContent);
    assert.ok(labels.includes('0, 10'), 'one label groups seconds spent at the same coordinate');
    await lab.press(2, 'ArrowRight', 10);
    assert.equal(lab.readout(0), '24');
    assert.equal(lab.readout(1), '-2');
    const arrow = plot.querySelector('.lab-direction');
    assert.match(arrow.getAttribute('d'), /^M[\d.]+ 72H[\d.]+m10 -6l-10 6 10 6$/);
    assert.ok(Number(point.getAttribute('cx')) < turningX);
  });
});

test('small nonzero velocities show their sign alongside the arrow', async () => {
  await withLab(async lab => {
    await lab.press(0, 'ArrowRight');
    await lab.press(1, 'ArrowLeft', 7);
    await lab.press(2, 'ArrowRight', 7);
    assert.equal(lab.readout(1), '-0,05');
    assert.ok(lab.host.querySelector('.lab-direction'));
  });
});

test('closely spaced second labels stay legible on the track', async () => {
  await withLab(async lab => {
    const plot = lab.host.querySelector('svg[role="img"]');
    const labels = [...plot.querySelectorAll('text')].filter(label => /^\d+$/.test(label.textContent));
    assert.equal(plot.querySelectorAll('.lab-tick').length, 11);
    assert.deepEqual(labels.map(label => Number(label.textContent)), [0, 1, 2, 3, 5, 10]);
    for (const [index, label] of labels.entries()) {
      for (const other of labels.slice(index + 1)) {
        if (label.getAttribute('y') !== other.getAttribute('y')) continue;
        const gap = Math.abs(Number(label.getAttribute('x')) - Number(other.getAttribute('x')));
        assert.ok(gap >= 18, `${label.textContent} and ${other.textContent} overlap`);
      }
    }
  });
});

test('second-by-second path adds both legs of a reversal and remains positive moving left', async () => {
  await withLab(async lab => {
    assert.equal(lab.readout(2), '1 / 3 / 5');
    await lab.press(0, 'ArrowRight');
    await lab.press(1, 'ArrowLeft', 8);
    assert.equal(lab.readout(2), '0,5 / 2 / 4');
    await lab.press(0, 'Home');
    assert.equal(lab.readout(2), '1 / 3 / 5');
    await lab.press(1, 'ArrowRight', 4);
    assert.equal(lab.readout(2), '0 / 0 / 0');
  });
});

test('reduced motion retains manual measurements and reset', async () => {
  await withLab(async lab => {
    assert.equal(lab.host.querySelector('.lab-playback button').disabled, true);
    await lab.press(2, 'PageUp');
    assert.equal(lab.slider(2).getAttribute('aria-valuenow'), '1');
    assert.equal(lab.readout(0), '1');
    await lab.click(1);
    assert.equal(lab.slider(2).getAttribute('aria-valuenow'), '0');
    assert.equal(frames.size, 0);
  }, true);
});
