import {CLASSES} from '../content/classes';
import {itemDef} from '../content/items';
import {deterministicCraftRarityRoll} from './crafted-gear-rarity';
import {weaponBonusRange,WEAPON_BONUS_LABELS,type WeaponBonusStat} from './weapon-bonus-rolls';
import type {ItemRarity} from './item-rarity';
import type {GearSlot} from './types';

/** T2–T9 non-weapon bonus rolls, stored on the immutable crafted-copy receipt. */
export type EquipmentBonusStat=WeaponBonusStat|'evasion'|'critDamage';
export interface EquipmentBonusRoll{stat:EquipmentBonusStat;basisPoints:number;}
export const EQUIPMENT_BONUS_ROLL_VERSION=1 as const;
export type EquipmentBonusRollVersion=typeof EQUIPMENT_BONUS_ROLL_VERSION;

const HIGH_RARITIES:readonly ItemRarity[]=['epic','legendary','mythic'];
const ROLE_POOL:Readonly<Record<'Tank'|'Damage'|'Support',readonly EquipmentBonusStat[]>>={
  Tank:['maxHp','armor','ward','tenacity','evasion','haste'],
  Damage:['critRate','critDamage','haste','penetration','accuracy','evasion'],
  Support:['potency','haste','ward','maxHp','tenacity','critRate'],
};
const EXTRA_RANGES:Readonly<Record<2|3|5|7|9,Readonly<Record<'evasion'|'critDamage',readonly [number,number]>>>>={
  2:{evasion:[20,70],critDamage:[50,160]},
  3:{evasion:[40,120],critDamage:[100,300]},
  5:{evasion:[60,150],critDamage:[150,400]},
  7:{evasion:[80,180],critDamage:[200,450]},
  9:{evasion:[100,200],critDamage:[250,500]},
};
const BONUS_LABELS:Readonly<Record<EquipmentBonusStat,string>>={
  ...WEAPON_BONUS_LABELS,evasion:'Evasion',critDamage:'Crit Damage',
};
const STEP_BPS=10;
const ELIGIBLE_SLOTS:ReadonlySet<GearSlot>=new Set(['helmet','chest','gloves','legs','boots','offhand','cape','amulet','ring']);
function bandForTier(tier:number):2|3|5|7|9|undefined{
  return tier>=9?9:tier>=7?7:tier>=5?5:tier>=3?3:tier===2?2:undefined;
}

/** Any non-weapon set slot can roll a role-relevant stat. T2 always has one roll. */
export function equipmentBonusConfig(itemId:string,rarity:ItemRarity){
  const item=itemDef(itemId);
  const tier=Number(/^T([1-9])_/.exec(item.equipmentSetId??'')?.[1]??0);
  const role=CLASSES.find(c=>c.id===item.classRestriction)?.role;
  if(item.type!=='gear'||!item.slot||!ELIGIBLE_SLOTS.has(item.slot)||tier<2||tier>9||!role)return undefined;
  const count=tier>=5||(tier>=3&&HIGH_RARITIES.includes(rarity))?2:1;
  return {tier,role,slot:item.slot,count,pool:ROLE_POOL[role]};
}

/** Smaller per-slot percentages than weapons, guarding against nine-slot stacking. */
export function equipmentBonusRange(tier:number,stat:EquipmentBonusStat,slot:GearSlot):readonly [number,number]|undefined{
  const band=bandForTier(tier);
  if(band===undefined||!ELIGIBLE_SLOTS.has(slot))return undefined;
  const base=stat==='evasion'||stat==='critDamage'
    ?EXTRA_RANGES[band][stat]:weaponBonusRange(tier,stat);
  if(!base)return undefined;
  const factor=slot==='offhand'?.8:slot==='amulet'||slot==='ring'?.7:.55;
  const min=Math.max(STEP_BPS,Math.ceil(base[0]*factor/STEP_BPS)*STEP_BPS);
  const max=Math.max(min+STEP_BPS,Math.floor(base[1]*factor/STEP_BPS)*STEP_BPS);
  return [min,max];
}

