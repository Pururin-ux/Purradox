const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'source/frontend');
const backend = path.join(root, 'source/backend');
const children = [];
let closing = false;

const services = [
  {
    name: 'API', port: 4183, url: 'http://127.0.0.1:4183/api/health', cwd: backend,
    command: process.platform === 'win32' ? 'python.exe' : 'python3',
    args: ['-m', 'uvicorn', 'server:app', '--app-dir', backend, '--host', '127.0.0.1', '--port', '4183',
      '--reload', '--reload-dir', backend],
    env: { MONGO_URL: 'mongodb://127.0.0.1:27017', DB_NAME: 'physicslab_local', CORS_ORIGINS: 'http://127.0.0.1:4184,http://localhost:4184' },
    validate: text => JSON.parse(text).ok === true,
  },
  {
    name: 'Frontend', port: 4184, url: 'http://127.0.0.1:4184/', cwd: frontend,
    command: process.execPath,
    args: [path.join(frontend, 'node_modules/@craco/craco/dist/bin/craco.js'), 'start'],
    env: { HOST: '127.0.0.1', PORT: '4184', BROWSER: 'none', REACT_APP_BACKEND_URL: 'http://127.0.0.1:4183' },
    validate: text => /<div id="root"><\/div>/.test(text),
  },
];

async function healthy(service) {
  try {
    const response = await fetch(service.url, { signal: AbortSignal.timeout(2000) });
    return response.ok && service.validate(await response.text());
  } catch { return false; }
}

async function checkCatalogCompression(healthUrl) {
  try {
    const response = await fetch(new URL('catalog', healthUrl), {
      headers: { 'Accept-Encoding': 'gzip' },
      signal: AbortSignal.timeout(2000),
    });
    await response.body?.cancel();
    if (response.ok && response.headers.get('content-encoding') !== 'gzip') {
      console.warn('API serves the catalog without gzip. Restart the local API to load the current backend.');
    }
  } catch { /* An unavailable catalog does not decide whether the port is safe to reuse. */ }
}

function occupied(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(false)));
  });
}

function stopChildren() {
  if (closing) return;
  closing = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    } else child.kill('SIGTERM');
  }
}
process.on('SIGINT', () => { stopChildren(); process.exit(0); });
process.on('SIGTERM', () => { stopChildren(); process.exit(0); });

async function main() {
  for (const service of services) {
    if (await healthy(service)) {
      console.log(`${service.name}: already running locally on ${service.port}`);
      if (service.port === 4183) await checkCatalogCompression(service.url);
      continue;
    }
    if (await occupied(service.port)) throw Error(`${service.port} is occupied by another service; nothing was stopped.`);
    console.log(`Starting local ${service.name}...`);
    const child = spawn(service.command, service.args, {
      cwd: service.cwd, env: { ...process.env, ...service.env }, stdio: 'inherit', windowsHide: true,
    });
    children.push(child);
    let spawnError;
    child.once('error', error => { spawnError = error; });
    const deadline = Date.now() + 120000;
    while (!(await healthy(service))) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) throw Error(`${service.name} exited with ${child.exitCode}.`);
      if (Date.now() > deadline) throw Error(`${service.name} did not become ready in 120 seconds.`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.log('\nPurradox: http://127.0.0.1:4184/');
  if (children.length) console.log('Ctrl+C stops only the services started by this launcher.');
}

main().catch(error => { console.error(error.message); stopChildren(); process.exitCode = 1; });
