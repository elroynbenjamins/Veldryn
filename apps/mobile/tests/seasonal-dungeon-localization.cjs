const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('../node_modules/typescript');
const root=path.resolve(__dirname,'../../..'),app=path.resolve(__dirname,'..');
function load(relative){
 const file=path.join(app,relative),source=fs.readFileSync(file,'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod._compile(compiled,file);
 return mod.exports;
}
const {SEASONAL_ROOM_TITLE_ROWS,seasonalDungeonRoomTitle}=load('src/i18n/seasonal-dungeon-copy.ts');
const {SEASONAL_BOSS_LABEL_ROWS,SEASONAL_BOSS_MOVE_ROWS,SEASONAL_BOSS_NUMBERED_ROWS,SEASONAL_BOSS_SUMMARY_ROWS,seasonalBossDisplayName,seasonalBossDisplaySummary}=load('src/i18n/seasonal-boss-copy.ts');
const locales=['en','de','es','nl','it','fr','ru','tr'];
const source=fs.readFileSync(path.join(root,'backend/src/server/expeditions/content/event-expeditions.ts'),'utf8');
const specials=[...source.matchAll(/special\(\d+,\d+,'[^']+','([^']+)',(["'])(.*?)\2,/g)].map(match=>({id:match[1],title:match[3]}));
assert.equal(specials.length,62,'Review the translated seasonal title set whenever server event routes change');
assert.equal(new Set(specials.map(item=>item.id)).size,62,'Seasonal node content IDs must be unique');
assert.equal(new Set(specials.map(item=>item.title)).size,62,'Each seasonal route title must be unique for source-only lookup');
assert.deepEqual(Object.keys(SEASONAL_ROOM_TITLE_ROWS).sort(),specials.map(item=>item.title).sort(),'Exact match to all 62 authoritative titles');
for(const item of specials){
 const rows=SEASONAL_ROOM_TITLE_ROWS[item.title];
 assert.equal(rows.length,7,'Missing room languages for '+item.id);
 assert.equal(seasonalDungeonRoomTitle('en',item.title),item.title);
 for(const [index,language] of locales.slice(1).entries()){
  assert.ok(rows[index].trim(),language+' missing route translation: '+item.title);
  assert.equal(seasonalDungeonRoomTitle(language,item.title),rows[index]);
 }
}
assert.equal(seasonalDungeonRoomTitle('ru','A new or changed server title'),'A new or changed server title');
assert.equal(seasonalDungeonRoomTitle('tr','Player-written guild notice'),'Player-written guild notice');

const bossSource=fs.readFileSync(path.join(root,'backend/src/server/expeditions/event-boss-mechanics.ts'),'utf8');
for(const [group,rows] of Object.entries({label:SEASONAL_BOSS_LABEL_ROWS,numbered:SEASONAL_BOSS_NUMBERED_ROWS,move:SEASONAL_BOSS_MOVE_ROWS,summary:SEASONAL_BOSS_SUMMARY_ROWS})){
 for(const [english,values] of Object.entries(rows)){
  assert.ok(bossSource.includes(english),'Reviewed seasonal boss '+group+' removed from backend: '+english);
  assert.equal(values.length,7,'Missing boss locales: '+english);
  for(const [index,language] of locales.slice(1).entries()){
   assert.ok(values[index].trim(),'Blank '+language+' boss '+group+' translation '+english);
   if(group==='label'||group==='move')assert.equal(seasonalBossDisplayName(language,english),values[index]);
   if(group==='numbered')for(const n of [1,2,3])assert.equal(seasonalBossDisplayName(language,english+' '+n),values[index]+' '+n);
   if(group==='summary')assert.equal(seasonalBossDisplaySummary(language,english),values[index]);
  }
  if(group==='label'||group==='move')assert.equal(seasonalBossDisplayName('en',english),english);
  if(group==='summary')assert.equal(seasonalBossDisplaySummary('en',english),english);
 }
}
assert.equal(Object.keys(SEASONAL_BOSS_LABEL_ROWS).length,9);
assert.equal(Object.keys(SEASONAL_BOSS_NUMBERED_ROWS).length,7);
assert.equal(Object.keys(SEASONAL_BOSS_MOVE_ROWS).length,6);
assert.equal(Object.keys(SEASONAL_BOSS_SUMMARY_ROWS).length,10);
assert.equal(seasonalBossDisplayName('nl','Chronicle Fracture 4'),'Chronicle Fracture 4','Unknown phases must not be guessed');
assert.equal(seasonalBossDisplayName('ru','A new seasonal move'),'A new seasonal move');
assert.equal(seasonalBossDisplaySummary('tr','2 new open rifts will erupt.'),'2 new open rifts will erupt.','Unreviewed dynamic mechanic text remains original');
const choices=fs.readFileSync(path.join(app,'src/components/coop/DungeonRouteChoices.tsx'),'utf8');
assert.ok(choices.includes('st(room.name):seasonalDungeonRoomTitle(language,option.title)'),'Only server-authored seasonal titles are localized; generic room labels remain in Social catalog');
assert.ok(choices.includes('onChoose?.(option.nodeId)'),'Route votes and server node identifiers must remain unchanged');
const panel=fs.readFileSync(path.join(app,'src/components/coop/SeasonalBossTelegraphPanel.tsx'),'utf8');
for(const input of ['mechanic.label','priorityCast.label','priorityPhase.label','phase.label','ability.label'])
 assert.ok(panel.includes('seasonalBossDisplayName(language,'+input+')'),'Missing localized seasonal boss display for '+input);
assert.ok(panel.includes('seasonalBossDisplaySummary(language,mechanic.summary)'),'Verified seasonal summary is displayed without modifying server data');
assert.ok(panel.includes('recap.phasesTriggered.map(name=>seasonalBossDisplayName(language,name))'),'Phase recap must translate recognized names');
assert.ok(panel.includes('recap.abilitiesCast.map(name=>seasonalBossDisplayName(language,name))'),'Cast recap must translate recognized names');
assert.ok(panel.includes('ability.castMs')&&panel.includes('ability.cooldownMs')&&panel.includes('phase.hpPct'),'Boss cast timings and HP thresholds must remain authoritative');
console.log('PASS 62 seasonal room titles x 7 locales, 9 boss profiles, 7 indexed phases, 6 boss casts and 10 fixed boss summaries; verified server source + strict fallbacks');
