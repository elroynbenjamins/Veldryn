import {randomInt} from 'node:crypto';

/** Hidden server-only Equipment/Crafting 2.0 outcome GENERATOR.
 * Do not mount this in an API until ownership checks, stock/Gold reservation,
 * atomic receipt persistence and idempotent replay are completed and audited.
 * Public clients must never supply rarity, quality or random units.
 */
export type V2Rarity='common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic';
export type V2Tier=1|2|3|4;
export type V2Role='tank'|'damage'|'support';
export type V2Slot='helmet'|'chest'|'gloves'|'legs'|'boots'|'cape'|'weapon'|'offhand'|'amulet'|'ring';
export type V2Affix='armor'|'maxHp'|'ward'|'tenacity'|'critRate'|'critDamage'|'haste'|'penetration'|'accuracy'|'potency'|'abilityDamage'|'healingPower';
export interface V2RollBand{rarity:V2Rarity;buckets:number;low:number;high:number;affixesLowTier:number;affixesHighTier:number}
export const EQUIPMENT_V2_SERVER_RULES_VERSION='equipment-crafting-v2-draft-1' as const;
export const V2_SERVER_RARITY_BANDS:readonly V2RollBand[]=[
 {rarity:'mythic',buckets:1000,low:.85,high:1,affixesLowTier:2,affixesHighTier:3},
 {rarity:'legendary',buckets:4000,low:.7,high:.95,affixesLowTier:2,affixesHighTier:2},
 {rarity:'epic',buckets:15000,low:.55,high:.85,affixesLowTier:1,affixesHighTier:2},
 {rarity:'rare',buckets:50000,low:.4,high:.7,affixesLowTier:1,affixesHighTier:1},
 {rarity:'uncommon',buckets:130000,low:.2,high:.45,affixesLowTier:1,affixesHighTier:1},
 {rarity:'common',buckets:800000,low:0,high:.25,affixesLowTier:1,affixesHighTier:1},
] as const;
export const V2_SERVER_RARITY_BASE_MULTIPLIER:Readonly<Record<V2Rarity,number>>={
 common:1,uncommon:1.10,rare:1.25,epic:1.42,legendary:1.65,mythic:1.85,
};
/** Percentage values, with T3 and T4 sharing provisional affix magnitudes.
 * Separate T4 ranges may be considered after actual combat projection.
 */
