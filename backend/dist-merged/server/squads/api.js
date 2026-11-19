"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQUAD_API_NAMES = void 0;
exports.validateSaveSquad = validateSaveSquad;
exports.resolveSquadArenaRequest = resolveSquadArenaRequest;
const roster_1 = require("./roster");
const arena_1 = require("./arena");
exports.SQUAD_API_NAMES = ['save_squad', 'publish_arena_defense', 'find_arena_opponents', 'start_squad_arena_match', 'claim_squad_arena_reward', 'start_triad_trial', 'resolve_triad_trial_floor', 'resume_triad_trial'];
function validateSaveSquad(r) { if (!r.requestId)
    throw new Error('request_id_required'); return (0, roster_1.validateThreeCharacterSquad)(r.squad, r.ownedCharacters); }
function resolveSquadArenaRequest(r) { if (!r.requestId)
    throw new Error('request_id_required'); return (0, arena_1.resolveArena3v3)(r.attacker, r.defender, r.seed); }
