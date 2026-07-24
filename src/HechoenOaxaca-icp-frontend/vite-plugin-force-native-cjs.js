// src/HechoenOaxaca-icp-frontend/vite-plugin-force-native-cjs.js

export default function patchRollupPlugin() {
    return {
      name: 'force-native-cjs-import',
      enforce: 'pre',
      resolveId(source) {
        if (source.includes('rollup/dist/es/shared/parseAst.js')) {
          return source;
        }
        return null;
      },
      load(id) {
        if (id.includes('rollup/dist/es/shared/parseAst.js')) {
          return `
            // 🔧 Parche dinámico forzado desde Vite Plugin
            import pkg from '../../native.cjs';
            const { parse, parseAsync } = pkg;
  
            export function parseAst(input) {
              return parse(input);
            }
  
            export async function parseAstAsync(input) {
              return await parseAsync(input);
            }
          `;
        }
        return null;
      }
    };
  }
  