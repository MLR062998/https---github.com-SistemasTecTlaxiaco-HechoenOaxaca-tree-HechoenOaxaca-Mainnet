// check-native-imports.js
import fs from 'fs';
import path from 'path';

function searchForIncorrectImports(dir, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      searchForIncorrectImports(fullPath, results);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(`from '../../native.js'`)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const baseDir = 'node_modules/rollup';
const found = searchForIncorrectImports(baseDir);

if (found.length) {
  console.log(`❌ Encontradas importaciones inválidas:\n`);
  found.forEach(f => console.log(`- ${f}`));
  process.exit(1);
} else {
  console.log('✅ No se encontraron importaciones incorrectas de native.js');
}
