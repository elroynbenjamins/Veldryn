/**
 * V64/V65 hidden proposal: themed World Boss gathering loot and 10-piece sets.
 *
 * NOT a live reward source. This module intentionally cannot debit attempts,
 * open inventory, award Sigils/Gold/Essence or mint equipment. Only a trusted
 * V26->V28 replay-proven, exactly-once server transaction may eventually call
 * its random-plan helpers, with CSPRNG entropy and durable reward source keys.
 * Never accept a boss ID, victory, random seed or receipt from a mobile client.
 */
export const WORLD_BOSS_GATHERING_LOOT_V64_LIVE=false as const;
/** Exactly three chest earning sources per account/event; no more per-attack RNG. */
export const WORLD_BOSS_GATHERING_CHEST_MAX_V65=3 as const;
export const WORLD_BOSS_GATHERING_CHEST_SOURCES_V65=[
 'donations','three_attempts','community_damage',
] as const;
export type WorldBossGatheringChestSourceV65=
 (typeof WORLD_BOSS_GATHERING_CHEST_SOURCES_V65)[number];
/** Exact approved V28 global HP milestone at 30% remaining = 70% dealt. */
export const WORLD_BOSS_GATHERING_COMMUNITY_HP_GOAL_BPS_V65=3_000 as const;
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
  /** No chest in the per-attempt loot plan. Chests are earned by milestone receipts. */
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
  const materials=[
    {itemId:set.primaryMaterial.itemId,quantity:won?baseQuantity:Math.max(1,Math.floor(baseQuantity/2))},
    ...(secondaryQuantity>0?[{itemId:set.secondaryMaterial.itemId,quantity:secondaryQuantity}]:[]),
  ];
  return {
    bossId:set.bossId,outcome:input.outcome,
    gold:won?gold:Math.floor(gold/2),
    materials,companionEssence:essenceQuantity,
  };
}
/**
 * The eventual private claim service must bind these counts to committed
 * V27 donations, V26/V28 completed/proven attempts and V18 global-HP state.
 * This pure planner never grants chest inventory and does not trust clients.
 */
export interface WorldBossGatheringChestEvidenceV65 {
  readonly eventId:string;
  readonly accountId:string;
  readonly bossId:WorldBossGatheringBossV64;
  readonly committedDonations:number;
  /** Number of the three shared War Camp tracks that reached Tier I. */
  readonly warCampTracksAtLeastTier1:number;
  readonly completedProvenAttempts:number;
  readonly globalBossRemainingHpBps:number;
  readonly alreadyAwardedSources:readonly WorldBossGatheringChestSourceV65[];
}
export interface WorldBossGatheringChestUnlockV65{
  readonly eventId:string;readonly accountId:string;
  readonly chestId:string;readonly bossId:WorldBossGatheringBossV64;
  readonly source:WorldBossGatheringChestSourceV65;
  /** Stable private source, unique(account,event,boss,source), never a request ID. */
  readonly rewardSourceKey:string;
}
const receiptIdPattern=/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;
export function eligibleWorldBossGatheringChestsV65(
  evidence:WorldBossGatheringChestEvidenceV65,
):readonly WorldBossGatheringChestUnlockV65[]{
  if(!evidence||!receiptIdPattern.test(evidence.accountId)||
    !receiptIdPattern.test(evidence.eventId))throw Error('world_boss_v65_invalid_identity');
  const set=worldBossGatheringSetV64(evidence.bossId);
  const countOk=(n:number)=>Number.isSafeInteger(n)&&n>=0&&n<=3;
  if(!countOk(evidence.committedDonations)||evidence.committedDonations>2||
    !countOk(evidence.warCampTracksAtLeastTier1)||
    !countOk(evidence.completedProvenAttempts)||
    !Number.isSafeInteger(evidence.globalBossRemainingHpBps)||
    evidence.globalBossRemainingHpBps<0||evidence.globalBossRemainingHpBps>10_000||
    !Array.isArray(evidence.alreadyAwardedSources)||
    evidence.alreadyAwardedSources.some(s=>!WORLD_BOSS_GATHERING_CHEST_SOURCES_V65.includes(s)))
    throw Error('world_boss_v65_invalid_proof_counts');
  const owned=new Set(evidence.alreadyAwardedSources);
  const eligible:WorldBossGatheringChestSourceV65[]=[];
  if(evidence.committedDonations>=1&&evidence.warCampTracksAtLeastTier1>=2)
    eligible.push('donations');
  if(evidence.completedProvenAttempts===3)eligible.push('three_attempts');
  if(evidence.completedProvenAttempts>=1&&
     evidence.globalBossRemainingHpBps<=WORLD_BOSS_GATHERING_COMMUNITY_HP_GOAL_BPS_V65)
    eligible.push('community_damage');
  return eligible.filter(source=>!owned.has(source)).map(source=>({
    eventId:evidence.eventId,accountId:evidence.accountId,
    bossId:evidence.bossId,chestId:set.chestId,source,
    rewardSourceKey:`wb_gather_chest:v65:${evidence.eventId}:${evidence.accountId}:${set.bossId}:${source}`,
  }));
}

