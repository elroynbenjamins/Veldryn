/** Nonpaying preview of exact equipped chest gear. No inventory or skill XP writer. */
import {reviewGatheringSpeedV2,reviewGatheringRewardChannelsV2,type GatheringGearSkillV2} from '../../../../apps/mobile/src/core/gathering-speed-v2-review';
import {WORLD_BOSS_GATHERING_PIECES_V64,WORLD_BOSS_GATHERING_RARITY_V65,previewWorldBossGatheringBonusV64} from './world-boss-gathering-loot-v64';
import {WORLD_BOSS_CHEST_POLICY_V96,WORLD_BOSS_GATHERING_BONUS_RANGES_V96,previewWorldBossChestRollV96} from './world-boss-chest-policy-v96';
type Roll=NonNullable<ReturnType<typeof previewWorldBossChestRollV96>['gear']>;
export type GatheringSpeedCopyV99={accountId:string;characterId:string;instanceId:string;roll:Roll};
export function reviewWorldBossGatheringSpeedV99(input:{
 accountId:string;characterId:string;skill:GatheringGearSkillV2;
 copies:readonly GatheringSpeedCopyV99[];
 baseActionSeconds:number;toolTimeMultiplier:number;existingRateMultiplier:number;
 verifyEquippedCopy:(copy:GatheringSpeedCopyV99)=>boolean;
}){
 const {accountId,characterId,skill}=input;
 if(!accountId||!characterId||!['mining','woodcutting','fishing'].includes(skill)||
 !Array.isArray(input.copies)||input.copies.length>10||typeof input.verifyEquippedCopy!=='function')
  throw Error('gathering_speed_invalid_roster');
 const copies:readonly GatheringSpeedCopyV99[]=input.copies;
 const seen=new Set<string>(),slots=new Set<string>(),matchingIds:string[]=[];
 let gearRatingBps=0,skillXpAffixBps=0,rareChanceAffixBps=0;
 const before=JSON.stringify(copies);
 for(const copy of copies){
  if(!copy||copy.accountId!==accountId||copy.characterId!==characterId||typeof copy.instanceId!=='string'||
   !copy.instanceId||seen.has(copy.instanceId)||!copy.roll)throw Error('gathering_speed_invalid_copy');
  const g=copy.roll,piece=WORLD_BOSS_GATHERING_PIECES_V64.find(row=>row.itemId===g.itemId);
  const rarity=WORLD_BOSS_GATHERING_RARITY_V65.find(row=>row.rarity===g.rarity);
  if(!piece||!rarity||g.rollVersion!==96||g.source!=='world_boss_chest_only'||g.combatPowerBonus!==0||
   g.primaryStat!=='gathering_speed'||g.skill!==piece.skill||g.slot!==piece.slot||g.setId!==piece.setId||
   slots.has(g.slot)||!Number.isInteger(g.quality)||g.quality<0||g.quality>100||
   g.gatheringSpeedBasisPoints!==Math.round(WORLD_BOSS_CHEST_POLICY_V96.innateGatheringSpeedBaseBps*rarity.multiplier*(.75+g.quality*.005))||
   !Array.isArray(g.bonusStats)||g.bonusStats.length!==(['epic','legendary','mythic'].includes(g.rarity)?2:1))
   throw Error('gathering_speed_invalid_roll');
  seen.add(copy.instanceId);slots.add(g.slot);
  const affixes:readonly Roll['bonusStats'][number][]=g.bonusStats;
  const stats=new Set<string>();
  let extra=0,xp=0,rare=0;
  for(const affix of affixes){
   if(!affix||!Object.prototype.hasOwnProperty.call(WORLD_BOSS_GATHERING_BONUS_RANGES_V96,affix.stat)||
    stats.has(affix.stat)||affix.skill!==piece.skill||!Number.isSafeInteger(affix.bonusBasisPoints))
    throw Error('gathering_speed_invalid_affix');
   const [low,high]=WORLD_BOSS_GATHERING_BONUS_RANGES_V96[affix.stat];
   if(affix.bonusBasisPoints<Math.round(low*rarity.affixScale)||affix.bonusBasisPoints>Math.round(high*rarity.affixScale))
    throw Error('gathering_speed_invalid_affix');
   stats.add(affix.stat);
   if(affix.stat==='gathering_speed')extra+=affix.bonusBasisPoints;
   if(affix.stat==='skill_xp')xp+=affix.bonusBasisPoints;
   if(affix.stat==='gathering_rarity_chance')rare+=affix.bonusBasisPoints;
  }
  if(input.verifyEquippedCopy(copy)!==true||JSON.stringify(copies)!==before)throw Error('gathering_speed_unverified_copy');
  if(piece.skill===skill){matchingIds.push(piece.itemId);gearRatingBps+=g.gatheringSpeedBasisPoints+extra;skillXpAffixBps+=xp;rareChanceAffixBps+=rare;}
 }
 // Historical V64 remains immutable; only its registered piece count is reused.
 const matched=previewWorldBossGatheringBonusV64(skill,matchingIds);
 const pace=reviewGatheringSpeedV2({baseActionSeconds:input.baseActionSeconds,toolTimeMultiplier:input.toolTimeMultiplier,
 existingRateMultiplier:input.existingRateMultiplier,gearRatingBps,setTimeMultiplier:matched.pieces>=8?.96:1});
 const channels=reviewGatheringRewardChannelsV2({matchingSetPieces:matched.pieces,skillXpAffixBps,rareChanceAffixBps});
 const set={pieces:matched.pieces,thresholds:matched.thresholds,xpBonusFraction:channels.setXpBps/10000,
  rareDropRelativeBonusFraction:channels.setRareBps/10000,actionTimeMultiplier:matched.pieces>=8?.96:1};
 return {...pace,skill,pieces:matched.pieces,gearRatingBps,set,channels,canApply:false as const,rewardGranted:false as const};
}
