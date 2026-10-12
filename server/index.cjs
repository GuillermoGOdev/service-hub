const path = require('node:path');
const fs = require('node:fs');
const { createApp } = require('./app.cjs');
const dbFile = path.resolve(process.env.SH_DB || path.join(__dirname, '../db.json'));
if (!fs.existsSync(dbFile))
  throw new Error(
    'Falta db.json. Restaura una copia o ejecuta npm run seed:reset con la API detenida.',
  );
const uploadDir = path.resolve(process.env.SH_UPLOADS || path.join(__dirname, 'uploads'));
const { acquireStorageLock } = require('./storage-lock.cjs');
const release = acquireStorageLock(dbFile);
process.once('exit', release);
const { app } = createApp({ dbFile, uploadDir });
const server = app.listen(Number(process.env.PORT || 3000), '127.0.0.1', () =>
  console.log(`ServiceHub API: http://127.0.0.1:${server.address().port}/api`),
);
server.on('error', (e) => {
  console.error(e.message);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => server.close(() => process.exit(0)));
