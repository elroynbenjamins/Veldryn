import type {CombatantDefinition} from '../types';
import {ASTERFALL_ENCOUNTERS} from './asterfall-encounters';
import {SUNSCAR_ENCOUNTERS} from './sunscar-encounters';

export const EXPEDITION_ENCOUNTERS:Readonly<Record<string,()=>CombatantDefinition[]>>=Object.freeze({...ASTERFALL_ENCOUNTERS,...SUNSCAR_ENCOUNTERS});
