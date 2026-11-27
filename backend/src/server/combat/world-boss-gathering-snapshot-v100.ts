/** Review-only bridge from committed V96 chest origin and complete account
 * physical equipment readback to a frozen gathering rate snapshot.
 * No V96 wearable mint writer exists yet. Quarantine is never wearable.
 * A caller must supply independently persisted readback, not player JSON. */
import {createHash} from 'node:crypto';
import type {GameState,GearSlot} from '../../../../apps/mobile/src/core/types';
import type {FrozenGatheringRateReview} from '../../../../apps/mobile/src/core/gathering-activity-snapshot-review';
import {GATHERING} from '../../../../apps/mobile/src/content/skills';
import {WORLD_BOSS_GATHERING_PIECES_V64,WORLD_BOSS_GATHERING_SETS_V64} from './world-boss-gathering-loot-v64';
import {worldBossChestLootTableV96} from './world-boss-chest-policy-v96';
import {reviewWorldBossGatheringSpeedV99,type GatheringSpeedCopyV99} from './world-boss-gathering-speed-v99';
import type {FrozenChestReceiptV69} from '../loot/chest-reward-settlement-v69';
export const WORLD_BOSS_GATHERING_SNAPSHOT_V100_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const id=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,180}$/.test(x);
function canonical(v:unknown):string{
 if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);
 if(typeof v==='number'&&Number.isFinite(v))return JSON.stringify(v);
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(v&&typeof v==='object')return '{'+Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>JSON.stringify(k)+':'+canonical(x)).join(',')+'}';
 throw Error('gathering_snapshot_invalid_value');
}
export const gatheringSnapshotDigestV100=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
const isPiece=(itemId:string)=>WORLD_BOSS_GATHERING_PIECES_V64.some(x=>x.itemId===itemId);
export type GatheringMintReadbackV100=GatheringSpeedCopyV99&{
 readonly custody:'equipped'|'quarantined_unclaimed'|'bank'|'inventory';
 readonly originalChest:FrozenChestReceiptV69;
 readonly rollDigest:string;
};
export function reviewWorldBossGatheringSnapshotV100(input:{
 readonly accountId:string;readonly characterId:string;readonly sourceRevision:number;readonly activityId:string;
 readonly state:GameState;readonly ownedCharacterIds:readonly string[];
 readonly mintRows:readonly GatheringMintReadbackV100[];
 readonly verifyAccountReadback:(accountId:string,revision:number,digest:string)=>boolean;
 readonly verifyMintReadback:(accountId:string,revision:number,digest:string)=>boolean;
}){
 const {accountId,characterId,sourceRevision,activityId,state}=input;
 const a=state.activity,c=state.character;
 if(!id(accountId)||!UUID.test(accountId)||!id(characterId)||!id(activityId)||!Number.isSafeInteger(sourceRevision)||sourceRevision<1||
 !c||c.id!==characterId||!a||!Number.isSafeInteger(a.startedAtMs)||a.startedAtMs<0||
 !Number.isSafeInteger(a.lastClaimAtMs)||a.lastClaimAtMs!==a.startedAtMs||(a.progressFraction??0)!==0||
 !Array.isArray(input.ownedCharacterIds)||!input.ownedCharacterIds.every(id)||
 new Set(input.ownedCharacterIds).size!==input.ownedCharacterIds.length||
 !Array.isArray(input.mintRows)||input.mintRows.length>10||
 typeof input.verifyAccountReadback!=='function'||typeof input.verifyMintReadback!=='function')
  throw Error('gathering_snapshot_invalid_scope');
 const node=GATHERING.find(x=>x.id===a.targetId);
 if(!node||node.skillId!==a.kind||node.skillId==='herbalism')throw Error('gathering_snapshot_wrong_activity');
 const stateDigest=gatheringSnapshotDigestV100(state),mintDigest=gatheringSnapshotDigestV100(input.mintRows);
 if(input.verifyAccountReadback(accountId,sourceRevision,stateDigest)!==true||
 gatheringSnapshotDigestV100(state)!==stateDigest||gatheringSnapshotDigestV100(input.mintRows)!==mintDigest)
  throw Error('gathering_snapshot_unverified_account');
 const roster=[c,...(state.otherCharacters??[]).map(x=>x.character)];
 if(new Set(roster.map(x=>x.id)).size!==roster.length||
 roster.length!==input.ownedCharacterIds.length||roster.some(x=>!input.ownedCharacterIds.includes(x.id)))
  throw Error('gathering_snapshot_incomplete_roster');
 const physical=new Map<string,{owner:string|null;itemId:string;slot?:string}[]>();
 const add=(instanceId:string,owner:string|null,itemId:string,slot?:string)=>{
  if(!id(instanceId)||!id(itemId))throw Error('gathering_snapshot_invalid_physical_id');
  const list=physical.get(instanceId)??[];list.push({owner,itemId,slot});physical.set(instanceId,list);
 };
 const scan=(stacks:readonly {itemId:string;instanceId?:string;quantity:number}[],owner:string|null)=>{
  for(const stack of stacks){
   if(stack.instanceId!==undefined){if(stack.quantity!==1)throw Error('gathering_snapshot_invalid_copy_quantity');add(stack.instanceId,owner,stack.itemId);}
   else if(isPiece(stack.itemId))throw Error('gathering_snapshot_untracked_world_gear');
  }
 };
 scan(state.bank.stacks,null);scan(state.inventory.stacks,c.id);scan(state.overflow.stacks,c.id);
 for(const alt of state.otherCharacters??[]){scan(alt.inventory.stacks,alt.character.id);scan(alt.overflow.stacks,alt.character.id);}
 for(const hero of roster){
  scan(hero.equipmentPouch?.stacks??[],hero.id);
  for(const [slot,itemId] of Object.entries(hero.equipment??{})){
   if(!itemId)continue;
   const instanceId=hero.equipmentInstanceIds?.[slot as GearSlot];
   if(instanceId)add(instanceId,hero.id,itemId,slot);
   else if(isPiece(itemId))throw Error('gathering_snapshot_untracked_world_gear');
  }
  for(const [slot,instanceId] of Object.entries(hero.equipmentInstanceIds??{}))
   if(instanceId&&!hero.equipment[slot as GearSlot])throw Error('gathering_snapshot_orphan_equipped_copy');
 }
 if([...physical.values()].some(rows=>rows.length!==1))throw Error('gathering_snapshot_duplicate_physical_copy');
 const equipped=Object.entries(c.equipment).filter(([,itemId])=>!!itemId&&isPiece(itemId));
 if(equipped.length!==input.mintRows.length)throw Error('gathering_snapshot_incomplete_mints');
 const seenSources=new Set<string>(),seenIds=new Set<string>();
 const mintRows:readonly GatheringMintReadbackV100[]=input.mintRows;
 for(const mint of mintRows){
  const g=mint.roll,receipt=mint.originalChest;
  const set=WORLD_BOSS_GATHERING_SETS_V64.find(x=>x.setId===g?.setId);
  const piece=WORLD_BOSS_GATHERING_PIECES_V64.find(x=>x.itemId===g?.itemId);
  const location=physical.get(mint.instanceId)?.[0];
  if(!g||!piece||!set||mint.accountId!==accountId||mint.characterId!==characterId||mint.custody!=='equipped'||
   seenIds.has(mint.instanceId)||!location||location.owner!==characterId||location.slot!==g.slot||
   location.itemId!==g.itemId||c.equipmentInstanceIds?.[g.slot]!==mint.instanceId||
   (state.account.craftedGearInstances??[]).some(x=>x.id===mint.instanceId)||
   mint.rollDigest!==gatheringSnapshotDigestV100(g))
   throw Error('gathering_snapshot_invalid_mint_custody');
  if(!receipt||receipt.accountId!==accountId||receipt.rulesVersion!=='chest-settlement-v69'||!receipt.committed||
   receipt.tableId!=='world_boss_chest'||receipt.tableVersion!=='world_boss_v98_unified_'+set.bossId||
   !receipt.proofVersion||receipt.recipientCharacterId!==null||receipt.equipmentDeliveryMode!=='account_unclaimed'||
   !receipt.sourceKey.startsWith('world-boss:')||!UUID.test(receipt.sourceKey.split(':')[1]??'')||receipt.sourceKey.split(':')[2]!==accountId||
   !/^(donations_goal|three_attempts|community_damage_goal|damage:[1-9][0-9]*)$/.test(receipt.sourceKey.split(':').slice(3).join(':'))||
   seenSources.has(receipt.sourceKey)||receipt.groups.length!==1||receipt.drops.length!==1)
   throw Error('gathering_snapshot_invalid_chest_origin');
  const group=receipt.groups[0],drop=receipt.drops[0],table=worldBossChestLootTableV96(set.bossId,'donations_goal');
  if(group.groupId!=='equipment'||group.type!=='equipment'||group.chanceBps!==1000||group.hit!==true||
   group.entryId!==g.slot||group.quantity!==1||drop.groupId!=='equipment'||drop.type!=='equipment'||
   drop.entryId!==g.slot||drop.quantity!==1||gatheringSnapshotDigestV100(receipt.guaranteed)!==gatheringSnapshotDigestV100(table.guarantees))
   throw Error('gathering_snapshot_chest_roll_mismatch');
  seenIds.add(mint.instanceId);seenSources.add(receipt.sourceKey);
  if(input.verifyMintReadback(accountId,sourceRevision,gatheringSnapshotDigestV100(mint))!==true||
   gatheringSnapshotDigestV100(input.mintRows)!==mintDigest||gatheringSnapshotDigestV100(state)!==stateDigest)
   throw Error('gathering_snapshot_unverified_mint');
 }
 const review=reviewWorldBossGatheringSpeedV99({accountId,characterId,skill:node.skillId,copies:mintRows,
 baseActionSeconds:1,toolTimeMultiplier:1,existingRateMultiplier:1,verifyEquippedCopy:copy=>seenIds.has(copy.instanceId)});
 const frozen:FrozenGatheringRateReview={accountId,characterId,activityId,skill:node.skillId,targetId:a.targetId,
 startedAtMs:a.startedAtMs,gearRatingBps:review.gearRatingBps,matchingSetPieces:review.pieces,
 exactCopyIds:[...seenIds].sort(),equippedReceiptDigest:gatheringSnapshotDigestV100({accountId,characterId,sourceRevision,stateDigest,mintDigest}),
 rewardChannels:{skillXpAffixBps:review.channels.skillXpAffixBps,rareChanceAffixBps:review.channels.rareChanceAffixBps}};
 return {frozen,digest:gatheringSnapshotDigestV100(frozen),stateDigest,mintDigest,sourceRevision,
 persisted:false as const,canApply:false as const,releaseReady:false as const};
}
