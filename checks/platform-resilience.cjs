const assert = require('node:assert/strict');
const fs = require('node:fs');
const { once } = require('node:events');
const { createServer } = require('node:http');
const { createRequire } = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const frontend = path.resolve(__dirname, '../source/frontend');
const frontendRequire = createRequire(path.join(frontend, 'package.json'));
const { QueryClient } = frontendRequire('@tanstack/react-query');
const { transformSync } = frontendRequire('@babel/core');

function loadLibrary(name, overrides = {}) {
  const file = path.join(frontend, 'src/lib', `${name}.js`);
  const module = { exports: {} };
  const { code } = transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    babelrc: false,
    configFile: false,
    plugins: [frontendRequire.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  const context = { module, exports: module.exports, process, require: frontendRequire };
  Object.defineProperties(context, Object.getOwnPropertyDescriptors(overrides));
  vm.runInNewContext(code, context, { filename: file });
  return module.exports;
}

test('denying storage access at import and write still allows sound toggles', () => {
  let muted;
  const react = {
    useSyncExternalStore(subscribe, snapshot) {
      muted = snapshot();
      return subscribe(() => { muted = snapshot(); });
    },
  };
  const sound = loadLibrary('sound', {
    require: () => react,
    get localStorage() { throw new Error('Storage denied'); },
  });
  const unsubscribe = sound.useMuted();
  assert.equal(muted, false);
  sound.toggleMute();
  assert.equal(muted, true);
  sound.toggleMute();
  assert.equal(muted, false);
  unsubscribe();
});

function lessonQuery(hooks) {
  let query;
  hooks.prefetchStudyPage({ prefetchQuery(options) { query = options; } }, '/lesson/test');
  return query;
}

async function holdRequests(t) {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const received = [];
  server.on('request', request => received.push(`${request.method} ${request.url}`));
  const hooks = loadLibrary('hooks');
  hooks.api.defaults.baseURL = `http://127.0.0.1:${server.address().port}/api`;
  hooks.api.defaults.proxy = false;
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  t.after(() => {
    client.clear();
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
  });
  return { server, received, hooks, client };
}

test('cancelling a lesson query closes its pending GET', { timeout: 15000 }, async t => {
  const { server, hooks, client } = await holdRequests(t);
  const incoming = once(server, 'request');
  const query = lessonQuery(hooks);
  const rejected = assert.rejects(client.fetchQuery(query), { message: 'CancelledError' });
  const [request, response] = await incoming;
  assert.equal(request.url, '/api/lessons/test');
  const connectionClosed = once(response, 'close');
  await client.cancelQueries({ queryKey: query.queryKey });
  await connectionClosed;
  await rejected;
  assert.equal(client.getQueryState(query.queryKey).fetchStatus, 'idle');
});

test('held lesson GET and CT submit POST stop at the request deadline', { timeout: 20000 }, async t => {
  const { received, hooks, client } = await holdRequests(t);
  assert.equal(hooks.api.defaults.timeout, 7000);
  await Promise.all([
    assert.rejects(client.fetchQuery(lessonQuery(hooks)), { code: 'ETIMEDOUT' }),
    assert.rejects(hooks.submitVariant('03', 'rev')({ a1: 2 }, 40), { code: 'ETIMEDOUT' }),
  ]);
  assert.deepEqual(received.sort(), ['GET /api/lessons/test', 'POST /api/ct/variants/03/submit']);
});
