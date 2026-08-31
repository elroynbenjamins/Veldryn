import {SquadDefinition,AccountCharacterSummary,validateThreeCharacterSquad} from './roster';
import {ArenaSquadSnapshot,resolveArena3v3} from './arena';
export const SQUAD_API_NAMES=['save_squad','publish_arena_defense','find_arena_opponents','start_squad_arena_match','claim_squad_arena_reward','start_triad_trial','resolve_triad_trial_floor','resume_triad_trial'] as const;
export interface SaveSquadRequest{requestId:string;squad:SquadDefinition;ownedCharacters:AccountCharacterSummary[];}
export function validateSaveSquad(r:SaveSquadRequest){if(!r.requestId)throw new Error('request_id_required');return validateThreeCharacterSquad(r.squad,r.ownedCharacters);}
export interface ResolveSquadArenaRequest{requestId:string;seed:string;attacker:ArenaSquadSnapshot;defender:ArenaSquadSnapshot;}
export function resolveSquadArenaRequest(r:ResolveSquadArenaRequest){if(!r.requestId)throw new Error('request_id_required');return resolveArena3v3(r.attacker,r.defender,r.seed);}
