import type {CombatantDefinition} from '../types';
import {ASTERFALL_ENCOUNTERS} from './asterfall-encounters';
import {SUNSCAR_ENCOUNTERS} from './sunscar-encounters';
import {FROSTMARCH_ENCOUNTERS,ASHLANDS_ENCOUNTERS} from './regional-encounters';
import {EVENT_ENCOUNTERS} from './event-encounters';

export const EXPEDITION_ENCOUNTERS:Readonly<Record<string,()=>CombatantDefinition[]>>=Object.freeze({...ASTERFALL_ENCOUNTERS,...SUNSCAR_ENCOUNTERS,...FROSTMARCH_ENCOUNTERS,...ASHLANDS_ENCOUNTERS,...EVENT_ENCOUNTERS});
