export type CollectionMemberKind='item'|'pet'|'companion'|'skin'|'background'|'border'|'bestiary'|'fish'|'lore'|'boss_drop'|'seasonal';
export interface CollectionMember{kind:CollectionMemberKind;id:string;label:string}
export interface CollectionSetDefinition{id:string;name:string;description:string;theme:'region'|'profession'|'combat'|'seasonal'|'collection';enabled:boolean;members:CollectionMember[];reward:{kind:'profile_unlock'|'cosmetic_unlock'|'recipe_unlock'|'title_unlock'|'item_bundle';ref:string;label:string}}
export interface CollectionSetState{schemaVersion:45;accountId:string;revision:number;completedSets:Record<string,number>}
export interface CollectionOwnershipSnapshot{ownedKeys:Record<string,true>}
export const COLLECTION_SETS_V45:CollectionSetDefinition[]=[
 {id:'asterfall_cuisine_runtime',name:'Asterfall Cuisine',description:'Prepare and collect Asterfall meals that already exist in the runtime item catalogue.',theme:'profession',enabled:true,members:[
  {kind:'item',id:'COOKED_SILVERFIN',label:'Cooked Silverfin'},{kind:'item',id:'SEARED_RIVER_EEL',label:'Seared River Eel'},{kind:'item',id:'IRONWOOD_STEW',label:'Ironwood Hunter Stew'},{kind:'item',id:'ROASTED_OATHSCALE',label:'Roasted Oathscale Pike'}],
  reward:{kind:'profile_unlock',ref:'PROFILE_ASTERFALL_GOURMAND',label:'Asterfall Gourmand profile accent'}},
 {id:'oathstone_armory_runtime',name:'Oathstone Armory',description:'Collect the complete Oathstone equipment family.',theme:'combat',enabled:true,members:[
  {kind:'item',id:'OATHSTONE_HELM',label:'Oathstone Greathelm'},{kind:'item',id:'OATHSTONE_WARDPLATE',label:'Oathstone Wardplate'},{kind:'item',id:'OATHSTONE_GAUNTLETS',label:'Oathstone Gauntlets'},{kind:'item',id:'OATHSTONE_LEGPLATES',label:'Oathstone Legplates'},{kind:'item',id:'OATHSTONE_GREAVES',label:'Oathstone Greaves'},{kind:'item',id:'OATHSTONE_BLADE',label:'Oathstone Runeblade'},{kind:'item',id:'OATHSTONE_TOWER_SHIELD',label:'Oathstone Tower Shield'},{kind:'item',id:'OATHSTONE_MANTLE',label:'Oathstone Mantle'},{kind:'item',id:'OATHSTONE_AMULET',label:'Oathstone Ward Amulet'},{kind:'item',id:'OATHSTONE_SIGNET',label:'Oathstone Signet'}],
  reward:{kind:'cosmetic_unlock',ref:'COSMETIC_OATHSTONE_ARMORY',label:'Oathstone Armory display accent'}},
];
export const collectionMemberKey=(ref:Pick<CollectionMember,'kind'|'id'>)=>`${ref.kind}:${ref.id}`;
export function newCollectionSetState(accountId:string):CollectionSetState{if(!accountId)throw new Error('account_required');return {schemaVersion:45,accountId,revision:0,completedSets:{}}}
export function collectionSetViews(state:CollectionSetState,snapshot:CollectionOwnershipSnapshot,catalog=COLLECTION_SETS_V45){
 return catalog.filter(set=>set.enabled).map(definition=>{const members=definition.members.map(member=>({...member,key:collectionMemberKey(member),owned:snapshot.ownedKeys[collectionMemberKey(member)]===true})),owned=members.filter(row=>row.owned).length,total=members.length;return {definition,members,owned,total,progress:total?owned/total:0,complete:owned===total,completedAtMs:state.completedSets[definition.id]}});
}
export function applyCollectionSetSnapshot(state:CollectionSetState,snapshot:CollectionOwnershipSnapshot,nowMs:number,catalog=COLLECTION_SETS_V45){
 const newlyCompletedSetIds:string[]=[],grants:Array<{grantKey:string;setId:string;reward:CollectionSetDefinition['reward']}>=[];for(const row of collectionSetViews(state,snapshot,catalog)){if(!row.complete||state.completedSets[row.definition.id]!==undefined)continue;state.completedSets[row.definition.id]=nowMs;newlyCompletedSetIds.push(row.definition.id);grants.push({grantKey:`collection-set:${state.accountId}:${row.definition.id}`,setId:row.definition.id,reward:row.definition.reward})}return {newlyCompletedSetIds,grants};
}
