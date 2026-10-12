const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
// Use the same Express major as JSON Server. Angular CLI also installs Express 5,
// whose request.query getter is incompatible with the v0.17 router's mutations.
const express = require(require.resolve('express', { paths: [require.resolve('json-server')] }));
const { seed } = require('../server/seed.cjs');
const { createApp } = require('../server/app.cjs');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'servicehub-e2e-'));
const dbFile = path.join(folder, 'db.json');
fs.writeFileSync(dbFile, JSON.stringify(seed()));
const api = createApp({ dbFile, uploadDir: path.join(folder, 'uploads'), quiet: true });
const app = express();
app.use((req, res, next) => (req.path.startsWith('/api/') ? api.app(req, res, next) : next()));
const root = path.resolve(__dirname, '../dist/service-hub/browser');
app.use(express.static(root));
app.get(/.*/, (req, res) => res.sendFile(path.join(root, 'index.html')));
const server = app.listen(4300, '127.0.0.1', () =>
  console.log('E2E ready: http://127.0.0.1:4300 (temporary db)'),
);
function close() {
  server.close(() => {
    if (
      path.resolve(folder).startsWith(path.resolve(os.tmpdir()) + path.sep) &&
      path.basename(folder).startsWith('servicehub-e2e-')
    )
      fs.rmSync(folder, { recursive: true, force: true });
    process.exit(0);
  });
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
