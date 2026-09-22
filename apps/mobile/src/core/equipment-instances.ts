import {itemDef} from '../content/items';
import {itemRarity,type ItemRarity} from './item-rarity';
import type {GameState,GearEnhancementState,GearInstance,GearInstanceLocation,GearSlot,ItemStack} from './types';

const LOCATIONS:GearInstanceLocation[]=['inventory','bank','equipped','orphaned'];
const emptyEnhancement=():GearEnhancementState=>({rank:0,failures:0,gemIds:[]});
function cleanEnhancement(raw:any):GearEnhancementState{
  return {
    rank:Math.max(0,Math.min(10,Math.floor(Number(raw?.rank)||0))),
    failures:Math.max(0,Math.floor(Number(raw?.failures)||0)),
    statGemId:typeof raw?.statGemId==='string'?raw.statGemId:undefined,
    effectGemId:typeof raw?.effectGemId==='string'?raw.effectGemId:undefined,
    gemIds:Array.isArray(raw?.gemIds)?raw.gemIds.filter((id:any)=>typeof id==='string').slice(0,2):[],
  };
}
function stackQty(stacks:ItemStack[],itemId:string){return stacks.find(row=>row.itemId===itemId)?.quantity??0;}
function gearIds(stacks:ItemStack[]){return stacks.filter(row=>{try{return row.quantity>0&&itemDef(row.itemId).type==='gear'}catch{return false}}).map(row=>row.itemId);}
function score(instance:GearInstance){
  const rarityScore:Record<ItemRarity,number>={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5};
  return rarityScore[instance.rarity]*1000+instance.enhancement.rank*20+Math.min(19,instance.enhancement.gemIds.length*5)+Math.min(9,instance.enhancement.failures);
}
export function normalizeGearInstances(raw:unknown):GearInstance[]{
  if(!Array.isArray(raw))return [];
  const seen=new Set<string>();
  return raw.flatMap((row:any)=>{
    if(!row||typeof row!=='object'||typeof row.id!=='string'||typeof row.itemId!=='string'||seen.has(row.id))return [];
    try{
      const item=itemDef(String(row.itemId));if(item.type!=='gear')return [];
      seen.add(row.id);
      const rarity=(['common','uncommon','rare','epic','legendary','mythic'].includes(row.rarity)?row.rarity:itemRarity(item)) as ItemRarity;
      const location=LOCATIONS.includes(row.location)?row.location:'inventory';
      return [{
        id:String(row.id).slice(0,180),itemId:item.id,ownerCharacterId:String(row.ownerCharacterId??'ACCOUNT').slice(0,120),rarity,
        acquireSource:['craft','drop','quest','starter','legacy'].includes(row.acquireSource)?row.acquireSource:'legacy',
        sourceReceiptKey:String(row.sourceReceiptKey??row.id).slice(0,200),createdAtMs:Math.max(0,Math.floor(Number(row.createdAtMs)||0)),
        enhancement:cleanEnhancement(row.enhancement),location,slot:location==='equipped'&&item.slot===row.slot?row.slot:undefined,
      } as GearInstance];
    }catch{return []}
  }).slice(-1200);
}
export function allGearInstances(state:GameState){return normalizeGearInstances(state.account.gearInstances?.length?state.account.gearInstances:state.account.craftedGearInstances);}
export function gearInstanceById(state:GameState,instanceId:string){return allGearInstances(state).find(row=>row.id===instanceId);}
export function gearInstancesForItem(state:GameState,itemId:string){const ready=materializeGearInstances(state);return allGearInstances(ready).filter(row=>row.itemId===itemId);}
export function inventoryGearInstances(state:GameState){const ready=materializeGearInstances(state),owner=ready.character?.id;return allGearInstances(ready).filter(row=>row.location==='inventory'&&(!owner||row.ownerCharacterId===owner||row.ownerCharacterId==='ACCOUNT'));}
export function bankGearInstances(state:GameState){const ready=materializeGearInstances(state);return allGearInstances(ready).filter(row=>row.location==='bank');}
export function equippedGearInstance(state:GameState,slot:GearSlot){
  const id=state.character?.equipmentInstanceIds?.[slot];
  return id?gearInstanceById(state,id):undefined;
}
export function gearInstanceEnhancement(state:GameState,instanceId:string){return gearInstanceById(state,instanceId)?.enhancement??emptyEnhancement();}
export function gearInstanceRarity(state:GameState,instanceId:string){const instance=gearInstanceById(state,instanceId);return instance?.rarity??itemRarity(itemDef(instanceId));}

function deterministicId(owner:string,where:string,itemId:string,ordinal:number){return `gear:migrated:${owner}:${where}:${itemId}:${ordinal}`;}
function legacyEnhancement(character:GameState['character'],itemId:string){return cleanEnhancement(character?.gearEnhancements?.[itemId]);}
function assignPool(existing:GearInstance[],used:Set<string>,itemId:string,count:number,location:GearInstanceLocation,owner:string,make:(ordinal:number)=>GearInstance){
  const candidates=existing.filter(row=>row.itemId===itemId&&!used.has(row.id)&&row.location!=='equipped').sort((a,b)=>score(b)-score(a)||a.createdAtMs-b.createdAtMs||a.id.localeCompare(b.id));
  const assigned:GearInstance[]=[];
  for(let i=0;i<count;i++){
    const row=candidates[i]??make(i);
    used.add(row.id);assigned.push({...row,ownerCharacterId:location==='bank'?row.ownerCharacterId:owner,location,slot:undefined});
  }
  return assigned;
}
function replaceRows(existing:GearInstance[],updates:GearInstance[],used:Set<string>){
  const byId=new Map(updates.map(row=>[row.id,row]));
  return existing.map(row=>byId.get(row.id)??row).concat(updates.filter(row=>!existing.some(old=>old.id===row.id))).map(row=>used.has(row.id)?row:{...row,location:'orphaned' as const,slot:undefined});
}

