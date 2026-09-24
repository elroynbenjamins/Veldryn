import type {CompanionAffinity,CompanionDefinition} from './combat-companion-types';

export const COMPANION_AFFINITIES:Record<CompanionAffinity,{label:string;glyph:string;description:string}>={
 wild:{label:'Wild',glyph:'❧',description:'Beasts, natural hunters and untamed creatures.'},
 arcane:{label:'Arcane',glyph:'✧',description:'Echo, rune and magical entities.'},
 radiant:{label:'Radiant',glyph:'✦',description:'Faith, dawn and protective light.'},
 umbral:{label:'Umbral',glyph:'◐',description:'Gloam, shadow and spectral entities.'},
 primal:{label:'Primal',glyph:'▲',description:'Elemental, ancient and raw regional forces.'},
 construct:{label:'Construct',glyph:'⬡',description:'Forged, bound and artificial companions.'},
};
export function companionAffinity(def:CompanionDefinition):CompanionAffinity{
 if(def.affinity)return def.affinity;
 const text=(def.name+' '+def.archetype+' '+def.origin.name).toLowerCase();
 if(/automaton|sentry|knightling|construct|forge|runebound/.test(text))return 'construct';
 if(/dawn|faith|wing|light|page|oathbound/.test(text))return 'radiant';
 if(/gloam|shade|shadow|wraith|memory/.test(text))return 'umbral';
 if(/sprite|echo|wisp|rune|arcane|glass/.test(text))return 'arcane';
 if(/sunscar|frost|ash|titan|treant|briar|element/.test(text))return 'primal';
 return 'wild';
}
export function companionAffinityDiversity(defs:CompanionDefinition[]){return new Set(defs.map(companionAffinity)).size;}
