import type {CollectibleDefinition,CollectibleTarget} from './collectibles';

export type CorePetRegion='Asterfall'|'Sunscar'|'Frostmarch'|'Ashlands';
export type CorePetRarity='Normal'|'Rare'|'Epic'|'Mythic';

export const CORE_PET_ACTIVE_BPS:Readonly<Record<CorePetRarity,number>>={Normal:200,Rare:300,Epic:400,Mythic:500};

const pet=(id:string,name:string,region:CorePetRegion,target:CollectibleTarget,rarity:CorePetRarity,source:string):CollectibleDefinition=>({
  id,
  kind:'pet',
  name,
  bonusFamilyId:id,
  target,
  ownedBps:50,
  activeBps:CORE_PET_ACTIVE_BPS[rarity],
  source,
  collectionGroup:'core',
  region,
  nativeSize:rarity==='Epic'||rarity==='Mythic'?64:48,
  rarity,
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
  pet('PET_001','Pebblemole','Asterfall','gatheringYield','Normal','Discovery while mining Copper Veins'),
  pet('PET_002','Cinderchip','Asterfall','craftingSpeed','Normal','Discovery while mining Aster-Iron Veins'),
  pet('PET_003','Twiglet','Asterfall','gatheringYield','Normal','Discovery while cutting Greenwood Trees'),
  pet('PET_004','Mossback Pup','Asterfall','characterXp','Rare','Rare drop from Ironwood Wolf'),
  pet('PET_005','Silverfin','Asterfall','fishingSpeed','Normal','Discovery while fishing Silverbrook Shoals'),
  pet('PET_006','Lantern Carp Fry','Asterfall','fishingSpeed','Normal','Discovery while fishing Oathscale Pools'),
  pet('PET_007','Briarbud','Asterfall','herbalismSpeed','Normal','Discovery while gathering Ironbloom'),
  pet('PET_008','Gloamcap','Asterfall','herbalismSpeed','Normal','Discovery while gathering Cavelichen'),
  pet('PET_009','Tusklet','Asterfall','dropChance','Normal','Drop from Roadside Boar'),
  pet('PET_010','Redfeather Chick','Asterfall','cookingSpeed','Normal','Discovery while scouting the Greenfields'),
  pet('PET_011','Forge Spark','Asterfall','craftingSpeed','Rare','Rare discovery while mining Oathstone Seams'),
  pet('PET_012','Mini Wretch','Asterfall','dropChance','Rare','Rare drop from Lantern Wretch'),
  pet('PET_013','Mapwing','Asterfall','skillXp','Normal',"Discovery while surveying the King's Road"),
  pet('PET_014','Pack Mimic','Asterfall','materialPreservation','Epic','Epic discovery while surveying the Old Mines'),
  pet('PET_015','Coinmouse','Asterfall','gold','Normal','Discovery while mapping Silverbrook'),
  pet('PET_016','Echo Wisp','Asterfall','actionSpeed','Epic','Epic drop from Echo Bat'),
  pet('PET_017','Campfox','Asterfall','skillXp','Normal','Discovery while tracing Ironwood paths'),
  pet('PET_018','Oathling','Asterfall','defense','Mythic','0.025% drop from Oathglass Revenant'),

  pet('PET_019','Duneling','Sunscar','gatheringYield','Rare','Rare drop from Sunscar Scorpion'),
  pet('PET_020','Mirage Minnow','Sunscar','fishingSpeed','Normal','Discovery while charting the Sunscar glasslands'),
  pet('PET_021','Sunscarab','Sunscar','craftingSpeed','Rare','Rare discovery while gathering Sunscale Bloom'),
  pet('PET_022','Tiny Sphinx','Sunscar','skillXp','Epic','Epic drop from Dune Oracle'),
  pet('PET_023','Tyrant Larva','Sunscar','characterXp','Mythic','0.025% drop from Glassbound Sentinel'),
  pet('PET_034','Glasswing Jerboa','Sunscar','gold','Normal','Drop from Glass Dune Strider'),
  pet('PET_035','Mirage Kit','Sunscar','actionSpeed','Rare','Rare discovery while gathering Mirage Saltbloom'),
  pet('PET_036','Crownscale Hatchling','Sunscar','defense','Epic',"Epic drop from Royal Sandguard in Tyrant's Crown"),

  pet('PET_024','Snowpuff Hare','Frostmarch','actionSpeed','Normal','Discovery while following the Frostmarch bells'),
  pet('PET_025','Rimecap','Frostmarch','herbalismSpeed','Rare','Rare discovery while gathering Frostbell Flowers'),
  pet('PET_026','Bellfin Fry','Frostmarch','fishingSpeed','Rare','Rare drop from Frostwolf'),
  pet('PET_027','Choir Pebble','Frostmarch','defense','Epic','Epic drop from Bellwraith'),
  pet('PET_028','Wyrmling Flake','Frostmarch','skillXp','Mythic','0.025% drop from Choir Hunter'),
  pet('PET_037','Whitepine Owlet','Frostmarch','characterXp','Rare','Rare drop from Snow Treant'),
  pet('PET_038','Rime Otter','Frostmarch','fishingSpeed','Epic','Epic drop from Lakebound Specter in Shiverlake'),
  pet('PET_039','Iceglass Minnow','Frostmarch','gatheringYield','Normal','Discovery while fishing the Shiverlake Icefin Pool'),

  pet('PET_029','Coalbug','Ashlands','craftingSpeed','Rare','Rare drop from Blackglass Mireling'),
  pet('PET_030','Sootling','Ashlands','materialPreservation','Rare','Rare discovery while gathering Ashen Myrrh'),
  pet('PET_031','Ember Eel Fry','Ashlands','fishingSpeed','Normal','Discovery while reading the Ashlands smoke'),
  pet('PET_032','Forge Imp','Ashlands','craftingSpeed','Epic','Epic drop from Cinder Titan'),
  pet('PET_033','Cinder Crownling','Ashlands','dropChance','Mythic','0.025% drop from Ashen Revenant'),
  pet('PET_040','Emberfin Tadpole','Ashlands','healingEffectiveness','Normal','Discovery while fishing Emberfin Deepwater'),
  pet('PET_041','Blackglass Newt','Ashlands','defense','Rare','Rare discovery while mining Deep Blackglass Veins'),
  pet('PET_042','Heartfire Salamander','Ashlands','materialPreservation','Epic','Epic discovery while cutting Heartfire Cinderwood'),
];

export const CORE_PET_IDS=new Set(CORE_PET_COLLECTIBLES.map(row=>row.id));

export function validateCorePetCatalog(catalog:readonly CollectibleDefinition[]=CORE_PET_COLLECTIBLES){
  const expected=Array.from({length:42},(_,index)=>`PET_${String(index+1).padStart(3,'0')}`).sort();
  const actual=catalog.map(row=>row.id).sort();
  if(actual.length!==42)throw new Error(`Canonical core pet catalog must contain 42 pets, got ${actual.length}.`);
  if(actual.join('|')!==expected.join('|'))throw new Error('Canonical core pet IDs must remain PET_001 through PET_042.');
  for(const row of catalog){
    const rarity=row.rarity as CorePetRarity;
    if(row.kind!=='pet'||row.collectionGroup!=='core'||row.ownedBps!==50||row.activeBps!==CORE_PET_ACTIVE_BPS[rarity])throw new Error(`Invalid core pet ${row.id}.`);
  }
  for(const region of ['Asterfall','Sunscar','Frostmarch','Ashlands'] as const){
    const rows=catalog.filter(row=>row.region===region);
    const expectedCounts=region==='Asterfall'?{Normal:12,Rare:3,Epic:2,Mythic:1}:{Normal:2,Rare:3,Epic:2,Mythic:1};
    for(const [rarity,count] of Object.entries(expectedCounts))if(rows.filter(row=>row.rarity===rarity).length!==count)throw new Error(`${region} must contain ${count} ${rarity} pets.`);
  }
}

validateCorePetCatalog();
