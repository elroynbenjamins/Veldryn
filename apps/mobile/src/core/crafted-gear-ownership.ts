import type {GameState,GearSlot,ItemStack,CraftedGearInstance} from './types';
import {craftedGearInstances} from './crafted-gear-instances';
import {entitlementStorageCapacity} from './account-entitlements';
import {itemDef} from '../content/items';

export type VerifiedGearPlace='inventory'|'bank'|'overflow'|'equipped';
export interface VerifiedGearLocation{
  instanceId:string;
  itemId:string;
  place:VerifiedGearPlace;
  /** Required for character locations, omitted for shared Bank. */
  holderCharacterId?:string;
  slot?:GearSlot;
}
export interface CraftedGearOwnershipAudit{
  linked:VerifiedGearLocation[];
  unlocatedInstanceIds:string[];
  /** Physical copies of a crafted item that lack any instance marker. */
  unmarkedPhysicalCopies:number;
  problems:string[];
  /** This is a consistency audit, NOT verification of locks/loadout protection. */
  consistent:boolean;
}

const empty=():CraftedGearOwnershipAudit=>({linked:[],unlocatedInstanceIds:[],unmarkedPhysicalCopies:0,problems:[],consistent:false});

/**
 * Only an explicit matching instanceId marker establishes where a copy is.
 * Never assign legacy untagged quantities to the strongest or oldest copy.
 * This audit is read-only and can be run before a zero-loss migration.
 */
export function auditCraftedGearOwnership(state:GameState):CraftedGearOwnershipAudit{
  const audit=empty();
  const definitions=craftedGearInstances(state),byId=new Map<string,CraftedGearInstance>();
  for(const record of definitions){
    if(byId.has(record.id))audit.problems.push(`Duplicate crafted record: ${record.id}`);
    else byId.set(record.id,record);
  }
  const observed=new Map<string,VerifiedGearLocation>();
  const trackedItemIds=new Set(definitions.map(row=>row.itemId));
  const register=(instanceId:string,itemId:string,place:VerifiedGearPlace,holderCharacterId?:string,slot?:GearSlot)=>{
    const record=byId.get(instanceId);
    if(!record){audit.problems.push(`Unrecognized crafted instance marker: ${instanceId}`);return;}
    if(record.itemId!==itemId){audit.problems.push(`Item definition mismatch for ${instanceId}`);return;}
    if(observed.has(instanceId)){audit.problems.push(`Duplicate physical copy marker: ${instanceId}`);return;}
    const location:VerifiedGearLocation={instanceId,itemId,place,holderCharacterId,slot};
    observed.set(instanceId,location);
    audit.linked.push(location);
  };
  const scanStacks=(stacks:readonly ItemStack[]|undefined,place:VerifiedGearPlace,holderCharacterId?:string)=>{
    for(const stack of stacks??[]){
      if(stack.instanceId===undefined){
        if(trackedItemIds.has(stack.itemId)&&Number.isSafeInteger(stack.quantity)&&stack.quantity>0)
          audit.unmarkedPhysicalCopies+=stack.quantity;
        continue;
      }
      if(typeof stack.instanceId!=='string'||!stack.instanceId.trim()||stack.quantity!==1){
        audit.problems.push(`Invalid tagged equipment stack: ${String(stack.instanceId)}`);
        continue;
      }
      register(stack.instanceId,stack.itemId,place,holderCharacterId);
    }
  };
  const scanCharacter=(character:GameState['character'],inventory:GameState['inventory'],overflow:GameState['overflow'])=>{
    if(!character)return;
    scanStacks(inventory.stacks,'inventory',character.id);
    scanStacks(overflow.stacks,'overflow',character.id);
    for(const [slot,itemId] of Object.entries(character.equipment)){
      if(itemId&&trackedItemIds.has(itemId)&&!character.equipmentInstanceIds?.[slot as GearSlot])
        audit.unmarkedPhysicalCopies+=1;
    }
    for(const [slot,instanceId] of Object.entries(character.equipmentInstanceIds??{})){
      if(typeof instanceId!=='string'||!instanceId.trim()){audit.problems.push(`Invalid equipped copy marker: ${slot}`);continue;}
      const itemId=character.equipment[slot as GearSlot];
      if(!itemId){audit.problems.push(`Equipped copy marker lacks equipment: ${instanceId}`);continue;}
      register(instanceId,itemId,'equipped',character.id,slot as GearSlot);
    }
  };
  scanCharacter(state.character,state.inventory,state.overflow);
  for(const entry of state.otherCharacters??[])scanCharacter(entry.character,entry.inventory,entry.overflow);
  scanStacks(state.bank.stacks,'bank');
  audit.unlocatedInstanceIds=[...byId.keys()].filter(id=>!observed.has(id));
  audit.consistent=audit.problems.length===0&&audit.unlocatedInstanceIds.length===0&&audit.unmarkedPhysicalCopies===0;
  return audit;
}

