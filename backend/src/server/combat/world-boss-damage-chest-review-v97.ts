/** Hidden, nonpaying personal damage chest progression. Server-frozen
 * threshold per event/account progression bracket; all damage is actual
 * committed global HP loss, never Guard, local previews or Impact scores.
 * Future SQL must lock event/account and atomically persist each hit/miss.
 */
import {defineChestLootTableV67,deriveChestGroupRollsV67} from '../loot/chest-loot-engine-v67';
import {reviewWorldBossRewardHandoffV95,type WorldBossV95SettledAttemptReview} from './world-boss-v95-reward-handoff-review';
import type {WorldBossCanonicalChestReadV59} from './world-boss-chest-proof-v59';
export const WORLD_BOSS_DAMAGE_CHEST_V97_LIVE=false as const;
export interface DamageChestPolicyV97{
 readonly eventId:string;readonly accountId:string;
 readonly bossId:WorldBossCanonicalChestReadV59['event']['bossId'];
 readonly bracketId:string;readonly revision:number;
 readonly damagePerRoll:number;readonly entropyVersion:string;
}
export interface DamageChestRollV97{
 readonly ordinal:number;readonly thresholdDamage:number;
 readonly roll:number;readonly hit:boolean;readonly sourceKey:string;
}
const integer=(n:number)=>Number.isSafeInteger(n)&&n>=0&&n<=1e12;
const tag=(s:string)=>typeof s==='string'&&/^[a-z0-9_-]{1,48}$/.test(s);
export function reviewWorldBossDamageChestsV97(input:{
 canonical:WorldBossCanonicalChestReadV59;
 receipts:readonly WorldBossV95SettledAttemptReview[];
 policy:DamageChestPolicyV97;previous:readonly DamageChestRollV97[];
 secret:Uint8Array;
 verifyPersistedAttempt:(row:WorldBossV95SettledAttemptReview)=>boolean;
 verifyFrozenPolicy:(policy:DamageChestPolicyV97)=>boolean;
}){
 const {canonical,receipts,policy:p,previous,secret}=input;
 if(!p||p.eventId!==canonical.eventId||p.accountId!==canonical.accountId||
  p.bossId!==canonical.event.bossId||!tag(p.bracketId)||!tag(p.entropyVersion)||
  !integer(p.revision)||p.revision<1||!integer(p.damagePerRoll)||p.damagePerRoll<1||
  !Array.isArray(previous)||previous.length>1000||
  !(secret instanceof Uint8Array)||secret.length<32||secret.length>512||
  typeof input.verifyFrozenPolicy!=='function')throw Error('world_boss_damage_invalid_policy');
 const frozen=JSON.stringify(p);
 if(input.verifyFrozenPolicy(p)!==true||JSON.stringify(p)!==frozen)throw Error('world_boss_damage_unverified_policy');
 reviewWorldBossRewardHandoffV95(canonical,receipts,input.verifyPersistedAttempt);
 const cumulative=receipts.reduce((sum,row)=>sum+row.committedGlobalHpDamage,0);
 if(!integer(cumulative)||cumulative>canonical.event.initialHp-canonical.event.remainingHp)
  throw Error('world_boss_damage_invalid_total');
 const crossed=Math.floor(cumulative/p.damagePerRoll);
 const table=defineChestLootTableV67({tableId:'world_boss_damage_chest_earning',version:'wb97_'+p.entropyVersion,
  guarantees:[],groups:[{id:'chest',type:'material',chanceBps:1000,duplicatePolicy:'allow_duplicates',
   entries:[{id:'personal_damage_chest',weight:1}]}]});
 const rolls:DamageChestRollV97[]=[];
 let wins=0;
 for(let ordinal=1;ordinal<=crossed&&wins<3;ordinal++){
  if(ordinal>1000)throw Error('world_boss_damage_review_budget_exceeded');
  const sourceKey='world-boss:'+p.eventId.toLowerCase()+':'+p.accountId.toLowerCase()+':damage:'+ordinal;
  const roll=deriveChestGroupRollsV67({table,sourceKey,secret,ownedDropIds:[]})[0].hitRoll;
  const hit=roll<1000;
  rolls.push({ordinal,thresholdDamage:ordinal*p.damagePerRoll,roll,hit,sourceKey});
  if(hit)wins++;
 }
 if(previous.length>rolls.length||Array.from(previous).some((row,i)=>!row||
  row.ordinal!==rolls[i].ordinal||row.thresholdDamage!==rolls[i].thresholdDamage||
  row.roll!==rolls[i].roll||row.hit!==rolls[i].hit||row.sourceKey!==rolls[i].sourceKey))
  throw Error('world_boss_damage_history_mismatch');
 return {cumulativeDamage:cumulative,damagePerRoll:p.damagePerRoll,rolls,
  newRolls:rolls.slice(previous.length),earnedChestCount:wins,
  damageToNextRoll:wins===3?null:p.damagePerRoll-cumulative%p.damagePerRoll,
  capReached:wins===3,claimEnabled:false as const,rewardGranted:false as const,releaseReady:false as const};
}
