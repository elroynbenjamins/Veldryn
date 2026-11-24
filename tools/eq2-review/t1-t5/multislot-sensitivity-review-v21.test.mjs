import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeSolo,summarizeParty} from './multislot-sensitivity-review-v21.mjs';
import {combatExperimentPlan} from './set-trait-cp-review-v17.mjs';
import {contract} from './normalized-effect-review-v18.mjs';
const bosses={BOSS_EXP_ROOT:['asterfall',1,25],BOSS_EXP_BELL:['asterfall',2,25],BOSS_EXP_SOLAR:['sunscar',3,40],BOSS_EXP_SPHINX:['sunscar',3,40],BOSS_EXP_BELLBEAST:['frostmarch',4,60],BOSS_EXP_CANTOR:['frostmarch',4,60]};
const sets={asterfall:['rootbound_t2','heartward','thornstrider','lifebloom'],sunscar:['observatory_t4','helioguard','sphinxclaw','mirageveil'],frostmarch:['shiverlake_t5','rimevanguard','cantorshard','frosthym']};
const role={IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage',DAWNKEEPER:'support',STONECALLER:'support'};
const effect=(region,r)=>{const s=sets[region],stat=contract.sets.find(x=>x.setId==='eq2_dungeon_'+s[0]+'_'+s[{tank:1,damage:2,support:3}[r]]&&x.pieces===2).stats[0];return {channel:stat.channel,pct:stat.value};};
const coverage=(id,tier)=>({equippedCopies:1,missing:['helmet','chest','legs','gloves','boots','cape','amulet','ring'],downgraded:0,tiers:[{slot:'weapon',tier,pieceId:'QA_SYNTHETIC',instanceId:id}]});
const baseline={victory:false,reason:'timeout',durationMs:120000,damage:10,healing:0,damageTaken:5,hp:95,maxHp:100,interrupts:0,enemyHp:90,enemyMaxHp:100};
const candidate={...baseline,damage:20,enemyHp:80};
const deny={actualOwnedCandidateCopies:false,conditionalEffectsApplied:false,releaseApproved:false};
test('synthetic shape: all 648 solo rows, coverage reported and invalid source rejected',()=>{
 const rows=combatExperimentPlan().filter(x=>x.gearVariant==='baseline').flatMap(x=>{
  const [region,targetTier,targetLevel]=bosses[x.bossId];
  return ['accessible','pressure'].map(band=>({bossId:x.bossId,classId:x.classId,specIndex:x.specializationIndex,strategy:x.strategy,band,region,targetTier,targetLevel,
   ...coverage([x.classId,x.specializationIndex,targetTier,targetLevel].join(':'),targetTier),...effect(region,role[x.classId]),baseline,candidate}));
 });
 const r={scope:'QA_ORIGINAL_FORGE_MULTISLOT_FIXED_DIFFICULTY',rows,...deny};
 const s=summarizeSolo(r);assert.equal(s.pairs,648);assert.equal(s.meanDamageDelta,10);assert.equal(s.uniqueLoadouts,72);assert.equal(s.missingSlots,576);assert.equal(s.bothWinMeanTimeDeltaMs,null);
 assert.throws(()=>summarizeSolo({...r,rows:[{...rows[0],pct:999},...rows.slice(1)]}));
 assert.throws(()=>summarizeSolo({...r,conditionalEffectsApplied:true}));
});
test('synthetic shape: 108 party pairs with one fixed baseline per group',()=>{
 const teams=[['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'],['BASTION','HEXWEAVER','KNIFE_DANCER','STONECALLER'],['DREADGUARD','RAVAGER','HEXWEAVER','DAWNKEEPER']];
 const rows=[];
 const b={...baseline,surviving:4,players:teams[0].map((c,i)=>({id:String(i),role:role[c],hp:95,maxHp:100,damage:10,healing:0,damageTaken:5,interrupts:0}))};
 for(const [region,[targetTier,targetLevel]] of Object.entries({asterfall:[2,25],sunscar:[3,40],frostmarch:[4,60]}))for(const [teamIndex,classes] of teams.entries())for(const specIndex of [0,1])for(const band of ['accessible','pressure'])for(const r of ['tank','damage','support']){
  rows.push({region,targetTier,targetLevel,teamIndex,classes,specIndex,band,role:r,selectedClass:classes.find(c=>role[c]===r),...effect(region,r),
   sourceCoverage:classes.map(c=>coverage(c,targetTier)),baseline:b,candidate:{...b,damage:20,enemyHp:80}});
 }
 const r={scope:'QA_ORIGINAL_FORGE_PARTY_CONTROLLED_PRESSURE',rows,...deny};const s=summarizeParty(r);assert.equal(s.pairs,108);assert.equal(s.uniqueBaselineEncounters,36);assert.equal(s.byRole.support.pairs,36);
 assert.throws(()=>summarizeParty({...r,rows:[{...rows[0],sourceCoverage:Array(4).fill(rows[0].sourceCoverage[0])},...rows.slice(1)]}));
});
