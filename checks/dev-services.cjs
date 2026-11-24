const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { createHash } = require('node:crypto');
const { once } = require('node:events');
const { realpathSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { test } = require('node:test');
const { promisify } = require('node:util');

const run = promisify(execFile);
const root = path.resolve(__dirname, '..');
const HealthPlugin = require('../source/frontend/plugins/health-check/webpack-health-plugin');
const setupHealthEndpoints = require('../source/frontend/plugins/health-check/health-endpoints');

async function serve(t, handler) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
  });
  return server.address().port;
}

function launch(apiPort, frontendPort) {
  return run(process.execPath, [path.join(root, 'local/dev.cjs')], {
    cwd: root,
    env: { ...process.env, PURRADOX_API_PORT: String(apiPort), PURRADOX_FRONTEND_PORT: String(frontendPort) },
    timeout: 10000,
    windowsHide: true,
  });
}

test('launcher checks checkout identity before reusing occupied ports', async t => {
  let apiCheckout;
  let frontendCheckout;
  const apiPort = await serve(t, (req, res) => {
    if (apiCheckout) res.setHeader('X-Purradox-Checkout', apiCheckout);
    if (req.url === '/api/health') res.end('{"ok":true}');
    else res.writeHead(404).end();
  });
  const frontendPort = await serve(t, (req, res) => {
    if (frontendCheckout) res.setHeader('X-Purradox-Checkout', frontendCheckout);
    res.end('<div id="root"></div>');
  });
  const { stdout: revision } = await run('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root, windowsHide: true });
  const checkout = createHash('sha256')
    .update(JSON.stringify([realpathSync(root), revision.trim(), apiPort, frontendPort])).digest('hex');
  await assert.rejects(launch(apiPort, frontendPort), err => {
    assert.equal(err.code, 1);
    assert.match(err.stderr, new RegExp(`Port ${apiPort} is occupied`));
    assert.doesNotMatch(err.stdout, /Starting local/);
    return true;
  });

  apiCheckout = checkout;
  frontendCheckout = 'different-checkout';
  await assert.rejects(launch(apiPort, frontendPort), err => {
    assert.equal(err.code, 1);
    assert.match(err.stderr, new RegExp(`Port ${frontendPort} is occupied`));
    assert.doesNotMatch(err.stdout, /Starting local/);
    return true;
  });

  frontendCheckout = checkout;
  const { stdout } = await launch(apiPort, frontendPort);
  assert.match(stdout, new RegExp(`API: already running locally on ${apiPort}`));
  assert.match(stdout, new RegExp(`Frontend: already running locally on ${frontendPort}`));
});

test('webpack health averages completed builds without idle time', t => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  const plugin = new HealthPlugin();
  const hooks = {};
  plugin.apply({ hooks: Object.fromEntries(['compile', 'done', 'invalid', 'failed'].map(name => [
    name, { tap: (_, callback) => { hooks[name] = callback; } },
  ])) });
  const routes = {};
  setupHealthEndpoints({ app: { get: (url, handler) => { routes[url] = handler; } } }, plugin);
  const stats = () => {
    let data;
    routes['/health/stats']({}, { json: value => { data = value; } });
    return data;
  };

  assert.equal(stats().averageCompileTime, null);
  hooks.compile();
  now += 100;
  hooks.done({ toJson: () => ({}), hasErrors: () => false, hasWarnings: () => false });
  now += 8000;
  assert.equal(stats().averageCompileTime, '100ms');
  hooks.invalid();
  hooks.compile();
  now += 250;
  hooks.failed(new Error('Compiler failure'));
  assert.equal(stats().totalCompiles, 2);
  assert.equal(stats().averageCompileTime, '175ms');
  assert.equal(stats().lastCompileDuration, '250ms');
  plugin.reset();
  assert.equal(stats().totalCompiles, 0);
  assert.equal(stats().averageCompileTime, null);
  assert.equal(stats().lastCompileDuration, null);
});
