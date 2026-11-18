/**
 * V64 hidden proposal: themed World Boss gathering loot and 10-piece sets.
 *
 * NOT a live reward source. This module intentionally cannot debit attempts,
 * open inventory, award Sigils/Gold/Essence or mint equipment. Only a trusted
 * V26->V28 replay-proven, exactly-once server transaction may eventually call
 * its random-plan helpers, with CSPRNG entropy and durable reward source keys.
 * Never accept a boss ID, victory, random seed or receipt from a mobile client.
 */
export const WORLD_BOSS_GATHERING_LOOT_V64_LIVE=false as const;
export const WORLD_BOSS_GATHERING_CHEST_CHANCE_BPS=100 as const; // 1% per proven victorious account attack
export const WORLD_BOSS_GATHERING_TARGETED_PIECE_PRICE_SIGILS=90 as const; // proposed shop source, NOT on sale
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
  readonly rarity:'epic';
  readonly gatheringXpBonusFraction:number;
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
    slot,setId:set.setId,skill:set.skill,rarity:'epic' as const,
    gatheringXpBonusFraction:.005,combatPowerBonus:0 as const,
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
function integerDraw(nextInt:WorldBossGatheringRandomV64,maxExclusive:number){
  if(!Number.isSafeInteger(maxExclusive)||maxExclusive<=0)throw Error('world_boss_v64_invalid_range');
  const rolled=nextInt(maxExclusive);
  if(!Number.isSafeInteger(rolled)||rolled<0||rolled>=maxExclusive)
    throw Error('world_boss_v64_invalid_server_entropy');
  return rolled;
}
function range(nextInt:WorldBossGatheringRandomV64,min:number,max:number){
  return min+integerDraw(nextInt,max-min+1);
}
export interface WorldBossGatheringLootPlanV64 {
  readonly bossId:WorldBossGatheringBossV64;
  readonly outcome:WorldBossGatheringOutcomeV64;
  readonly gold:number;
  readonly materials:readonly {itemId:string;quantity:number}[];
  readonly companionEssence:number;
  /** A chest is a SEPARATE inventory source; its piece is rolled once upon authenticated opening. */
  readonly chestId?:string;
}
/** Pure preview only. No loot writes, receipt proof, auth or wallet access here. */
export function planWorldBossGatheringLootV64(input:{
  bossId:WorldBossGatheringBossV64;outcome:WorldBossGatheringOutcomeV64;
  nextInt:WorldBossGatheringRandomV64;
}):WorldBossGatheringLootPlanV64{
  const set=worldBossGatheringSetV64(input.bossId);
  if(input.outcome!=='victory'&&input.outcome!=='defeat')
    throw Error('world_boss_v64_invalid_outcome');
  if(typeof input.nextInt!=='function')
    throw Error('world_boss_v64_missing_server_entropy');
  const won=input.outcome==='victory';
  const gold=range(input.nextInt,set.goldMin,set.goldMax);
  const baseQuantity=range(input.nextInt,set.primaryMaterial.min,set.primaryMaterial.max);
  const secondary=integerDraw(input.nextInt,10_000)<2_000; // 20% secondary resource
  const secondaryQuantity=secondary?range(input.nextInt,set.secondaryMaterial.min,set.secondaryMaterial.max):0;
  const essence=integerDraw(input.nextInt,10_000)<3_500; // 35% Companion Essence
  const essenceQuantity=essence?range(input.nextInt,2,4):0;
  const chest=won&&integerDraw(input.nextInt,10_000)<WORLD_BOSS_GATHERING_CHEST_CHANCE_BPS;
  const materials=[
    {itemId:set.primaryMaterial.itemId,quantity:won?baseQuantity:Math.max(1,Math.floor(baseQuantity/2))},
    ...(secondaryQuantity>0?[{itemId:set.secondaryMaterial.itemId,quantity:secondaryQuantity}]:[]),
  ];
  return {
    bossId:set.bossId,outcome:input.outcome,
    gold:won?gold:Math.floor(gold/2),
    materials,companionEssence:essenceQuantity,
    ...(chest?{chestId:set.chestId}:{}),
  };
}
/** Call ONLY when consuming an owned, unused, immutable chest receipt exactly once in a transaction. */
export function previewOpenWorldBossGatheringChestV64(
  chestId:string,nextInt:WorldBossGatheringRandomV64,
):WorldBossGatheringPieceV64{
  const set=WORLD_BOSS_GATHERING_SETS_V64.find(row=>row.chestId===chestId);
  if(!set)throw Error('world_boss_v64_unknown_chest');
  if(typeof nextInt!=='function')throw Error('world_boss_v64_missing_server_entropy');
  const pieces=worldBossGatheringPiecesV64(set.bossId);
  return pieces[integerDraw(nextInt,pieces.length)];
}
export interface WorldBossGatheringBonusV64 {
  pieces:number;
  thresholds:readonly number[];
  xpBonusFraction:number;
  yieldBonusFraction:number;
  rareDropRelativeBonusFraction:number;
  actionTimeMultiplier:number;
}
/**
 * Only exact registered pieces equipped ONCE count. No class combat stat
 * bonuses. Relative rare-drop bonus multiplies a base probability, never
 * adds percentage points. Requires integration into authoritative gathering
 * actions; a screen reading this helper does not activate any of it.
 */
export function previewWorldBossGatheringBonusV64(
  skill:WorldBossGatheringSkillV64,equippedItemIds:readonly string[],
):WorldBossGatheringBonusV64{
  const seen=new Set<string>();
  for(const id of equippedItemIds){
    const piece=PIECES_BY_ID.get(id);
    if(piece?.skill===skill)seen.add(id);
  }
  const pieces=seen.size;
  return {
    pieces,
    thresholds:[2,4,6,8,10].filter(n=>pieces>=n),
    xpBonusFraction:pieces*.005+(pieces>=2?.03:0)+(pieces>=10?.05:0),
    yieldBonusFraction:(pieces>=4?.04:0)+(pieces>=10?.03:0),
    rareDropRelativeBonusFraction:pieces>=6?.10:0,
    actionTimeMultiplier:pieces>=8?.96:1,
  };
}
for(const set of WORLD_BOSS_GATHERING_SETS_V64){
  const pieces=worldBossGatheringPiecesV64(set.bossId);
  if(pieces.length!==10||new Set(pieces.map(p=>p.slot)).size!==10)
    throw Error('world_boss_v64_incomplete_set:'+set.setId);
}
