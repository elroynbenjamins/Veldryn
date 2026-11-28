const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'../../..');

// Load the actual server factories and mobile portrait resolver without a
// native runtime. Asset requires return their verified absolute file path;
// all executable TS imports are resolved from source, never stale dist files.
const modules=new Map();
function load(file){
 file=path.resolve(file);
 if(modules.has(file))return modules.get(file).exports;
 const mod={exports:{}};
 modules.set(file,mod);
 const source=fs.readFileSync(file,'utf8');
 const js=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const localRequire=request=>{
  assert(request.startsWith('.'),'Unexpected runtime import: '+request+' in '+file);
  const target=path.resolve(path.dirname(file),request);
  if(/\.(webp|png|jpg|jpeg)$/.test(target)){
   assert(fs.statSync(target).isFile(),'Missing bundled art: '+target);
   return target;
  }
  return load(target.endsWith('.ts')?target:target+'.ts');
 };
 new Function('require','module','exports',js)(localRequire,mod,mod.exports);
 return mod.exports;
}
const {EXPEDITION_ENCOUNTERS}=load(path.join(root,'backend/src/server/combat/content/expedition-encounters.ts'));
const {pveEncounterPreview}=load(path.join(root,'backend/src/server/combat/pve-encounter-identity.ts'));
const {dungeonEnemyPortraitSource,dungeonEnemyRegionalPortraitCell}=load(path.join(root,'apps/mobile/src/theme/dungeon-enemy-art.ts'));
const resolves=name=>Boolean(dungeonEnemyPortraitSource(name)||dungeonEnemyRegionalPortraitCell(name));
const missing=new Set(),names=new Set(),roles=new Set();
for(const [id,factory] of Object.entries(EXPEDITION_ENCOUNTERS)){
 const enemies=factory();
 for(const enemy of enemies){
  names.add(enemy.name);
  for(const name of [enemy.name,enemy.name+' Echo',enemy.name.toUpperCase()]){
   if(!resolves(name))missing.add(id+': '+name);
  }
 }
 const preview=pveEncounterPreview(enemies);
 for(const enemy of preview?.enemies??[])if(!resolves(enemy.name))missing.add(id+' preview: '+enemy.name);
 for(const role of preview?.archetypes??[]){
  roles.add(role.label);
  if(!resolves(role.label))missing.add(id+' legacy preview: '+role.label);
 }
}
assert(Object.keys(EXPEDITION_ENCOUNTERS).length>=50,'Expected regional and seasonal encounter factories');
assert(names.has('Bramble Reaver'),'Rootbound assassin encounter must be included');
assert.equal(roles.size,8,'All eight legacy preview archetypes must be covered');
assert.deepEqual([...missing],[],'Dungeon enemy portrait missing');
assert.match(dungeonEnemyPortraitSource('Bramble Reaver'),/gloamblade-raider\.webp$/);
assert.equal(dungeonEnemyPortraitSource('Bramble Reaver Echo'),dungeonEnemyPortraitSource('Bramble Reaver'));
assert.equal(dungeonEnemyPortraitSource('Assassin'),dungeonEnemyPortraitSource('Bramble Reaver'));
assert.equal(resolves('Unknown unauthored enemy'),false,'Unknown names retain a diagnostic fallback rather than hiding omissions');
console.log('PASS dungeon portrait coverage: '+Object.keys(EXPEDITION_ENCOUNTERS).length+' encounter factories, '+names.size+' named enemies, '+roles.size+' preview roles');
