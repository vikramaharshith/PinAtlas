import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {root} from '../scripts/validate.mjs';

test('published build includes every local script and stylesheet referenced by the page',async()=>{
 execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root});
 const html=await readFile(path.join(root,'dist/index.html'),'utf8');
 const assets=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(\.\/[^"#?]+)"/g)].map(m=>m[1]);
 assert.ok(assets.includes('./compare.js'),'Compare module must be loaded by the page');
 for(const asset of assets)await access(path.join(root,'dist',asset));
 const compare=await readFile(path.join(root,'dist/compare.js'),'utf8');
 for(const [,dependency] of compare.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g))await access(path.join(root,'dist',dependency));
});
