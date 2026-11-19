/** V43 offline World Boss fairness and Sigil economy review.
 * NO production class coefficients, no wallet writes and no payout approval.
 * Evidence must come from a trusted join of private V28 replay, server class
 * and ownership rows. Passing synthetic fixtures is NOT population proof.
 */
import {WORLD_BOSS_V29_MIN_ACCOUNTS_PER_CELL,
 type WorldBossV29Audit,type WorldBossV29ClassRole} from
 './world-boss-impact-audit-v29';

export const WORLD_BOSS_V43_LIVE=false as const;
export const WORLD_BOSS_V43_PAYOUT_APPROVED=false as const;
export const WORLD_BOSS_V43_MAX_EARNABLE_BEFORE_IMPACT=70 as const;
export const WORLD_BOSS_V43_RESERVED_IMPACT_BUDGET=30 as const;
const BOSSES=['hollowroot','sunscar','frostmarch'] as const;
const ROLES=['tank','damage','support'] as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export interface WorldBossV43BalanceReview {
 cellsChecked:135;adequatelySampledCells:number;
 warnings:readonly string[];needsManualCalibration:true;
 approvedForPayout:false;
}
/** Every 3-boss x 5-bracket x 9-class cell needs 20 independent real
 * account samples. Also show cross-class utility/survival gaps by role.
 * A valid report never flips a runtime flag or authorizes rewards.
 */
export function reviewWorldBossClassBalanceV43(
 report:WorldBossV29Audit,classes:readonly WorldBossV29ClassRole[],
):WorldBossV43BalanceReview{
 if(!report||report.status!=='review_only_impact_locked'||
  report.payoutsAuthorized!==false||report.persisted!==false||
  !Array.isArray(report.referenceCells)||report.referenceCells.length!==135||
  !Array.isArray(classes)||classes.length!==9)
  throw Error('world_boss_v43_invalid_balance_report');
 const catalog=new Map<string,string>();
 for(const c of classes){
  if(!c||!['tank','damage','support'].includes(c.role)||
   catalog.has(c.classId))throw Error('world_boss_v43_invalid_class_catalog');
  catalog.set(c.classId,c.role);
 }
 const counts=ROLES.map(r=>classes.filter(c=>c.role===r).length);
 if(counts.join(',')!=='3,4,2')
  throw Error('world_boss_v43_invalid_class_distribution');
 const unique=new Set<string>();
 const warnings=[...report.warnings];
 let covered=0;
 for(const row of report.referenceCells){
  const key=row.boss+'|'+row.bracket+'|'+row.classId;
  if(unique.has(key)||!BOSSES.includes(row.boss)||
   !Number.isInteger(row.bracket)||row.bracket<1||row.bracket>5||
   catalog.get(row.classId)!==row.role||
   !Number.isSafeInteger(row.uniqueAccounts)||row.uniqueAccounts<0||
   !Number.isFinite(row.medianUtilityPerRootPower)||
   row.medianUtilityPerRootPower<0||
   !Number.isFinite(row.p10UtilityPerRootPower)||
   row.p10UtilityPerRootPower<0||
   !Number.isFinite(row.p90UtilityPerRootPower)||
   row.p90UtilityPerRootPower<row.medianUtilityPerRootPower||
   row.p10UtilityPerRootPower>row.medianUtilityPerRootPower||
   !Number.isFinite(row.survivalRate)||row.survivalRate<0||
   row.survivalRate>1)
   throw Error('world_boss_v43_invalid_reference_cell');
  unique.add(key);
  if(row.uniqueAccounts>=WORLD_BOSS_V29_MIN_ACCOUNTS_PER_CELL)covered++;
  else warnings.push('insufficient_real_accounts:'+key);
 }
 for(const boss of BOSSES)for(const bracket of [1,2,3,4,5]){
  for(const cls of classes){
   if(!unique.has(boss+'|'+bracket+'|'+cls.classId))
    throw Error('world_boss_v43_missing_class_cell');
  }
  for(const role of ROLES){
   const rows=report.referenceCells.filter(x=>x.boss===boss&&
    x.bracket===bracket&&x.role===role);
   const medians=rows.map(r=>r.medianUtilityPerRootPower);
   const survivors=rows.map(r=>r.survivalRate);
   const min=Math.min(...medians),max=Math.max(...medians);
   if(min<=0||max/min>1.30)
    warnings.push('class_utility_gap:'+boss+'|'+bracket+'|'+role);
   if(Math.max(...survivors)-Math.min(...survivors)>.25)
    warnings.push('class_survival_gap:'+boss+'|'+bracket+'|'+role);
  }
 }
 return {cellsChecked:135,adequatelySampledCells:covered,
  warnings:[...new Set(warnings)],needsManualCalibration:true,
  approvedForPayout:false};
}
type Attempt={ordinal:1|2|3;survived:boolean;verifiedReplay:boolean;
 characterCount:number};
