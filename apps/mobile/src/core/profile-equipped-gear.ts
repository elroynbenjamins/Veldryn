import type {CharacterState,GameState,GearSlot} from './types';
import type {ItemRarity} from './item-rarity';

/** Stable ten-slot order used by the public profile and local audience preview. */
export const PROFILE_GEAR_SLOTS:readonly GearSlot[]=[
 'helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring',
];
export interface ProfileEquippedGear{
 slot:GearSlot;
 itemId:string;
 rarity?:ItemRarity;
 quality?:number;
 rank?:number;
 statGemId?:string;
 effectGemId?:string;
 /** Legacy saves used a single array for both gem socket types. */
 gemIds?:string[];
}
const rarities:readonly string[]=['common','uncommon','rare','epic','legendary','mythic'];
const allowedSlots=new Set<string>(PROFILE_GEAR_SLOTS);

/** Keep ten slots accessible in narrow modal sheets and with large system text. */
export function profileGearColumnCount(width:number,fontScale:number):3|4|5{
 if(!Number.isFinite(width)||width<258||fontScale>=1.4)return 3;
 if(width<318||fontScale>=1.18)return 4;
 return 5;
}
const cleanId=(value:unknown)=>typeof value==='string'&&value.length>0&&value.length<=160?value:undefined;
const cleanRank=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=4?value:undefined;
const cleanQuality=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=100?value:undefined;
const cleanGems=(value:unknown)=>Array.isArray(value)?Array.from(new Set(value.map(cleanId).filter((id):id is string=>!!id))).slice(0,2):[];

/** Validate untrusted RPC JSON and never repeat or invent equipment slots. */
export function normalizeProfileGear(rows:unknown):ProfileEquippedGear[]|undefined{
 if(!Array.isArray(rows))return undefined;
 const bySlot=new Map<GearSlot,ProfileEquippedGear>();
 for(const raw of rows){
  if(!raw||typeof raw!=='object')continue;
  const row=raw as Record<string,unknown>;
  if(typeof row.slot!=='string'||!allowedSlots.has(row.slot)||bySlot.has(row.slot as GearSlot))continue;
  const itemId=cleanId(row.itemId);
  if(!itemId)continue;
  const rarity=typeof row.rarity==='string'&&rarities.includes(row.rarity)?row.rarity as ItemRarity:undefined;
  bySlot.set(row.slot as GearSlot,{
   slot:row.slot as GearSlot,itemId,rarity,
   quality:cleanQuality(row.quality),rank:cleanRank(row.rank),
   statGemId:cleanId(row.statGemId),effectGemId:cleanId(row.effectGemId),
   gemIds:cleanGems(row.gemIds),
  });
 }
 return PROFILE_GEAR_SLOTS.flatMap(slot=>bySlot.has(slot)?[bySlot.get(slot)!]:[]);
}

/** Offline/self preview uses the selected character, not necessarily the active one. */
export function localProfileGear(state:GameState,selectedCharacterId?:string|null):ProfileEquippedGear[]{
 const characters:CharacterState[]=[
  ...(state.character?[state.character]:[]),
  ...(state.otherCharacters??[]).map(row=>row.character),
 ];
 const character=characters.find(row=>row.id===selectedCharacterId)??(selectedCharacterId?undefined:state.character);
 if(!character)return [];
 return PROFILE_GEAR_SLOTS.flatMap(slot=>{
  const itemId=character.equipment?.[slot];
  if(!itemId)return [];
  const instanceId=character.equipmentInstanceIds?.[slot];
  const instance=instanceId?state.account.craftedGearInstances?.find(row=>
    row.id===instanceId&&row.itemId===itemId&&row.ownerCharacterId===character.id):undefined;
  const enhancement=instance?.enhancement??character.gearEnhancements?.[itemId];
  return [{
   slot,itemId,rarity:instance?.rarity,
   quality:cleanQuality(instance?.quality),
   rank:cleanRank(enhancement?.rank),
   statGemId:cleanId(enhancement?.statGemId),
   effectGemId:cleanId(enhancement?.effectGemId),
   gemIds:cleanGems(enhancement?.gemIds),
  }];
 });
}
