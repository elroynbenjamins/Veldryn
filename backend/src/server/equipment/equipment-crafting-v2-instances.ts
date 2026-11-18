import {V2_SERVER_MANIFEST_VERSION,type V2ServerPiece,v2ServerPiece} from './equipment-crafting-v2-manifest';
import {
 EQUIPMENT_V2_SERVER_RULES_VERSION,V2_SERVER_RARITY_BANDS,V2_SERVER_RARITY_BASE_MULTIPLIER,V2_SERVER_AFFIX_RANGES,
 type V2DraftRollOutcome,type V2Affix,type V2Slot,type V2Tier,
} from './equipment-crafting-v2-rolls';

/** Hidden, server-owned exact-copy item projection. Never read item stats,
 * rarity, equip restrictions, affixes, gems or ownership from a client request.
 * This module is an isolated draft; it is not the live equipment runtime.
 */
export interface V2ExactBaseStats {attack:number;defense:number;hp:number}
export interface V2ExactEquipmentTemplate {
 manifestVersion:typeof V2_SERVER_MANIFEST_VERSION;
 rulesVersion:typeof EQUIPMENT_V2_SERVER_RULES_VERSION;
 pieceId:string;name:string;tier:V2Tier;slot:V2Slot;
 profile:V2ServerPiece['profile'];role:V2ServerPiece['role'];
 material:string;setId?:string;classRestriction?:string;
 hands?:'one'|'two'|'dual';
 rarity:V2DraftRollOutcome['rarity'];quality:number;
 baseStats:V2ExactBaseStats;
 affixes:readonly {stat:V2Affix;percent:number;grade:number}[];
 /** Gems are permanent: a later system can replace, never extract them. */
 gemSlots:readonly {socketId:string;gemInstanceId:string;gemId:string}[];
 enhancementRank:0;
}
const HP_PER_POINT=4;
const FACTOR=1.08;
export const V2_SERVER_SLOT_BUDGET:Readonly<Record<V2Slot,number>>={
 helmet:6,chest:11,gloves:5.5,legs:8,boots:5.75,cape:6.25,
 weapon:9,offhand:10,amulet:6,ring:5.5,
};
const percent=(v:number)=>Math.round(v*100)/100;
export function v2ServerWeightedBaseBudget(stats:V2ExactBaseStats){
 return stats.attack+stats.defense+stats.hp/HP_PER_POINT;
}
export function v2ServerBaseStatProjection(piece:V2ServerPiece,baseMultiplier:number):V2ExactBaseStats{
 if(!piece||!Number.isFinite(baseMultiplier)||baseMultiplier<0.5||baseMultiplier>3)
  throw new Error('invalid_v2_server_base_multiplier');
 const weaponPoints=piece.slot==='weapon'&&piece.hands!=='one'
  ?V2_SERVER_SLOT_BUDGET.weapon+V2_SERVER_SLOT_BUDGET.offhand
  :V2_SERVER_SLOT_BUDGET[piece.slot];
 if(!Number.isFinite(weaponPoints))throw new Error('unknown_v2_slot');
 const budget=weaponPoints*piece.tier*FACTOR*baseMultiplier;
 const profile=piece.profile;
 const split=profile==='attack'?[1,0,0]
  :profile==='defense'?[0,1,0]
  :profile==='health'?[0,0,1]
  :profile==='attack_defense'?[.6,.4,0]
  :profile==='attack_health'?[.6,0,.4]
  :profile==='defense_health'?[0,2/3,1/3]
  :null;
 if(!split)throw new Error('invalid_v2_profile');
 return {attack:percent(budget*split[0]),defense:percent(budget*split[1]),
  hp:percent(budget*split[2]*HP_PER_POINT)};
}
function validateRolledOutcome(piece:V2ServerPiece,roll:V2DraftRollOutcome){
 if(!roll||roll.rulesVersion!==EQUIPMENT_V2_SERVER_RULES_VERSION
  ||roll.pieceId!==piece.id||roll.tier!==piece.tier
  ||!Number.isSafeInteger(roll.quality)||roll.quality<0||roll.quality>100)throw new Error('invalid_v2_roll_identity');
 const rarityBand=V2_SERVER_RARITY_BANDS.find(row=>row.rarity===roll.rarity);
 if(!rarityBand)throw new Error('invalid_v2_roll_rarity');
 const expectedMultiplier=V2_SERVER_RARITY_BASE_MULTIPLIER[roll.rarity]*(.75+roll.quality*.005);
 if(!Number.isFinite(roll.baseStatMultiplier)||Math.abs(expectedMultiplier-roll.baseStatMultiplier)>1e-9)
  throw new Error('invalid_v2_roll_multiplier');
 const count=piece.tier<3?rarityBand.affixesLowTier:rarityBand.affixesHighTier;
 if(!Array.isArray(roll.affixes)||roll.affixes.length!==count)throw new Error('invalid_v2_affix_count');
 const used=new Set<V2Affix>();
 for(const affix of roll.affixes){
  if(!affix||!Object.prototype.hasOwnProperty.call(V2_SERVER_AFFIX_RANGES,affix.stat)
   ||used.has(affix.stat))throw new Error('invalid_v2_affix_identity');
  used.add(affix.stat);
  const range=V2_SERVER_AFFIX_RANGES[affix.stat][piece.tier-1];
  const min=range[0]+(range[1]-range[0])*rarityBand.low;
  const max=range[0]+(range[1]-range[0])*rarityBand.high;
  if(!Number.isFinite(affix.percent)||affix.percent<min-.011||affix.percent>max+.011
   ||!Number.isSafeInteger(affix.grade)||affix.grade<0||affix.grade>100)
   throw new Error('invalid_v2_affix_strength');
  const grade=Math.round((affix.percent-range[0])/(range[1]-range[0])*100);
  if(Math.abs(grade-affix.grade)>1)throw new Error('invalid_v2_affix_grade');
 }
}
/** Immutable by protocol: a *copy* is persisted with the item at claim time.
 * Later balance changes cannot rewrite old stat snapshots.
 */
