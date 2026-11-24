import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {contract} from './normalized-effect-review-v18.mjs';
const helio='eq2_dungeon_observatory_t4_helioguard:4',stone='eq2_combo_t5_stonewinter_frame:2',rime='eq2_dungeon_shiverlake_t5_rimevanguard:4';
const specs={
 [helio]:{pct:5,threshold:6,window:6,cd:20,duration:0,consume:'direct_nontrue_hp_loss'},
 [stone]:{pct:4,threshold:6,window:6,cd:18,duration:0,consume:'direct_nontrue_hp_loss'},
 [rime]:{pct:6,threshold:7,window:0,cd:22,duration:5,consume:null}
};
const fail=x=>{throw Error('eq2_v24_'+x);};
export function sourceAudit(){
 for(const [id,s] of Object.entries(specs)){
  const [setId,pieces]=id.split(':');const x=contract.sets.find(x=>x.setId===setId&&x.pieces===Number(pieces));
  if(!x||x.trigger!=='direct_nontrue_hp_loss'||x.consumeOn!==s.consume||x.windowSeconds!==s.window||
     x.minActualHpLossPct!==s.threshold||x.internalCooldownSeconds!==s.cd||x.outputs.length!==1||
     x.outputs[0].channel!=='incoming_nontrue_reduction'||x.outputs[0].value!==s.pct||x.outputs[0].durationSeconds!==s.duration)fail('source_mismatch');
 }
 return {sourceIds:3,distinctMechanics:3,reviewOnly:true,releaseApproved:false};
}
const regions={BOSS_EXP_SOLAR:'sunscar',BOSS_EXP_SPHINX:'sunscar',BOSS_EXP_BELLBEAST:'frostmarch',BOSS_EXP_CANTOR:'frostmarch'};
const metrics=x=>x&&typeof x.victory==='boolean'&&['victory','wipe','timeout'].includes(x.reason)&&x.victory===(x.reason==='victory')&&
 ['durationMs','damage','healing','damageTaken','hp','maxHp','enemyHp','enemyMaxHp'].every(k=>Number.isFinite(x[k])&&x[k]>=0)&&x.durationMs<=120000&&x.hp<=x.maxHp&&x.enemyHp<=x.enemyMaxHp;
const mean=xs=>xs.length?Math.round(xs.reduce((n,x)=>n+x,0)/xs.length*10000)/10000:null;
export function summarize(report){
 sourceAudit();
 if(report.scope!=='QA_ORIGINAL_FORGE_INCOMING_DEFENSE_COUNTERFACTUAL'||report.actualOwnedCandidateCopies!==false||report.releaseApproved!==false||report.rows?.length!==96)fail('scope');
 const keys=new Set(),baselines=new Map();
 for(const r of report.rows){
  const region=regions[r.bossId],variants=region==='sunscar'?[[helio]]:[[stone],[rime],[stone,rime]];
  if(!region||r.region!==region||r.classId!=='IRONWARDEN'||![0,1].includes(r.specIndex)||!['generic','targeted','alternative'].includes(r.strategy)||
     !['accessible','pressure'].includes(r.band)||!variants.some(v=>JSON.stringify(v)===JSON.stringify(r.ids))||!metrics(r.baseline)||!metrics(r.candidate)||
     !Number.isInteger(r.equippedCopies)||r.equippedCopies<1||r.equippedCopies>10||r.perId?.length!==r.ids.length||
     !Number.isFinite(r.preventedHpDamage)||r.preventedHpDamage<0)fail('row');
  for(let i=0;i<r.ids.length;i++){const x=r.perId[i];if(x.id!==r.ids[i]||!Number.isSafeInteger(x.earned)||x.earned<0||!Number.isSafeInteger(x.applied)||x.applied<0||
   (x.id!==rime&&x.applied>x.earned)||(x.applied>0&&x.earned===0))fail('receipt');}
  const group=[r.bossId,r.specIndex,r.strategy,r.band].join(':'),key=group+':'+r.ids.join('+');
  if(keys.has(key))fail('duplicate');keys.add(key);
  const old=baselines.get(group);if(old&&JSON.stringify(old)!==JSON.stringify(r.baseline))fail('baseline_changed');
  baselines.set(group,r.baseline);
  if(r.baseline.enemyMaxHp!==r.candidate.enemyMaxHp||r.baseline.maxHp!==r.candidate.maxHp)fail('stats_changed');
  if(r.perId.every(x=>x.applied===0)&&(r.preventedHpDamage!==0||JSON.stringify(r.baseline)!==JSON.stringify(r.candidate)))fail('unapplied_effect_changed_combat');
 }
 if(baselines.size!==48)fail('baseline_count');
 const stats=rows=>({pairs:rows.length,earned:rows.reduce((n,x)=>n+x.perId.reduce((s,y)=>s+y.earned,0),0),applied:rows.reduce((n,x)=>n+x.perId.reduce((s,y)=>s+y.applied,0),0),
  preventedHpDamage:Math.round(rows.reduce((n,x)=>n+x.preventedHpDamage,0)*100)/100,
  baselineWins:rows.filter(x=>x.baseline.victory).length,candidateWins:rows.filter(x=>x.candidate.victory).length,gainedWins:rows.filter(x=>!x.baseline.victory&&x.candidate.victory).length,lostWins:rows.filter(x=>x.baseline.victory&&!x.candidate.victory).length,
  bothWinMeanTimeDeltaMs:mean(rows.filter(x=>x.baseline.victory&&x.candidate.victory).map(x=>x.candidate.durationMs-x.baseline.durationMs)),meanDamageTakenDelta:mean(rows.map(x=>x.candidate.damageTaken-x.baseline.damageTaken)),meanRemainingHpFractionDelta:mean(rows.map(x=>x.candidate.hp/x.candidate.maxHp-x.baseline.hp/x.baseline.maxHp))});
 return {...stats(report.rows),distinctBaselineEncounters:baselines.size,byVariant:Object.fromEntries([[helio],[stone],[rime],[stone,rime]].map(ids=>[ids.join('+'),stats(report.rows.filter(x=>JSON.stringify(x.ids)===JSON.stringify(ids)))])),
  reviewOnly:true,actualOwnedCandidateCopies:false,cpApproved:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url&&process.argv[2])console.log('EQ2_V24_DEFENSE '+JSON.stringify(summarize(JSON.parse(readFileSync(process.argv[2],'utf8')))));
