const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('../node_modules/typescript');
// Load dependent authored localization modules through the same TypeScript transpiler.
require.extensions['.ts']=(module,filename)=>module._compile(
 ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText,filename
);
const root=path.resolve(__dirname,'../../..'),app=path.resolve(__dirname,'..');
function load(relative){
 const file=path.join(app,relative),source=fs.readFileSync(file,'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod._compile(compiled,file);
 return mod.exports;
}
const {DUNGEON_ARCHETYPE_COPY:archetypes,DUNGEON_MECHANIC_COPY:mechanics,localizedDungeonEncounterPreview}=load('src/i18n/dungeon-encounter-preview.ts');
const {DUNGEON_ROOM_PRESENTATION}=load('src/components/coop/dungeon-room-presentation.ts');
const {EARLY_LOCALE_ROWS,earlyLocaleText}=load('src/i18n/early-locales.ts');
const locales=['en','de','es','nl','it','fr','ru','tr'];
const original=fs.readFileSync(path.join(root,'backend/src/server/combat/pve-encounter-identity.ts'),'utf8');
const archetypeSource=original.slice(original.indexOf('const ARCHETYPE_LABEL:'),original.indexOf('const MECHANICS:'));
const mechanicSource=original.slice(original.indexOf('const MECHANICS:'),original.indexOf('const archetypeTag='));
const knownArchetypes=Object.entries(archetypes),knownMechanics=Object.entries(mechanics);
assert.equal(knownArchetypes.length,8,'All eight server archetypes must have translations');
assert.equal(knownMechanics.length,11,'All eleven counterplay mechanics must have translations');
for(const [id,rows] of knownArchetypes){
 assert.equal(rows.length,8,'Archetype missing locale: '+id);
 assert.ok(archetypeSource.includes(id+":'"+rows[0]+"'"),'Archetype changed on server: '+id);
 for(const [index,language] of locales.entries())assert.ok(rows[index].trim(),language+' archetype empty: '+id);
}
for(const [id,rows] of knownMechanics){
 assert.equal(rows.label.length,8);assert.equal(rows.description.length,8);
 assert.ok(mechanicSource.includes(id+":{id:'"+id+"',label:'"+rows.label[0]+"',description:'"+rows.description[0]+"'"),'Mechanic changed on server: '+id);
 for(const [index,language] of locales.entries()){
  assert.ok(rows.label[index].trim(),language+' mechanic label empty: '+id);
  assert.ok(rows.description[index].trim(),language+' mechanic description empty: '+id);
 }
}
const base={
 archetypes:[{id:'assassin',label:'Assassin'},{id:'guardian',label:'Guardian'}],
 mechanics:[
  {id:'focus',label:'Focus',description:'Can pressure a non-tank party member.'},
  {id:'barrier',label:'Barrier',description:'Can create a protective barrier.'},
  {id:'enrage',label:'Enrage',description:'Temporarily increases offensive pressure.'},
 ],
 summary:'Assassin · Guardian · Focus · Barrier',
};
for(const [index,language] of locales.entries()){
 const output=localizedDungeonEncounterPreview(language,base);
 assert.equal(output.summary,[
  archetypes.assassin[index],archetypes.guardian[index],mechanics.focus.label[index],mechanics.barrier.label[index]
 ].join(' · '),language+' summary must preserve server ordering and display max-two mechanics');
 assert.equal(output.mechanics[0].description,mechanics.focus.description[index],language+' counterplay must translate');
 assert.equal(output.mechanics[2].description,mechanics.enrage.description[index],language+' hidden mechanic explanation must translate');
 assert.equal(output.archetypes[0].id,'assassin','Identifiers must not change');
 assert.equal(output.mechanics[0].id,'focus','Mechanic identifiers must not change');
}
assert.equal(localizedDungeonEncounterPreview('en',base),base,'English preview must retain original object');
const wrongSummary={...base,summary:'Server-modified strategic warning'};
assert.equal(localizedDungeonEncounterPreview('ru',wrongSummary),wrongSummary,'Do not overwrite server-provided new summary');
const wrongMechanic={...base,mechanics:[{...base.mechanics[0],description:'Now applies a new debuff.'},...base.mechanics.slice(1)]};
assert.equal(localizedDungeonEncounterPreview('tr',wrongMechanic),wrongMechanic,'Do not conceal changed server mechanics');
const unknown={...base,archetypes:[{id:'new_archetype',label:'New threat'}]};
assert.equal(localizedDungeonEncounterPreview('nl',unknown),unknown,'Unknown enemies stay unchanged');
const empty={archetypes:[],mechanics:[],summary:''};
assert.equal(localizedDungeonEncounterPreview('fr',empty).summary,'','Empty intel remains empty');
assert.equal(Object.keys(DUNGEON_ROOM_PRESENTATION).length,12,'All twelve existing dungeon room kinds stay available');
for(const entry of Object.values(DUNGEON_ROOM_PRESENTATION)){
 for(const key of [entry.name,entry.description]){
  assert.ok(Object.prototype.hasOwnProperty.call(EARLY_LOCALE_ROWS,key),'Missing RU/TR room copy: '+key);
  for(const language of ['ru','tr'])assert.ok(earlyLocaleText(language,key),'Missing '+language+' room copy: '+key);
 }
}
for(const key of ["Face the final encounter.","Restore your party's health.","Gain resources, but take a curse.","Earn resources for your run."]){
 assert.ok(earlyLocaleText('ru',key)&&earlyLocaleText('tr',key),'Four missing room descriptions now authored: '+key);
}
assert.equal(earlyLocaleText('ru','Unknown player message'),undefined,'Unknown text is never translated');
const route=fs.readFileSync(path.join(app,'src/components/coop/DungeonRouteChoices.tsx'),'utf8');
const resolution=fs.readFileSync(path.join(app,'src/components/coop/DungeonRoomResolution.tsx'),'utf8');
assert.ok(route.includes('localizedDungeonEncounterPreview(language,option.encounterPreview).summary'),'Route previews must use checked translated intel');
assert.ok(route.includes("st(room.name):seasonalDungeonRoomTitle(language,option.title)"),'Seasonal authored room titles must use a verified translation with safe English fallback');
assert.ok(route.includes('option.risk')&&route.includes('option.reward'),'Authoritative risk/reward projections must not be invented');
assert.ok(resolution.includes('st(room.description)'),'Resolving screen uses existing translated room descriptions');
console.log('PASS 12 Dungeon room types (RU/TR complete), 8 encounter archetypes, 11 mechanics, 210 locale entries, exact server-contract parity and fallback');
