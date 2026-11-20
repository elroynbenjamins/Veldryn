/**
 * Party Events V48 — HIDDEN server-only canonical commit selection.
 *
 * DO NOT change RELEASED until the V11–V47 schema has been independently
 * reviewed and installed on staging with exact-head green CI.
 *
 * This module receives ONLY the authoritative executeGameCommand result and
 * the existing verified online-game commit arguments. Never accept its
 * parameters from a mobile request body or a user JWT context.
 */
import type {GameCommandResult} from '../../apps/mobile/src/core/game-commands';
import type {ActiveActivity} from '../../apps/mobile/src/core/types';
import {preparePartySourcePacketV44} from './party-event-canonical-source-packet-v44';

export const PARTY_EVENT_GAMEPLAY_COMMIT_V48_RELEASED=false;

export type OnlineGameCanonicalCommitArgsV48=Readonly<{
 p_account_id:string;
 p_expected_version:number;
 p_expected_gold:number|null;
 p_request_id:string;
 p_request_hash:string;
 p_response:unknown;
 p_contributions:readonly unknown[];
 p_deleted_character_id?:string;
}>;
export type OnlineGameCanonicalCommitV48=Readonly<{
 rpc:'commit_online_game_guild_pve_v1'|'commit_online_game_party_sources_server_v48';
 args:OnlineGameCanonicalCommitArgsV48 & {p_packet?:ReturnType<typeof preparePartySourcePacketV44>};
 sourceCount:number;
 hidden:true;
}>;
export interface TrustedServerGameCommitContextV48 {
 readonly enableDraftBridge:boolean;
 readonly adminQa:boolean;
 readonly commandType:string;
 readonly trustedServerNowMs:number;
 readonly previousActivity:ActiveActivity|null;
 readonly result:GameCommandResult;
 readonly normalArgs:OnlineGameCanonicalCommitArgsV48;
}

function fallback(args:OnlineGameCanonicalCommitArgsV48):OnlineGameCanonicalCommitV48{
 return {rpc:'commit_online_game_guild_pve_v1',args,sourceCount:0,hidden:true};
}

/**
 * V48 is a selection function, not an action. Default-off. In an approved
 * future staging integration this must only be called from the trusted server.
 *
 * Do not switch create/delete/roster/QA commands to V45; the draft V45 SQL
 * intentionally requires an existing live character and no deletion. If no
 * verified eligible source exists, preserve the ordinary commit unchanged.
 */
export function planHiddenPartyGameCommitV48(
 input:TrustedServerGameCommitContextV48,
):OnlineGameCanonicalCommitV48{
 const {normalArgs:args}=input;
 if(!input.enableDraftBridge||input.adminQa
  ||/^(qa_|roster_|create$|delete$)/.test(input.commandType)
  ||args.p_deleted_character_id!==undefined
  ||!input.result?.state?.character?.id
  ||args.p_contributions.length>4){
  return fallback(args);
 }
 // A command result may contain a claim but no settled, eligible receipt.
 // This is not an error: it is simply the normal gameplay commit path.
 const packet=preparePartySourcePacketV44({
  accountId:args.p_account_id,
  characterId:input.result.state.character.id,
  requestId:args.p_request_id,
  trustedServerNowMs:input.trustedServerNowMs,
  adminQa:input.adminQa,
  previousActivity:input.previousActivity,
  result:input.result,
 });
 const sourceCount=packet.craft.length+packet.idle.length;
 if(sourceCount===0)return fallback(args);
 // The old commit remains inside V45's single PostgreSQL transaction.
 return {rpc:'commit_online_game_party_sources_server_v48',
  args:{...args,p_packet:packet},sourceCount,hidden:true};
}
