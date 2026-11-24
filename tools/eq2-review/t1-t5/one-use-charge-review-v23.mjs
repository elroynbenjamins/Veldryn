import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {contract} from './normalized-effect-review-v18.mjs';
const follow='eq2_t5_avalanche:4',talons='eq2_combo_t5_glacier_talons:2',thorn='eq2_dungeon_rootbound_t2_thornstrider:4';
const specs={
 [follow]:{trigger:'direct_physical_ability_hit',consume:'basic_direct_weapon_hit',pct:6,window:6,cd:16},
 [talons]:{trigger:'direct_physical_ability_hit',consume:'basic_direct_weapon_hit',pct:6,window:5,cd:14},
 [thorn]:{trigger:'consecutive_direct_ability_hits',consume:'direct_class_ability_hit',pct:6,window:6,cd:18,count:2,sameTarget:true}
};
const fail=x=>{throw Error('eq2_v23_'+x);};
export function sourceAudit(){
 for(const [id,s] of Object.entries(specs)){
  const [setId,pieces]=id.split(':');const x=contract.sets.find(x=>x.setId===setId&&x.pieces===Number(pieces));
  if(!x||x.trigger!==s.trigger||x.consumeOn!==s.consume||x.windowSeconds!==s.window||x.internalCooldownSeconds!==s.cd||
     x.outputs.length!==1||x.outputs[0].channel!=='direct_damage_bonus'||x.outputs[0].value!==s.pct||
     (s.count!==undefined&&(x.count!==s.count||x.sameTarget!==true)))fail('source_mismatch');
 }
 return {sourceIds:3,distinctMechanics:3,reviewOnly:true,releaseApproved:false};
}
const regions={BOSS_EXP_ROOT:'asterfall',BOSS_EXP_BELL:'asterfall',BOSS_EXP_BELLBEAST:'frostmarch',BOSS_EXP_CANTOR:'frostmarch'};
const metrics=x=>x&&typeof x.victory==='boolean'&&['victory','wipe','timeout'].includes(x.reason)&&x.victory===(x.reason==='victory')&&
 ['durationMs','damage','healing','damageTaken','hp','maxHp','enemyHp','enemyMaxHp'].every(k=>Number.isFinite(x[k])&&x[k]>=0)&&x.durationMs<=120000&&x.hp<=x.maxHp&&x.enemyHp<=x.enemyMaxHp;
const mean=xs=>xs.length?Math.round(xs.reduce((n,x)=>n+x,0)/xs.length*10000)/10000:null;
export function summarize(report){
 sourceAudit();if(report.scope!=='QA_ORIGINAL_FORGE_ONE_USE_CHARGE_COUNTERFACTUAL'||report.actualOwnedCandidateCopies!==false||report.releaseApproved!==false||report.rows?.length!==96)fail('scope');
 const keys=new Set(),baselines=new Map();
 for(const r of report.rows){
  const region=regions[r.bossId],variants=region==='asterfall'?[[thorn]]:[[follow],[talons],[follow,talons]];
  if(!region||r.region!==region||r.classId!=='RAVAGER'||![0,1].includes(r.specIndex)||!['generic','targeted','alternative'].includes(r.strategy)||
     !['accessible','pressure'].includes(r.band)||!variants.some(v=>JSON.stringify(v)===JSON.stringify(r.ids))||!metrics(r.baseline)||!metrics(r.candidate)||
     !Number.isInteger(r.equippedCopies)||r.equippedCopies<1||r.equippedCopies>10||r.perId?.length!==r.ids.length||
     !Number.isFinite(r.extraHpDamage)||r.extraHpDamage<0)fail('row');
  for(let i=0;i<r.ids.length;i++){const x=r.perId[i];if(x.id!==r.ids[i]||!Number.isSafeInteger(x.earned)||!Number.isSafeInteger(x.consumed)||x.consumed<0||x.earned<x.consumed)fail('charge_receipt');}
  const group=[r.bossId,r.specIndex,r.strategy,r.band].join(':'),key=group+':'+r.ids.join('+');
  if(keys.has(key))fail('duplicate');keys.add(key);
  const old=baselines.get(group);if(old&&JSON.stringify(old)!==JSON.stringify(r.baseline))fail('baseline_changed');
  baselines.set(group,r.baseline);
  if(r.baseline.enemyMaxHp!==r.candidate.enemyMaxHp)fail('enemy_changed');
  if(r.perId.every(x=>x.consumed===0)&&(r.extraHpDamage!==0||JSON.stringify(r.baseline)!==JSON.stringify(r.candidate)))fail('unconsumed_effect_changed_combat');
 }
 if(baselines.size!==48)fail('baseline_count');
 const stats=rows=>({pairs:rows.length,earned:rows.reduce((n,x)=>n+x.perId.reduce((s,y)=>s+y.earned,0),0),consumed:rows.reduce((n,x)=>n+x.perId.reduce((s,y)=>s+y.consumed,0),0),
  consumptionRows:rows.filter(x=>x.perId.some(y=>y.consumed>0)).length,extraHpDamage:Math.round(rows.reduce((n,x)=>n+x.extraHpDamage,0)*100)/100,
  baselineWins:rows.filter(x=>x.baseline.victory).length,candidateWins:rows.filter(x=>x.candidate.victory).length,gainedWins:rows.filter(x=>!x.baseline.victory&&x.candidate.victory).length,lostWins:rows.filter(x=>x.baseline.victory&&!x.candidate.victory).length,
  bothWinMeanTimeDeltaMs:mean(rows.filter(x=>x.baseline.victory&&x.candidate.victory).map(x=>x.candidate.durationMs-x.baseline.durationMs)),meanDamageDelta:mean(rows.map(x=>x.candidate.damage-x.baseline.damage))});
 return {...stats(report.rows),distinctBaselineEncounters:baselines.size,byVariant:Object.fromEntries([[thorn],[follow],[talons],[follow,talons]].map(ids=>[ids.join('+'),stats(report.rows.filter(x=>JSON.stringify(x.ids)===JSON.stringify(ids)))])),
  reviewOnly:true,actualOwnedCandidateCopies:false,cpApproved:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url&&process.argv[2])console.log('EQ2_V23_CHARGES '+JSON.stringify(summarize(JSON.parse(readFileSync(process.argv[2],'utf8')))));
