import type {GameState,GearSlot,ItemStack,CraftedGearInstance} from './types';
import {craftedGearInstances} from './crafted-gear-instances';
import {entitlementStorageCapacity} from './account-entitlements';

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

/** Exact-copy visibility for future slot and bank UIs. Does not select an untagged legacy copy. */
export function craftedGearCopiesAt(state:GameState,itemId:string,place:'inventory'|'bank'){
  const audit=auditCraftedGearOwnership(state);
  if(audit.problems.length)return [];
  return audit.linked.filter(row=>row.itemId===itemId&&row.place===place&&(place==='bank'||row.holderCharacterId===state.character?.id));
}
