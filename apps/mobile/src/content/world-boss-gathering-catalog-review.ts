/** Hidden 2.0 catalogue projection of V64 authored identities, NOT a live
 * ItemDef or Forge combat manifest. V96 is the only supported mint version.
 * Dedicated parity tests compare all 30 entries against the server V64 source.
 * No combat tier, class, recipes, upgrade or Market policy inferred. */
export const WORLD_BOSS_GATHERING_SLOTS=[
  'helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring',
] as const;
export type GatheringGearSlotV64=(typeof WORLD_BOSS_GATHERING_SLOTS)[number];
export type WorldBossGatheringBossV64='hollowroot'|'sunscar'|'frostmarch';
export type WorldBossGatheringSkillV64='woodcutting'|'mining'|'fishing';
export type WorldBossGatheringOutcomeV64='victory'|'defeat';
export type WorldBossGatheringRandomV64=(maxExclusive:number)=>number;
export type WorldBossGatheringMaterialV64={
  readonly itemId:string;readonly min:number;readonly max:number;
};
export interface WorldBossGatheringSetV64 {
  readonly bossId:WorldBossGatheringBossV64;
  readonly name:string;
  readonly skill:WorldBossGatheringSkillV64;
  readonly region:string;
  readonly setId:string;
  readonly chestId:string;
  readonly prefix:string;
  readonly primaryMaterial:WorldBossGatheringMaterialV64;
  readonly secondaryMaterial:WorldBossGatheringMaterialV64;
  readonly goldMin:number;
  readonly goldMax:number;
}
export interface WorldBossGatheringPieceV64 {
  readonly itemId:string;
  readonly name:string;
  readonly slot:GatheringGearSlotV64;
  readonly setId:string;
  readonly skill:WorldBossGatheringSkillV64;
  /** V65 rolled copies get rarity/quality/affixes, never a static Epic rarity. */
  readonly primaryStat:'gathering_speed';
  readonly combatPowerBonus:0;
}
const SETS:Readonly<Record<WorldBossGatheringBossV64,WorldBossGatheringSetV64>>={
  hollowroot:{
    bossId:'hollowroot',name:'Rootbound Harvester',skill:'woodcutting',region:'Asterfall',
    setId:'WB64_ROOTBOUND_HARVESTER',chestId:'WB64_ROOTBOUND_CACHE',prefix:'Rootbound',
    primaryMaterial:{itemId:'IRONWOOD_LOG',min:8,max:16},
    secondaryMaterial:{itemId:'CROWNWOOD_LOG',min:1,max:3},
    goldMin:500,goldMax:900,
  },
  sunscar:{
    bossId:'sunscar',name:'Sunforged Prospector',skill:'mining',region:'Sunscar',
    setId:'WB64_SUNFORGED_PROSPECTOR',chestId:'WB64_SUNFORGED_CACHE',prefix:'Sunforged',
    primaryMaterial:{itemId:'SUNSTONE_ORE',min:8,max:14},
    secondaryMaterial:{itemId:'BLACKGLASS_ORE',min:1,max:2},
    goldMin:700,goldMax:1200,
  },
  frostmarch:{
    bossId:'frostmarch',name:'Rimebound Angler',skill:'fishing',region:'Frostmarch',
    setId:'WB64_RIMEBOUND_ANGLER',chestId:'WB64_RIMEBOUND_CACHE',prefix:'Rimebound',
    primaryMaterial:{itemId:'ICEFIN',min:8,max:14},
    secondaryMaterial:{itemId:'BELLFIN_SCALE',min:1,max:2},
    goldMin:900,goldMax:1500,
  },
};
export const WORLD_BOSS_GATHERING_SETS_V64=Object.values(SETS);
const SLOT_TITLE:Readonly<Record<GatheringGearSlotV64,string>>={
  helmet:'Crown',chest:'Vest',gloves:'Grips',legs:'Legguards',boots:'Trailboots',
  weapon:'Implement',offhand:'Focus',cape:'Mantle',amulet:'Charm',ring:'Band',
};
export const WORLD_BOSS_GATHERING_PIECES_V64:readonly WorldBossGatheringPieceV64[]=
  WORLD_BOSS_GATHERING_SETS_V64.flatMap(set=>WORLD_BOSS_GATHERING_SLOTS.map(slot=>({
    itemId:`${set.setId}_${slot.toUpperCase()}`,
    name:`${set.prefix} ${SLOT_TITLE[slot]}`,
    slot,setId:set.setId,skill:set.skill,primaryStat:'gathering_speed' as const,
    combatPowerBonus:0 as const,
  })));
const PIECES_BY_ID=new Map(WORLD_BOSS_GATHERING_PIECES_V64.map(piece=>[piece.itemId,piece]));
export function worldBossGatheringSetV64(bossId:WorldBossGatheringBossV64){
  const set=SETS[bossId];
  if(!set)throw Error('world_boss_v64_unknown_boss');
  return set;
}
export function worldBossGatheringPiecesV64(bossId:WorldBossGatheringBossV64){
  const set=worldBossGatheringSetV64(bossId);
  return WORLD_BOSS_GATHERING_PIECES_V64.filter(piece=>piece.setId===set.setId);
}

export const WORLD_BOSS_GATHERING_CATALOG_REVIEW_LIVE=false as const;
export function gatheringEquipmentDefinitionReview(itemId:string){
 const piece=PIECES_BY_ID.get(itemId);
 if(!piece)return undefined;
 const set=WORLD_BOSS_GATHERING_SETS_V64.find(row=>row.setId===piece.setId)!;
 return {...piece,kind:'gathering' as const,source:'world_boss_chest_only' as const,
  rollVersion:96 as const,bossId:set.bossId,region:set.region,setName:set.name,
  hands:piece.slot==='weapon'?'one' as const:undefined,
  combatStats:{attack:0,defense:0,hp:0},combatPowerBonus:0 as const,
  equipRequirementsFinalized:false as const,marketEligibilityFinalized:false as const,
  releaseReady:false as const};
}
