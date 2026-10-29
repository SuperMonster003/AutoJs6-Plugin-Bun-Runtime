import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
// The Bun mediainfo facade is hand-written (Node's uses its private bridge helpers); its types are Node's.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const node = resolve(root, '../AutoJs6-Plugin-NodeJs-Runtime');
const read = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const file = 'app/src/main/assets/autojs6/host-client.d.mts', path = resolve(root, file), text = read(path);
const types = read(resolve(node, 'docs/nodejs/types/autojs6-node/mediainfo.d.ts'));
const start = types.indexOf('  namespace mediainfo {'), end = types.indexOf('\n  const mediainfo:', start);
assert(start >= 0 && end > start);
const begin = '// BEGIN GENERATED MEDIAINFO TYPES', finish = '// END GENERATED MEDIAINFO TYPES';
const block = begin + '\n' + types.slice(start, end).replace('  namespace mediainfo', 'export namespace RuntimeMediainfo')
  .replaceAll('AutoJs6Node.BridgeCallOptions', 'AutomationCallOptions') + '\n' + finish;
const anchor = 'export interface HostClient {';
const result = text.includes(begin) ? text.replace(new RegExp(begin + '[\\s\\S]*?' + finish), () => block) : text.replace(anchor, block + '\n\n' + anchor);
assert(result.includes(block));
if (process.argv.includes('--check')) assert.equal(result, text, file + ' differs from Node mediainfo types'); else writeFileSync(path, result);
console.log('Node/Bun mediainfo types match');
