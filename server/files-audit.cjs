const fs = require('node:fs');
const path = require('node:path');
const dbFile = path.resolve(process.env.SH_DB || path.join(__dirname, '../db.json'));
const uploadDir = path.resolve(process.env.SH_UPLOADS || path.join(__dirname, 'uploads'));
const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
const references = new Set(
  [
    ...data.services.flatMap((service) => service.imageIds),
    ...data.providerProfiles.map((profile) => profile.avatarId),
    ...data.messages.flatMap((message) => message.fileIds || []),
    ...data.requests.flatMap((request) => request.fileIds || []),
  ].filter(Boolean),
);
const metadataKeys = new Set(data.files.map((file) => file.key));
const unreferenced = data.files
  .filter((file) => !references.has(file.id))
  .map(({ id, createdAt }) => ({ id, createdAt }));
const missing = data.files
  .filter((file) => !fs.existsSync(path.join(uploadDir, file.key)))
  .map((file) => file.id);
const orphanedKeys = fs.existsSync(uploadDir)
  ? fs.readdirSync(uploadDir).filter((key) => key !== '.gitkeep' && !metadataKeys.has(key))
  : [];
console.log(
  JSON.stringify(
    { mode: 'Solo lectura: no se elimina ningún archivo', unreferenced, missing, orphanedKeys },
    null,
    2,
  ),
);
