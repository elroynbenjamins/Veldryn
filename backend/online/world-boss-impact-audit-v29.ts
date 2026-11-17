/**
 * World Boss V29: OFFLINE / REVIEW-ONLY Impact fairness calibration.
 *
 * Input must come from a trusted server job that has joined V28 immutable
 * replay proofs with server-owned class identity and Combat Power. The string
 * "verified_v28" is an assertion by that job, NOT independent authentication.
 * NEVER invoke this with user JSON; NEVER feed previews to reward claims.
 */
export const WORLD_BOSS_V29_IMPACT_LIVE=false as const;
export const WORLD_BOSS_V29_IMPACT_PAYOUTS_APPROVED=false as const;
export const WORLD_BOSS_V29_MIN_ACCOUNTS_PER_CELL=20 as const;
export const WORLD_BOSS_V29_EXPECTED_CLASSES=9 as const;
const ID=/^[A-Za-z][A-Za-z0-9_-]{1,63}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGEST=/^[a-f0-9]{64}$/;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const BOSSES=['hollowroot','sunscar','frostmarch'] as const;
const ROLES=['tank','damage','support'] as const;
// Canonical Veldryn class catalog: 3 Tanks, 4 Damage, 2 Support (9 total).
// Do not assume a symmetric three-class-per-role distribution.
const EXPECTED_ROLE_COUNTS={tank:3,damage:4,support:2} as const;
const SECONDARY=[1,.12,.07,.05,.04] as const;
type Boss=typeof BOSSES[number];
type Role=typeof ROLES[number];
/**
 * Intentional release gate: assert exact shipped class-to-role ownership.
 * Keeping a snapshot here prevents server workers from trusting a user-provided
 * role map. Test coverage compares every entry against mobile CLASSES so any
 * future class/role change fails CI until reviewed and rebalanced.
 */
const RELEASED_CLASS_ROLES:Readonly<Record<string,Role>>=Object.freeze({
 IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',
 WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',
 KNIFE_DANCER:'damage',DAWNKEEPER:'support',STONECALLER:'support',
});
type Bracket=1|2|3|4|5;

