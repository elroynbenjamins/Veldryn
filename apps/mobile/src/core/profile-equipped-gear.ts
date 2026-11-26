import type {CharacterState,GameState,GearSlot} from './types';
import {itemRarity,type ItemRarity} from './item-rarity';
import {itemDef} from '../content/items';
import {normalizeGemRollPercentV1,gemRolledValueV1} from '../content/gems-v1';
import {gearStatsAtRank,gemEffectDescription,legacyGemBonusValue,normalizeEnhancementGemSlots} from './equipment-enhancement';
import {canonicalGemMetaV1,formatGemValueV1} from './gem-progression-v1';
import {normalizeWeaponBonuses,type WeaponBonusRoll,type WeaponBonusRollVersion} from './weapon-bonus-rolls';
import {normalizeEquipmentBonuses} from './equipment-bonus-rolls';
import {craftedGearQualityMultiplier} from './crafted-gear-instances';
import {craftedRarityStatMultiplier} from './crafted-gear-rarity';

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
 /** True only when the server resolved the selected character and its exact equipped copy. */
 inspectionKnown?:boolean;
 /** Old RPC: only the item-level stat inputs are known, not rolled gem or bonus details. */
 legacyStatsKnown?:boolean;
 bonuses?:WeaponBonusRoll[];
 statGemRollPercent?:number;
 effectGemRollPercent?:number;
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

function copyBonuses(itemId:string,rarity:ItemRarity|undefined,row:Record<string,unknown>):WeaponBonusRoll[]|undefined{
 if(!rarity)return undefined;
 try{
  const item=itemDef(itemId);
  if(item.type!=='gear')return undefined;
  if(item.slot==='weapon'){
   const rawVersion=row.weaponBonusRollVersion;
   const version=rawVersion===undefined||rawVersion===null?1:rawVersion;
   if(typeof version!=='number'||![1,2,3,4,5,6,7].includes(version))return undefined;
   return normalizeWeaponBonuses(itemId,rarity,row.weaponBonuses,version as WeaponBonusRollVersion);
  }
  return normalizeEquipmentBonuses(itemId,rarity,row.equipmentBonuses,row.equipmentBonusRollVersion);
 }catch{return undefined}
}

/** No viewer loadout, set bonuses, or speculative values are included. */
export function profileItemStats(gear:ProfileEquippedGear){
 try{
  if(gear.inspectionKnown!==true&&gear.legacyStatsKnown!==true)return undefined;
  const item=itemDef(gear.itemId);
  if(item.type!=='gear'||item.slot!==gear.slot)return undefined;
  // Reuse the authoritative rank, rarity and quality helpers without changing shared combat code.
  const stats=gearStatsAtRank(item.id,gear.rank??0);
  const quality=gear.quality===undefined?1:craftedGearQualityMultiplier(gear.quality);
  const m=craftedRarityStatMultiplier(item.id,gear.rarity??itemRarity(item))*quality;
  return {hp:stats.hp*m,attack:stats.attack*m,defense:stats.defense*m};
 }catch{return undefined}
}

export function profileItemSockets(gear:ProfileEquippedGear){
 const slots=normalizeEnhancementGemSlots(gear);
 return (['stat','effect'] as const).map(kind=>{
  const id=kind==='stat'?slots.statGemId:slots.effectGemId;
  const roll=kind==='stat'?slots.statGemRollPercent:slots.effectGemRollPercent;
  if(!id)return {kind,id:undefined,detail:undefined};
  // An old RPC did not include roll strength. Do not imply a neutral roll is verified.
  if(gear.inspectionKnown!==true)return {kind,id,detail:undefined};
  try{
   const gem=itemDef(id),meta=canonicalGemMetaV1(id);
   const value=meta?gemRolledValueV1(meta.familyId,meta.grade,roll):legacyGemBonusValue(id,roll);
   const detail=kind==='stat'
    ?meta?formatGemValueV1(meta.familyId,meta.grade,roll):`+${Number((value*100).toFixed(3))}% ${gem.gemStat??'stat'}`
    :meta?`${Number((value*100).toFixed(3))}% · ${gemEffectDescription(id)}`:gemEffectDescription(id,roll);
   return {kind,id,detail};
  }catch{return {kind,id,detail:undefined}}
 });
}

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
  const validOptional=(value:unknown,cleaned:unknown)=>value===null||value===undefined||cleaned!==undefined;
  // Explicit false is never treated as complete. Older endpoints can still supply exact
  // rarity and enhancement metadata for already minted gear; allow that narrow fallback
  // for item-only stats, but never guess absent bonus/gem roll data.
  const valid=validOptional(row.rank,cleanRank(row.rank))&&validOptional(row.quality,cleanQuality(row.quality))&&validOptional(row.rarity,rarity);
  const known=row.inspectionKnown===true&&valid;
  const legacyStatsKnown=row.inspectionKnown===undefined&&valid&&!!rarity&&cleanRank(row.rank)!==undefined;
  bySlot.set(row.slot as GearSlot,{
   slot:row.slot as GearSlot,itemId,rarity,
   quality:cleanQuality(row.quality),rank:cleanRank(row.rank),
   inspectionKnown:known,legacyStatsKnown,
   bonuses:known?copyBonuses(itemId,rarity,row):undefined,
   statGemRollPercent:normalizeGemRollPercentV1(row.statGemRollPercent),
   effectGemRollPercent:normalizeGemRollPercentV1(row.effectGemRollPercent),
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
  const matches=instanceId?(state.account.craftedGearInstances??[]).filter(row=>row.id===instanceId):[];
  const candidate=matches.length===1?matches[0]:undefined;
  const instance=candidate?.itemId===itemId&&candidate.ownerCharacterId===character.id?candidate:undefined;
  const enhancement=instanceId?instance?.enhancement:character.gearEnhancements?.[itemId];
  return [{
   slot,itemId,rarity:instance?.rarity,
   inspectionKnown:!instanceId||!!instance&&!!instance.enhancement,
   bonuses:instance?copyBonuses(itemId,instance.rarity,{...instance}):undefined,
   statGemRollPercent:normalizeGemRollPercentV1(enhancement?.statGemRollPercent),
   effectGemRollPercent:normalizeGemRollPercentV1(enhancement?.effectGemRollPercent),
   quality:cleanQuality(instance?.quality),
   rank:cleanRank(enhancement?.rank),
   statGemId:cleanId(enhancement?.statGemId),
   effectGemId:cleanId(enhancement?.effectGemId),
   gemIds:cleanGems(enhancement?.gemIds),
  }];
 });
}

export function profileBonusPercent(percent:number){return '+'+Number(percent.toFixed(2))+'%';}
