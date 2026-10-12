const fs = require('node:fs');

// Cooperative local lock: both the application and the manual seed command use it.
// It cannot protect against an unrelated process editing the JSON file directly.
function acquireStorageLock(dbFile) {
  const lockFile = dbFile + '.lock';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const descriptor = fs.openSync(lockFile, 'wx');
      fs.writeFileSync(descriptor, String(process.pid));
      fs.closeSync(descriptor);
      return () => {
        if (fs.existsSync(lockFile) && fs.readFileSync(lockFile, 'utf8') === String(process.pid)) {
          fs.unlinkSync(lockFile);
        }
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const pid = Number(fs.readFileSync(lockFile, 'utf8'));
      if (!Number.isSafeInteger(pid) || pid <= 0)
        throw new Error('Bloqueo ilegible: revisa ' + lockFile);
      try {
        process.kill(pid, 0);
      } catch (probe) {
        if (probe.code === 'ESRCH') {
          fs.unlinkSync(lockFile);
          continue;
        }
        throw probe;
      }
      throw new Error(
        `La base está en uso por el proceso ${pid}. Detén la API antes de reiniciar datos.`,
      );
    }
  }
  throw new Error('No se pudo obtener el bloqueo de la base.');
}
module.exports = { acquireStorageLock };