export interface WorldBossV29ClassRole {
 classId:string;role:Role;
}
export interface WorldBossV29ProvenCharacter {
 characterId:string;classId:string;role:Role;combatPower:number;
 bossHpDamage:number;localGuardDamage:number;effectiveHealing:number;
 shieldConsumed:number;tankProtection:number;cleansePrevented:number;
 interrupts:number;survived:boolean;
}
export interface WorldBossV29ProvenAttempt {
 eventId:string;accountId:string;requestId:string;attempt:1|2|3;
 boss:Boss;bracket:Bracket;replaySha256:string;
 proofStatus:'verified_v28';roundsCompleted:number;
 participants:readonly WorldBossV29ProvenCharacter[];
}
export interface WorldBossV29ReferenceCell {
 boss:Boss;bracket:Bracket;classId:string;role:Role;
 uniqueAccounts:number;medianUtilityPerRootPower:number;
 p10UtilityPerRootPower:number;p90UtilityPerRootPower:number;
 survivalRate:number;
}
export interface WorldBossV29ImpactPreview {
 accountId:string;attempts:number;provisionalImpact:number;
 /** Never a grant; V28 is the sole reward authority and holds Impact. */
 rewardAuthorized:false;
}
export interface WorldBossV29Audit {
 status:'review_only_impact_locked';
 eventId:string;sampledAttempts:number;uniqueAccounts:number;
 referenceCells:readonly WorldBossV29ReferenceCell[];
 warnings:readonly string[];
 readyForHumanReview:boolean;
 preview:readonly WorldBossV29ImpactPreview[];
 payoutsAuthorized:false;walletWrites:0;persisted:false;
}
const positivePower=(v:number)=>Number.isSafeInteger(v)&&v>=1&&v<=100000000;
const metric=(n:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e12;
const quantile=(sorted:readonly number[],q:number)=>{
 if(!sorted.length)throw Error('world_boss_v29_empty_quantile');
 const position=(sorted.length-1)*q;
 const low=Math.floor(position),fraction=position-low;
 return sorted[low]+(sorted[Math.ceil(position)]-sorted[low])*fraction;
};
const ordered=(values:readonly number[])=>[...values].sort((a,b)=>a-b);
const cellKey=(boss:Boss,bracket:Bracket,classId:string)=>
 boss+'|'+bracket+'|'+classId;
const round=(v:number)=>Math.round(v*10000)/10000;

/** Deliberately PROVISIONAL weights. Engine-effective amounts only:
 * no attempted overheals, applied-but-unused shields, imaginary protection,
 * or separate per-character World HP grant. Class baselines are mandatory.
 */
export function provisionalWorldBossRoleUtilityV29(
 row:WorldBossV29ProvenCharacter,
):number{
 const d=row.bossHpDamage,g=row.localGuardDamage;
 const h=row.effectiveHealing,s=row.shieldConsumed;
 const p=row.tankProtection,c=row.cleansePrevented,i=row.interrupts;
 let utility=0;
 if(row.role==='tank')utility=.45*d+.30*g+.40*h+.70*s+p+.50*c+20*i;
 else if(row.role==='support')
  utility=.45*d+.25*g+.90*h+.80*s+.70*p+c+20*i;
 else utility=d+.35*g+.15*h+.30*s+.20*p+.30*c+20*i;
 if(!metric(utility))throw Error('world_boss_v29_utility_out_of_range');
 return utility/Math.sqrt(row.combatPower);
}
/** 9 class-specific references, independently in each of 3 bosses x 5 CP
 * brackets. One account contributes at most one reference observation to a
 * cell, even with all three attacks or multiple characters of that class.
 */
export function auditProvenWorldBossImpactV29(input:{
 eventId:string;
 expectedClasses:readonly WorldBossV29ClassRole[];
 attempts:readonly WorldBossV29ProvenAttempt[];
}):WorldBossV29Audit{
 if(!input||!UUID.test(input.eventId)||
  !Array.isArray(input.expectedClasses)||
  input.expectedClasses.length!==WORLD_BOSS_V29_EXPECTED_CLASSES||
  !Array.isArray(input.attempts)||!input.attempts.length||
  input.attempts.length>50000)
  throw Error('world_boss_v29_invalid_audit_scope');
 // Retain declared element types after Array.isArray runtime validation.
 const expectedClasses:readonly WorldBossV29ClassRole[]=input.expectedClasses;
 const attempts:readonly WorldBossV29ProvenAttempt[]=input.attempts;
 const classes=new Map<string,Role>(),roleCounts:Record<Role,number>={
  tank:0,damage:0,support:0};
 for(const x of expectedClasses){
  if(!x||!ID.test(x.classId)||classes.has(x.classId)||
   !ROLES.includes(x.role))throw Error('world_boss_v29_invalid_class_catalog');
  classes.set(x.classId,x.role);roleCounts[x.role]++;
 }
 if(ROLES.some(r=>roleCounts[r]!==EXPECTED_ROLE_COUNTS[r]))
  throw Error('world_boss_v29_invalid_class_role_distribution');
 if(Object.keys(RELEASED_CLASS_ROLES).length!==WORLD_BOSS_V29_EXPECTED_CLASSES||
  [...classes].some(([classId,role])=>RELEASED_CLASS_ROLES[classId]!==role))
  throw Error('world_boss_v29_class_catalog_role_mismatch');

 // These replay/account keys must be unique across this ONE event. Client
 // supplied class, bracket, role, CP, and proof status are untrusted inputs.
 const attemptKeys=new Set<string>(),requestKeys=new Set<string>();
 const digestKeys=new Set<string>(),accounts=new Set<string>();
 const characterOwners=new Map<string,{accountId:string;classId:string;role:Role}>();
 const byCell=new Map<string,Map<string,number[]>>();
 const survival=new Map<string,Map<string,boolean[]>>();
 for(const a of attempts){
  if(!a||a.eventId!==input.eventId||!UUID.test(a.accountId)||
   !REQUEST.test(a.requestId)||!Number.isSafeInteger(a.attempt)||
   a.attempt<1||a.attempt>3||!BOSSES.includes(a.boss)||
   !Number.isSafeInteger(a.bracket)||a.bracket<1||a.bracket>5||
   !DIGEST.test(a.replaySha256)||a.proofStatus!=='verified_v28'||
   !Number.isSafeInteger(a.roundsCompleted)||
   a.roundsCompleted<1||a.roundsCompleted>14||
   !Array.isArray(a.participants)||a.participants.length<1||
   a.participants.length>5)
   throw Error('world_boss_v29_unproved_or_invalid_attempt');
  const key=a.accountId+':'+a.attempt;
  if(attemptKeys.has(key)||requestKeys.has(a.accountId+':'+a.requestId)||
   digestKeys.has(a.replaySha256))
   throw Error('world_boss_v29_duplicate_attempt_or_replay');
  attemptKeys.add(key);requestKeys.add(a.accountId+':'+a.requestId);
  digestKeys.add(a.replaySha256);accounts.add(a.accountId);
  const ids=new Set<string>();
  for(const p of a.participants){
   if(!p||!UUID.test(p.characterId)||ids.has(p.characterId)||
    !classes.has(p.classId)||classes.get(p.classId)!==p.role||
    !ROLES.includes(p.role)||!positivePower(p.combatPower)||
    !metric(p.bossHpDamage)||!metric(p.localGuardDamage)||
    !metric(p.effectiveHealing)||!metric(p.shieldConsumed)||
    !metric(p.tankProtection)||!metric(p.cleansePrevented)||
    !Number.isSafeInteger(p.interrupts)||p.interrupts<0||
    p.interrupts>1000||typeof p.survived!=='boolean')
    throw Error('world_boss_v29_unverified_character');
   const owner=characterOwners.get(p.characterId);
   if(owner&&(owner.accountId!==a.accountId||
    owner.classId!==p.classId||owner.role!==p.role))
    throw Error('world_boss_v29_foreign_or_changed_character');
   characterOwners.set(p.characterId,{
    accountId:a.accountId,classId:p.classId,role:p.role,
   });
   ids.add(p.characterId);
   const cell=cellKey(a.boss,a.bracket,p.classId);
   const perAccount=byCell.get(cell)??new Map<string,number[]>();
   const samples=perAccount.get(a.accountId)??[];
   samples.push(provisionalWorldBossRoleUtilityV29(p));
   perAccount.set(a.accountId,samples);byCell.set(cell,perAccount);
   const survived=survival.get(cell)??new Map<string,boolean[]>();
   const results=survived.get(a.accountId)??[];
   results.push(p.survived);
   survived.set(a.accountId,results);survival.set(cell,survived);
  }
 }
 const references:WorldBossV29ReferenceCell[]=[];
 const baseline=new Map<string,number>(),warnings:string[]=[];
 for(const boss of BOSSES)for(const bracket of [1,2,3,4,5] as const){
  for(const x of expectedClasses){
   const cell=cellKey(boss,bracket,x.classId);
   const members=byCell.get(cell)??new Map<string,number[]>();
   // Per-account median avoids overrepresenting high-activity accounts.
   const scores=ordered([...members.values()].map(v=>quantile(ordered(v),.5)));
   const survivor=survival.get(cell)??new Map<string,boolean[]>();
   const survivorFraction=[...survivor.values()].map(rows=>
    rows.filter(Boolean).length/rows.length);
   const rate=survivorFraction.length?
    survivorFraction.reduce((a,b)=>a+b,0)/survivorFraction.length:0;
   const median=scores.length?quantile(scores,.5):0;
   const p10=scores.length?quantile(scores,.1):0;
   const p90=scores.length?quantile(scores,.9):0;
   references.push({boss,bracket,classId:x.classId,role:x.role,
    uniqueAccounts:members.size,medianUtilityPerRootPower:round(median),
    p10UtilityPerRootPower:round(p10),
    p90UtilityPerRootPower:round(p90),survivalRate:round(rate)});
   if(members.size<WORLD_BOSS_V29_MIN_ACCOUNTS_PER_CELL)
    warnings.push('insufficient_unique_accounts:'+cell);
   if(median<=0)warnings.push('zero_reference_utility:'+cell);
   if(rate<.30)warnings.push('poor_survival:'+cell);
   if(p10>0&&p90/p10>10)
    warnings.push('extreme_utility_variance:'+cell);
   if(median>0)baseline.set(cell,median);
  }
  // Survival is comparable across roles; raw healing and damage are not.
  for(const role of ROLES){
   const rates=references.filter(r=>r.boss===boss&&
    r.bracket===bracket&&r.role===role).map(r=>r.survivalRate);
   if(Math.max(...rates)-Math.min(...rates)>.25)
    warnings.push('class_survival_gap:'+boss+'|'+bracket+'|'+role);
  }
 }
 // No predictive claims if coverage/fairness gates are incomplete.
 const ready=warnings.length===0;
 const preview:WorldBossV29ImpactPreview[]=[];
 if(ready){
  const total=new Map<string,{attacks:number;impact:number}>();
  for(const a of attempts){
   const ratios=a.participants.map(p=>{
    const base=baseline.get(cellKey(a.boss,a.bracket,p.classId))!;
    return Math.min(2,provisionalWorldBossRoleUtilityV29(p)/base);
   }).sort((x,y)=>y-x);
   const sum=ratios.reduce((acc,n,i)=>acc+n*SECONDARY[i],0);
   const previous=total.get(a.accountId)??{attacks:0,impact:0};
   previous.attacks++;
   previous.impact+=sum;total.set(a.accountId,previous);
  }
  for(const [accountId,value] of total)
   preview.push({accountId,attempts:value.attacks,
    provisionalImpact:round(value.impact),rewardAuthorized:false});
  preview.sort((a,b)=>a.accountId.localeCompare(b.accountId));
 }
 return {status:'review_only_impact_locked',eventId:input.eventId,
  sampledAttempts:input.attempts.length,uniqueAccounts:accounts.size,
  referenceCells:references,warnings,
  readyForHumanReview:ready,preview,payoutsAuthorized:false,
  walletWrites:0,persisted:false};
}
