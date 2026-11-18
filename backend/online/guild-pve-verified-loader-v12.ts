/**
 * Guild Expeditions V12 — HIDDEN, server-owned GameState -> V9 combat actor.
 * Not a route or an authentication layer. Only a server repository that already
 * authenticated the account and owns the saved GameState may implement reader.
 * Never pass client JSON, selected equipment, attack, companion, or revision in.
 */
import type {GameState} from '../../apps/mobile/src/core/types';
import {verifyPartyEventEquippedCopyOwnershipV4} from './party-event-loadout-v4';
import {deriveOnlineCoopLoadout,onlineCoopLoadoutHash} from './coop-loadout';
import {combatantFromVerifiedSnapshot} from '../src/server/combat/snapshot-adapter';
import {deriveRole} from '../src/server/coop/role-readiness';
import type {GuildPveV9TrustedLoader} from '../src/server/combat/guild-pve-transaction-v9';

export const GUILD_PVE_V12_LIVE=false as const;
export interface GuildPveV12OwnedState {
  /** Verified by the server DB repository, not supplied by the player. */
  ownerAccountId:string;
  characterId:string;
  /** Current online_game_states revision, read together with the state. */
  revision:number;
  state:GameState;
}
export interface GuildPveV12ServerReader {
  /** Must enforce account ownership in SQL, using authenticated identity. */
  readOwnedState(input:{accountId:string;characterId:string}):
    Promise<GuildPveV12OwnedState|null>;
}
const safeId=(id:unknown):id is string=>
  typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9:_-]{1,99}$/.test(id);

/** A narrow adapter for the V9 domain port, NOT a general-purpose trust source.
 * Does not turn the V10/V11 fixture database into deployable persistence.
 */
export class GuildPveV12VerifiedActorLoader implements GuildPveV9TrustedLoader {
  constructor(private readonly reader:GuildPveV12ServerReader){}
  async resolveOwnedActor(principalAccountId:string,characterId:string) {
    if(!safeId(principalAccountId)||!safeId(characterId))
      throw Error('guild_pve_v12_invalid_identity');
    const row=await this.reader.readOwnedState({
      accountId:principalAccountId,characterId,
    });
    if(!row||row.ownerAccountId!==principalAccountId||
      row.characterId!==characterId||
      row.state?.character?.id!==characterId)
      throw Error('guild_pve_v12_character_not_owned');
    if(!Number.isSafeInteger(row.revision)||row.revision<1)
      throw Error('guild_pve_v12_invalid_server_revision');
    // Do not retain a mutable reference to the repository's state. All
    // authorization and loadout checks run on a private current-state copy.
    const state=structuredClone(row.state);
    verifyPartyEventEquippedCopyOwnershipV4(state);
    const record=deriveOnlineCoopLoadout(principalAccountId,state,row.revision);
    if(record.accountId!==principalAccountId||
      record.characterId!==characterId||
      record.revision!==row.revision||!record.legalEquipment)
      throw Error('guild_pve_v12_illegal_loadout');
    const actor=combatantFromVerifiedSnapshot({
      ...record.stats,
      role:deriveRole(record.classId),
      level:record.combatScalingLevel??record.characterLevel,
    },record.abilities);
    if(actor.id!==characterId||actor.team!=='players'||
      !Number.isFinite(actor.stats.attackPower)||actor.stats.attackPower<=0)
      throw Error('guild_pve_v12_invalid_actor');
    return {
      actor,characterId,
      gameRevision:row.revision,
      sourceHash:onlineCoopLoadoutHash(record),
    };
  }
}
