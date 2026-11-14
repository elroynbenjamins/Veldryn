const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=function(mod,filename){
 const out=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 mod._compile(out,filename);
};
require.extensions['.tsx']=require.extensions['.ts'];
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {playbackCueLabel}=require('../src/core/dungeon-combat-playback.ts');
const {dungeonDynamicUiRows,dungeonDynamicUiText,localizedDungeonPlaybackCue,localizedDungeonCueType}=require('../src/i18n/dungeon-dynamic-ui.ts');
const languages=['de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],['en',...languages]);
assert.equal(Object.keys(dungeonDynamicUiRows).length,70);
const tokens=x=>[...x.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
for(const [en,translations] of Object.entries(dungeonDynamicUiRows)){
 assert.equal(translations.length,7,'language parity '+en);
 assert.equal(dungeonDynamicUiText('en',en),en);
 const params=Object.fromEntries(tokens(en).map(name=>[name,'VALUE_$&_'+name]));
 for(const [i,language] of languages.entries()){
  assert.ok(translations[i]?.trim(),language+' missing '+en);
  assert.deepEqual(tokens(translations[i]),tokens(en),language+' placeholder mismatch '+en);
  assert.equal(dungeonDynamicUiText(language,en),translations[i],language+' row mismatch '+en);
  for(const name of tokens(en))assert.ok(dungeonDynamicUiText(language,en,params).includes('VALUE_$&_'+name),language+' lost '+name);
 }
}
const cues=[
 {atMs:0,type:'action',actorName:'Kestrel $&',targetName:'Rootbound Sentinel',actionKind:'damage',amount:117,abilityName:'Basic Attack',outcome:'critical',absorbed:12,gemProc:true},
 {atMs:500,type:'action',actorName:'Ariadne',targetName:'Kestrel $&',actionKind:'heal',amount:83},
 {atMs:700,type:'action',actorName:'Ariadne',targetName:'Kestrel',actionKind:'shield',amount:61},
 {atMs:800,type:'action',actorName:'Ariadne',targetName:'Rootbound Sentinel',outcome:'miss',gemProc:true},
 {atMs:900,type:'action',actorName:'Ariadne',targetName:'Rootbound Sentinel',abilityName:'Untested custom ability',amount:20},
 {atMs:1000,type:'phase',actorName:'Rootbound Colossus',abilityName:'Unknown new boss phase'},
 {atMs:1100,type:'phase',actorName:'Rootbound Colossus'},
 {atMs:1200,type:'cast',actorName:'Rootbound Colossus',abilityName:'Unknown new boss cast',durationMs:6000},
 {atMs:1300,type:'cast',actorName:'Rootbound Colossus'},
 {atMs:1400,type:'interrupt',actorName:'Kestrel $&',abilityName:'Guard Break'},
 {atMs:1500,type:'interrupt',actorName:'Ariadne'},
 {atMs:1600,type:'assist',actorName:'A companion'},
 {atMs:1700,type:'assist',actorName:'A companion',abilityName:'Unexpected assist ability'},
 {atMs:1800,type:'down',targetName:'Kestrel $&'},
 {atMs:1900,type:'victory'},
 {atMs:2000,type:'wipe'},
 {atMs:2100,type:'timeout'},
];
for(const cue of cues){
 assert.equal(localizedDungeonPlaybackCue('en',cue),playbackCueLabel(cue),'English combat replay regression '+cue.type);
 for(const language of languages){
  const text=localizedDungeonPlaybackCue(language,cue);
  assert.ok(text.length>0,language+' empty '+cue.type);
  if(cue.actorName==='Kestrel $&'||cue.targetName==='Kestrel $&')assert.ok(text.includes('Kestrel $&'),language+' changed player name');
  if(cue.abilityName?.startsWith('Unknown'))assert.ok(text.includes(cue.abilityName),language+' changed unknown ability');
  if(cue.abilityName==='Untested custom ability')assert.ok(text.includes(cue.abilityName),language+' changed custom ability');
  if(cue.amount!==undefined)assert.ok(text.includes(String(cue.amount)),language+' changed amount');
 }
}
assert.equal(localizedDungeonPlaybackCue('nl',{atMs:0,type:'action',actorName:'Mira',targetName:'Ari',actionKind:'heal',amount:15}),'Mira geneest Ari · 15');
assert.equal(localizedDungeonPlaybackCue('nl',{atMs:0,type:'action',actorName:'Mira',targetName:'Ari',actionKind:'heal',amount:15,abilityName:'Healing Light'}),'Mira geneest Ari met Healing Light · 15');
assert.equal(localizedDungeonPlaybackCue('de',{atMs:0,type:'action',actorName:'Mira',targetName:'Ari',actionKind:'shield',amount:25,abilityName:'Stone Ward'}),'Mira schützt Ari mit Stone Ward · 25');
assert.equal(dungeonDynamicUiText('ru','COMPANION SKILL'),'УМЕНИЕ СПУТНИКА');
assert.equal(dungeonDynamicUiText('tr','CLASS ABILITY'),'SINIF YETENEĞİ');

assert.equal(localizedDungeonPlaybackCue('ru',{atMs:0,type:'cast',actorName:'Boss $&',abilityName:'Unknown Storm'}),'Boss $& начинает Unknown Storm');
assert.equal(localizedDungeonPlaybackCue('tr',{atMs:0,type:'down',targetName:'Mira'}),'Mira yere düştü');
assert.equal(localizedDungeonPlaybackCue('de',{atMs:0,type:'action',actorName:'Mira',targetName:'Ari',outcome:'miss'}),'Mira verfehlt Ari · VERFEHLT');
assert.equal(dungeonDynamicUiText('nl','DMG {amount}',{amount:'1.2k'}),'SCH 1.2k');
assert.equal(dungeonDynamicUiText('ru','INT {count}',{count:3}),'ПРЕР 3');
assert.equal(dungeonDynamicUiText('tr','TAKEN {amount}',{amount:71}),'ALIN 71');
assert.equal(dungeonDynamicUiText('en','HEAL {amount}',{amount:'5k'}),'HEAL 5k');
assert.ok(dungeonDynamicUiText('de','Boss ability').includes('Boss'));
assert.equal(localizedDungeonCueType('nl','cast'),'SPREUK');
assert.equal(localizedDungeonCueType('ru',undefined),'В ПРЯМОМ ЭФИРЕ');
const root=path.resolve(__dirname,'../src/components/coop');
const combat=fs.readFileSync(path.join(root,'DungeonCombatStage.tsx'),'utf8');
const routes=fs.readFileSync(path.join(root,'DungeonRouteChoices.tsx'),'utf8');
const run=fs.readFileSync(path.join(root,'CoopRunOverview.tsx'),'utf8');
for(const marker of [
 'localizedDungeonPlaybackCue(language,currentCue)', 'localizedDungeonPlaybackCue(language,cue)',
 'localizedDungeonCueType(language,currentCue?.type??(pending?undefined:replay.reason))',
 "dungeonDynamicUiText(language,'{count} combat events'",
 "dungeonDynamicUiText(language,'{count} recent'",
 'playbackAdvanceDelayMs(current,next,1)','playbackCombatantState(replay,cueIndex',
  'contributionSummary(language,slot.role,value)','roleShort(language,slot.role)',
  "dungeonDynamicUiText(language,'Boss ability')",
])assert.ok(combat.includes(marker),'Dungeon combat stage lost safety or translation: '+marker);
assert.ok(!combat.includes('playbackCueLabel(cue)'),'combat log still bypasses localizer');
for(const marker of [
 "ui('Route {title}: {risk}; {reward}. {extra}{action}'",
 "ui('{votes} of {total} votes. '", "ui('Your vote. '",
 "ui('{votes}/4 votes'", "onChoose?.(option.nodeId)",
 'localizedSeasonalDungeonRouteRisk(language,option.risk)',
 'localizedSeasonalDungeonRouteReward(language,option.reward)',
])assert.ok(routes.includes(marker),'route voting lost translation or authority: '+marker);
for(const marker of [
 "dungeonDynamicUiText(language,'Resolving room')",
 "dungeonDynamicUiText(language,'Expedition completed')",
 "dungeonDynamicUiText(language,'Expedition failed')",
 "run.phase.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase())",
 'validateCoopRunView(run)',
  "dungeonDynamicUiText(language,'A disconnected party member is being piloted",
])assert.ok(run.includes(marker),'run status missing safe localization: '+marker);
console.log('PASS: 70 Dungeon dynamic UI templates x 7 locales, combat cue replay parity, source values, route and status wiring');
