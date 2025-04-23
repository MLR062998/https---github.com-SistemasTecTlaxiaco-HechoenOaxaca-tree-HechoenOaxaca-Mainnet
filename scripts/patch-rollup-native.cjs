const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '../node_modules/rollup/dist/native.js');

const dummyContent = `#!/usr/bin/env node
module.exports = {
  load() {
    console.log("✅ Dummy Rollup loader activo. Evitando carga nativa.");
    return {};
  }
};`;

if (!fs.existsSync(target)) {
  fs.writeFileSync(target, dummyContent, 'utf8');
  fs.chmodSync(target, 0o755);
  console.log("✅ Patch aplicado: native.js dummy creado");
} else {
  console.log("ℹ️ Ya existe native.js, no se sobrescribe");
}
