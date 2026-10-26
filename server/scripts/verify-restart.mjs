import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
  nextDecisionId,
  openDatabase,
  readExamples,
} from './local-database.mjs';

async function unusedPort() {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const { port } = socket.address();
  await new Promise((resolve, reject) =>
    socket.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function stopServer(server) {
  const child = server?.child;
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null)
    return;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Backend did not stop within five seconds.'));
    }, 5000);
    child.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

async function startServer() {
  const port = await unusedPort();
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL('../dist/main.js', import.meta.url))],
    {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env: {
        ...process.env,
        PORT: String(port),
        OBSERVE_APP_KEY: '',
        OBSERVE_APP_SECRET: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let output = '';
  let startupError;
  child.stdout.on('data', (data) => {
    output += data.toString();
  });
  child.stderr.on('data', (data) => {
    output += data.toString();
  });
  child.once('error', (error) => {
    startupError = error;
  });
  const server = {
    child,
    baseUrl: `http://127.0.0.1:${port}`,
    logs: () => output,
  };

  try {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (startupError) throw startupError;
      if (child.exitCode !== null)
        throw new Error('Backend exited before becoming ready.');
      try {
        const response = await fetch(`${server.baseUrl}/docs-json`, {
          signal: AbortSignal.timeout(500),
        });
        if (response.ok) return server;
      } catch {
        // Wait while this newly spawned process connects and starts listening.
      }
      await delay(100);
    }
    throw new Error('Backend did not become ready within the startup timeout.');
  } catch (error) {
    await stopServer(server);
    const safeLogs = output.replace(
      /mongodb(?:\+srv)?:\/\/[^\s]+/g,
      '[MongoDB URI]',
    );
    throw new Error(`${error.message}\n${safeLogs}`, { cause: error });
  }
}

async function post(server, id, action, expectedStatus) {
  const response = await fetch(`${server.baseUrl}/decisions/${id}/${action}`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
  });
  const body = await response.json();
  assert.equal(
    response.status,
    expectedStatus,
    `${action}: ${body.message ?? 'unexpected status'}`,
  );
  return body;
}

const database = await openDatabase();
let fixture;
let activeServer;

try {
  fixture = await database.decisions.create({
    ...readExamples()[0],
    id: await nextDecisionId(database),
    title: 'Temporary backend process-restart verification',
    status: 'Draft',
    winnerNames: [],
  });

  activeServer = await startServer();
  const firstPid = activeServer.child.pid;
  const specification = await (
    await fetch(`${activeServer.baseUrl}/docs-json`)
  ).json();
  for (const action of ['calculate', 'finalize', 'reopen']) {
    assert.ok(specification.paths[`/decisions/{id}/${action}`]?.post);
  }
  const rowSchema =
    specification.components.schemas.RankedOptionResponse.properties;
  assert.equal(rowSchema.exactTotal.type, 'number');
  assert.equal(rowSchema.displayTotal.type, 'string');
  assert.equal('weightedSum' in rowSchema, false);

  const before = await post(activeServer, fixture.id, 'calculate', 200);
  const finalized = await post(activeServer, fixture.id, 'finalize', 200);
  assert.equal(finalized.status, 'Finalized');
  assert.deepEqual(finalized.winnerNames, before.winners);
  assert.ok(Number.isFinite(Date.parse(finalized.finalizedAt)));
  assert.equal('_id' in finalized, false);
  const firstLogs = activeServer.logs();
  await stopServer(activeServer);

  const persisted = await database.decisions.findById(fixture._id).exec();
  assert.equal(persisted.status, 'Finalized');
  assert.deepEqual([...persisted.winnerNames], before.winners);
  assert.equal(persisted.finalizedAt.toISOString(), finalized.finalizedAt);

  activeServer = await startServer();
  const secondPid = activeServer.child.pid;
  assert.notEqual(secondPid, firstPid);
  await post(activeServer, fixture.id, 'calculate', 409);
  const reopened = await post(activeServer, fixture.id, 'reopen', 200);
  assert.equal(reopened.status, 'Draft');
  assert.deepEqual(reopened.winnerNames, []);
  assert.equal('finalizedAt' in reopened, false);
  assert.deepEqual(
    await post(activeServer, fixture.id, 'calculate', 200),
    before,
  );

  const logs = firstLogs + activeServer.logs();
  assert.ok(logs.includes(`Finalized decision ${fixture.id}`));
  assert.ok(logs.includes(`Reopened decision ${fixture.id}`));
  assert.ok(logs.includes(`Rejected calculate for decision ${fixture.id}`));

  await stopServer(activeServer);
  await database.decisions.deleteOne({ _id: fixture._id }).exec();
  assert.equal(await database.decisions.exists({ _id: fixture._id }), null);

  console.log(
    JSON.stringify(
      {
        result: 'passed',
        processIds: [firstPid, secondPid],
        persistedAcrossProcessRestart: true,
        swaggerSchemasVerified: true,
        lifecycleLoggingVerified: true,
        temporaryFixtureRemoved: true,
      },
      null,
      2,
    ),
  );
} finally {
  await stopServer(activeServer);
  if (fixture) await database.decisions.deleteOne({ _id: fixture._id }).exec();
  await database.connection.close();
}
