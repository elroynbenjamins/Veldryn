import {strict as assert} from 'node:assert';
import {createCompletionLedgerReviewV2,completionAccessReviewV2,reviewCompletionVictoryV2,reviewLegacyCompletionV2,type CompletionVictoryEvidenceV2,type LegacyCompletionEvidenceV2} from './regional-completion-ledger-review';
import type {CompletionBossIdV2} from './regional-completion-boss-review';
export function runRegionalCompletionLedgerReviewV2(){
 const identity={accountId:'QA_ACCOUNT_A',characterId:'QA_CHARACTER_A'};
 const base=createCompletionLedgerReviewV2(identity);
 const digest='a'.repeat(64),eventDigest='b'.repeat(64);
 const evidence=(bossId:CompletionBossIdV2,levelAtStart:number,receiptId:string):CompletionVictoryEvidenceV2=>({...identity,receiptId,bossId,levelAtStart,
 kind:'regional_completion',ruleset:'completion-v2-review',inputDigest:digest,eventDigest,reason:'victory',victory:true,enemyHp:0,playerHp:20,completedAtMs:1000});
 const knight=evidence('FALLEN_KNIGHT',25,'QA_KNIGHT'),sand=evidence('BOSS_002',50,'QA_SAND'),frost=evidence('BOSS_003',75,'QA_FROST');
 // Exact server-owned fixture rows, not a verifier that accepts any digest.
 const stored=new Map([knight,sand,frost].map(x=>[x.receiptId,JSON.stringify(x)]));
 const verify=(x:Readonly<CompletionVictoryEvidenceV2>)=>stored.get(x.receiptId)===JSON.stringify(x);
 assert.deepEqual(completionAccessReviewV2(base),{asterfall:true,sunscar:false,frostmarch:false,region4:false,frostCompletionRecorded:false,releaseEnabled:false,rewardEnabled:false});
 assert.throws(()=>reviewCompletionVictoryV2(base,sand,verify),/region_locked/);
 assert.throws(()=>reviewCompletionVictoryV2(base,frost,verify),/region_locked/);
 const bad:Partial<CompletionVictoryEvidenceV2>[]=[
  {accountId:'QA_OTHER'},{characterId:'QA_OTHER'},{levelAtStart:24},{levelAtStart:25.5},{reason:'timeout'},{reason:'wipe'},
  {victory:false},{enemyHp:1},{playerHp:0},{playerHp:NaN},{completedAtMs:0},{inputDigest:'bad'},{eventDigest:'bad'},
  {receiptId:''},{receiptId:'QA_UNKNOWN'},{inputDigest:'c'.repeat(64)},{completedAtMs:1001},
 ];
 for(const patch of bad)assert.throws(()=>reviewCompletionVictoryV2(base,{...knight,...patch},verify),/invalid_completion_victory|unverified_completion_victory/);
 const snapshot=JSON.stringify(base);
 const one=reviewCompletionVictoryV2(base,knight,verify);
 assert.equal(JSON.stringify(base),snapshot);assert.equal(one.duplicate,false);assert.equal(one.grant,false);
 assert.equal(completionAccessReviewV2(one.ledger).sunscar,true);assert.equal(completionAccessReviewV2(one.ledger).frostmarch,false);
 assert.deepEqual(reviewCompletionVictoryV2(one.ledger,knight,verify),{ledger:one.ledger,duplicate:true,grant:false});
 const two=reviewCompletionVictoryV2(one.ledger,sand,verify);
 const three=reviewCompletionVictoryV2(two.ledger,frost,verify);
 assert.equal(completionAccessReviewV2(two.ledger).frostmarch,true);
 assert.equal(completionAccessReviewV2(three.ledger).frostCompletionRecorded,true);
 assert.equal(completionAccessReviewV2(three.ledger).region4,false);
 const replay={...knight,receiptId:'QA_KNIGHT_REMATCH'};
 stored.set(replay.receiptId,JSON.stringify(replay));
 const repeat=reviewCompletionVictoryV2(three.ledger,replay,verify);
 assert.equal(repeat.duplicate,true);assert.equal(repeat.grant,false);
 const collision={...sand,receiptId:replay.receiptId};
 stored.set(collision.receiptId,JSON.stringify(collision));
 assert.throws(()=>reviewCompletionVictoryV2(repeat.ledger,collision,verify),/source_conflict/);
 const legacyKnight:LegacyCompletionEvidenceV2={...identity,source:'legacy_story_state',sourceId:'QA_STATE_REV_7',bossId:'FALLEN_KNIGHT',victory:true};
 const legacySand:LegacyCompletionEvidenceV2={...identity,source:'legacy_regional_receipt',sourceId:'QA_OLD_RECEIPT',bossId:'BOSS_002',victory:true};
 const historical=new Map([legacyKnight,legacySand].map(x=>[x.sourceId,JSON.stringify(x)]));
 const verifyLegacy=(x:Readonly<LegacyCompletionEvidenceV2>)=>historical.get(x.sourceId)===JSON.stringify(x);
 const importedSand=reviewLegacyCompletionV2(base,legacySand,verifyLegacy);
 assert.equal(completionAccessReviewV2(importedSand.ledger).frostmarch,false);
 const imported=reviewLegacyCompletionV2(importedSand.ledger,legacyKnight,verifyLegacy);
 assert.equal(completionAccessReviewV2(imported.ledger).frostmarch,true);
 assert.equal(reviewLegacyCompletionV2(imported.ledger,legacyKnight,verifyLegacy).duplicate,true);
 assert.throws(()=>reviewLegacyCompletionV2(base,{...legacySand,bossId:'BOSS_003'},verifyLegacy),/invalid_legacy_completion/);
 assert.throws(()=>reviewLegacyCompletionV2(base,{...legacyKnight,characterId:'QA_OTHER'},verifyLegacy),/invalid_legacy_completion/);
 assert.throws(()=>reviewLegacyCompletionV2(base,legacyKnight,()=>false),/unverified_legacy_completion/);
 assert.throws(()=>createCompletionLedgerReviewV2(identity,['region4']),/invalid_completion_identity/);
 const preserved=createCompletionLedgerReviewV2(identity,['frostmarch']);
 assert.equal(completionAccessReviewV2(preserved).sunscar,true);assert.equal(completionAccessReviewV2(preserved).frostmarch,true);
 assert.equal(preserved.entries.length,0);assert.equal(completionAccessReviewV2(preserved).region4,false);
 const existingVictory=reviewCompletionVictoryV2(preserved,frost,verify);
 assert.equal(completionAccessReviewV2(existingVictory.ledger).frostCompletionRecorded,true);
 assert.equal(completionAccessReviewV2(existingVictory.ledger).region4,false);
 console.log('REGIONAL_COMPLETION_LEDGER_REVIEW '+JSON.stringify({invalidReceiptCases:bad.length,threeOrderedCompletions:true,
  idempotentRematch:true,receiptCollisionRejected:true,legacyOutOfOrderSafe:true,verifiedExistingAccessPreserved:true,
  unverifiedLegacyRejected:true,region4Enabled:false,releaseEnabled:false,rewardEnabled:false,productionPersistenceVerified:false}));
}
