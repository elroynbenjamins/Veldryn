import type {CompanionDefinition} from '../core/combat-companion-types';
import {EVENT_COMPANIONS} from './event-companions-v2';

/** Only companions from released event packs may enter the player-facing roster. */
const RELEASED_EVENT_COMPANION_IDS=new Set(['EVT_UNIT_007','EVT_UNIT_008','EVT_UNIT_011']);

export const RELEASED_EVENT_COMPANIONS:readonly CompanionDefinition[]=
 EVENT_COMPANIONS.filter(companion=>RELEASED_EVENT_COMPANION_IDS.has(companion.id));
