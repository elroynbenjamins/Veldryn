import type {CompanionDefinition} from './combat-companion-types';
import {COMPANION_AFFINITY_BY_ID,companionAffinityById,type CompanionAffinity} from '../../../../backend/src/shared/companion-affinity-catalog';

export type {CompanionAffinity};
export {COMPANION_AFFINITY_BY_ID};

export const COMPANION_AFFINITIES:Record<CompanionAffinity,{label:string;glyph:string;description:string}>={
 wild:{label:'Wild',glyph:'❧',description:'Beasts, natural hunters and untamed creatures.'},
 arcane:{label:'Arcane',glyph:'✧',description:'Echo, rune and magical entities.'},
 radiant:{label:'Radiant',glyph:'✦',description:'Faith, dawn and protective light.'},
 umbral:{label:'Umbral',glyph:'◐',description:'Gloam, shadow and spectral entities.'},
 primal:{label:'Primal',glyph:'▲',description:'Elemental, ancient and raw regional forces.'},
 construct:{label:'Construct',glyph:'⬡',description:'Forged, bound and artificial companions.'},
};
export function companionAffinity(def:CompanionDefinition):CompanionAffinity{return def.affinity??companionAffinityById(def.id);}
export function companionAffinityDiversity(defs:CompanionDefinition[]){return new Set(defs.map(companionAffinity)).size;}
