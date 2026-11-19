/**
 * Runtime behavioral tests for the *pure mobile presentation projection*.
 * Uses already-installed TypeScript to load isolated content modules; no
 * React Native, Expo, game state or network access required.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const NodeModule=require('node:module');
const root=path.resolve(__dirname,'../src/content');
const modules={};
function load(name){
 if(modules[name])return modules[name];
 const file=path.join(root,name+'.ts');
 const source=fs.readFileSync(file,'utf8');
 const js=ts.transpileModule(source,{
  fileName:file,
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
 }).outputText;
 const mod=new NodeModule(file,module);
 mod.filename=file;
 mod.paths=NodeModule._nodeModulePaths(path.dirname(file));
 mod.require=(id)=>{
  if(id==='./boss-v2-preview-locales')return load('boss-v2-preview-locales');
  throw Error('Unapproved runtime import: '+id);
 };
 // Compile only the two checked-in fixed-id content modules, not app routes.
 mod._compile(js,file);
 modules[name]=mod.exports;
 return mod.exports;
}
const locale=load('boss-v2-preview-locales');
const replay=load('boss-v2-replay-preview');
assert.equal(locale.BOSS_V2_PREVIEW_PUBLIC_ENABLED,false);
assert.equal(locale.BOSS_V2_CAST_IDS.length,7);
for(const lang of ['en','es','de','ru','tr']){
 assert.equal(locale.bossV2Locale(lang+'-XX'),lang);
 assert.ok(locale.bossV2Words(lang).legacyMoves,
  'Existing boss mechanics must be explained in each language');
 for(const id of locale.BOSS_V2_CAST_IDS){
  const copy=locale.bossV2LocalizedCast(id,lang);
  assert.ok(copy&&copy.name&&copy.tell&&copy.counter&&copy.fallback);
 }
}
assert.equal(locale.bossV2Locale('fr-FR'),'en');
assert.equal(locale.bossV2LocalizedCast('UNTRUSTED_ATTACK','en'),null);

const cast=(id,ms,interruptible)=>({
 abilityId:id,castMs:ms,interruptible,
 name:'untrusted arbitrary title',tell:'untrusted arbitrary tell',
 counter:'untrusted counter',fallback:'untrusted fallback',
});
const preview={
 bossId:'BOSS_EXP_SOLAR',bossName:'The Buried Heliarch',
 casts:[cast('SOLAR_V2_SUNFALL',1800,true)],
 phases:[
  {phaseId:'SOLAR_V2_PHASE_70',name:'Solar Ascendance',hpPercent:70},
  {phaseId:'SOLAR_V2_PHASE_35',name:'Cracked Corona',hpPercent:35},
 ],
};
const start=[
 {atMs:0,type:'combat_start'},
 {atMs:1000,type:'cast_start',actorId:preview.bossId,
  abilityId:'SOLAR_V2_SUNFALL'},
];
assert.deepEqual(replay.projectBossV2Replay(preview,start,1500),{
 currentCast:{abilityId:'SOLAR_V2_SUNFALL',durationMs:1800,remainingMs:1300},
 latestPhase:null,currentAtMs:1500,
});
assert.equal(replay.projectBossV2Replay(preview,start,1500).currentCast?.remainingMs,1300);
assert.equal(replay.projectBossV2Replay(preview,start,1000).currentCast?.remainingMs,1800,
 'Server replay cursor controls time, not the device clock');
const completed=[...start,
 {atMs:2800,type:'cast_complete',actorId:preview.bossId,
  abilityId:'SOLAR_V2_SUNFALL'},
 {atMs:3100,type:'phase',actorId:preview.bossId,
  abilityId:'SOLAR_V2_PHASE_70'},
];
assert.deepEqual(replay.projectBossV2Replay(preview,completed,3200),{
 currentCast:null,latestPhase:{phaseId:'SOLAR_V2_PHASE_70',hpPercent:70},
 currentAtMs:3200,
});
const interrupted=[...start,{atMs:1450,type:'interrupt',actorId:'HERO',
 targetId:preview.bossId,interruptedAbilityId:'SOLAR_V2_SUNFALL'}];
assert.equal(replay.projectBossV2Replay(preview,interrupted,1600).currentCast,null);
assert.equal(replay.projectBossV2Replay(preview,[...start,
 {atMs:2000,type:'death',actorId:preview.bossId}],2300).currentCast,null);
const invalid=[
 [{...preview,bossId:'UNKNOWN_BOSS'},start],
 [{...preview,bossId:'__proto__'},start],
 [{...preview,bossId:'constructor'},start],
 [{...preview,casts:[null]},start],
 [{...preview,phases:[null,preview.phases[1]]},start],
 [{...preview,casts:[cast('SOLAR_V2_SUNFALL',1200,true)]},start],
 [{...preview,casts:[cast('SOLAR_V2_SUNFALL',1800,false)]},start],
 [{...preview,casts:[cast('BELLBEAST_V2_SHATTER',2000,true)]},start],
 [{...preview,phases:[preview.phases[0],{...preview.phases[1],hpPercent:30}]},start],
 [preview,[...start,{atMs:500,type:'phase'}]],
];
for(const [suspect,events] of invalid)
 assert.equal(replay.projectBossV2Replay(suspect,events,2000),null);
assert.equal(replay.projectBossV2Replay(preview,start,-1),null);
assert.equal(replay.projectBossV2Replay(preview,start,180001),null);
assert.equal(replay.projectBossV2Replay(preview,Array(5001).fill(start[0]),1000),null);

for(const [bossId,info] of Object.entries(replay.BOSS_V2_PRESENTATION_IDS)){
 assert.equal(info.phases.length,2,bossId);
 const known={bossId,bossName:'Trusted name',
  casts:info.casts.map(id=>({
   ...cast(id,({
    ROOT_V2_LIVING_BARK:1200,BELL_V2_SOUL_CURSE:1350,
    BELL_V2_VEIL_MIRROR:1150,SOLAR_V2_SUNFALL:1800,
    SPHINX_V2_MIRAGE:1200,BELLBEAST_V2_SHATTER:2000,
    CANTOR_V2_DISSONANCE:1500,
   })[id],[
    'SOLAR_V2_SUNFALL','BELLBEAST_V2_SHATTER','CANTOR_V2_DISSONANCE',
   ].includes(id)),
  })),
  phases:info.phases.map((id,i)=>({phaseId:id,name:id,
   hpPercent:i===0?70:35})),
 };
 assert.ok(replay.projectBossV2Replay(known,[],0),bossId);
}
console.log('PASS: six bosses, seven authored casts, five locales, replay cursor and phase projection, interrupts, spoofed profiles, stale phase, tamper rejection');
