import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {contract,v17} from './normalized-effect-review-v18.mjs';
const ids={asterfall:'EQ2_DUNGEON_ROOTBOUND_T2_WEAPON_RAVAGER',sunscar:'EQ2_DUNGEON_OBSERVATORY_T4_WEAPON_RAVAGER',frostmarch:'EQ2_DUNGEON_SHIVERLAKE_T5_WEAPON_RAVAGER'};
const regions={BOSS_EXP_ROOT:'asterfall',BOSS_EXP_BELL:'asterfall',BOSS_EXP_SOLAR:'sunscar',BOSS_EXP_SPHINX:'sunscar',BOSS_EXP_BELLBEAST:'frostmarch',BOSS_EXP_CANTOR:'frostmarch'};
const avalanche='eq2_t5_avalanche:6';
const fail=x=>{throw Error('eq2_v22_'+x);};
export function sourceAudit(){
 for(const id of Object.values(ids)){
  const x=v17.traits.find(x=>x.itemId===id);
  if(!x||x.classId!=='RAVAGER'||x.value!==7||x.internalCooldownSeconds!==20||x.trigger!=='direct_class_ability_hit_target_below_35'||x.effect!=='direct_hit_damage')fail('winter_source');
 }
 const x=contract.sets.find(x=>x.setId==='eq2_t5_avalanche'&&x.pieces===6);
 if(!x||!x.currentHit||x.targetBelowHpPct!==30||x.internalCooldownSeconds!==20||x.outputs.length!==1||x.outputs[0].value!==8||x.trigger!=='direct_physical_ability_hit')fail('avalanche_source');
 return {sourceIds:4,distinctMechanics:2,reviewOnly:true,releaseApproved:false};
}
const mean=xs=>xs.length?Math.round(xs.reduce((a,b)=>a+b,0)/xs.length*10000)/10000:null;
const metrics=r=>r&&typeof r.victory==='boolean'&&['victory','wipe','timeout'].includes(r.reason)&&r.victory===(r.reason==='victory')&&['durationMs','damage','healing','damageTaken','hp','maxHp','enemyHp','enemyMaxHp'].every(k=>Number.isFinite(r[k])&&r[k]>=0)&&r.durationMs<=120000&&r.hp<=r.maxHp&&r.enemyHp<=r.enemyMaxHp;
export function summarize(report){
 sourceAudit();
 if(report.scope!=='QA_ORIGINAL_FORGE_CURRENT_HIT_COUNTERFACTUAL'||report.actualOwnedCandidateCopies!==false||report.releaseApproved!==false||report.rows?.length!==120)fail('scope');
 const keys=new Set(),baseline=new Map();
 for(const r of report.rows){
  const region=regions[r.bossId],winter=ids[region],variants=region==='frostmarch'?[[winter],[avalanche],[winter,avalanche]]:[[winter]];
  if(!region||r.region!==region||r.classId!=='RAVAGER'||![0,1].includes(r.specIndex)||!['generic','targeted','alternative'].includes(r.strategy)||!['accessible','pressure'].includes(r.band)||!variants.some(v=>JSON.stringify(v)===JSON.stringify(r.ids))||!metrics(r.baseline)||!metrics(r.candidate)||!Number.isInteger(r.equippedCopies)||r.equippedCopies<1||r.equippedCopies>10||!Number.isInteger(r.activations)||r.activations<0||!Number.isFinite(r.extraHpDamage)||r.extraHpDamage<0)fail('row');
  const group=[r.bossId,r.specIndex,r.strategy,r.band].join(':'),key=group+':'+r.ids.join('+');
  if(keys.has(key))fail('duplicate');keys.add(key);
  const old=baseline.get(group);if(old&&JSON.stringify(old)!==JSON.stringify(r.baseline))fail('baseline_changed');
  baseline.set(group,r.baseline);
  if(r.baseline.enemyMaxHp!==r.candidate.enemyMaxHp)fail('enemy_changed');
  if(r.activations===0&&(r.extraHpDamage!==0||JSON.stringify(r.baseline)!==JSON.stringify(r.candidate)))fail('untriggered_effect_changed_combat');
 }
 if(baseline.size!==72)fail('baseline_count');
 const stats=rows=>({pairs:rows.length,activationRows:rows.filter(x=>x.activations>0).length,totalActivations:rows.reduce((n,x)=>n+x.activations,0),totalDirectExtraHpDamage:Math.round(rows.reduce((n,x)=>n+x.extraHpDamage,0)*100)/100,baselineWins:rows.filter(x=>x.baseline.victory).length,candidateWins:rows.filter(x=>x.candidate.victory).length,gainedWins:rows.filter(x=>!x.baseline.victory&&x.candidate.victory).length,lostWins:rows.filter(x=>x.baseline.victory&&!x.candidate.victory).length,bothWinMeanTimeDeltaMs:mean(rows.filter(x=>x.baseline.victory&&x.candidate.victory).map(x=>x.candidate.durationMs-x.baseline.durationMs)),meanDamageDelta:mean(rows.map(x=>x.candidate.damage-x.baseline.damage))});
 return {...stats(report.rows),distinctBaselineEncounters:baseline.size,byVariant:Object.fromEntries(['winterbreaker','avalanche','combined'].map(k=>[k,stats(report.rows.filter(x=>(x.ids.length===2?'combined':x.ids[0]===avalanche?'avalanche':'winterbreaker')===k))])),reviewOnly:true,actualOwnedCandidateCopies:false,cpApproved:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url&&process.argv[2])console.log('EQ2_V22_CURRENT_HIT '+JSON.stringify(summarize(JSON.parse(readFileSync(process.argv[2],'utf8')))));
