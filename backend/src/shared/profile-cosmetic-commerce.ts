export type ProfileCosmeticGrantKind='border'|'effect'|'icon';
export interface ProfileCosmeticGrantItem{kind:ProfileCosmeticGrantKind;id:string}
export interface ProfileCosmeticGrantDefinition{
 sku:string;collectionId:'gloamward'|'frostbound'|'amberglass'|'briarbound';kind:'set';grants:readonly ProfileCosmeticGrantItem[];
}
export const PROFILE_COSMETIC_FORBIDDEN_COMMERCE_IDS=[
 'frame_gloamward','dungeon:frostmarch:frostbound-chime','dungeon:sunscar:amberglass-loop','dungeon:asterfall:briarbound-frame',
] as const;
export const PROFILE_COSMETIC_GRANTS:readonly ProfileCosmeticGrantDefinition[]=[
 {sku:'profile_cosmetic_gloamward_set_v1',collectionId:'gloamward',kind:'set',grants:[{kind:'border',id:'cosmetic:gloamward:arcane-frame'},{kind:'effect',id:'effect_gloamward_wisps'},{kind:'icon',id:'cosmetic:gloamward:portrait-seer'},{kind:'icon',id:'cosmetic:gloamward:portrait-magus'}]},
 {sku:'profile_cosmetic_frostbound_set_v1',collectionId:'frostbound',kind:'set',grants:[{kind:'border',id:'cosmetic:frostbound:chime-frame'},{kind:'effect',id:'effect_frostbound_winter_veil'},{kind:'icon',id:'cosmetic:frostbound:portrait-oracle'},{kind:'icon',id:'cosmetic:frostbound:portrait-warden'}]},
 {sku:'profile_cosmetic_amberglass_set_v1',collectionId:'amberglass',kind:'set',grants:[{kind:'border',id:'cosmetic:amberglass:loop-frame'},{kind:'effect',id:'effect_amberglass_ember_motes'},{kind:'icon',id:'cosmetic:amberglass:portrait-duelist'},{kind:'icon',id:'cosmetic:amberglass:portrait-vanguard'}]},
 {sku:'profile_cosmetic_briarbound_set_v1',collectionId:'briarbound',kind:'set',grants:[{kind:'border',id:'cosmetic:briarbound:verdant-frame'},{kind:'effect',id:'effect_briarbound_verdant_whispers'},{kind:'icon',id:'cosmetic:briarbound:portrait-ranger'},{kind:'icon',id:'cosmetic:briarbound:portrait-warden'}]},
] as const;
const FORBIDDEN=new Set<string>(PROFILE_COSMETIC_FORBIDDEN_COMMERCE_IDS),BY_SKU=new Map(PROFILE_COSMETIC_GRANTS.map(row=>[row.sku,row]));
export function profileCosmeticGrantDefinition(sku:string){return BY_SKU.get(sku)}
export function assertProfileCosmeticGrantDefinition(sku:string){
 const row=profileCosmeticGrantDefinition(sku);if(!row)throw new Error('UNKNOWN_PROFILE_COSMETIC_SKU');
 const counts={border:0,effect:0,icon:0};for(const grant of row.grants){counts[grant.kind]++;if(FORBIDDEN.has(grant.id))throw new Error('EXCLUSIVE_REWARD_COMMERCE_GRANT_FORBIDDEN')}
 if(row.grants.length!==4||counts.border!==1||counts.effect!==1||counts.icon!==2)throw new Error('INVALID_PROFILE_COSMETIC_SET');
 return row;
}
export interface ProfileCosmeticGrantState{unlockedProfileBorderIds?:string[];unlockedProfileEffectIds?:string[];unlockedProfileIconIds?:string[]}
function appendUnique(values:readonly string[]|undefined,id:string){return values?.includes(id)?[...values]:[...(values??[]),id]}
export function applyProfileCosmeticGrant(state:ProfileCosmeticGrantState,sku:string){
 const definition=assertProfileCosmeticGrantDefinition(sku);let next={...state};const added:ProfileCosmeticGrantItem[]=[];
 for(const grant of definition.grants){
  if(grant.kind==='border'){
   if(!next.unlockedProfileBorderIds?.includes(grant.id))added.push(grant);
   next.unlockedProfileBorderIds=appendUnique(next.unlockedProfileBorderIds,grant.id);
  }else if(grant.kind==='effect'){
   if(!next.unlockedProfileEffectIds?.includes(grant.id))added.push(grant);
   next.unlockedProfileEffectIds=appendUnique(next.unlockedProfileEffectIds,grant.id);
  }else{
   if(!next.unlockedProfileIconIds?.includes(grant.id))added.push(grant);
   next.unlockedProfileIconIds=appendUnique(next.unlockedProfileIconIds,grant.id);
  }
 }
 return {state:next,definition,added,alreadyOwned:added.length===0};
}
