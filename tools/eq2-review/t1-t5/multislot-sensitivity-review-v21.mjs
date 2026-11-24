import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {contract} from './normalized-effect-review-v18.mjs';
const deny={reviewOnly:true,actualOwnedCandidateCopies:false,conditionalEffectsApplied:false,cpApproved:false,releaseApproved:false};
const fail=x=>{throw Error('eq2_v21_'+x);};
const profiles={BOSS_EXP_ROOT:['asterfall',1,25],BOSS_EXP_BELL:['asterfall',2,25],BOSS_EXP_SOLAR:['sunscar',3,40],BOSS_EXP_SPHINX:['sunscar',3,40],BOSS_EXP_BELLBEAST:['frostmarch',4,60],BOSS_EXP_CANTOR:['frostmarch',4,60]};
const sets={asterfall:['rootbound_t2','heartward','thornstrider','lifebloom'],sunscar:['observatory_t4','helioguard','sphinxclaw','mirageveil'],frostmarch:['shiverlake_t5','rimevanguard','cantorshard','frosthym']};
const roles={IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage',DAWNKEEPER:'support',STONECALLER:'support'};
const teams=[['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'],['BASTION','HEXWEAVER','KNIFE_DANCER','STONECALLER'],['DREADGUARD','RAVAGER','HEXWEAVER','DAWNKEEPER']];
const roleIndex={tank:1,damage:2,support:3};
const slotIds=['weapon','offhand','helmet','chest','gloves','legs','boots','cape','amulet','ring'];
const mean=xs=>xs.length?Math.round(xs.reduce((n,x)=>n+x,0)/xs.length*10000)/10000:null;
function exactEffect(r,role){
 const set=sets[r.region],s=contract.sets.find(x=>x.setId==='eq2_dungeon_'+set[0]+'_'+set[roleIndex[role]]&&x.pieces===2);
 if(s?.kind!=='permanent'||s.stats.length!==1||s.stats[0].channel!==r.channel||s.stats[0].value!==r.pct)fail('source_coefficient');
}
function coverage(c,tier){
 if(!Number.isInteger(c.equippedCopies)||c.equippedCopies<1||c.equippedCopies>10||c.tiers?.length!==c.equippedCopies||
 new Set(c.tiers.map(x=>x.slot)).size!==c.equippedCopies||new Set(c.tiers.map(x=>x.instanceId)).size!==c.equippedCopies||
 !c.tiers.some(x=>x.slot==='weapon')||c.tiers.some(x=>!slotIds.includes(x.slot)||!Number.isInteger(x.tier)||x.tier<1||x.tier>tier||!x.pieceId||!x.instanceId)||
 !Array.isArray(c.missing)||new Set(c.missing).size!==c.missing.length||c.missing.some(x=>!slotIds.includes(x)||c.tiers.some(y=>y.slot===x))||
 c.downgraded!==c.tiers.filter(x=>x.tier<tier).length)fail('coverage');
}
function metrics(r,party){
 if(!r||typeof r.victory!=='boolean'||!['victory','wipe','timeout'].includes(r.reason)||r.victory!==(r.reason==='victory')||
 ['durationMs','damage','healing','damageTaken','enemyHp'].some(k=>!Number.isFinite(r[k])||r[k]<0)||r.durationMs>120000)fail('metrics');
 if(party){if(r.players?.length!==4||!Number.isInteger(r.surviving)||r.surviving<0||r.surviving>4||
 r.players.some(x=>['hp','maxHp','damage','healing','damageTaken','interrupts'].some(k=>!Number.isFinite(x[k])||x[k]<0)||x.hp>x.maxHp))fail('party_metrics');}
 else if(['hp','maxHp','enemyMaxHp','interrupts'].some(k=>!Number.isFinite(r[k])||r[k]<0)||r.hp>r.maxHp||r.enemyHp>r.enemyMaxHp||!r.enemyMaxHp)fail('solo_metrics');
}
function stats(rows,party){
 const both=rows.filter(r=>r.baseline.victory&&r.candidate.victory);
 return {pairs:rows.length,baselineWins:rows.filter(x=>x.baseline.victory).length,candidateWins:rows.filter(x=>x.candidate.victory).length,
 gainedWins:rows.filter(x=>!x.baseline.victory&&x.candidate.victory).length,lostWins:rows.filter(x=>x.baseline.victory&&!x.candidate.victory).length,
 bothWinMeanTimeDeltaMs:mean(both.map(x=>x.candidate.durationMs-x.baseline.durationMs)),
 meanDamageDelta:mean(rows.map(x=>x.candidate.damage-x.baseline.damage)),meanHealingDelta:mean(rows.map(x=>x.candidate.healing-x.baseline.healing)),
 meanDamageTakenDelta:mean(rows.map(x=>x.candidate.damageTaken-x.baseline.damageTaken)),
 meanEnemyHpDelta:mean(rows.map(x=>x.candidate.enemyHp-x.baseline.enemyHp)),
 ...(party?{meanSurvivorDelta:mean(rows.map(x=>x.candidate.surviving-x.baseline.surviving))}:{meanRemainingHpFractionDelta:mean(rows.map(x=>x.candidate.hp/x.candidate.maxHp-x.baseline.hp/x.baseline.maxHp))})};
}
function base(report,scope,count){
 if(report.scope!==scope||report.actualOwnedCandidateCopies!==false||report.conditionalEffectsApplied!==false||report.releaseApproved!==false||report.rows?.length!==count)fail('scope');
}
export function summarizeSolo(report){
 base(report,'QA_ORIGINAL_FORGE_MULTISLOT_FIXED_DIFFICULTY',648);
 const keys=new Set(),loadouts=new Map();
 for(const r of report.rows){
  const p=profiles[r.bossId],role=roles[r.classId],k=[r.bossId,r.classId,r.specIndex,r.strategy,r.band].join(':');
  if(!p||!role||r.region!==p[0]||r.targetTier!==p[1]||r.targetLevel!==p[2]||![0,1].includes(r.specIndex)||!['generic','targeted','alternative'].includes(r.strategy)||!['accessible','pressure'].includes(r.band)||keys.has(k))fail('solo_identity');
  keys.add(k);coverage(r,r.targetTier);exactEffect(r,role);metrics(r.baseline,false);metrics(r.candidate,false);
  if(r.baseline.enemyMaxHp!==r.candidate.enemyMaxHp)fail('enemy_change');
  const identity=[r.classId,r.specIndex,r.targetTier,r.targetLevel].join(':');
  const prior=loadouts.get(identity);if(prior&&JSON.stringify(prior.tiers)!==JSON.stringify(r.tiers))fail('gear_changed');
  loadouts.set(identity,r);
 }
 const l=[...loadouts.values()];
 return {...stats(report.rows,false),byBand:Object.fromEntries(['accessible','pressure'].map(b=>[b,stats(report.rows.filter(x=>x.band===b),false)])),
 byRole:Object.fromEntries(Object.keys(roleIndex).map(role=>[role,stats(report.rows.filter(x=>roles[x.classId]===role),false)])),
 uniqueLoadouts:l.length,minCopies:Math.min(...l.map(x=>x.equippedCopies)),maxCopies:Math.max(...l.map(x=>x.equippedCopies)),
 missingSlots:l.reduce((n,x)=>n+x.missing.length,0),downgradedSlots:l.reduce((n,x)=>n+x.downgraded,0),
 conditionalEngineRuns:0,...deny};
}
export function summarizeParty(report){
 base(report,'QA_ORIGINAL_FORGE_PARTY_CONTROLLED_PRESSURE',108);
 const keys=new Set(),baseline=new Map();
 for(const r of report.rows){
  const team=teams[r.teamIndex],p={asterfall:[2,25],sunscar:[3,40],frostmarch:[4,60]}[r.region],k=[r.region,r.teamIndex,r.specIndex,r.band,r.role].join(':');
  if(!team||!p||JSON.stringify(r.classes)!==JSON.stringify(team)||r.targetTier!==p[0]||r.targetLevel!==p[1]||![0,1].includes(r.specIndex)||!['accessible','pressure'].includes(r.band)||!roleIndex[r.role]||team.find(c=>roles[c]===r.role)!==r.selectedClass||keys.has(k))fail('party_identity');
  keys.add(k);exactEffect(r,r.role);if(r.sourceCoverage?.length!==4)fail('party_coverage');for(const c of r.sourceCoverage)coverage(c,r.targetTier);
  const ids=r.sourceCoverage.flatMap(x=>x.tiers.map(t=>t.instanceId));if(new Set(ids).size!==ids.length)fail('duplicate_party_copy');
  metrics(r.baseline,true);metrics(r.candidate,true);
  const group=[r.region,r.teamIndex,r.specIndex,r.band].join(':');
  const old=baseline.get(group);if(old&&JSON.stringify(old.baseline)!==JSON.stringify(r.baseline))fail('baseline_changed');
  baseline.set(group,r);
 }
 return {...stats(report.rows,true),uniqueBaselineEncounters:baseline.size,
 byRole:Object.fromEntries(Object.keys(roleIndex).map(role=>[role,stats(report.rows.filter(x=>x.role===role),true)])),
 byBand:Object.fromEntries(['accessible','pressure'].map(b=>[b,stats(report.rows.filter(x=>x.band===b),true)])),conditionalEngineRuns:0,...deny};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url&&process.argv[2]&&process.argv[3]){
 console.log('EQ2_V21_SOLO '+JSON.stringify(summarizeSolo(JSON.parse(readFileSync(process.argv[2],'utf8')))));
 console.log('EQ2_V21_PARTY '+JSON.stringify(summarizeParty(JSON.parse(readFileSync(process.argv[3],'utf8')))));
}