/** Repeating the same trusted Forge claim returns exactly the same two unique stats. */
export function rollEquipmentBonuses(itemId:string,rarity:ItemRarity,receiptKey:string,trustedRoll:number):EquipmentBonusRoll[]|undefined{
  if(!Number.isFinite(trustedRoll)||trustedRoll<0||trustedRoll>=1)throw new Error('Invalid trusted equipment roll');
  const cfg=equipmentBonusConfig(itemId,rarity);
  if(!cfg)return undefined;
  const available=[...cfg.pool],result:EquipmentBonusRoll[]=[];
  const seed=`${trustedRoll.toFixed(12)}:${receiptKey}:${itemId}`;
  for(let index=0;index<cfg.count;index++){
    const choice=deterministicCraftRarityRoll(`equipment-affix:v1:stat:${seed}:${index}`);
    const [stat]=available.splice(Math.min(available.length-1,Math.floor(choice*available.length)),1);
    const [minimum,maximum]=equipmentBonusRange(cfg.tier,stat,cfg.slot)!;
    const steps=(maximum-minimum)/STEP_BPS;
    const roll=deterministicCraftRarityRoll(`equipment-affix:v1:value:${seed}:${index}`);
    result.push({stat,basisPoints:minimum+STEP_BPS*Math.min(steps,Math.floor(roll*(steps+1)))});
  }
  return result;
}

/** Missing receipts remain unrolled. Reject any malformed/version-mismatched stat set. */
export function normalizeEquipmentBonuses(itemId:string,rarity:ItemRarity,raw:unknown,version:unknown):EquipmentBonusRoll[]|undefined{
  const cfg=equipmentBonusConfig(itemId,rarity);
  if(!cfg||version!==EQUIPMENT_BONUS_ROLL_VERSION||!Array.isArray(raw)||raw.length!==cfg.count)return undefined;
  const seen=new Set<EquipmentBonusStat>(),result:EquipmentBonusRoll[]=[];
  for(const entry of raw){
    if(!entry||typeof entry!=='object')return undefined;
    const {stat,basisPoints}=entry as Partial<EquipmentBonusRoll>;
    if(!stat||!cfg.pool.includes(stat)||seen.has(stat))return undefined;
    const range=equipmentBonusRange(cfg.tier,stat,cfg.slot);
    if(!range||!Number.isInteger(basisPoints)||basisPoints!<range[0]||basisPoints!>range[1]
      ||(basisPoints!-range[0])%STEP_BPS!==0)return undefined;
    seen.add(stat);
    result.push({stat,basisPoints:basisPoints!});
  }
  return result;
}
export function equipmentBonusStrength(itemId:string,rarity:ItemRarity,bonus:EquipmentBonusRoll){
  const cfg=equipmentBonusConfig(itemId,rarity);
  const range=cfg?.pool.includes(bonus.stat)?equipmentBonusRange(cfg.tier,bonus.stat,cfg.slot):undefined;
  if(!range)return 0;
  return Math.max(0,Math.min(100,Math.round(100*(bonus.basisPoints-range[0])/(range[1]-range[0]))));
}
export function equipmentBonusCompactLine(bonus:EquipmentBonusRoll){
  return `+${(bonus.basisPoints/100).toFixed(1)}% ${BONUS_LABELS[bonus.stat]}`;
}
export function equipmentBonusLine(itemId:string,rarity:ItemRarity,bonus:EquipmentBonusRoll){
  const cfg=equipmentBonusConfig(itemId,rarity);
  const range=cfg?.pool.includes(bonus.stat)?equipmentBonusRange(cfg.tier,bonus.stat,cfg.slot):undefined;
  if(!range)return '';
  return `${equipmentBonusCompactLine(bonus)} · Range ${(range[0]/100).toFixed(1)}–${(range[1]/100).toFixed(1)}% · ${equipmentBonusStrength(itemId,rarity,bonus)}/100 roll`;
}
