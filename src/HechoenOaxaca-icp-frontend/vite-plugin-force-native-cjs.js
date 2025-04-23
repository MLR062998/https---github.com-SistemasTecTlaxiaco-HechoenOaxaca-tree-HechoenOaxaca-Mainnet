export default function patchRollupPlugin() {
    return {
      name: 'vite-plugin-force-native-cjs',
      enforce: 'pre',
      resolveId(source) {
        if (source.includes('parseAst.js')) {
          return source;
        }
        return null;
      },
      load(id) {
        if (id.includes('parseAst.js')) {
          return `
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
  