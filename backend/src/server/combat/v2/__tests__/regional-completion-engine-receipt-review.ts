/** PRIVATE QA adapter: exact reserved input -> actual engine terminal receipt.
 * This module is deliberately in __tests__. No live route, grant, or DB write.
 * Reservation/ownership are disposable fixtures; production issuer not proven.
 */
import type {CombatInput,CombatResult} from '../../types';
import {simulateCombat} from '../../engine';
import {issueEnemyV2EngineAuthority,enemyV2SnapshotDigest} from '../enemy-engine-authority';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import {COMPLETION_BOSSES_REVIEW_V2,type CompletionBossIdV2} from './regional-completion-boss-review';
import type {CompletionVictoryEvidenceV2} from './regional-completion-ledger-review';
type Reservation={accountId:string;characterId:string;actorId:string;receiptId:string;bossId:CompletionBossIdV2;inputDigest:string;startedAtMs:number;revision:number};
const digest=enemyV2SnapshotDigest;
export function completionEventDigestReviewV2(result:CombatResult){
 // Each event is canonicalized separately, then folded in order; no truncation
 // or arbitrary event array size limit and no loss of event identity/order.
 let chain=digest({scope:'regional-completion-events-v2',count:result.events.length});
 for(const event of result.events)chain=digest({chain,event});
 return digest({chain,reason:result.reason,victory:result.victory,durationMs:result.durationMs,
  players:result.players.map(p=>({id:p.definition.id,hp:p.hp,alive:p.alive,downed:p.downed})),
  enemies:result.enemies.map(p=>({id:p.definition.id,hp:p.hp,alive:p.alive,downed:p.downed}))});
}
export function replayRegionalCompletionReceiptReviewV2(reservation:Readonly<Reservation>,input:CombatInput,
 verifyReservation:(r:Readonly<Reservation>)=>boolean):Readonly<CompletionVictoryEvidenceV2>{
 const p=COMPLETION_BOSSES_REVIEW_V2.find(b=>b.id===reservation.bossId);
 const actor=input.players[0],enemy=input.enemies[0];
 if(!p||!reservation.accountId||!reservation.characterId||!reservation.receiptId||
  !Number.isSafeInteger(reservation.revision)||reservation.revision<1||
  !Number.isSafeInteger(reservation.startedAtMs)||reservation.startedAtMs<=0||
  input.players.length!==1||input.enemies.length!==1||input.initialPlayerState!==undefined||
  input.enemyDamageProfile!==undefined||!actor||actor.team!=='players'||actor.combatV2?.version!==2||
  actor.id!==reservation.actorId||actor.level<p.level||!enemy||enemy.team!=='enemies'||
  enemy.id!==p.id||enemy.level!==p.level||enemy.boss!==true||digest(input)!==reservation.inputDigest)
  throw Error('completion_engine_reservation_mismatch');
 const frozen=Object.freeze({...reservation});
 const reservationDigest=digest(frozen);
 if(verifyReservation(frozen)!==true||digest(reservation)!==reservationDigest||digest(input)!==frozen.inputDigest)
  throw Error('completion_engine_reservation_unverified');
 const authority=issueEnemyV2EngineAuthority({source:'server-persisted-v2',version:2,ruleset:ENEMY_V2_RULESET,
  mode:'solo',encounterId:frozen.receiptId,revision:frozen.revision,seed:input.seed,
  playerIds:[actor.id],enemyIds:[enemy.id],bossIds:[enemy.id]},input,
  (_scope,inputDigest)=>inputDigest===frozen.inputDigest);
 const result=simulateCombat(input,authority);
 const completedAtMs=frozen.startedAtMs+result.durationMs;
 if(!Number.isSafeInteger(completedAtMs)||result.reason!=='victory'||!result.victory||
  result.enemies.length!==1||result.enemies[0].definition.id!==frozen.bossId||result.enemies[0].hp!==0||
  result.players.length!==1||result.players[0].definition.id!==frozen.actorId||result.players[0].hp<=0||
  !result.players[0].alive||result.players[0].downed||digest(input)!==frozen.inputDigest)
  throw Error('completion_engine_not_terminal_victory');
 return Object.freeze({accountId:frozen.accountId,characterId:frozen.characterId,receiptId:frozen.receiptId,
  bossId:frozen.bossId,levelAtStart:actor.level,inputDigest:frozen.inputDigest,eventDigest:completionEventDigestReviewV2(result),
  kind:'regional_completion',ruleset:'completion-v2-review',reason:'victory',victory:true,
  enemyHp:result.enemies[0].hp,playerHp:result.players[0].hp,completedAtMs});
}
