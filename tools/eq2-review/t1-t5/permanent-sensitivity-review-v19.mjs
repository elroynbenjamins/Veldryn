import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {contract} from './normalized-effect-review-v18.mjs';
const fail=x=>{throw Error('eq2_v19_static_sensitivity_'+x);};
const regions={BOSS_EXP_ROOT:['rootbound_t2','heartward','thornstrider','lifebloom'],BOSS_EXP_BELL:['rootbound_t2','heartward','thornstrider','lifebloom'],BOSS_EXP_SOLAR:['observatory_t4','helioguard','sphinxclaw','mirageveil'],BOSS_EXP_SPHINX:['observatory_t4','helioguard','sphinxclaw','mirageveil'],BOSS_EXP_BELLBEAST:['shiverlake_t5','rimevanguard','cantorshard','frosthym'],BOSS_EXP_CANTOR:['shiverlake_t5','rimevanguard','cantorshard','frosthym']};
const roles={IRONWARDEN:1,BASTION:1,DREADGUARD:1,WAYFINDER:2,RAVAGER:2,HEXWEAVER:2,KNIFE_DANCER:2,DAWNKEEPER:3,STONECALLER:3};
const deny={reviewOnly:true,ownedCandidateCopies:false,conditionalEffectsApplied:false,cpApproved:false,releaseApproved:false};
const validMetrics=x=>x&&typeof x.victory==='boolean'&&['victory','wipe','timeout'].includes(x.reason)&&(x.victory===(x.reason==='victory'))&&['durationMs','damage','healing','hp'].every(k=>Number.isFinite(x[k])&&x[k]>=0);
const mean=xs=>xs.length?Math.round(xs.reduce((a,b)=>a+b,0)/xs.length*10000)/10000:null;
export function summarizeSensitivity(report){
 if(report.scope!=='QA_ORIGINAL_SOURCE_STATIC_STAT_COUNTERFACTUAL'||report.actualOwnedCandidateCopies!==false||report.conditionalEffectsApplied!==false||report.releaseApproved!==false||report.rows?.length!==324)fail('scope');
 const keys=new Set(),out=[];
 for(const r of report.rows){
  const reg=regions[r.bossId],role=roles[r.classId];
  const key=[r.bossId,r.classId,r.specIndex,r.strategy].join(':');
  if(!reg||!role||![0,1].includes(r.specIndex)||!['generic','targeted','alternative'].includes(r.strategy)||keys.has(key)||!validMetrics(r.baseline)||!validMetrics(r.candidate))fail('identity_or_metrics');
  keys.add(key);
  const s=contract.sets.find(x=>x.setId==='eq2_dungeon_'+reg[0]+'_'+reg[role]&&x.pieces===2);
  if(s?.kind!=='permanent'||s.stats.length!==1||s.stats[0].channel!==r.channel||s.stats[0].value!==r.pct)fail('candidate_source_mismatch');
  const b=r.baseline,c=r.candidate;
  out.push({...r,outcome:b.victory&&c.victory?'both_win':b.victory?'lost_win':c.victory?'gained_win':'neither_win',
   matchedWinTimeDeltaMs:b.victory&&c.victory?c.durationMs-b.durationMs:null,damageDelta:c.damage-b.damage,healDelta:c.healing-b.healing,...deny});
 }
 const stats=rows=>({cases:rows.length,baselineWins:rows.filter(x=>x.baseline.victory).length,candidateWins:rows.filter(x=>x.candidate.victory).length,
  gainedWins:rows.filter(x=>x.outcome==='gained_win').length,lostWins:rows.filter(x=>x.outcome==='lost_win').length,bothWin:rows.filter(x=>x.outcome==='both_win').length,
  bothWinMeanTimeDeltaMs:mean(rows.filter(x=>x.outcome==='both_win').map(x=>x.matchedWinTimeDeltaMs)),meanDamageDelta:mean(rows.map(x=>x.damageDelta)),meanHealDelta:mean(rows.map(x=>x.healDelta))});
 const byChannel=Object.fromEntries([...new Set(out.map(x=>x.channel))].map(k=>[k,stats(out.filter(x=>x.channel===k))]));
 return {...stats(out),byChannel,actualEngineCounterfactualPairs:324,conditionalEngineRuns:0,...deny};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url&&process.argv[2]){
 console.log('EQ2_V19_STATIC '+JSON.stringify(summarizeSensitivity(JSON.parse(readFileSync(process.argv[2],'utf8')))));
}
