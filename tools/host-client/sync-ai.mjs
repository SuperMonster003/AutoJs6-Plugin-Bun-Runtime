import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const node = resolve(root, '../AutoJs6-Plugin-NodeJs-Runtime');
const read = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
function update(file, kind, body, anchor) {
  const path = resolve(root, file), text = read(path);
  const begin = '// BEGIN GENERATED AI ' + kind, end = '// END GENERATED AI ' + kind;
  const block = begin + '\n' + body + end;
  const result = text.includes(begin) ? text.replace(new RegExp(begin + '[\\s\\S]*?' + end), () => block) : text.replace(anchor, block + '\n\n' + anchor);
  assert(result.includes(block));
  if (process.argv.includes('--check')) assert.equal(result, text, file + ' differs from Node AI'); else writeFileSync(path, result);
}
const source = read(resolve(node, 'app/src/main/cpp/node_bridge_sources.cpp'));
const a = source.indexOf('  // Shared AI facade.'), z = source.indexOf('  // End shared AI facade.', a);
assert(a >= 0 && z > a);
update('app/src/main/assets/autojs6/host-client.mjs', 'FACADE', source.slice(a, z) + '  // End shared AI facade.\n', 'export async function createHostClient');
const types = read(resolve(node, 'docs/nodejs/types/autojs6-node/ai.d.ts'));
const start = types.indexOf('  namespace ai {'), end = types.indexOf('\n  const ai:', start);
assert(start >= 0 && end > start);
update('app/src/main/assets/autojs6/host-client.d.mts', 'TYPES', types.slice(start, end).replace('  namespace ai', 'export namespace RuntimeAi').replaceAll('AutoJs6Node.BridgeCallOptions', 'AutomationCallOptions').replaceAll('import("tts").', 'RuntimeTts.') + '\n', 'export interface HostClient {');
console.log('Node/Bun AI factories and types match');
