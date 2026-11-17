import {CLASSES} from '../content/classes';
import {itemDef} from '../content/items';
import {deterministicCraftRarityRoll} from './crafted-gear-rarity';
import type {ItemRarity} from './item-rarity';

/** Basis points: 100 = +1.0 percentage point. One decimal place is displayed. */
export type WeaponBonusStat='maxHp'|'armor'|'ward'|'tenacity'|'critRate'|'haste'|'penetration'|'accuracy'|'potency';
export interface WeaponBonusRoll{stat:WeaponBonusStat;basisPoints:number;}
export const WEAPON_BONUS_ROLL_VERSION=1;
export const WEAPON_BONUS_LABELS:Readonly<Record<WeaponBonusStat,string>>={
  maxHp:'Max HP',armor:'Armor',ward:'Ward',tenacity:'Tenacity',
  critRate:'Crit Rate',haste:'Haste',penetration:'Penetration',
  accuracy:'Accuracy',potency:'Potency',
};
const ROLE_POOL:Readonly<Record<'Tank'|'Damage'|'Support',readonly WeaponBonusStat[]>>={
  Tank:['armor','maxHp','ward','tenacity'],
  Damage:['critRate','haste','penetration','accuracy'],
  Support:['potency','haste','ward','maxHp'],
};
const RANGE_BY_TIER:Readonly<Record<number,readonly [number,number]>>={
  3:[100,300],4:[100,300],5:[200,400],6:[200,400],
  7:[300,500],8:[300,500],9:[400,600],
};
const HIGH_RARITIES:readonly ItemRarity[]=['epic','legendary','mythic'];
const STEP_BPS=10;

export function weaponBonusConfig(itemId:string,rarity:ItemRarity){
  const item=itemDef(itemId);
  const tier=Number(/^T([1-9])_/.exec(item.equipmentSetId??'')?.[1]??0);
  const role=CLASSES.find(c=>c.id===item.classRestriction)?.role;
  const range=RANGE_BY_TIER[tier];
  if(item.type!=='gear'||item.slot!=='weapon'||!range||!role)return undefined;
  const count=tier>=5||HIGH_RARITIES.includes(rarity)?2:1;
  return {tier,role,range,count,pool:ROLE_POOL[role]};
}

/** Trusted claim-roll + receipt seeded; independent of rarity/quality and stable across retries. */
export function rollWeaponBonuses(itemId:string,rarity:ItemRarity,receiptKey:string,trustedRoll:number):WeaponBonusRoll[]|undefined{
  if(!Number.isFinite(trustedRoll)||trustedRoll<0||trustedRoll>=1)throw new Error('Invalid trusted weapon roll');
  const cfg=weaponBonusConfig(itemId,rarity);
  if(!cfg)return undefined;
  const pool=[...cfg.pool],out:WeaponBonusRoll[]=[];
  const seed=`${trustedRoll.toFixed(12)}:${receiptKey}:${itemId}`;
  const steps=(cfg.range[1]-cfg.range[0])/STEP_BPS;
  for(let index=0;index<cfg.count;index++){
    const statUnit=deterministicCraftRarityRoll(`weapon-affix:v1:stat:${seed}:${index}`);
    const position=Math.min(pool.length-1,Math.floor(statUnit*pool.length));
    const [stat]=pool.splice(position,1); // Two bonuses must have different stat types.
    const valueUnit=deterministicCraftRarityRoll(`weapon-affix:v1:value:${seed}:${index}`);
    out.push({stat,basisPoints:cfg.range[0]+STEP_BPS*Math.min(steps,Math.floor(valueUnit*(steps+1)))});
  }
  return out;
}

/** Missing bonuses remain missing on legacy copies; malformed values never grant stats. */
export function normalizeWeaponBonuses(itemId:string,rarity:ItemRarity,raw:unknown):WeaponBonusRoll[]|undefined{
  const cfg=weaponBonusConfig(itemId,rarity);
  if(!cfg||!Array.isArray(raw)||raw.length!==cfg.count)return undefined;
  const seen=new Set<WeaponBonusStat>(),out:WeaponBonusRoll[]=[];
  for(const entry of raw){
    if(!entry||typeof entry!=='object')return undefined;
    const {stat,basisPoints}=entry as Partial<WeaponBonusRoll>;
    if(typeof stat!=='string'||!cfg.pool.includes(stat as WeaponBonusStat)||seen.has(stat as WeaponBonusStat)
      ||typeof basisPoints!=='number'||!Number.isInteger(basisPoints)
      ||basisPoints<cfg.range[0]||basisPoints>cfg.range[1]
      ||(basisPoints-cfg.range[0])%STEP_BPS!==0)return undefined;
    seen.add(stat as WeaponBonusStat);
    out.push({stat:stat as WeaponBonusStat,basisPoints});
  }
  return out;
}

export function weaponBonusStrength(itemId:string,rarity:ItemRarity,bonus:WeaponBonusRoll){
  const range=weaponBonusConfig(itemId,rarity)?.range;
  if(!range)return 0;
  return Math.round(100*(bonus.basisPoints-range[0])/(range[1]-range[0]));
}
export function weaponBonusLine(itemId:string,rarity:ItemRarity,bonus:WeaponBonusRoll){
  const cfg=weaponBonusConfig(itemId,rarity);
  if(!cfg)return '';
  return `+${(bonus.basisPoints/100).toFixed(1)}% ${WEAPON_BONUS_LABELS[bonus.stat]} (${(cfg.range[0]/100).toFixed(1)}–${(cfg.range[1]/100).toFixed(1)}%, ${weaponBonusStrength(itemId,rarity,bonus)}% roll)`;
}
