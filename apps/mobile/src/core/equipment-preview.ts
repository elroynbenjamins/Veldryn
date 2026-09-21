import {itemDef} from '../content/items';
import {GameState} from './types';
import {gearInstanceById,gearInstancesForItem,materializeGearInstances} from './equipment-instances';

/** Returns an equipment comparison state without mutating or consuming items. Exact copy refs preserve rank, rarity and gems. */
export function previewEquipment(state:GameState,ref:string):GameState{
  if(!state.character)throw new Error('No character');
  const ready=materializeGearInstances(state);
  let instance=gearInstanceById(ready,ref);
  if(!instance){
    const matches=gearInstancesForItem(ready,ref).filter(row=>row.location==='inventory'||row.location==='bank');
    if(matches.length===1)instance=matches[0];
  }
  const id=instance?.itemId??ref,item=itemDef(id);
  if(item.type!=='gear'||!item.slot)throw new Error('Only equipment can be previewed');
  if(item.classRestriction&&item.classRestriction!==ready.character!.classId)throw new Error('This equipment belongs to another class');
  return {...ready,character:{...ready.character!,equipment:{...ready.character!.equipment,[item.slot]:id},equipmentInstanceIds:{...(ready.character!.equipmentInstanceIds??{}),...(instance?{[item.slot]:instance.id}:{})}}};
}
