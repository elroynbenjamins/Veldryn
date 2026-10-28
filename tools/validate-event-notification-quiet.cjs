// Standalone regression checks run before unrelated mobile-wide TypeScript checks.
// Use the real production notification builder and its canonical UI contract tests.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=path.resolve(__dirname,'../apps/mobile');
const ts=require(path.join(app,'node_modules/typescript'));
const cache=new Map();
function run(relative){
 const filename=path.resolve(app,relative);
 if(cache.has(filename))return cache.get(filename).exports;
 const module={exports:{}};cache.set(filename,module);
 const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 const localRequire=name=>name.startsWith('.')?run(path.relative(app,path.resolve(path.dirname(filename),name+(path.extname(name)?'':'.ts')))):require(name);
 vm.runInNewContext(js,{exports:module.exports,module,require:localRequire,console,process},{filename});
 return module.exports;
}
process.chdir(app);
run('tests/navigation-notifications-v51.ts');
run('tests/actionable-claims-modal-ui-contract.ts');
console.log('PASS: Event reward navigation notifications disabled; Event rewards remain claimable');