export function v2ServerCreateExactTemplate(piece:V2ServerPiece,roll:V2DraftRollOutcome):V2ExactEquipmentTemplate{
 const canonical=v2ServerPiece(piece.id);
 if(!canonical||canonical!==piece)throw new Error('uncanonical_v2_item_template');
 validateRolledOutcome(piece,roll);
 return {
  manifestVersion:V2_SERVER_MANIFEST_VERSION,rulesVersion:EQUIPMENT_V2_SERVER_RULES_VERSION,
  pieceId:piece.id,name:piece.name,tier:piece.tier,slot:piece.slot,
  profile:piece.profile,role:piece.role,material:piece.material,
  ...(piece.setId?{setId:piece.setId}:{}),
  ...(piece.classRestriction?{classRestriction:piece.classRestriction}:{}),
  ...(piece.hands?{hands:piece.hands}:{}),
  rarity:roll.rarity,quality:roll.quality,baseStats:v2ServerBaseStatProjection(piece,roll.baseStatMultiplier),
  affixes:roll.affixes.map(a=>({...a})),gemSlots:[],enhancementRank:0,
 };
}
/** Structural consistency check for a server-loaded, not client-submitted,
 * exact item. Ownership/trade/lock/equipped state must be checked separately.
 */
export function v2ServerExactTemplateConsistent(item:V2ExactEquipmentTemplate){
 const piece=item&&v2ServerPiece(item.pieceId);
 if(!piece||item.manifestVersion!==V2_SERVER_MANIFEST_VERSION
  ||item.rulesVersion!==EQUIPMENT_V2_SERVER_RULES_VERSION
  ||item.slot!==piece.slot||item.tier!==piece.tier||item.profile!==piece.profile
  ||item.role!==piece.role||item.material!==piece.material||item.name!==piece.name
  ||item.setId!==piece.setId||item.classRestriction!==piece.classRestriction
  ||item.hands!==piece.hands
  ||!Number.isInteger(item.quality)||item.quality<0||item.quality>100
  ||!Object.prototype.hasOwnProperty.call(V2_SERVER_RARITY_BASE_MULTIPLIER,item.rarity))
  return false;
 const multiplier=V2_SERVER_RARITY_BASE_MULTIPLIER[item.rarity]*(.75+item.quality*.005);
 const expected=v2ServerBaseStatProjection(piece,multiplier);
 if(!Object.entries(expected).every(([key,v])=>Number.isFinite(item.baseStats?.[key as keyof V2ExactBaseStats])
   &&Math.abs(item.baseStats[key as keyof V2ExactBaseStats]-v)<.005))return false;
 try{
  validateRolledOutcome(piece,{
   rulesVersion:item.rulesVersion,recipeId:'inspection-only',pieceId:piece.id,
   tier:item.tier,rarity:item.rarity,quality:item.quality,
   baseStatMultiplier:multiplier,affixes:item.affixes,
  });
  return true;
 }catch{return false;}
}

export interface V2EquipIntent{
 characterClass:string;characterLevel:number;
 newItem:V2ExactEquipmentTemplate;
 equipped:readonly {instanceId:string;item:V2ExactEquipmentTemplate}[];
}
/** Preview-only equip eligibility. No class restrictions apply to CRAFTING.
 * The 'replace' list is explicit; this never auto-deletes existing items.
 */
export function v2ServerEquipPreview(input:V2EquipIntent){
 const {newItem,characterClass,characterLevel,equipped}=input;
 if(!v2ServerExactTemplateConsistent(newItem))
  return {allowed:false,reason:'unverified_template',replace:[] as string[]};
 if(!Number.isSafeInteger(characterLevel)||characterLevel<1)return {allowed:false,reason:'invalid_character_level',replace:[] as string[]};
 if(newItem.classRestriction&&newItem.classRestriction!==characterClass)
  return {allowed:false,reason:'wrong_class',replace:[] as string[]};
 const minLevels:Readonly<Record<V2Tier,number>>={1:2,2:12,3:26,4:40};
 if(characterLevel<minLevels[newItem.tier])
  return {allowed:false,reason:'level_locked',replace:[] as string[]};
 const replace=new Set<string>();
 for(const worn of equipped){
  if(worn.item.slot===newItem.slot)replace.add(worn.instanceId);
  if(newItem.slot==='weapon'&&newItem.hands!=='one'&&worn.item.slot==='offhand')replace.add(worn.instanceId);
  if(newItem.slot==='offhand'&&worn.item.slot==='weapon'&&worn.item.hands!=='one')replace.add(worn.instanceId);
 }
 return {allowed:true,reason:'ok',replace:[...replace]};
}