/** One-time/lazy migration from stack + item-definition identity to exact gear instances.
 * Existing best-copy behavior is used only to pick which legacy copy was already equipped;
 * after this function returns, all runtime operations are instance-ID based.
 */
export function materializeGearInstances(state:GameState):GameState{
  const existing=allGearInstances(state);
  const updates:GearInstance[]=[];
  const used=new Set<string>();
  const chars=[...(state.character?[{character:state.character,inventory:state.inventory,active:true}]:[]),...(state.otherCharacters??[]).map(entry=>({character:entry.character,inventory:entry.inventory,active:false}))];
  const equipmentIdsByCharacter=new Map<string,Partial<Record<GearSlot,string>>>();

  for(const ctx of chars){
    const c=ctx.character,eqIds:{[K in GearSlot]?:string}={};
    for(const [slot,itemId] of Object.entries(c.equipment??{}) as [GearSlot,string][]){
      if(!itemId)continue;
      const explicit=c.equipmentInstanceIds?.[slot];
      let chosen=explicit?existing.find(row=>row.id===explicit&&row.itemId===itemId&&!used.has(row.id)):undefined;
      if(!chosen){
        chosen=existing.filter(row=>row.itemId===itemId&&!used.has(row.id)).sort((a,b)=>score(b)-score(a)||b.createdAtMs-a.createdAtMs||a.id.localeCompare(b.id))[0];
      }
      if(!chosen){
        chosen={id:deterministicId(c.id,`equipped-${slot}`,itemId,0),itemId,ownerCharacterId:c.id,rarity:itemRarity(itemDef(itemId)),acquireSource:'legacy',sourceReceiptKey:`legacy:equipped:${c.id}:${slot}`,createdAtMs:state.createdAtMs,enhancement:legacyEnhancement(c,itemId),location:'equipped',slot};
      }else if((c.gearEnhancements?.[itemId]?.rank??0)>0||(c.gearEnhancements?.[itemId]?.gemIds?.length??0)>0){
        chosen={...chosen,enhancement:legacyEnhancement(c,itemId)};
      }
      used.add(chosen.id);updates.push({...chosen,ownerCharacterId:c.id,location:'equipped',slot});eqIds[slot]=chosen.id;
    }
    equipmentIdsByCharacter.set(c.id,eqIds);

    for(const itemId of [...new Set(gearIds(ctx.inventory.stacks))]){
      const count=stackQty(ctx.inventory.stacks,itemId);
      updates.push(...assignPool(existing,used,itemId,count,'inventory',c.id,ordinal=>({
        id:deterministicId(c.id,'inventory',itemId,ordinal),itemId,ownerCharacterId:c.id,rarity:itemRarity(itemDef(itemId)),acquireSource:'legacy',sourceReceiptKey:`legacy:inventory:${c.id}:${itemId}:${ordinal}`,createdAtMs:state.createdAtMs,enhancement:emptyEnhancement(),location:'inventory'
      })));
    }
  }

  for(const itemId of [...new Set(gearIds(state.bank.stacks))]){
    const count=stackQty(state.bank.stacks,itemId);
    updates.push(...assignPool(existing,used,itemId,count,'bank','ACCOUNT',ordinal=>({
      id:deterministicId('ACCOUNT','bank',itemId,ordinal),itemId,ownerCharacterId:'ACCOUNT',rarity:itemRarity(itemDef(itemId)),acquireSource:'legacy',sourceReceiptKey:`legacy:bank:${itemId}:${ordinal}`,createdAtMs:state.createdAtMs,enhancement:emptyEnhancement(),location:'bank'
    })));
  }

  const merged=replaceRows(existing,updates,used);
  const active=state.character?{...state.character,equipmentInstanceIds:equipmentIdsByCharacter.get(state.character.id),gearEnhancements:undefined}:null;
  const others=(state.otherCharacters??[]).map(entry=>({...entry,character:{...entry.character,equipmentInstanceIds:equipmentIdsByCharacter.get(entry.character.id),gearEnhancements:undefined}}));
  return {...state,character:active,otherCharacters:others,account:{...state.account,gearInstances:merged,craftedGearInstances:undefined}};
}
export function updateGearInstance(state:GameState,instanceId:string,updater:(row:GearInstance)=>GearInstance):GameState{
  const ready=materializeGearInstances(state),rows=allGearInstances(ready),index=rows.findIndex(row=>row.id===instanceId);
  if(index<0)throw new Error('Equipment instance not found');
  const next=rows.slice();next[index]=updater(rows[index]);
  return {...ready,account:{...ready.account,gearInstances:next}};
}
export function removeGearInstance(state:GameState,instanceId:string){
  const ready=materializeGearInstances(state),rows=allGearInstances(ready),instance=rows.find(row=>row.id===instanceId);
  if(!instance)throw new Error('Equipment instance not found');
  return {state:{...ready,account:{...ready.account,gearInstances:rows.filter(row=>row.id!==instanceId)}},instance};
}
export function setGearInstanceLocation(state:GameState,instanceId:string,location:GearInstanceLocation,slot?:GearSlot){
  return updateGearInstance(state,instanceId,row=>({...row,location,slot:location==='equipped'?slot:undefined}));
}
