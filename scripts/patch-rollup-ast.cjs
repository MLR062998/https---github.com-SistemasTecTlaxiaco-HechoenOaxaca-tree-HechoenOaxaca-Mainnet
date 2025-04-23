// scripts/patch-rollup-ast.cjs
const fs = require('fs');
const path = require('path');

const parseAstPath = path.resolve(__dirname, '../node_modules/rollup/dist/es/shared/parseAst.js');

const fixedCode = `
// 🚨 Este archivo ha sido parchado automáticamente por scripts/patch-rollup-ast.cjs
import pkg from '../../native.cjs';
const { parse, parseAsync } = pkg;

export function parseAst(input) {
  return parse(input);
}

export async function parseAstAsync(input) {
  return await parseAsync(input);
}
`.trimStart();

try {
  fs.writeFileSync(parseAstPath, fixedCode, 'utf8');
  console.log('✅ parche aplicado: parseAst.js → usa native.cjs');
} catch (err) {
  console.error('❌ Error aplicando parche:', err.message);
}
