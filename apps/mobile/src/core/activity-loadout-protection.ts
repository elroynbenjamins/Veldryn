/** Saved presets protect physical copies, including locked slots and inactive heroes.
 * Exact-copy presets never lock unrelated copies of the same item definition.
 * Legacy item-only references are deliberately conservative until identity migration. */
import type {GameState,GearSlot} from './types';
export function savedLoadoutProtection(state:GameState,itemId:string,instanceId?:string){
 const references:{characterId:string;loadoutId:string;slotIndex:number;kind:'exact'|'legacy'}[]=[];
 for(const character of [state.character,...(state.otherCharacters??[]).map(row=>row.character)]){
  if(!character)continue;
  for(const preset of character.savedLoadouts??[]){
   if(!preset)continue;
   const exact=instanceId!==undefined&&Object.values(preset.equipmentInstanceIds??{}).includes(instanceId);
   const legacy=Object.entries(preset.equipment??{}).some(([slot,id])=>id===itemId&&!preset.equipmentInstanceIds?.[slot as GearSlot]);
   if(exact||legacy)references.push({characterId:character.id,loadoutId:preset.id,slotIndex:preset.slotIndex,kind:exact?'exact':'legacy'});
  }
 }
 return {protected:references.length>0,references};
}
