import type {GameState} from './types';

export const PROFILE_EFFECTS=[
 {id:'effect_gloamward_wisps',name:'Arcane Wisps',collection:'Gloamward',borderId:'frame_gloamward'},
 {id:'effect_frostbound_winter_veil',name:'Winter Veil',collection:'Frostbound Chime',borderId:'dungeon:frostmarch:frostbound-chime'},
 {id:'effect_amberglass_ember_motes',name:'Ember Motes',collection:'Amberglass Loop',borderId:'dungeon:sunscar:amberglass-loop'},
 {id:'effect_briarbound_verdant_whispers',name:'Verdant Whispers',collection:'Briarbound',borderId:'dungeon:asterfall:briarbound-frame'},
] as const;
export type ProfileEffectId=(typeof PROFILE_EFFECTS)[number]['id'];
export function profileEffectDefinition(id:string){return PROFILE_EFFECTS.find(row=>row.id===id)}
/** Ownership is account-wide; the equipped choice remains character-scoped. */
export function canUseProfileEffect(state:GameState,id:string){
 if(!id)return true;
 return state.account.unlockedProfileEffectIds?.includes(id)??false;
}
