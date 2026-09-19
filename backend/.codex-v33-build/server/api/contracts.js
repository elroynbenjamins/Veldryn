"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_TRUSTED_RPC_NAMES = exports.COOP_API_ROUTES = exports.EQUIPMENT_API_NAMES_V33 = exports.API_NAMES = exports.ANDROID_PACKAGE = void 0;
exports.decideBootstrap = decideBootstrap;
exports.envelope = envelope;
const equipment_api_contract_v33_1 = require("../equipment/equipment-api-contract-v33");
exports.ANDROID_PACKAGE = 'com.elroybenjamins.veldryn';
function decideBootstrap(h, minBuild, activeContent) {
    if (h.buildNumber < minBuild)
        return { allowed: false, forceUpdate: true, contentUpdateRequired: true, reason: 'client_build_too_old' };
    return { allowed: true, forceUpdate: false, contentUpdateRequired: h.contentVersion !== activeContent };
}
function envelope(requestId, contentVersion, data, serverTime = new Date().toISOString()) { return { requestId, serverTime, contentVersion, data }; }
exports.API_NAMES = [...['bootstrap', 'claim_idle_progress', 'create_expedition_run', 'resolve_expedition_encounter', 'claim_expedition_reward', 'craft', 'queue_party', 'publish_echo_profile', 'create_guild', 'contribute_guild_xp', 'queue_arena', 'claim_raid_loot', 'send_chat_message', 'save_squad', 'publish_arena_defense', 'find_arena_opponents', 'start_squad_arena_match', 'claim_squad_arena_reward', 'start_triad_trial', 'resolve_triad_trial_floor', 'resume_triad_trial', 'create_persistent_party_v16', 'join_persistent_party_v16', 'leave_persistent_party_v16', 'browse_recruitment_v16', 'publish_recruitment_post_v16', 'refresh_recruitment_post', 'close_recruitment_post_v16', 'party_social_state_v16', 'claim_party_contract_reward_v16', 'party_rankings_board_v16', 'send_persistent_party_chat_v16', 'apply_to_guild', 'respond_guild_application', 'invite_to_guild', 'respond_guild_invite', 'get_active_liveops_events', 'get_party_event', 'get_party_event_leaderboard', 'get_event_contribution_breakdown', 'claim_liveops_event_reward', 'list_liveops_event_history'], ...equipment_api_contract_v33_1.EQUIPMENT_API_NAMES_V33];
exports.EQUIPMENT_API_NAMES_V33 = equipment_api_contract_v33_1.EQUIPMENT_API_NAMES_V33;
exports.COOP_API_ROUTES = ['GET /coop/entry', 'POST /coop/qmode', 'POST /coop/queue', 'GET /coop/runs/:runId', 'POST /coop/runs/:runId/choose', 'POST /coop/runs/:runId/vote', 'POST /coop/ready/:checkId', 'POST /coop/parties/:partyId/chat'];
/** These RPCs are never exposed as authenticated client actions. */
exports.PARTY_TRUSTED_RPC_NAMES = ['create_party_contract_instance_v16', 'record_party_contract_contribution_v16', 'create_party_contract_rewards_v16', 'settle_party_activity_v16', 'maintain_party_social_v16', 'maintain_party_social_v17', 'process_social_contribution_outbox_v17'];
