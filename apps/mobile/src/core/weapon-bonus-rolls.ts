import {CLASSES} from '../content/classes';
import {itemDef} from '../content/items';
import {deterministicCraftRarityRoll} from './crafted-gear-rarity';
import type {ItemRarity} from './item-rarity';

/** Basis points: 100 = +1.0 percentage point. One decimal place is displayed. */
export type WeaponBonusStat='maxHp'|'armor'|'ward'|'tenacity'|'critRate'|'haste'|'penetration'|'accuracy'|'potency';
export interface WeaponBonusRoll{stat:WeaponBonusStat;basisPoints:number;}
export const WEAPON_BONUS_ROLL_VERSION=2;
export type WeaponBonusRollVersion=1|2;
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
/** Stat-sensitive ranges in basis points, grouped by weapon tier.
 * HP and Tenacity have wider budgets than combat tempo/crit/avoidance stats. */
type WeaponTierBand=2|3|5|7|9;
export const WEAPON_BONUS_BPS_BY_BAND:Readonly<Record<WeaponTierBand,Readonly<Record<WeaponBonusStat,readonly [number,number]>>>>={
  2:{
    maxHp:[100,250],armor:[80,180],ward:[30,90],tenacity:[100,240],
    critRate:[30,80],haste:[40,110],penetration:[50,130],accuracy:[30,90],potency:[80,200],
  },
  3:{
    maxHp:[200,400],armor:[150,300],ward:[50,150],tenacity:[200,400],
    critRate:[50,150],haste:[80,200],penetration:[100,250],accuracy:[50,150],potency:[150,350],
  },
  5:{
    maxHp:[300,550],armor:[200,400],ward:[80,200],tenacity:[300,500],
    critRate:[80,200],haste:[120,250],penetration:[150,300],accuracy:[80,200],potency:[250,450],
  },
  7:{
    maxHp:[400,700],armor:[250,450],ward:[100,250],tenacity:[400,600],
    critRate:[100,250],haste:[150,300],penetration:[200,350],accuracy:[100,250],potency:[300,550],
  },
  9:{
    maxHp:[500,800],armor:[300,500],ward:[150,300],tenacity:[500,700],
    critRate:[150,300],haste:[200,350],penetration:[250,400],accuracy:[150,300],potency:[400,650],
  },
};
/** Version 1 is retained for any older test/staging receipts. Never reinterpret a
 * previously minted percentage under a newly tuned range. */
const V1_RANGE_BY_BAND:Readonly<Partial<Record<WeaponTierBand,readonly [number,number]>>>={
  3:[100,300],5:[200,400],7:[300,500],9:[400,600],
};
/** The maximum of a stat is independent of the other stat on a dual-roll weapon. */
export function weaponBonusRange(
  tier:number,stat:WeaponBonusStat,version:WeaponBonusRollVersion=WEAPON_BONUS_ROLL_VERSION,
):readonly [number,number]|undefined{
  const band:WeaponTierBand|undefined=tier===9?9:tier>=7&&tier<=8?7:tier>=5&&tier<=6?5:tier>=3&&tier<=4?3:tier===2?2:undefined;
  if(band===undefined)return undefined;
  return version===1?V1_RANGE_BY_BAND[band]:version===2?WEAPON_BONUS_BPS_BY_BAND[band][stat]:undefined;
}
const HIGH_RARITIES:readonly ItemRarity[]=['epic','legendary','mythic'];
const STEP_BPS=10;

export function weaponBonusConfig(itemId:string,rarity:ItemRarity){
  const item=itemDef(itemId);
  const tier=Number(/^T([1-9])_/.exec(item.equipmentSetId??'')?.[1]??0);
  const role=CLASSES.find(c=>c.id===item.classRestriction)?.role;
  if(item.type!=='gear'||item.slot!=='weapon'||tier<2||tier>9||!role)return undefined;
  const count=tier>=5||(tier>=3&&HIGH_RARITIES.includes(rarity))?2:1;
  return {tier,role,count,pool:ROLE_POOL[role]};
}

