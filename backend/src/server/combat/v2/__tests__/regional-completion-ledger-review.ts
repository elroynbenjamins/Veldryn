/** Private, pure progression contract. Not a DB migration or runtime authority.
 * Caller must load evidence from authenticated, server-owned storage.
 * Never accept evidence, ledger or verifier from a client. */
import {COMPLETION_BOSSES_REVIEW_V2,type CompletionBossIdV2} from './regional-completion-boss-review';
type Chapter='asterfall'|'sunscar'|'frostmarch'|'region4';
type Identity={accountId:string;characterId:string};
type Victory={accountId:string;characterId:string;receiptId:string;bossId:CompletionBossIdV2;
 kind:'regional_completion';levelAtStart:number;inputDigest:string;eventDigest:string;
 reason:'victory'|'wipe'|'timeout';victory:boolean;enemyHp:number;playerHp:number;completedAtMs:number;
 ruleset:'completion-v2-review'};
type LegacyEvidence={accountId:string;characterId:string;source:'legacy_story_state'|'legacy_regional_receipt';
 sourceId:string;bossId:CompletionBossIdV2;victory:boolean};
type Entry={bossId:CompletionBossIdV2;sourceId:string;source:'v2_receipt'|'legacy_story_state'|'legacy_regional_receipt'};
export type CompletionLedgerReviewV2=Identity&{entries:readonly Entry[];legacyTravel:readonly Chapter[]};
const hex=(s:string)=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const own=(a:Identity,b:Identity)=>a.accountId===b.accountId&&a.characterId===b.characterId;
const profile=(id:CompletionBossIdV2)=>COMPLETION_BOSSES_REVIEW_V2.find(p=>p.id===id);
export function createCompletionLedgerReviewV2(identity:Identity,verifiedExistingTravel:readonly Chapter[]=[]):CompletionLedgerReviewV2{
 if(!identity.accountId||!identity.characterId||verifiedExistingTravel.some(c=>!['asterfall','sunscar','frostmarch'].includes(c)))throw Error('invalid_completion_identity_or_travel');
 return {...identity,entries:[],legacyTravel:[...new Set(verifiedExistingTravel)]};
}
export function completionAccessReviewV2(ledger:CompletionLedgerReviewV2){
 const has=(id:CompletionBossIdV2)=>ledger.entries.some(e=>e.bossId===id);
 const sun=has('FALLEN_KNIGHT'),frost=sun&&has('BOSS_002');
 return {asterfall:true,sunscar:sun||ledger.legacyTravel.includes('sunscar')||ledger.legacyTravel.includes('frostmarch'),
  frostmarch:frost||ledger.legacyTravel.includes('frostmarch'),region4:false,
  frostCompletionRecorded:has('BOSS_003'),releaseEnabled:false as const,rewardEnabled:false as const};
}
function append(ledger:CompletionLedgerReviewV2,e:Entry){
 const bySource=ledger.entries.find(x=>x.source===e.source&&x.sourceId===e.sourceId);
 if(bySource&&bySource.bossId!==e.bossId)throw Error('completion_source_conflict');
 if(ledger.entries.some(x=>x.bossId===e.bossId))return {ledger,duplicate:true,grant:false as const};
 return {ledger:{...ledger,entries:[...ledger.entries,e]},duplicate:false,grant:false as const};
}
export function reviewCompletionVictoryV2(ledger:CompletionLedgerReviewV2,e:Victory,verify:(e:Readonly<Victory>)=>boolean){
 const p=profile(e.bossId);
 if(!p||!own(ledger,e)||!e.receiptId||e.kind!=='regional_completion'||e.ruleset!=='completion-v2-review'||
  !Number.isSafeInteger(e.levelAtStart)||e.levelAtStart<p.level||!hex(e.inputDigest)||!hex(e.eventDigest)||
  !Number.isSafeInteger(e.completedAtMs)||e.completedAtMs<=0||e.reason!=='victory'||e.victory!==true||
  e.enemyHp!==0||!Number.isFinite(e.playerHp)||e.playerHp<=0)throw Error('invalid_completion_victory');
 const frozen=Object.freeze({...e});
 if(!verify(frozen))throw Error('unverified_completion_victory');
 const access=completionAccessReviewV2(ledger);
 if(!access[p.region])throw Error('completion_region_locked');
 return append(ledger,{bossId:e.bossId,sourceId:e.receiptId,source:'v2_receipt'});
}
export function reviewLegacyCompletionV2(ledger:CompletionLedgerReviewV2,e:LegacyEvidence,verify:(e:Readonly<LegacyEvidence>)=>boolean){
 // Explicit source allowlist: Fallen Knight server state and the actual
 // Sunscar regional receipt only. No assumed Frostmarch historical receipt.
 if(!own(ledger,e)||!e.sourceId||e.victory!==true||
 !((e.source==='legacy_story_state'&&e.bossId==='FALLEN_KNIGHT')||(e.source==='legacy_regional_receipt'&&e.bossId==='BOSS_002')))
  throw Error('invalid_legacy_completion_evidence');
 if(!verify(Object.freeze({...e})))throw Error('unverified_legacy_completion');
 return append(ledger,{bossId:e.bossId,sourceId:e.sourceId,source:e.source});
}
