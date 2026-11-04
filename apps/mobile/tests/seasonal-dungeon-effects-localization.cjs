const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('../node_modules/typescript');
const root=path.resolve(__dirname,'../../..'),app=path.resolve(__dirname,'..');
function load(file){
 const source=fs.readFileSync(file,'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod._compile(compiled,file);
 return mod.exports;
}
const {SEASONAL_MECHANIC_ROWS,SEASONAL_OBJECTIVE_ROWS,SEASONAL_BOSS_EFFECT_TEMPLATES,SEASONAL_OBJECTIVE_EFFECT_TEMPLATES,localizedSeasonalDungeonMechanic,localizedSeasonalDungeonObjective}=load(path.join(app,'src/i18n/seasonal-dungeon-effects.ts'));
const {SEASONAL_BOSS_SUMMARY_ROWS,SEASONAL_BOSS_DYNAMIC_ROWS,seasonalBossDisplaySummary}=load(path.join(app,'src/i18n/seasonal-boss-copy.ts'));
const {eventBossMechanicProfile}=load(path.join(root,'backend/src/server/expeditions/event-boss-mechanics.ts'));
const definitionSource=fs.readFileSync(path.join(root,'backend/src/server/expeditions/content/event-expeditions.ts'),'utf8');
const bossSource=fs.readFileSync(path.join(root,'backend/src/server/expeditions/event-boss-mechanics.ts'),'utf8');
const overview=fs.readFileSync(path.join(app,'src/components/coop/CoopRunOverview.tsx'),'utf8');
const locales=['en','de','es','nl','it','fr','ru','tr'];
assert.equal(Object.keys(SEASONAL_MECHANIC_ROWS).length,8);
assert.equal(Object.keys(SEASONAL_OBJECTIVE_ROWS).length,8);
assert.equal(Object.keys(SEASONAL_BOSS_DYNAMIC_ROWS).length,8);
for(const [id,row] of Object.entries(SEASONAL_MECHANIC_ROWS)){
 assert.ok(definitionSource.includes("mechanic:{id:'"+id+"',label:'"+row.label+"',description:'"+row.description+"'"),'Backend mechanic definition drift: '+id);
 assert.equal(row.labels.length,7);assert.equal(row.descriptions.length,7);
 for(const status of ['critical','steady','strong']){
  const bossEffect=status==='critical'?'Boss attack +12% while '+row.label.toLowerCase()+' is critical.':status==='strong'?'Boss attack -8% · +7 event currency on clear.':'Reach 80+ for a boss advantage and +7 event currency.';
  const view={label:row.label,description:row.description,value:60,maxValue:100,status,bossEffect};
  assert.equal(localizedSeasonalDungeonMechanic('en',view),view);
  for(const [index,language] of locales.slice(1).entries()){
   const result=localizedSeasonalDungeonMechanic(language,view);
   assert.equal(result.label,row.labels[index]);
   assert.equal(result.description,row.descriptions[index]);
   assert.notEqual(result.bossEffect,bossEffect,'Missing '+status+' warning: '+language+' '+id);
   assert.ok(!result.bossEffect.includes('{')&&!result.bossEffect.includes('undefined'),'Unresolved boss warning placeholder');
   assert.equal(result.value,view.value);assert.equal(result.maxValue,view.maxValue);
   assert.equal(result.status,view.status);
  }
  assert.equal(localizedSeasonalDungeonMechanic('ru',{...view,bossEffect:'Backend changed warning'}).bossEffect,'Backend changed warning');
  assert.equal(localizedSeasonalDungeonMechanic('tr',{...view,description:'Backend changed mechanic'}).description,'Backend changed mechanic');
 }
}
for(const [id,row] of Object.entries(SEASONAL_OBJECTIVE_ROWS)){
 assert.ok(definitionSource.includes("objective:{id:'"+id+"',label:'"+row.label+"',description:'"+row.description+"'"),'Backend objective definition drift: '+id);
 assert.equal(row.labels.length,7);assert.equal(row.descriptions.length,7);
 const lower=row.label.toLowerCase(),count=2,maxCount=3;
 const effectText=row.effect==='boss_attack_down'?'Boss attack -8% from 2/3 '+lower+'.'
  :row.effect==='boss_hp_down'?'Boss maximum health -10% from 2/3 '+lower+'.'
  :row.effect==='boss_defense_down'?'Boss defense -8% from 2/3 '+lower+'.'
  :row.effect==='reward_bonus'?'+6 event currency if the run clears with 2/3 '+lower+'.'
  :'Surviving party members recover 16% max health before the final boss.';
 const view={label:row.label,description:row.description,count,maxCount,completed:false,effectText};
 assert.equal(localizedSeasonalDungeonObjective('en',view),view);
 for(const [index,language] of locales.slice(1).entries()){
  const result=localizedSeasonalDungeonObjective(language,view);
  assert.equal(result.label,row.labels[index]);
  assert.equal(result.description,row.descriptions[index]);
  assert.notEqual(result.effectText,effectText,'Missing translated objective effect '+id+' '+language);
  assert.ok(!result.effectText.includes('{')&&!result.effectText.includes('undefined'),'Unresolved objective effect placeholder');
  assert.equal(result.count,2);assert.equal(result.maxCount,3);assert.equal(result.completed,false);
 }
 const changed={...view,effectText:'Server rule changed'};
 assert.equal(localizedSeasonalDungeonObjective('nl',changed),changed,'Unknown effects must never be invented');
 const mismatched={...view,count:1};
 if(row.effect!=='preboss_heal')assert.equal(localizedSeasonalDungeonObjective('fr',mismatched),mismatched,'Changed counters must remain original');
}
for(const [key,templates] of Object.entries(SEASONAL_BOSS_EFFECT_TEMPLATES))assert.equal(templates.length,7,key);
for(const [key,templates] of Object.entries(SEASONAL_OBJECTIVE_EFFECT_TEMPLATES))assert.equal(templates.length,7,key);
const eventIds=[
 'EVENT_TURNING_CHRONICLE_VAULT','EVENT_HEARTBOND_VOW_GARDEN','EVENT_BLOOMWAKE_THORNHEART_GROVE',
 'EVENT_SUNCREST_SHATTERED_ISLES','EVENT_STARFALL_ASTRAL_RIFT','EVENT_VEILBREAK_GLOAM_BREACH',
 'EVENT_MERCHANT_GILDED_ROAD','EVENT_FROSTFALL_AURORA_HOLLOW',
];
let dynamicCases=0;
for(const eventId of eventIds){
 assert.ok(bossSource.includes("case '"+eventId+"'"),'Boss event source changed '+eventId);
 for(const objectiveCount of [0,1,2,3])for(const mechanicStatus of ['critical','steady','strong']){
  const profile=eventBossMechanicProfile({eventId,objectiveCount,objectiveMax:3,mechanicStatus});
  const staticSummary=Object.prototype.hasOwnProperty.call(SEASONAL_BOSS_SUMMARY_ROWS,profile.summary);
  if(!staticSummary)dynamicCases++;
  for(const language of locales){
   const translated=seasonalBossDisplaySummary(language,profile.summary);
   if(language==='en')assert.equal(translated,profile.summary);
   else {
    assert.notEqual(translated,profile.summary,'Untranslated '+eventId+' '+objectiveCount+' '+mechanicStatus+' '+language);
    assert.ok(!translated.includes('{')&&!translated.includes('undefined'),'Unresolved dynamic warning placeholder');
    if(dynamicCases>0)assert.ok(translated.length>12,'Boss warning unexpectedly short');
   }
  }
 }
}
assert.ok(dynamicCases>=45,'Expected wide dynamic boss variant coverage');
for(const english of ['4 unsealed fractures will erupt during The Last Hour.','1 unsealed fractures will erupt during The Last Hour.','Backend-authoritative new cast hazard.','2 unlit hearths allow extra Deep Freeze phases. Lit hearths reduce Aurora Shatter by 12%.'])
 for(const language of locales.slice(1))assert.equal(seasonalBossDisplaySummary(language,english),english,'Unknown or changed warnings must pass through');
for(const text of [
 'localizedSeasonalDungeonMechanic(language,run.mechanic)',
 'localizedSeasonalDungeonObjective(language,run.objective)',
 'localizedMechanic?.label','localizedMechanic?.description','localizedMechanic?.bossEffect',
 'localizedObjective?.label','localizedObjective?.description','localizedObjective?.effectText',
])assert.ok(overview.includes(text),'Overview does not render translated effect: '+text);
console.log('PASS 8 seasonal mechanics + 8 objectives x 7 locales; 3 boss-effect and 5 objective-effect formulas; '+dynamicCases+' server-generated boss cases x 7 locales, strict fallback and UI contract');
