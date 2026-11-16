import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const cache=new Map();
const root=path.resolve(import.meta.dirname,'..');

function load(file){
  const resolved=path.resolve(file);
  if(cache.has(resolved))return cache.get(resolved).exports;
  const mod={exports:{}};
  cache.set(resolved,mod);
  const output=ts.transpileModule(readFileSync(resolved,'utf8'),{
    fileName:resolved,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  new Function('require','module','exports',output)((id)=>{
    if(id.startsWith('.'))return load(path.resolve(path.dirname(resolved),id+'.ts'));
    return require(id);
  },mod,mod.exports);
  return mod.exports;
}
// Focused checks intentionally do not compile unrelated gameplay tests.
// Type safety for these exact files is independently checked by tsconfig.rankings.json.
load(path.join(root,'tests/rankings.ts'));
