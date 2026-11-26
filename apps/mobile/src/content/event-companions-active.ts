import type {CompanionDefinition} from '../core/combat-companion-types';
import {EVENT_COMPANIONS} from './event-companions-v2';
import {FROSTFALL_REWARDS_RELEASED} from '../core/release-flags';

/** Only companions from released event packs may enter the player-facing roster. */
const RELEASED_EVENT_COMPANION_IDS=new Set(['EVT_UNIT_007','EVT_UNIT_008','EVT_UNIT_011']);
/** Frostfall companions must remain hidden until explicit reward and artwork approval. */
export const FROSTFALL_COMPANION_IDS=new Set(['EVT_UNIT_009','EVT_UNIT_012','EVT_UNIT_013']);

export const RELEASED_EVENT_COMPANIONS:readonly CompanionDefinition[]=
 EVENT_COMPANIONS.filter(companion=>RELEASED_EVENT_COMPANION_IDS.has(companion.id)
  || (FROSTFALL_REWARDS_RELEASED&&FROSTFALL_COMPANION_IDS.has(companion.id)));