function resolveTracked(state:GameState,instanceId:string){
  const audit=auditCraftedGearOwnership(state);
  if(audit.problems.length)throw new Error('Equipment identity conflict; do not modify items until resolved');
  const record=craftedGearInstances(state).find(row=>row.id===instanceId);
  if(!record)throw new Error('Unknown equipment instance');
  const locations=audit.linked.filter(row=>row.instanceId===instanceId);
  if(locations.length!==1)throw new Error('Equipment location is not verified; inspect legacy ownership first');
  return {record,location:locations[0]};
}
function withoutInstance(stacks:readonly ItemStack[],instanceId:string):ItemStack[]{
  const index=stacks.findIndex(row=>row.instanceId===instanceId);
  if(index<0||stacks[index].quantity!==1)throw new Error('Exact equipment copy is missing from storage');
  return [...stacks.slice(0,index),...stacks.slice(index+1)];
}
function appendInstance(stacks:readonly ItemStack[],instance:CraftedGearInstance,capacity:number):ItemStack[]{
  if(stacks.some(row=>row.instanceId===instance.id))throw new Error('Equipment copy already exists in destination');
  if(stacks.filter(row=>row.quantity>0).length>=capacity)throw new Error('Destination storage is full');
  return [...stacks,{itemId:instance.itemId,quantity:1,instanceId:instance.id}];
}

/**
 * Exact-copy bank transfer for fully linked equipment only. This reducer does
 * not perform any server write or authorize client-chosen ownership. The
 * authoritative command must recheck ownership under an account transaction.
 */
export function moveCraftedGearInstance(state:GameState,instanceId:string,to:'inventory'|'bank'):GameState{
  if(!state.character)throw new Error('Create a character before moving equipment');
  const {record,location}=resolveTracked(state,instanceId);
  const from=location.place;
  if(from!=='inventory'&&from!=='bank')throw new Error('Only stored equipment can be transferred');
  if(from===to)return state;
  if(from==='inventory'&&location.holderCharacterId!==state.character.id)throw new Error('Another character is carrying this equipment');
  if(to==='bank'){
    const bankStacks=appendInstance(state.bank.stacks,record,entitlementStorageCapacity(state,'bank'));
    return {...state,inventory:{...state.inventory,stacks:withoutInstance(state.inventory.stacks,instanceId)},bank:{...state.bank,stacks:bankStacks}};
  }
  const inventoryStacks=appendInstance(state.inventory.stacks,record,entitlementStorageCapacity(state,'inventory'));
  return {...state,bank:{...state.bank,stacks:withoutInstance(state.bank.stacks,instanceId)},inventory:{...state.inventory,stacks:inventoryStacks}};
}

/**
 * Exact-copy lock state reducer for future trusted commands. The server must
 * perform the same ownership check under an account lock before persisting.
 * Only this character's physical copy, its equipped slots or a Bank copy can
 * be toggled; a missing/ambiguous legacy instance is never guessed.
 */
export function setCraftedGearInstanceLock(state:GameState,instanceId:string,locked:boolean):GameState{
  if(typeof locked!=='boolean')throw new Error('Invalid equipment lock state');
  if(!state.character)throw new Error('No character');
  const {location}=resolveTracked(state,instanceId);
  if(location.place!=='bank'&&location.holderCharacterId!==state.character.id)
    throw new Error('Cannot change another character\'s equipment protection');
  const records=craftedGearInstances(state);
  return {...state,account:{...state.account,craftedGearInstances:records.map(record=>
    record.id===instanceId?{...record,locked}:record)}};
}

/**
 * Explicit legacy reconciliation. The player chooses which physical untagged
 * equipment copy receives which pre-existing Forge receipt. It never guesses
 * mappings automatically, creates gear or changes rarity/quality.
 *
 * Only the active character's Inventory and shared Bank are handled here;
 * legacy equipped gear must be unequipped first. The server must persist this
 * as a single revision-fenced account command.
 */
