const fs = require('node:fs');
const path = require('node:path');
const { seed } = require('./seed.cjs');
const file = path.resolve(__dirname, '../db.json');
if (!process.argv.includes('--confirm'))
  throw new Error('Este comando reemplaza los datos. Detén la API y ejecuta npm run seed:reset.');
const { acquireStorageLock } = require('./storage-lock.cjs');
const release = acquireStorageLock(file);
process.once('exit', release);
if (fs.existsSync(file)) {
  const backup = `${file}.${Date.now()}.backup`;
  fs.copyFileSync(file, backup);
  console.log(`Copia conservada: ${backup}`);
}
fs.writeFileSync(file, JSON.stringify(seed(), null, 2));
console.log('Datos de demostración restaurados. No ejecutar con la API activa.');