export type WorldBossGatheringRarityV65=
  'common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic';
export type WorldBossGatheringAffixV65='gathering_xp'|'extra_yield'|'rare_material_find';
export interface WorldBossGatheringRolledAffixV65{
  readonly stat:WorldBossGatheringAffixV65;
  /** 100 basis points = +1%, rare_material_find is RELATIVE chance increase. */
  readonly bonusBasisPoints:number;
}
export interface WorldBossGatheringRolledGearV65{
  readonly rollVersion:65;
  readonly itemId:string;
  readonly setId:string;
  readonly slot:GatheringGearSlotV64;
  readonly skill:WorldBossGatheringSkillV64;
  readonly rarity:WorldBossGatheringRarityV65;
  readonly quality:number;
  readonly primaryStat:'gathering_speed';
  /** Gather speed is the only base stat. One/two gathering-only random affixes. */
  readonly gatheringSpeedBasisPoints:number;
  readonly bonusStats:readonly WorldBossGatheringRolledAffixV65[];
  readonly combatPowerBonus:0;
}
/**
 * Matches the existing crafted-gear rarity probability buckets rather than
 * applying a new boss-exclusive rarity advantage. Quality Q0–Q100 follows
 * the crafted 1.25 power curve; it affects base speed, not affixes.
 */
export const WORLD_BOSS_GATHERING_RARITY_V65:readonly {
 readonly rarity:WorldBossGatheringRarityV65;readonly weightPerMillion:number;
 readonly multiplier:number;readonly affixScale:number;
}[]=[
  {rarity:'mythic',weightPerMillion:1_000,multiplier:2,affixScale:1.5},
  {rarity:'legendary',weightPerMillion:2_000,multiplier:1.8,affixScale:1.45},
  {rarity:'epic',weightPerMillion:6_000,multiplier:1.5,affixScale:1.35},
  {rarity:'rare',weightPerMillion:30_000,multiplier:1.28,affixScale:1.2},
  {rarity:'uncommon',weightPerMillion:70_000,multiplier:1.12,affixScale:1},
  {rarity:'common',weightPerMillion:891_000,multiplier:1,affixScale:.85},
];
const AFFIX_POOL:readonly {
 readonly stat:WorldBossGatheringAffixV65;readonly minBps:number;readonly maxBps:number;
}[]=[
 {stat:'gathering_xp',minBps:80,maxBps:220},
 {stat:'extra_yield',minBps:40,maxBps:130},
 {stat:'rare_material_find',minBps:200,maxBps:550},
];
/**
 * PREVIEW ONLY: actual opening must be one atomic, trusted transaction
 * authenticating the chest's owned and unconsumed source receipt, then
 * persisting the entire exact roll before marking the chest opened.
 */