export function linkLegacyCraftedGearInstance(state:GameState,instanceId:string,from:'inventory'|'bank',stackIndex:number):GameState{
  if(!state.character)throw new Error('No active character');
  if(!Number.isSafeInteger(stackIndex)||stackIndex<0)throw new Error('Invalid physical equipment selection');
  const audit=auditCraftedGearOwnership(state);
  if(audit.problems.length)throw new Error('Existing equipment identity conflicts must be resolved before reconciliation');
  const record=craftedGearInstances(state).find(row=>row.id===instanceId);
  if(!record)throw new Error('Unknown Forge quality record');
  if(!audit.unlocatedInstanceIds.includes(instanceId))throw new Error('Forge quality record already linked to an equipment copy');
  const physical=[state.inventory.stacks,state.bank.stacks,state.overflow.stacks,...(state.otherCharacters??[]).flatMap(row=>[row.inventory.stacks,row.overflow.stacks])].reduce((sum,stacks)=>sum+stacks.reduce((n,row)=>n+(row.itemId===record.itemId?row.quantity:0),0),0)
    +[state.character,...(state.otherCharacters??[]).map(row=>row.character)].reduce((n,character)=>n+Object.values(character?.equipment??{}).filter(id=>id===record.itemId).length,0);
  const recorded=craftedGearInstances(state).filter(row=>row.itemId===record.itemId).length;
  if(physical!==recorded)throw new Error('Legacy equipment count mismatch; inspect unmatched gear before associating Forge quality');
  const container=state[from],source=container.stacks[stackIndex];
  if(!source||source.itemId!==record.itemId||source.instanceId!==undefined||!Number.isSafeInteger(source.quantity)||source.quantity<1)
    throw new Error('Select an unlinked physical copy of exactly the same equipment item');
  const replacement=source.quantity===1
    ?[{itemId:source.itemId,quantity:1,instanceId:record.id}]
    :[{itemId:source.itemId,quantity:source.quantity-1},{itemId:source.itemId,quantity:1,instanceId:record.id}];
  if(source.quantity>1&&container.stacks.length>=entitlementStorageCapacity(state,from))
    throw new Error('Free one storage slot before separating a legacy equipment stack');
  const stacks=[...container.stacks.slice(0,stackIndex),...replacement,...container.stacks.slice(stackIndex+1)];
  const next={...state,[from]:{...container,stacks}} as GameState;
  if(auditCraftedGearOwnership(next).problems.length)throw new Error('Legacy equipment reconciliation would create duplicate copy identity');
  return next;
}

/** Exact-copy equipment changes require a server-validated command. */
export function equipCraftedGearInstance(state:GameState,instanceId:string):GameState{
  if(!state.character)throw new Error('No active character');
  if(state.activity?.kind==='combat')throw new Error('Stop combat before equipping');
  const {record,location}=resolveTracked(state,instanceId);
  if(location.place!=='inventory'||location.holderCharacterId!==state.character.id)
    throw new Error('Move this exact equipment copy into your Inventory first');
  const def=itemDef(record.itemId);
  if(def.type!=='gear'||!def.slot)throw new Error('Not equipment');
  if(def.classRestriction&&def.classRestriction!==state.character.classId)throw new Error('This equipment belongs to another class');
  if(state.character.level<(def.requiredLevel??1))throw new Error(`Requires level ${def.requiredLevel}`);
  const oldId=state.character.equipment[def.slot],oldInstanceId=state.character.equipmentInstanceIds?.[def.slot];
  // Swapping between tagged/legacy gear is allowed, but the old item's exact
  // identity is preserved when returning it to Inventory.
  const nextStacks=withoutInstance(state.inventory.stacks,instanceId);
  const returned=oldId?oldInstanceId
    ?[{itemId:oldId,quantity:1,instanceId:oldInstanceId}]
    :[{itemId:oldId,quantity:1}]
    :[];
  if(returned.length&&nextStacks.filter(row=>row.quantity>0).length>=entitlementStorageCapacity(state,'inventory'))
    throw new Error('Inventory is full; make room before swapping equipment');
  const equipment={...state.character.equipment,[def.slot]:record.itemId};
  const equipmentInstanceIds={...(state.character.equipmentInstanceIds??{}),[def.slot]:record.id};
  return {...state,inventory:{...state.inventory,stacks:[...nextStacks,...returned]},
    character:{...state.character,equipment,equipmentInstanceIds}};
}

export function unequipCraftedGearInstance(state:GameState,instanceId:string):GameState{
  if(!state.character)throw new Error('No active character');
  if(state.activity?.kind==='combat')throw new Error('Stop combat before unequipping');
  const {record,location}=resolveTracked(state,instanceId);
  if(location.place!=='equipped'||location.holderCharacterId!==state.character.id||!location.slot)
    throw new Error('This exact equipment copy is not equipped on the active character');
  const stacks=appendInstance(state.inventory.stacks,record,entitlementStorageCapacity(state,'inventory'));
  const equipment={...state.character.equipment},equipmentInstanceIds={...(state.character.equipmentInstanceIds??{})};
  delete equipment[location.slot];delete equipmentInstanceIds[location.slot];
  return {...state,inventory:{...state.inventory,stacks},character:{...state.character,equipment,equipmentInstanceIds}};
}