/** Trusted claim-roll + receipt seeded; independent of rarity/quality and stable across retries. */
export function rollWeaponBonuses(itemId:string,rarity:ItemRarity,receiptKey:string,trustedRoll:number):WeaponBonusRoll[]|undefined{
  if(!Number.isFinite(trustedRoll)||trustedRoll<0||trustedRoll>=1)throw new Error('Invalid trusted weapon roll');
  const cfg=weaponBonusConfig(itemId,rarity);
  if(!cfg)return undefined;
  const pool=[...cfg.pool],out:WeaponBonusRoll[]=[];
  const seed=`${trustedRoll.toFixed(12)}:${receiptKey}:${itemId}`;
  for(let index=0;index<cfg.count;index++){
    const statUnit=deterministicCraftRarityRoll(`weapon-affix:v2:stat:${seed}:${index}`);
    const position=Math.min(pool.length-1,Math.floor(statUnit*pool.length));
    const [stat]=pool.splice(position,1); // Two bonuses must have different stat types.
    const valueUnit=deterministicCraftRarityRoll(`weapon-affix:v2:value:${seed}:${index}`);
    const range=weaponBonusRange(cfg.tier,stat)!;
    const steps=(range[1]-range[0])/STEP_BPS;
    out.push({stat,basisPoints:range[0]+STEP_BPS*Math.min(steps,Math.floor(valueUnit*(steps+1)))});
  }
  return out;
}

/** Missing bonuses remain missing on legacy copies; malformed values never grant stats. */
export function normalizeWeaponBonuses(itemId:string,rarity:ItemRarity,raw:unknown,version:WeaponBonusRollVersion=WEAPON_BONUS_ROLL_VERSION):WeaponBonusRoll[]|undefined{
  const cfg=weaponBonusConfig(itemId,rarity);
  if(!cfg||!Array.isArray(raw)||raw.length!==cfg.count)return undefined;
  const seen=new Set<WeaponBonusStat>(),out:WeaponBonusRoll[]=[];
  for(const entry of raw){
    if(!entry||typeof entry!=='object')return undefined;
    const {stat,basisPoints}=entry as Partial<WeaponBonusRoll>;
    const range=typeof stat==='string'&&cfg.pool.includes(stat as WeaponBonusStat)
      ?weaponBonusRange(cfg.tier,stat as WeaponBonusStat,version):undefined;
    if(!range||seen.has(stat as WeaponBonusStat)
      ||typeof basisPoints!=='number'||!Number.isInteger(basisPoints)
      ||basisPoints<range[0]||basisPoints>range[1]
      ||(basisPoints-range[0])%STEP_BPS!==0)return undefined;
    seen.add(stat as WeaponBonusStat);
    out.push({stat:stat as WeaponBonusStat,basisPoints});
  }
  return out;
}

export function weaponBonusStrength(itemId:string,rarity:ItemRarity,bonus:WeaponBonusRoll,version:WeaponBonusRollVersion=WEAPON_BONUS_ROLL_VERSION){
  const cfg=weaponBonusConfig(itemId,rarity);
  const range=cfg?.pool.includes(bonus.stat)?weaponBonusRange(cfg.tier,bonus.stat,version):undefined;
  if(!range)return 0;
  return Math.max(0,Math.min(100,Math.round(100*(bonus.basisPoints-range[0])/(range[1]-range[0]))));
}
/** Quick, glanceable equipment label; explanatory range lives in the detailed tooltip. */
export function weaponBonusCompactLine(bonus:WeaponBonusRoll){
  return `+${(bonus.basisPoints/100).toFixed(1)}% ${WEAPON_BONUS_LABELS[bonus.stat]}`;
}
export type WeaponBonusRollGrade='Perfect'|'Excellent'|'Strong'|'Standard';
export function weaponBonusRollGrade(strength:number):WeaponBonusRollGrade{
  return strength===100?'Perfect':strength>=90?'Excellent':strength>=70?'Strong':'Standard';
}

export function weaponBonusLine(itemId:string,rarity:ItemRarity,bonus:WeaponBonusRoll,version:WeaponBonusRollVersion=WEAPON_BONUS_ROLL_VERSION){
  const cfg=weaponBonusConfig(itemId,rarity);
  const range=cfg?.pool.includes(bonus.stat)?weaponBonusRange(cfg.tier,bonus.stat,version):undefined;
  if(!range)return '';
  return `${weaponBonusCompactLine(bonus)} · Range ${(range[0]/100).toFixed(1)}–${(range[1]/100).toFixed(1)}% · ${weaponBonusStrength(itemId,rarity,bonus,version)}/100 roll`;
}
