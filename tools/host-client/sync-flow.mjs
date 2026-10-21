import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const node = resolve(root, '../AutoJs6-Plugin-NodeJs-Runtime');
const read = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
function update(file, kind, body, anchor) {
  const path = resolve(root, file), text = read(path);
  const begin = '// BEGIN GENERATED FLOW ' + kind, end = '// END GENERATED FLOW ' + kind;
  const block = begin + '\n' + body + end;
  const result = text.includes(begin) ? text.replace(new RegExp(begin + '[\\s\\S]*?' + end), () => block) : text.replace(anchor, block + '\n\n' + anchor);
  assert(result.includes(block));
  if (process.argv.includes('--check')) assert.equal(result, text, file + ' differs from Node Flow'); else writeFileSync(path, result);
}
const source = read(resolve(node, 'app/src/main/cpp/node_bridge_sources.cpp'));
const start = source.indexOf('  // Shared flow core.'), end = source.indexOf('  // End shared flow core.', start);
assert(start >= 0 && end > start);
update('app/src/main/assets/autojs6/host-client.mjs', 'FACADE', source.slice(start, end) + '  // End shared flow core.\n', 'export async function createHostClient');
const types = read(resolve(node, 'docs/nodejs/types/autojs6-node/flow.d.ts'));
const first = types.indexOf('  namespace flow {'), last = types.indexOf('\n  const flow:', first);
assert(first >= 0 && last > first);
update('app/src/main/assets/autojs6/host-client.d.mts', 'TYPES', types.slice(first, last).replace('  namespace flow', 'export namespace RuntimeFlow') + '\n', 'export interface HostClient {');
console.log('Node/Bun Flow factories and types match');
