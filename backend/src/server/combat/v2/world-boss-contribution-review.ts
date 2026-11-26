/** V92A: nonpaying evidence, not contribution/reward points. The existing
 * engine does not preserve ordinary shield owner/consumption or counterfactual
 * mitigation attribution. Never manufacture those values from shield grants.
 */
import type {CombatResult} from '../types';
const metric=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e12;
const round=(x:number)=>Math.round(x*100)/100;
export const WORLD_BOSS_CONTRIBUTION_REVIEW_LIVE=false as const;
export function reviewWorldBossContributionV2(combat:CombatResult){
 if(!combat||!Array.isArray(combat.players)||combat.players.length<1||combat.players.length>3||
  !Array.isArray(combat.enemies)||combat.enemies.length!==1||
  !Array.isArray(combat.events)||!metric(combat.durationMs))
  throw Error('world_boss_review_invalid_combat');
 const boss=combat.enemies[0];
 if(!boss?.definition?.boss||boss.definition.team!=='enemies'||
  !metric(boss.hp)||!metric(boss.definition.stats.maxHp)||
  boss.hp>boss.definition.stats.maxHp)
  throw Error('world_boss_review_invalid_boss');
 const players=combat.players;
 const ids=new Set<string>();
 const rows=players.map(p=>{
  const d=p.definition;
  if(!d||d.team!=='players'||!d.combatV2||!['tank','damage','support'].includes(d.role)||
   !d.id||d.id===boss.definition.id||ids.has(d.id)||
   !metric(p.damageDone)||!metric(p.healingDone)||!metric(p.damageTaken)||
   !Number.isSafeInteger(p.interrupts)||p.interrupts<0||typeof p.alive!=='boolean')
   throw Error('world_boss_review_invalid_actor');
  ids.add(d.id);
  return {actorId:d.id,role:d.role,engineDamageDone:p.damageDone,
   engineEffectiveHealing:p.healingDone,damageTaken:p.damageTaken,
   interrupts:p.interrupts,survived:p.alive,
   observedBossShieldAbsorption:0,observedAllyShieldGranted:0,observedCleanses:0};
 });
 const byId=new Map(rows.map(row=>[row.actorId,row]));
 let unattributedPartyShieldAbsorbed=0,bossShieldGranted=0,bossHealingObserved=0,lastAt=0;
 for(const event of combat.events){
  if(!event||!metric(event.atMs)||event.atMs<lastAt||event.atMs>combat.durationMs||
   (event.amount!==undefined&&!metric(event.amount))||
   (event.absorbed!==undefined&&!metric(event.absorbed)))
   throw Error('world_boss_review_invalid_event');
  lastAt=event.atMs;
  const row=byId.get(event.actorId??'');
  const targetIsAlly=ids.has(event.targetId??'');
  const targetIsBoss=event.targetId===boss.definition.id;
  if((event.type==='damage'||event.type==='dot_tick')&&event.absorbed!==undefined){
   if(row&&targetIsBoss)row.observedBossShieldAbsorption+=event.absorbed;
   if(event.actorId===boss.definition.id&&targetIsAlly)unattributedPartyShieldAbsorbed+=event.absorbed;
  }
  if(event.type==='shield'){
   if(row&&targetIsAlly)row.observedAllyShieldGranted+=event.amount??0;
   if(event.actorId===boss.definition.id&&targetIsBoss)bossShieldGranted+=event.amount??0;
  }
  if(row&&targetIsAlly&&event.type==='status_remove'&&
   (event.statusKind==='dot'||event.statusKind==='debuff'))row.observedCleanses++;
  if(targetIsBoss&&(event.type==='heal'||event.type==='hot_tick'))bossHealingObserved+=event.amount??0;
 }
 const localHpLoss=boss.definition.stats.maxHp-boss.hp;
 const engineDamageTotal=rows.reduce((sum,row)=>sum+row.engineDamageDone,0);
 // Diagnostic only: any discrepancy (overkill, boss healing or event/source
 // accounting) must not be allocated proportionally or paid as World HP.
 return {characters:rows.map(row=>({...row,observedBossShieldAbsorption:round(row.observedBossShieldAbsorption),
  observedAllyShieldGranted:round(row.observedAllyShieldGranted)})),
  localHpLoss,engineDamageTotal,damageReconciliationDelta:engineDamageTotal-localHpLoss,
  bossShieldGranted:round(bossShieldGranted),
  bossShieldAbsorbed:round(rows.reduce((sum,row)=>sum+row.observedBossShieldAbsorption,0)),
  unattributedPartyShieldAbsorbed:round(unattributedPartyShieldAbsorbed),bossHealingObserved:round(bossHealingObserved),
  shieldOwnerCredit:'unavailable' as const,mitigationCredit:'unavailable' as const,
  cleansePreventedDamage:'unavailable' as const,impactScore:null,
  globalHpCredited:0 as const,rewardGranted:false as const,releaseReady:false as const};
}
/** Provisional inherited V22 weighting, only for nonnegative fixed measured
 * inputs. Monotonic for adding a value to the same ledger, NOT a proof that
 * an extra character cannot change combat outcomes. Not a reward score. */
export function reviewWorldBossFixedLedgerWeightV2(values:readonly number[]):number{
 if(!Array.isArray(values)||values.length<1||values.length>3||!Array.from(values).every(metric))
  throw Error('world_boss_review_invalid_fixed_ledger');
 return Math.floor([...values].sort((a,b)=>b-a).reduce((s,n,i)=>s+n*[1,.12,.07][i],0));
}