function protectedGear(state:GameState,record:CraftedGearInstance){
  const enhancement=record.enhancement;
  if(record.locked===true)throw new Error('This equipment copy is locked');
  if(state.settings.favoriteItemIds?.includes(record.itemId))throw new Error('Favorite equipment cannot be sold or salvaged');
  if(enhancement.rank>0||enhancement.statGemId||enhancement.effectGemId||enhancement.gemIds.length>0)
    throw new Error('Enhanced or socketed equipment cannot be sold or salvaged');
  const characters=[state.character,...(state.otherCharacters??[]).map(entry=>entry.character)].filter(Boolean);
  if(characters.some(character=>character?.savedLoadouts?.some(preset=>Object.values(preset.equipmentInstanceIds??{}).includes(record.id)||Object.entries(preset.equipment).some(([slot,id])=>id===record.itemId&&!preset.equipmentInstanceIds?.[slot as GearSlot]))))
    throw new Error('A saved loadout protects this equipment copy');
  if(characters.some(character=>{const old=character?.gearEnhancements?.[record.itemId];return !!old&&(old.rank>0||!!old.statGemId||!!old.effectGemId||(old.gemIds?.length??0)>0)}))
    throw new Error('Legacy equipment enhancements require manual review before disposal');
}
export function disposeCraftedGearInstance(state:GameState,instanceId:string,method:'sell'|'salvage'):GameState{
  if(!state.character)throw new Error('No active character');
  const {record,location}=resolveTracked(state,instanceId);
  if(location.place!=='inventory'&&location.place!=='bank')throw new Error('Unequip the exact equipment copy before disposal');
  if(location.place==='inventory'&&location.holderCharacterId!==state.character.id)
    throw new Error('Cannot dispose equipment carried by another character');
  protectedGear(state,record);
  const def=itemDef(record.itemId);
  if(def.type!=='gear'||def.knowledgeUnlockId)throw new Error('This equipment cannot be disposed');
  if(method==='salvage'&&!def.salvage)throw new Error('This equipment cannot be salvaged');
  if(method==='sell'&&(!Number.isSafeInteger(def.value)||def.value<0))throw new Error('Invalid equipment vendor value');
  const source=location.place==='bank'?state.bank.stacks:state.inventory.stacks;
  const removed=withoutInstance(source,record.id);
  let next:GameState={...state,account:{...state.account,craftedGearInstances:craftedGearInstances(state).filter(row=>row.id!==record.id)},
    [location.place]:{...state[location.place],stacks:removed}};
  if(method==='sell'){
    if(location.place==='bank'){
      const gold=(next.bank.gold??0)+def.value;
      if(!Number.isSafeInteger(gold))throw new Error('Bank Gold overflow');
      next={...next,bank:{...next.bank,gold}};
    }else{
      const gold=next.character!.gold+def.value;
      if(!Number.isSafeInteger(gold))throw new Error('Character Gold overflow');
      next={...next,character:{...next.character!,gold}};
    }
  }else{
    // Salvage never eats a protected gem; the received material is carried by
    // the active character, independent of whether equipment was in Bank.
    if(!next.character)throw new Error('No active character');
    const reward=def.salvage!;
    const stack=next.inventory.stacks.find(row=>row.itemId===reward.itemId&&row.instanceId===undefined);
    if(!stack&&next.inventory.stacks.filter(row=>row.quantity>0).length>=entitlementStorageCapacity(next,'inventory'))
      throw new Error('Inventory is full; make space for salvage');
    next={...next,inventory:{...next.inventory,stacks:stack
      ?next.inventory.stacks.map(row=>row===stack?{...row,quantity:row.quantity+reward.quantity}:row)
      :[...next.inventory.stacks,{...reward}]}};
  }
  return next;
}

/** Exact-copy visibility for future slot and bank UIs. Does not select an untagged legacy copy. */
export function craftedGearCopiesAt(state:GameState,itemId:string,place:'inventory'|'bank'){
  const audit=auditCraftedGearOwnership(state);
  if(audit.problems.length)return [];
  return audit.linked.filter(row=>row.itemId===itemId&&row.place===place&&(place==='bank'||row.holderCharacterId===state.character?.id));
}
