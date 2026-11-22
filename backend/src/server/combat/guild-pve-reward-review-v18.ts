/**
 * Guild PvE V18 — nonpaying reward proof, never an entitlement mint.
 * A read-only audit from already committed V18 action receipts. Role credit
 * is bounded per action; there is no last-hit reward, wallet or outbox writer.
 */
import {createHash} from 'node:crypto';
import {GUILD_PVE_V8_MANIFEST} from './guild-pve-shared-v8';
import type {GuildPveV18Receipt,GuildPveV18StoreState} from './guild-pve-settlement-v18';

export const GUILD_PVE_V18_REWARDS_ENABLED=false as const;
const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const safe=(v:unknown):v is string=>
 typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9:_-]{1,99}$/.test(v);
const required=GUILD_PVE_V8_MANIFEST.filter(n=>n.required&&n.boss).map(n=>n.id);
function fail(message:string):never{throw Error('guild_pve_v18_reward_'+message);}
export interface GuildPveV18RewardReview {
 cycleId:string;guildId:string;accountId:string;
 band:'none'|'partial_review'|'full_review';
 reason:'not_frozen_member'|'cross_guild_binding'|'no_verified_action'|
  'partial_progress'|'campaign_complete';
 verifiedActions:number;verifiedHpCredit:number;
 verifiedHealing:number;verifiedShielding:number;verifiedCleanses:number;
 cappedFairUnits:number;
 requiredNodesCleared:number;requiredNodesTotal:7;
 finalizationVerified:false;canClaim:false;rewardGranted:false;
 tokenAmount:null;guildXpAmount:null;cosmeticId:null;
 sourceEvidenceDigest:string;
}
export function reviewGuildPveV18Reward(input:{
 state:GuildPveV18StoreState;cycleId:string;guildId:string;accountId:string;
}):GuildPveV18RewardReview {
 const {state,cycleId,guildId,accountId}=input;
 if(!safe(cycleId)||!safe(guildId)||!safe(accountId))fail('invalid_identity');
 const run=state.guild.guildRuns[JSON.stringify([cycleId,guildId])];
 if(!run)fail('unknown_run');
 const frozen=Object.hasOwn(run.members,accountId);
 const binding=state.guild.cycleBindings[JSON.stringify([cycleId,accountId])];
 const competing=Boolean(binding&&binding!==guildId);
 const cleared=required.filter(id=>run.nodes[id]?.cleared&&run.nodes[id]?.hp===0).length;
 if(cleared>7||required.some(id=>!run.nodes[id]))fail('invalid_node_state');
 let actions=0,hp=0,healing=0,shield=0,cleanses=0,fair=0;
 const evidence:readonly (readonly [string,string])[]=[];
 const ownEvidence:Array<readonly [string,string]>=[];
 for(const [key,entry] of Object.entries(state.receipts)){
  const r=entry.value as GuildPveV18Receipt;
  if(r.cycleId!==cycleId||r.accountId!==accountId)continue;
  if(key!==JSON.stringify([cycleId,accountId,r.requestId])||
   !/^[a-f0-9]{64}$/.test(entry.fingerprint)||
   !safe(r.requestId)||!safe(r.guildId)||
   r.rewardGranted!==false||r.walletWritten!==false||r.outboxCreated!==false)
   fail('invalid_receipt');
  if(r.guildId!==guildId)continue;
  if(!frozen)fail('unrostered_receipt');
  ownEvidence.push([key,entry.fingerprint]);
  if(r.status==='stale'){
   if(r.sealDebit!==0||r.combat!==null||r.creditedHp!==0)
    fail('stale_has_credit');
   continue;
  }
  if(r.status!=='committed'||r.sealDebit!==1||!r.combat||
   r.actorSourceHash?.length!==64||!Number.isSafeInteger(r.gameRevision)||
   !Number.isFinite(r.creditedHp)||r.creditedHp<0||
   r.creditedHp>r.beforeHp||
   !/^[a-f0-9]{64}$/.test(r.combat.deterministicEvidenceHash)||
   r.combat.rewardMinted!==false||r.combat.serverPersisted!==false)
   fail('unverified_committed_receipt');
  if(!Number.isFinite(r.combat.effectiveHealing)||r.combat.effectiveHealing<0||
   !Number.isFinite(r.combat.absorbedShield)||r.combat.absorbedShield<0||
   !Number.isSafeInteger(r.combat.cleanseEvents)||r.combat.cleanseEvents<0)
   fail('invalid_role_evidence');
  actions++;hp+=r.creditedHp;
  healing+=r.combat.effectiveHealing;
  shield+=r.combat.absorbedShield;
  cleanses+=r.combat.cleanseEvents;
  // Indicative fairness units only. Bonuses can't be farmed above a bounded
  // normalized allowance per committed Seal. No live reward conversion.
  const cap=run.reference.attack;
  fair+=r.creditedHp+
   Math.min(r.combat.effectiveHealing,cap*.4)+
   Math.min(r.combat.absorbedShield,cap*.4)+
   Math.min(r.combat.cleanseEvents,4)*cap*.05;
 }
 const round=(n:number)=>Number(n.toFixed(2));
 const eligible=frozen&&!competing&&actions>0;
 const complete=cleared===7;
 const reason:GuildPveV18RewardReview['reason']=!frozen?'not_frozen_member':
  competing?'cross_guild_binding':!actions?'no_verified_action':
  complete?'campaign_complete':'partial_progress';
 return {
  cycleId,guildId,accountId,
  band:eligible?(complete?'full_review':'partial_review'):'none',
  reason,verifiedActions:actions,verifiedHpCredit:round(hp),
  verifiedHealing:round(healing),verifiedShielding:round(shield),
  verifiedCleanses:cleanses,cappedFairUnits:round(fair),
  requiredNodesCleared:cleared,requiredNodesTotal:7,
  finalizationVerified:false,canClaim:false,rewardGranted:false,
  tokenAmount:null,guildXpAmount:null,cosmeticId:null,
  sourceEvidenceDigest:sha([
   cycleId,guildId,accountId,run.revision,cleared,binding??null,
   ownEvidence.sort((a,b)=>a[0].localeCompare(b[0])),
  ]),
 };
}
