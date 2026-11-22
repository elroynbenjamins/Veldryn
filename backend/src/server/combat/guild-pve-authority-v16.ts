/**
 * Guild Expeditions V16 — HIDDEN read-only server principal / consistent snapshot port.
 * No transport, SQL implementation, payouts or character mutations.
 *
 * The host MUST provide the authenticated principal independently of request data
 * and run the callback inside a real REPEATABLE READ database read transaction
 * (or a stricter isolation level) against account-filtered rows.
 *
 * This boundary models those guarantees; it does NOT implement DB authentication.
 */
import type {GameState} from '../../../apps/mobile/src/core/types';
import {GuildPveV12VerifiedActorLoader} from '../../online/guild-pve-verified-loader-v12';
import {projectGuildPveV15Campaign,type GuildPveV15Snapshot} from './guild-pve-progress-v15';
import type {GuildPveV9StoreState} from './guild-pve-transaction-v9';

export const GUILD_PVE_V16_LIVE=false as const;
const safeId=(v:unknown):v is string=>
 typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9:_-]{1,99}$/.test(v);
const positive=(v:unknown):v is number=>
 typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
const fail=(reason:string):never=>{throw Error('guild_pve_v16_'+reason)};

export interface GuildPveV16Membership {
 guildId:string;accountId:string;joinedAtUtcMs:number;
}
export interface GuildPveV16CharacterRow {
 ownerAccountId:string;characterId:string;revision:number;state:GameState;
}
/**
 * All rows MUST be fetched by the trusted host in one database snapshot,
 * with guild_members.account_id and online_game_states.account_id both
 * matching the authenticated principal; no client-provided GameState.
 * guildRoster and frozen run must originate from private expedition storage,
 * not the existing weekly guild_pve_* Hunt tables.
 */
export interface GuildPveV16ConsistentRead {
 authenticatedAccountId:string;
 membership:GuildPveV16Membership|null;
 character:GuildPveV16CharacterRow|null;
 ledger:GuildPveV9StoreState|null;
 /** Read from the same versioned guild_runs row as the ledger. */
 expeditionRevision:number;
 /** Database clock, not a request timestamp. */
 serverNowUtcMs:number;
}
export interface GuildPveV16TrustedReadPort {
 /** Already validated through current server session/token, NEVER user_metadata. */
 verifiedPrincipalAccountId():Promise<string|null>;
 /** Must be a true DB transaction with one consistent account-filtered view. */
 withConsistentRead<T>(selection:{
  principalAccountId:string;guildId:string;cycleId:string;characterId:string;
 },use:(snapshot:GuildPveV16ConsistentRead)=>Promise<T>):Promise<T>;
}
export interface GuildPveV16PrivateView {
 /** Authorized for later server-internal decisions ONLY; never serialize publicly. */
 actorSourceHash:string;characterRevision:number;actorRole:'tank'|'damage'|'support';
 progress:GuildPveV15Snapshot;
 /** This proof is read-only: not permission to spend an attempt or grant XP. */
 canCommit:false;canClaim:false;
}
export class GuildPveV16PrivateReadService {
 constructor(private readonly reader:GuildPveV16TrustedReadPort){}
 async inspect(selection:{cycleId:string;guildId:string;characterId:string}):
 Promise<GuildPveV16PrivateView> {
  const accountId=await this.reader.verifiedPrincipalAccountId();
  if(!safeId(accountId))fail('unauthenticated');
  if(!safeId(selection.cycleId)||!safeId(selection.guildId)||
   !safeId(selection.characterId))fail('invalid_selection');
  return this.reader.withConsistentRead({
   principalAccountId:accountId,guildId:selection.guildId,
   cycleId:selection.cycleId,characterId:selection.characterId,
  },async read=>{
   if(!read||read.authenticatedAccountId!==accountId)
    fail('principal_snapshot_mismatch');
   // The trusted DB callback owns repeatable-read isolation. Copy the
   // complete observation before the first asynchronous actor derivation so
   // a mutable/mock repository cannot silently change the read mid-flight.
   const frozen=structuredClone(read);
   if(!Number.isSafeInteger(frozen.serverNowUtcMs)||frozen.serverNowUtcMs<0)
    fail('invalid_clock');
   const {membership,character,ledger}=frozen;
   if(!membership||membership.accountId!==accountId||
    membership.guildId!==selection.guildId||
    !Number.isSafeInteger(membership.joinedAtUtcMs)||
    membership.joinedAtUtcMs<0)fail('not_current_guild_member');
   if(!character||character.ownerAccountId!==accountId||
    character.characterId!==selection.characterId||
    !positive(character.revision)||!character.state)
    fail('not_owned_character');
   if(!ledger)fail('missing_private_expedition');
   const run=ledger.guildRuns[JSON.stringify([selection.cycleId,selection.guildId])];
   if(!run||!Number.isSafeInteger(frozen.expeditionRevision)||
    frozen.expeditionRevision<0||run.revision!==frozen.expeditionRevision)
    fail('stale_expedition_revision');
   if(!Object.hasOwn(run.members,accountId))
    fail('not_in_frozen_roster');
   // Late-join eligibility is intentionally NOT assumed. This fail-closed
   // gate must be redesigned only after guild-tenure rules are approved.
   if(membership.joinedAtUtcMs>run.startMs)fail('late_join_not_authorized');
   const bound=ledger.cycleBindings[JSON.stringify([selection.cycleId,accountId])];
   if(bound&&bound!==selection.guildId)fail('bound_to_other_guild');
   // V12 performs exact account-owned equipment copy, class, companion and
   // saved GameState checks in the same transactional reader scope.
   const source=structuredClone(character);
   const trusted=new GuildPveV12VerifiedActorLoader({
    async readOwnedState({accountId:requestedAccount,characterId:requestedCharacter}){
     return requestedAccount===accountId&&requestedCharacter===selection.characterId
      ?{ownerAccountId:source.ownerAccountId,characterId:source.characterId,
        revision:source.revision,state:source.state}
      :null;
    },
   });
   const actor=await trusted.resolveOwnedActor(accountId,selection.characterId);
   if(!['tank','damage','support'].includes(actor.actor.role))
    fail('invalid_actor_role');
   const progress=projectGuildPveV15Campaign({
    state:structuredClone(ledger),cycleId:selection.cycleId,
    guildId:selection.guildId,nowUtcMs:frozen.serverNowUtcMs,
   });
   return {
    actorSourceHash:actor.sourceHash,
    characterRevision:actor.gameRevision,
    actorRole:actor.actor.role as 'tank'|'damage'|'support',
    progress,canCommit:false as const,canClaim:false as const,
   };
  });
 }
}