export function previewOpenWorldBossGatheringChestV65(
 chestId:string,nextInt:WorldBossGatheringRandomV64,
):WorldBossGatheringRolledGearV65{
 const piece=previewOpenWorldBossGatheringChestV64(chestId,nextInt);
 let raritySample=integerDraw(nextInt,1_000_000);
 let rarityRow=(WORLD_BOSS_GATHERING_RARITY_V65[WORLD_BOSS_GATHERING_RARITY_V65.length-1]);
 for(const row of WORLD_BOSS_GATHERING_RARITY_V65){
   if(raritySample<row.weightPerMillion){rarityRow=row;break}
   raritySample-=row.weightPerMillion;
 }
 const qualitySample=integerDraw(nextInt,1_000_000)/1_000_000;
 const quality=Math.min(100,Math.floor(Math.pow(qualitySample,1.25)*101));
 const qualityMultiplier=.75+quality*.005;
 const gatheringSpeedBasisPoints=Math.round(80*rarityRow.multiplier*qualityMultiplier);
 const available=[...AFFIX_POOL];
 const bonusStats:WorldBossGatheringRolledAffixV65[]=[];
 const affixCount=['epic','legendary','mythic'].includes(rarityRow.rarity)?2:1;
 for(let i=0;i<affixCount;i++){
   const index=integerDraw(nextInt,available.length);
   const affix=available.splice(index,1)[0];
   const low=Math.round(affix.minBps*rarityRow.affixScale);
   const high=Math.round(affix.maxBps*rarityRow.affixScale);
   bonusStats.push({
     stat:affix.stat,
     bonusBasisPoints:range(nextInt,low,high),
   });
 }
 return {
   rollVersion:65,itemId:piece.itemId,setId:piece.setId,
   slot:piece.slot,skill:piece.skill,rarity:rarityRow.rarity,quality,
   primaryStat:'gathering_speed',gatheringSpeedBasisPoints,
   bonusStats,combatPowerBonus:0,
 };
}
/** Read-model guard; true instance provenance still requires private DB custody. */
export function validateWorldBossGatheringRollV65(roll:WorldBossGatheringRolledGearV65):boolean{
 if(!roll||roll.rollVersion!==65||
   roll.primaryStat!=='gathering_speed'||roll.combatPowerBonus!==0||
   !Number.isInteger(roll.quality)||roll.quality<0||roll.quality>100||
   !Number.isInteger(roll.gatheringSpeedBasisPoints))return false;
 const piece=PIECES_BY_ID.get(roll.itemId);
 const rarity=WORLD_BOSS_GATHERING_RARITY_V65.find(row=>row.rarity===roll.rarity);
 if(!piece||!rarity||roll.setId!==piece.setId||roll.slot!==piece.slot||
   roll.skill!==piece.skill||
   roll.gatheringSpeedBasisPoints!==Math.round(80*rarity.multiplier*(.75+roll.quality*.005))||
   !Array.isArray(roll.bonusStats)||
   roll.bonusStats.length!==(['epic','legendary','mythic'].includes(roll.rarity)?2:1))return false;
 const seen=new Set<WorldBossGatheringAffixV65>();
 for(const stat of roll.bonusStats){
   const allowed=AFFIX_POOL.find(x=>x.stat===stat?.stat);
   if(!allowed||seen.has(stat.stat)||!Number.isInteger(stat.bonusBasisPoints)||
     stat.bonusBasisPoints<Math.round(allowed.minBps*rarity.affixScale)||
     stat.bonusBasisPoints>Math.round(allowed.maxBps*rarity.affixScale))return false;
   seen.add(stat.stat);
 }
 return true;
}
export interface WorldBossGatheringRolledStatsV65{
 readonly pieces:number;readonly skill:WorldBossGatheringSkillV64;
 readonly gatheringSpeedBasisPoints:number;
 readonly gatheringXpBasisPoints:number;
 readonly extraYieldBasisPoints:number;
 readonly rareMaterialFindRelativeBasisPoints:number;
}
/**
 * Display-only roll totals. Server applies verified, slot-matched instances,
 * not item IDs or mobile-provided roll payloads. Caller must ensure distinct
 * exact owned instance receipts and slots; duplicates are excluded here too.
 */
export function previewEquippedWorldBossGatheringStatsV65(
 skill:WorldBossGatheringSkillV64,rolls:readonly WorldBossGatheringRolledGearV65[],
):WorldBossGatheringRolledStatsV65{
 const seenSlots=new Set<GatheringGearSlotV64>();
 let gatheringSpeedBasisPoints=0,gatheringXpBasisPoints=0;
 let extraYieldBasisPoints=0,rareMaterialFindRelativeBasisPoints=0;
 for(const gear of rolls){
  if(!validateWorldBossGatheringRollV65(gear)||gear.skill!==skill||
    seenSlots.has(gear.slot))continue;
  seenSlots.add(gear.slot);
  gatheringSpeedBasisPoints+=gear.gatheringSpeedBasisPoints;
  for(const affix of gear.bonusStats){
   if(affix.stat==='gathering_xp')gatheringXpBasisPoints+=affix.bonusBasisPoints;
   if(affix.stat==='extra_yield')extraYieldBasisPoints+=affix.bonusBasisPoints;
   if(affix.stat==='rare_material_find')rareMaterialFindRelativeBasisPoints+=affix.bonusBasisPoints;
  }
 }
 return {skill,pieces:seenSlots.size,gatheringSpeedBasisPoints,
   gatheringXpBasisPoints,extraYieldBasisPoints,rareMaterialFindRelativeBasisPoints};
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
    xpBonusFraction:(pieces>=2?.03:0)+(pieces>=10?.05:0),
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
