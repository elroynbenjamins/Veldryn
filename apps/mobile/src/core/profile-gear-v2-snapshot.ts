import {WEAPON_BONUS_LABELS,type WeaponBonusStat} from './weapon-bonus-rolls';
export interface ProfileV2Bonus{stat:WeaponBonusStat;percent:number}
export interface ProfileV2Snapshot{
 name:string;tier:number;
 /** Raw item-only numbers, already scaled by rarity, quality and enhancement. */
 baseStats:{attack:number;defense:number;hp:number};
 innateBonuses:ProfileV2Bonus[];randomBonuses:ProfileV2Bonus[];trait?:string;
}
/** Future trusted server projection only; never a craft preview or private receipt. */
export function normalizeProfileV2Snapshot(raw:unknown):ProfileV2Snapshot|undefined{
 if(!raw||typeof raw!=='object')return undefined;
 const row=raw as Record<string,unknown>,stats=row.baseStats as Record<string,unknown>|undefined;
 if(typeof row.name!=='string'||!row.name.trim()||row.name.length>120||typeof row.tier!=='number'||!Number.isInteger(row.tier)||row.tier<1||row.tier>9||!stats||typeof stats!=='object')return undefined;
 const {attack,defense,hp}=stats;
 const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e9;
 if(!finite(attack)||!finite(defense)||!finite(hp)||[attack,defense,hp].filter(v=>v>0).length<1||[attack,defense,hp].filter(v=>v>0).length>2)return undefined;
 const parse=(raw:unknown,max:number):ProfileV2Bonus[]|undefined=>{
  if(!Array.isArray(raw)||raw.length>max)return undefined;
  const seen=new Set<string>(),out:ProfileV2Bonus[]=[];
  for(const entry of raw){
   if(!entry||typeof entry!=='object'||typeof entry.stat!=='string'||!Object.prototype.hasOwnProperty.call(WEAPON_BONUS_LABELS,entry.stat)||seen.has(entry.stat)||typeof entry.percent!=='number'||!Number.isFinite(entry.percent)||entry.percent<=0||entry.percent>100)return undefined;
   seen.add(entry.stat);out.push({stat:entry.stat as WeaponBonusStat,percent:entry.percent});
  }
  return out;
 };
 const innateBonuses=parse(row.innateBonuses,4),randomBonuses=parse(row.randomBonuses,3);
 if(!innateBonuses||!randomBonuses)return undefined;
 if(row.trait!==undefined&&row.trait!==null&&(typeof row.trait!=='string'||row.trait.length>500))return undefined;
 return {name:row.name,tier:row.tier,baseStats:{attack,defense,hp},innateBonuses,randomBonuses,trait:typeof row.trait==='string'?row.trait:undefined};
}
export function profileBonusPercent(percent:number){return '+'+Number(percent.toFixed(2))+'%';}
