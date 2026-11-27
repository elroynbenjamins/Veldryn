/** Pure unmounted UI review. Never opens a chest, performs RNG or credits an item.
 * Only committed server readback can feed the future production screen.
 * One receipt per chest, mixed rarity equipment stays as exact copies. */
export interface ChestOpenResourceReviewV97{
 readonly itemId:string;readonly name:string;readonly quantity:number;
}
export interface ChestOpenGearReviewV97{
 readonly instanceId:string;readonly name:string;readonly rarity:'common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic';
 readonly quality:number;readonly skill:'woodcutting'|'mining'|'fishing';
}
export interface ChestOpenReceiptReviewV97{
 readonly sourceKey:string;readonly accountId:string;readonly status:'committed';
 readonly resources:readonly ChestOpenResourceReviewV97[];
 readonly gear:ChestOpenGearReviewV97|null;
}
export type ChestOpenEntryReviewV97=
 {readonly sourceKey:string;readonly state:'opening'|'failed'|'unknown'}|
 {readonly sourceKey:string;readonly state:'committed';readonly receipt:ChestOpenReceiptReviewV97};
const id=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=220;
const rarities=['common','uncommon','rare','epic','legendary','mythic'];
export function buildWorldBossChestOpeningReviewV97(accountId:string,entries:readonly ChestOpenEntryReviewV97[]){
 if(!id(accountId)||!Array.isArray(entries)||entries.length<1||entries.length>6)
  throw Error('world_boss_opening_invalid_batch');
 const keys=new Set<string>(),instances=new Set<string>();
 const resources=new Map<string,ChestOpenResourceReviewV97>();
 const gear:ChestOpenGearReviewV97[]=[];
 const pending:string[]=[],retry:string[]=[];
 let opened=0;
 for(const entry of entries){
  if(!entry||!id(entry.sourceKey)||keys.has(entry.sourceKey)||
   !['opening','failed','unknown','committed'].includes(entry.state))
   throw Error('world_boss_opening_invalid_entry');
  keys.add(entry.sourceKey);
  if(entry.state==='opening'||entry.state==='unknown'){pending.push(entry.sourceKey);continue;}
  if(entry.state==='failed'){retry.push(entry.sourceKey);continue;}
  if(entry.state!=='committed')throw Error('world_boss_opening_invalid_entry');
  const row=entry.receipt;
  if(!row||row.status!=='committed'||row.accountId!==accountId||row.sourceKey!==entry.sourceKey||
   !Array.isArray(row.resources)||row.resources.length>40)
   throw Error('world_boss_opening_invalid_receipt');
  opened++;
  const perChest=new Set<string>();
  for(const item of row.resources){
   if(!item||!id(item.itemId)||!id(item.name)||!Number.isSafeInteger(item.quantity)||
    item.quantity<=0||item.quantity>2147483647||perChest.has(item.itemId))
    throw Error('world_boss_opening_invalid_resource');
   perChest.add(item.itemId);
   const old=resources.get(item.itemId);
   if(old&&old.name!==item.name)throw Error('world_boss_opening_resource_mismatch');
   resources.set(item.itemId,{...item,quantity:(old?.quantity??0)+item.quantity});
  }
  if(row.gear!==null){
   const g=row.gear;
   if(!g||!id(g.instanceId)||instances.has(g.instanceId)||!id(g.name)||
    !rarities.includes(g.rarity)||!Number.isInteger(g.quality)||g.quality<0||g.quality>100||
    !['woodcutting','mining','fishing'].includes(g.skill))throw Error('world_boss_opening_invalid_gear');
   instances.add(g.instanceId);gear.push({...g});
  }
 }
 return {requested:entries.length,opened,pending,retry,gear:gear.sort((a,b)=>
  rarities.indexOf(b.rarity)-rarities.indexOf(a.rarity)||b.quality-a.quality||a.instanceId.localeCompare(b.instanceId)),
  resources:[...resources.values()],complete:opened===entries.length,
  closeAllowed:true,claimEnabled:false as const,releaseReady:false as const};
}
