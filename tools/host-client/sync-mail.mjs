import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const node = resolve(root, '../AutoJs6-Plugin-NodeJs-Runtime');
const read = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
function update(file, kind, body, anchor) {
  const path = resolve(root, file), text = read(path);
  const begin = '// BEGIN GENERATED MAIL ' + kind, end = '// END GENERATED MAIL ' + kind;
  const block = begin + '\n' + body + end;
  const result = text.includes(begin) ? text.replace(new RegExp(begin + '[\\s\\S]*?' + end), () => block) : text.replace(anchor, block + '\n\n' + anchor);
  assert(result.includes(block));
  if (process.argv.includes('--check')) assert.equal(result, text, file + ' differs from Node MAIL'); else writeFileSync(path, result);
}
const source = read(resolve(node, 'app/src/main/cpp/node_bridge_sources.cpp'));
const a = source.indexOf('  // Shared mail facade.'), z = source.indexOf('  // End shared mail facade.', a);
assert(a >= 0 && z > a);
update('app/src/main/assets/autojs6/host-client.mjs', 'FACADE', source.slice(a, z) + '  // End shared mail facade.\n', 'export async function createHostClient');
const types = read(resolve(node, 'docs/nodejs/types/autojs6-node/mail.d.ts'));
const start = types.indexOf('  namespace mail {'), end = types.indexOf('\n  const mail:', start);
assert(start >= 0 && end > start);
update('app/src/main/assets/autojs6/host-client.d.mts', 'TYPES', types.slice(start, end).replace('  namespace mail', 'export namespace RuntimeMail').replaceAll('AutoJs6Node.BridgeCallOptions', 'AutomationCallOptions').replaceAll('import("tts").', 'RuntimeTts.') + '\n', 'export interface HostClient {');
console.log('Node/Bun MAIL factories and types match');
