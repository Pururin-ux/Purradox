const path = require('node:path');
const net = require('node:net');
const { createHash } = require('node:crypto');
const { existsSync, realpathSync } = require('node:fs');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'source/frontend');
const backend = path.join(root, 'source/backend');
const children = [];
let closing = false;

function readPort(variable, defaultPort) {
  const port = Number(process.env[variable] ?? defaultPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw Error(`${variable} must be a port number from 1 to 65535.`);
  }
  return port;
}

function pythonCommand() {
  const onWindows = process.platform === 'win32';
  const executable = onWindows ? 'python.exe' : 'python3';
  const localPython = path.join(root, '.venv', onWindows ? 'Scripts' : 'bin', executable);
  return !process.env.VIRTUAL_ENV && existsSync(localPython) ? localPython : executable;
}

async function healthy(service, checkout) {
  try {
    const response = await fetch(service.url, { redirect: 'error', signal: AbortSignal.timeout(2000) });
    if (!response.ok || response.headers.get('X-Purradox-Checkout') !== checkout) {
      await response.body?.cancel();
      return false;
    }
    return service.validate(await response.text());
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
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    } else child.kill('SIGTERM');
  }
}
process.on('SIGINT', () => { stopChildren(); process.exit(0); });
process.on('SIGTERM', () => { stopChildren(); process.exit(0); });

async function main() {
  const apiPort = readPort('PURRADOX_API_PORT', 4183);
  const frontendPort = readPort('PURRADOX_FRONTEND_PORT', 4184);
  if (apiPort === frontendPort) throw Error('The API and frontend require different ports.');

  const apiUrl = `http://127.0.0.1:${apiPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const revision = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true,
  }).stdout?.trim() ?? '';
  const checkout = createHash('sha256')
    .update(JSON.stringify([realpathSync(root), revision, apiPort, frontendPort])).digest('hex');
  const services = [
    {
      name: 'API', port: apiPort, url: `${apiUrl}/api/health`, cwd: backend,
      command: pythonCommand(),
      args: ['-m', 'uvicorn', 'server:app', '--app-dir', backend, '--host', '127.0.0.1', '--port', String(apiPort),
        '--reload', '--reload-dir', backend],
      env: { CORS_ORIGINS: `${frontendUrl},http://localhost:${frontendPort}` },
      validate: text => JSON.parse(text).ok === true,
    },
    {
      name: 'Frontend', port: frontendPort, url: `${frontendUrl}/`, cwd: frontend,
      command: process.execPath,
      args: [path.join(frontend, 'node_modules/@craco/craco/dist/bin/craco.js'), 'start'],
      env: { HOST: '127.0.0.1', PORT: String(frontendPort), BROWSER: 'none', REACT_APP_BACKEND_URL: apiUrl },
      validate: text => /<div id="root"><\/div>/.test(text),
    },
  ];

  const toStart = [];
  for (const service of services) {
    if (await healthy(service, checkout)) {
      console.log(`${service.name}: already running locally on ${service.port}`);
      if (service.port === apiPort) await checkCatalogCompression(service.url);
      continue;
    }
    if (await occupied(service.port)) {
      throw Error(`Port ${service.port} is occupied by a service outside this Purradox launch. Set PURRADOX_API_PORT or PURRADOX_FRONTEND_PORT to use a different port.`);
    }
    toStart.push(service);
  }
  for (const service of toStart) {
    console.log(`Starting local ${service.name}...`);
    const child = spawn(service.command, service.args, {
      cwd: service.cwd, env: { ...process.env, ...service.env, PURRADOX_LOCAL_CHECKOUT: checkout },
      stdio: 'inherit', windowsHide: true,
    });
    children.push(child);
    let spawnError;
    child.once('error', error => { spawnError = error; });
    const deadline = Date.now() + 120000;
    while (!(await healthy(service, checkout))) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null || child.signalCode !== null) {
        throw Error(`${service.name} exited with ${child.exitCode ?? child.signalCode}.`);
      }
      if (Date.now() > deadline) throw Error(`${service.name} did not become ready in 120 seconds.`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.log(`\nPurradox: ${frontendUrl}/`);
  if (children.length) console.log('Ctrl+C stops only the services started by this launcher.');
}

main().catch(error => { console.error(error.message); stopChildren(); process.exitCode = 1; });