export const V2_SERVER_AFFIX_RANGES:Readonly<Record<V2Affix,readonly [readonly [number,number],readonly [number,number],readonly [number,number],readonly [number,number]]>>={
 armor:[[.6,1.2],[1,2],[1.5,3],[1.5,3]],
 maxHp:[[.8,1.6],[1.2,2.5],[2,4],[2,4]],
 ward:[[.2,.7],[.3,1],[.5,1.5],[.5,1.5]],
 tenacity:[[.8,1.6],[1.2,2.6],[2,4],[2,4]],
 critRate:[[.2,.7],[.3,1],[.5,1.5],[.5,1.5]],
 critDamage:[[1,2.5],[1.5,3.5],[2.5,5.5],[2.5,5.5]],
 haste:[[.3,.9],[.5,1.3],[.8,2],[.8,2]],
 penetration:[[.4,1.1],[.7,1.7],[1,2.5],[1,2.5]],
 accuracy:[[.2,.7],[.3,1],[.5,1.5],[.5,1.5]],
 potency:[[.6,1.5],[1,2.3],[1.5,3.5],[1.5,3.5]],
 abilityDamage:[[.8,1.8],[1.2,2.8],[2,4.5],[2,4.5]],
 healingPower:[[.8,1.8],[1.2,2.8],[2,4.5],[2,4.5]],
};
const ROLE_WEIGHTS:Readonly<Record<V2Role,readonly {affix:V2Affix;weight:number}[]>>={
 tank:[{affix:'armor',weight:30},{affix:'maxHp',weight:30},{affix:'ward',weight:20},{affix:'tenacity',weight:20}],
 damage:[{affix:'critRate',weight:20},{affix:'critDamage',weight:20},{affix:'haste',weight:15},{affix:'penetration',weight:15},{affix:'abilityDamage',weight:15},{affix:'accuracy',weight:10},{affix:'potency',weight:5}],
 support:[{affix:'potency',weight:30},{affix:'healingPower',weight:25},{affix:'ward',weight:15},{affix:'haste',weight:15},{affix:'maxHp',weight:10},{affix:'tenacity',weight:5}],
};
const SLOT_AFFIX_PREFERENCES:Readonly<Record<V2Slot,readonly V2Affix[]>>={
 helmet:['armor','maxHp','ward','accuracy'],chest:['armor','maxHp','ward','tenacity'],
 gloves:['critRate','critDamage','haste','accuracy'],legs:['maxHp','armor','ward','tenacity'],
 boots:['haste','accuracy','tenacity','maxHp'],cape:['ward','potency','healingPower','maxHp'],
 weapon:['critRate','critDamage','penetration','abilityDamage','potency','healingPower'],
 offhand:['armor','maxHp','ward','potency'],amulet:['critDamage','abilityDamage','healingPower','maxHp'],
 ring:['critRate','haste','penetration','potency'],
};
export interface V2TrustedRecipeTemplate {
 /** Selected by authenticated server against canonical allowed recipe and catalogue. */
 recipeId:string;pieceId:string;slot:V2Slot;role:V2Role;tier:V2Tier;
}
export interface V2RolledAffix {stat:V2Affix;percent:number;grade:number}
export interface V2DraftRollOutcome {
 rulesVersion:typeof EQUIPMENT_V2_SERVER_RULES_VERSION;
 recipeId:string;pieceId:string;tier:V2Tier;rarity:V2Rarity;quality:number;
 baseStatMultiplier:number;affixes:readonly V2RolledAffix[];
}
type SecureDraw=(exclusiveMax:number)=>number;
function draw(drawInt:SecureDraw,max:number){
 const value=drawInt(max);
 if(!Number.isSafeInteger(value)||value<0||value>=max)throw new Error('invalid_server_rng');
 return value;
}
function pickWeighted(pool:readonly {affix:V2Affix;weight:number}[],drawInt:SecureDraw):V2Affix{
 const sum=pool.reduce((total,row)=>total+row.weight,0);
 if(sum<=0)throw new Error('affix_pool_empty');
 let next=draw(drawInt,sum);
 for(const row of pool){next-=row.weight;if(next<0)return row.affix;}
 throw new Error('affix_pool_unreachable');
}
function chooseAffixes(role:V2Role,slot:V2Slot,count:number,drawInt:SecureDraw):V2Affix[]{
 const pool=ROLE_WEIGHTS[role],preferred=SLOT_AFFIX_PREFERENCES[slot],picked:V2Affix[]=[];
 for(let i=0;i<count;i++){
  const eligible=pool.filter(row=>!picked.includes(row.affix));
  if(!eligible.length)throw new Error('affix_pool_exhausted');
  const slotEligible=eligible.filter(row=>preferred.includes(row.affix));
  const useSlot=slotEligible.length>0&&draw(drawInt,100)<70;
  picked.push(pickWeighted(useSlot?slotEligible:eligible,drawInt));
 }
 return picked;
}
/** Internal candidate only. Not an item receipt, authorization or persisted roll. */
export function draftEquipmentV2Outcome(input:V2TrustedRecipeTemplate,drawInt:SecureDraw=randomInt):V2DraftRollOutcome{
 if(!/^EQ2_(?:SOLO_|SET_)?[A-Z0-9_]+$/.test(input.pieceId)
   ||!input.recipeId.startsWith(input.pieceId+'_')
   ||![1,2,3,4].includes(input.tier)
   ||!Object.prototype.hasOwnProperty.call(ROLE_WEIGHTS,input.role)
   ||!Object.prototype.hasOwnProperty.call(SLOT_AFFIX_PREFERENCES,input.slot)){
  throw new Error('invalid_trusted_v2_recipe');
 }
 const raritySample=draw(drawInt,1000000);
 let cursor=0;
 const band=V2_SERVER_RARITY_BANDS.find(row=>{cursor+=row.buckets;return raritySample<cursor;});
 if(!band)throw new Error('rarity_distribution_invalid');
 // Preserve the existing nonuniform Q0-Q100 distribution, while independent of rarity.
 const qualityUnit=draw(drawInt,1000000)/1000000;
 const quality=Math.min(100,Math.floor(Math.pow(qualityUnit,1.25)*101));
 const affixCount=input.tier>=3?band.affixesHighTier:band.affixesLowTier;
 const kinds=chooseAffixes(input.role,input.slot,affixCount,drawInt);
 const affixes=kinds.map(stat=>{
  const full=V2_SERVER_AFFIX_RANGES[stat][input.tier-1];
  const unit=draw(drawInt,10001)/10000;
  const scaled=band.low+(band.high-band.low)*unit;
  const raw=full[0]+(full[1]-full[0])*scaled;
  const percent=Math.round(raw*100)/100;
  const grade=Math.max(0,Math.min(100,Math.round((percent-full[0])/(full[1]-full[0])*100)));
  return {stat,percent,grade};
 });
 const qualityMultiplier=.75+quality*.005;
 return {rulesVersion:EQUIPMENT_V2_SERVER_RULES_VERSION,
  recipeId:input.recipeId,pieceId:input.pieceId,tier:input.tier,
  rarity:band.rarity,quality,baseStatMultiplier:V2_SERVER_RARITY_BASE_MULTIPLIER[band.rarity]*qualityMultiplier,
  affixes,
 };
}
