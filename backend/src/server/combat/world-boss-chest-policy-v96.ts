/** New hidden 2.0 loot policy. Do not mutate historical V58/V68 tables or
 * frozen earned receipts. Actual settlement must choose the version explicitly. */
import {worldBossChestLootTableV68,type WorldBossChestKindV58} from './world-boss-chests-v58';
import {defineChestLootTableV67,resolveChestLootV67} from '../loot/chest-loot-engine-v67';
import {worldBossGatheringPiecesV64,WORLD_BOSS_GATHERING_RARITY_V65,
 type WorldBossGatheringBossV64,type WorldBossGatheringRandomV64,type GatheringGearSlotV64} from './world-boss-gathering-loot-v64';
export const WORLD_BOSS_CHEST_POLICY_V96={
 equipmentChanceBps:1000,damageChestChanceBps:1000,maxDamageChests:3,maxMilestoneChests:3,
 gearSource:'world_boss_chest_only',sigilGearExchange:false,luckModifiersAllowed:false,
 releaseReady:false,
} as const;
export type WorldBossChestKindV96=WorldBossChestKindV58|'personal_damage';
export function worldBossChestLootTableV96(bossId:WorldBossGatheringBossV64,kind:WorldBossChestKindV96){
 // Damage chest guarantees remain unapproved. No fabricated material quantities.
 const source=worldBossChestLootTableV68({bossId,kind:kind==='personal_damage'?'three_attempts':kind});
 return defineChestLootTableV67({
  ...source,version:'world_boss_v96_'+bossId+'_'+kind,
  guarantees:kind==='personal_damage'?[]:source.guarantees,
  groups:source.groups.map(group=>({...group,chanceBps:WORLD_BOSS_CHEST_POLICY_V96.equipmentChanceBps})),
 });
}
export type WorldBossGatheringBonusV96='gathering_speed'|'gathering_rarity_chance'|'skill_xp';
/** Preview ranges only; these are equipment-piece budgets, NOT full tool
 * roll ranges multiplied by ten slots. Preserve V65 rarity and quality
 * curve. Final range/cap and tier-specific scaling need economy approval. */
const bonusRanges:Readonly<Record<WorldBossGatheringBonusV96,readonly [number,number]>>={
 gathering_speed:[40,130],gathering_rarity_chance:[200,550],skill_xp:[80,220],
};
const draw=(rng:WorldBossGatheringRandomV64,max:number)=>{
 const n=rng(max);
 if(!Number.isSafeInteger(n)||n<0||n>=max)throw Error('world_boss_v96_invalid_entropy');
 return n;
};
export function previewWorldBossChestRollV96(input:{
 bossId:WorldBossGatheringBossV64;kind:WorldBossChestKindV96;
 hitRoll:number;slotRoll:number;ownedSlots:readonly GatheringGearSlotV64[];
 nextInt:WorldBossGatheringRandomV64;
}){
 const table=worldBossChestLootTableV96(input.bossId,input.kind);
 const result=resolveChestLootV67(table,{rolls:[{groupId:'equipment',hitRoll:input.hitRoll,
  selectionRoll:input.slotRoll}],ownedDropIds:input.ownedSlots});
 const slot=result.groups[0]?.entryId;
 const piece=slot===null?undefined:worldBossGatheringPiecesV64(input.bossId).find(p=>p.slot===slot);
 if(slot!==null&&!piece)throw Error('world_boss_v96_invalid_piece');
 if(!piece)return {gear:null,tableVersion:table.version,gearGranted:false as const,releaseReady:false as const};
 let n=draw(input.nextInt,1_000_000);
 let rarity=WORLD_BOSS_GATHERING_RARITY_V65[WORLD_BOSS_GATHERING_RARITY_V65.length-1];
 for(const row of WORLD_BOSS_GATHERING_RARITY_V65){if(n<row.weightPerMillion){rarity=row;break;}n-=row.weightPerMillion;}
 const quality=Math.min(100,Math.floor(Math.pow(draw(input.nextInt,1_000_000)/1_000_000,1.25)*101));
 const pool=Object.keys(bonusRanges) as WorldBossGatheringBonusV96[];
 const count=['epic','legendary','mythic'].includes(rarity.rarity)?2:1;
 const bonusStats=Array.from({length:count},()=>{
  const stat=pool.splice(draw(input.nextInt,pool.length),1)[0];
  const [min,max]=bonusRanges[stat];
  const low=Math.round(min*rarity.affixScale),high=Math.round(max*rarity.affixScale);
  return {stat,skill:piece.skill,bonusBasisPoints:low+draw(input.nextInt,high-low+1)};
 });
 return {gear:{rollVersion:96 as const,itemId:piece.itemId,setId:piece.setId,slot:piece.slot,skill:piece.skill,
  rarity:rarity.rarity,quality,primaryStat:'gathering_speed' as const,
  gatheringSpeedBasisPoints:Math.round(80*rarity.multiplier*(.75+quality*.005)),bonusStats,
  combatPowerBonus:0 as const,source:'world_boss_chest_only' as const},tableVersion:table.version,
  gearGranted:false as const,releaseReady:false as const};
}
