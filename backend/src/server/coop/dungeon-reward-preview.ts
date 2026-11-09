import {gemPoolForSourceV1} from '../equipment/gems/gem-acquisition-v1';

/** Only advertise a rate when the claimed reward actually has a registered
 * co-op gem settlement source. EXP_* regular runs currently settle Marks,
 * whereas gem settlement SQL (20261025000015) recognizes COP_004..COP_009.
 * Never borrow COP odds for an EXP dungeon with a similar name. */
const SETTLED_GEM_DUNGEONS=new Set(['COP_004','COP_005','COP_006','COP_007','COP_008','COP_009']);

export interface DungeonPotentialDrop {
 label:string;
 chancePercent:number;
 pityAt?:number;
 detail?:string;
}
export interface DungeonRewardPreview {
 /** One completed and claimed run pays Marks, with charge-dependent scaling. */
 guaranteedOnClear:readonly ['Expedition Marks'];
 potentialDrops:readonly DungeonPotentialDrop[];
 /** Explicit empty state avoids fictional guaranteed gear or cosmetic drops. */
 dropNotice:string;
}
export function dungeonRewardPreview(expeditionId:string):DungeonRewardPreview{
 const pool=SETTLED_GEM_DUNGEONS.has(expeditionId)?gemPoolForSourceV1(expeditionId):undefined;
 if(!pool||pool.kind!=='dungeon_boss')return {
  guaranteedOnClear:['Expedition Marks'],
  potentialDrops:[],
  dropNotice:'No verified item-drop rates are published for this dungeon yet.',
 };
 const drops:DungeonPotentialDrop[]=[{
  label:'Grade III unrefined gem',
  chancePercent:pool.chance*100,
  ...(pool.pityAt?{pityAt:pool.pityAt}:{}),
  detail:'Random gem family from this boss pool',
 }];
 if(pool.recipeChance)drops.push({
  label:'Gem recipe or duplicate compensation',
  chancePercent:pool.recipeChance*100,
  detail:'A duplicate learned recipe grants Gem Dust instead',
 });
 if(pool.catalystChance)drops.push({label:'Regional Catalyst',chancePercent:pool.catalystChance*100});
 return {guaranteedOnClear:['Expedition Marks'],potentialDrops:drops,dropNotice:'Rates are per eligible claimed clear, not per room or attempt.'};
}