export interface WorldBossV43EconomyEvidence {
 eventId:string;accountId:string;
 attempts:readonly Attempt[];
 donations:readonly (1|2)[];
 globalMilestones:readonly (70|30|0)[];
 /** These are actual private ledger rows, never client-selected sources. */
 ledger:readonly {sourceKey:string;amount:number}[];
}
export interface WorldBossV43EconomyReview {
 expectedEarned:number;ledgerEarned:number;
 maxEarnableBeforeImpact:70;reservedImpactBudget:30;
 sourceCount:number;accountWide:true;approvedForPayout:false;
}
/** Reconciles the EXACT V28 private source-key model, not wallet balance.
 * Prior wallet spending does not change the immutable event-earned total.
 */
export function reconcileWorldBossEconomyV43(
 input:WorldBossV43EconomyEvidence,
):WorldBossV43EconomyReview{
 if(!input||!UUID.test(input.eventId)||!UUID.test(input.accountId)||
  !Array.isArray(input.attempts)||input.attempts.length>3||
  !Array.isArray(input.donations)||input.donations.length>2||
  !Array.isArray(input.globalMilestones)||input.globalMilestones.length>3||
  !Array.isArray(input.ledger)||input.ledger.length>8)
  throw Error('world_boss_v43_invalid_economy_scope');
 const expected=new Map<string,number>();
 for(const a of input.attempts){
  if(!a||![1,2,3].includes(a.ordinal)||typeof a.survived!=='boolean'||
   a.verifiedReplay!==true||!Number.isSafeInteger(a.characterCount)||
   a.characterCount<1||a.characterCount>5||
   expected.has('battle:'+a.ordinal))
   throw Error('world_boss_v43_unverified_or_duplicate_battle');
  expected.set('battle:'+a.ordinal,a.survived?10:5);
 }
 for(const ordinal of input.donations){
  if(![1,2].includes(ordinal)||expected.has('supply:'+ordinal))
   throw Error('world_boss_v43_duplicate_supply');
  expected.set('supply:'+ordinal,5);
 }
 const milestoneKeys=new Set<number>();
 for(const threshold of input.globalMilestones){
  if(![70,30,0].includes(threshold)||milestoneKeys.has(threshold))
   throw Error('world_boss_v43_invalid_milestone');
  milestoneKeys.add(threshold);
  // Global milestones are earned only by accounts with a committed,
  // verified replay. An unparticipating donor cannot get these.
  if(!input.attempts.length)continue;
  const key='global:'+threshold;
  if(expected.has(key))throw Error('world_boss_v43_duplicate_milestone');
  expected.set(key,threshold===70?5:threshold===30?10:15);
 }
 const seen=new Set<string>();
 let ledgerEarned=0;
 for(const r of input.ledger){
  if(!r||typeof r.sourceKey!=='string'||seen.has(r.sourceKey)||
   !Number.isSafeInteger(r.amount)||expected.get(r.sourceKey)!==r.amount)
   throw Error('world_boss_v43_unreconciled_ledger');
  seen.add(r.sourceKey);ledgerEarned+=r.amount;
 }
 const expectedEarned=[...expected.values()].reduce((sum,n)=>sum+n,0);
 if(seen.size!==expected.size||ledgerEarned!==expectedEarned||
  expectedEarned>WORLD_BOSS_V43_MAX_EARNABLE_BEFORE_IMPACT)
  throw Error('world_boss_v43_unreconciled_ledger');
 return {expectedEarned,ledgerEarned,
  maxEarnableBeforeImpact:WORLD_BOSS_V43_MAX_EARNABLE_BEFORE_IMPACT,
  reservedImpactBudget:WORLD_BOSS_V43_RESERVED_IMPACT_BUDGET,
  sourceCount:expected.size,accountWide:true,approvedForPayout:false};
}
