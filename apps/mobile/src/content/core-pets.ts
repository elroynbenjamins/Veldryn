import type {CollectibleDefinition,CollectibleTarget} from './collectibles';

export type CorePetRegion='Asterfall'|'Sunscar'|'Frostmarch'|'Ashlands';

const pet=(id:string,name:string,region:CorePetRegion,target:CollectibleTarget,nativeSize:48|64,activeBps=200,source?:string):CollectibleDefinition=>({
  id,
  kind:'pet',
  name,
  bonusFamilyId:id,
  target,
  ownedBps:50,
  activeBps,
  source:source??`${region} pet collection`,
  collectionGroup:'core',
  region,
  nativeSize,
  rarity:nativeSize===64?'Epic':undefined,
  description:`A permanent ${region} pet collectible.`,
});

/**
 * Canonical permanent VELDRYN pet roster.
 *
 * IDs and names are stable content identifiers and must not be replaced by
 * temporary event IDs. Runtime art may be added independently through the
 * pet-art registry; missing art must never invalidate ownership or bonuses.
 */
export const CORE_PET_COLLECTIBLES:readonly CollectibleDefinition[]=[
  pet('PET_001','Pebblemole','Asterfall','gatheringYield',48,200,'Rare discovery while mining Copper Veins'),
  pet('PET_002','Cinderchip','Asterfall','craftingSpeed',48,200,'Rare discovery while mining Aster-Iron Veins'),
  pet('PET_003','Twiglet','Asterfall','gatheringYield',48,200,'Rare discovery while cutting Greenwood Trees'),
  pet('PET_004','Mossback Pup','Asterfall','characterXp',48,200,'Rare drop from Ironwood Wolf'),
  pet('PET_005','Silverfin','Asterfall','fishingSpeed',48,200,'Rare discovery while fishing Silverbrook Shoals'),
  pet('PET_006','Lantern Carp Fry','Asterfall','fishingSpeed',48,200,'Rare discovery while fishing Oathscale Pools'),
  pet('PET_007','Briarbud','Asterfall','herbalismSpeed',48,200,'Rare discovery while gathering Ironbloom'),
  pet('PET_008','Gloamcap','Asterfall','herbalismSpeed',48,200,'Rare discovery while gathering Cavelichen'),
  pet('PET_009','Tusklet','Asterfall','dropChance',48,200,'Rare drop from Roadside Boar'),
  pet('PET_010','Redfeather Chick','Asterfall','cookingSpeed',48,200,'Rare discovery while scouting the Greenfields'),
  pet('PET_011','Forge Spark','Asterfall','craftingSpeed',48,200,'Rare discovery while mining Oathstone Seams'),
  pet('PET_012','Mini Wretch','Asterfall','dropChance',48,200,'Rare drop from Lantern Wretch'),
  pet('PET_013','Mapwing','Asterfall','skillXp',48,200,"Rare discovery while surveying the King's Road"),
  pet('PET_014','Pack Mimic','Asterfall','materialPreservation',48,200,'Rare discovery while surveying the Old Mines'),
  pet('PET_015','Coinmouse','Asterfall','gold',48,200,'Rare discovery while mapping Silverbrook'),
  pet('PET_016','Echo Wisp','Asterfall','actionSpeed',48,200,'Rare drop from Echo Bat'),
  pet('PET_017','Campfox','Asterfall','skillXp',48,200,'Rare discovery while tracing Ironwood paths'),
  pet('PET_018','Oathling','Asterfall','defense',64,300,'0.05% drop from Oathglass Revenant'),

  pet('PET_019','Duneling','Sunscar','gatheringYield',48,200,'Rare drop from Sunscar Scorpion'),
  pet('PET_020','Mirage Minnow','Sunscar','fishingSpeed',48,200,'Rare discovery while charting the Sunscar glasslands'),
  pet('PET_021','Sunscarab','Sunscar','craftingSpeed',48,200,'Rare discovery while gathering Sunscale Bloom'),
  pet('PET_022','Tiny Sphinx','Sunscar','skillXp',64,300,'Rare drop from Dune Oracle'),
  pet('PET_023','Tyrant Larva','Sunscar','characterXp',64,300,'0.05% drop from Glassbound Sentinel'),

  pet('PET_024','Snowpuff Hare','Frostmarch','actionSpeed',48,200,'Rare discovery while following the Frostmarch bells'),
  pet('PET_025','Rimecap','Frostmarch','herbalismSpeed',48,200,'Rare discovery while gathering Frostbell Flowers'),
  pet('PET_026','Bellfin Fry','Frostmarch','fishingSpeed',48,200,'Rare drop from Frostwolf'),
  pet('PET_027','Choir Pebble','Frostmarch','defense',64,300,'Rare drop from Bellwraith'),
  pet('PET_028','Wyrmling Flake','Frostmarch','skillXp',64,300,'0.05% drop from Choir Hunter'),

  pet('PET_029','Coalbug','Ashlands','craftingSpeed',48,200,'Rare drop from Blackglass Mireling'),
  pet('PET_030','Sootling','Ashlands','materialPreservation',48,200,'Rare discovery while gathering Ashen Myrrh'),
  pet('PET_031','Ember Eel Fry','Ashlands','fishingSpeed',48,200,'Rare discovery while reading the Ashlands smoke'),
  pet('PET_032','Forge Imp','Ashlands','craftingSpeed',64,300,'Rare drop from Cinder Titan'),
  pet('PET_033','Cinder Crownling','Ashlands','dropChance',64,300,'0.05% drop from Ashen Revenant'),
];

export const CORE_PET_IDS=new Set(CORE_PET_COLLECTIBLES.map(row=>row.id));

export function validateCorePetCatalog(catalog:readonly CollectibleDefinition[]=CORE_PET_COLLECTIBLES){
  const expected=Array.from({length:33},(_,index)=>`PET_${String(index+1).padStart(3,'0')}`);
  const actual=catalog.map(row=>row.id);
  if(actual.length!==33)throw new Error(`Canonical core pet catalog must contain 33 pets, got ${actual.length}.`);
  if(actual.join('|')!==expected.join('|'))throw new Error('Canonical core pet IDs must remain PET_001 through PET_033 in order.');
  for(const row of catalog){
    if(row.kind!=='pet'||row.collectionGroup!=='core'||row.ownedBps!==50||row.activeBps<200)throw new Error(`Invalid core pet ${row.id}.`);
  }
}

validateCorePetCatalog();
