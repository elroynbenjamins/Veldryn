import type {GameState} from './types';
import {WAVE2_SETS,WAVE2_READY_SET_IDS,wave2SetFor,wave2Owned} from './profile-cosmetic-wave2';
import {PREMIUM_PROFILE_COSMETICS} from './profile-premium-cosmetics';

export const PROFILE_EFFECTS=[
 {id:'effect_gloamward_wisps',name:'Arcane Wisps',collection:'Gloamward',borderId:'cosmetic:gloamward:arcane-frame',borderName:'Gloamward Arcane Frame',fallbackBorderId:'frame_gloamward'},
 {id:'effect_frostbound_winter_veil',name:'Winter Veil',collection:'Frostbound Chime',borderId:'cosmetic:frostbound:chime-frame',borderName:'Frostbound Chime Frame',fallbackBorderId:'dungeon:frostmarch:frostbound-chime'},
 {id:'effect_amberglass_ember_motes',name:'Ember Motes',collection:'Amberglass Loop',borderId:'cosmetic:amberglass:loop-frame',borderName:'Amberglass Loop Frame',fallbackBorderId:'dungeon:sunscar:amberglass-loop'},
 {id:'effect_briarbound_verdant_whispers',name:'Verdant Whispers',collection:'Briarbound',borderId:'cosmetic:briarbound:verdant-frame',borderName:'Briarbound Verdant Frame',fallbackBorderId:'dungeon:asterfall:briarbound-frame'},
 ...WAVE2_SETS.filter(row=>WAVE2_READY_SET_IDS.includes(row.id)).map(row=>({id:row.effectId,name:row.effectName,collection:row.name,borderId:row.borderId,borderName:row.borderName,fallbackBorderId:''})),
] as const;
export const PROFILE_ALL_EFFECTS=[...PROFILE_EFFECTS,...PREMIUM_PROFILE_COSMETICS.map(row=>({id:row.effectId,name:row.effectName,collection:row.name,borderId:row.borderId,borderName:row.borderName,fallbackBorderId:row.fallbackBorderId}))] as const;
export type ProfileEffectId=(typeof PROFILE_ALL_EFFECTS)[number]['id'];
export function profileEffectDefinition(id:string){return PROFILE_ALL_EFFECTS.find(row=>row.id===id)}
export function profileAnimatedBorderDefinition(id:string){return PROFILE_ALL_EFFECTS.find(row=>row.borderId===id)}
/** Ownership is account-wide; the equipped choice remains character-scoped. */
export function canUseProfileEffect(state:GameState,id:string){
 if(!id)return true;
 if(wave2SetFor('effect',id))return wave2Owned(state.account,'effect',id);
 return state.account.unlockedProfileEffectIds?.includes(id)??false;
}
