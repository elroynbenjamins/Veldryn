import {EVENT_PET_COLLECTIBLES} from './event-collectible-content';
import {CORE_PET_COLLECTIBLES} from './core-pets';

export type CollectibleKind='pet'|'background'|'border';
export type CollectibleTarget='hp'|'attack'|'defense'|'skillXp'|'characterXp'|'gold'|'gatheringYield'|'miningYield'|'woodcuttingYield'|'fishingYield'|'herbalismYield'|'huntingYield'|'gatheringSpeed'|'dropChance'|'actionSpeed'|'cookingSpeed'|'herbalismSpeed'|'healingEffectiveness'|'craftingSpeed'|'enchantingSpeed'|'dungeonReward'|'fishingSpeed'|'materialPreservation'|'guildContribution'|'monsterMasteryXp'|'explorationProgress'|'offlineLootCapacity'|'echoReward'|'foodDuration';
export type CollectibleGroup='core'|'event'|'legacy'|'profile';
export interface CollectibleDefinition{
  id:string;
  kind:CollectibleKind;
  name:string;
  bonusFamilyId:string;
  target:CollectibleTarget;
  ownedBps:50;
  activeBps:number;
  source:string;
  requiredCharacterLevel?:number;
  event?:string;
  rarity?:string;
  buff?:string;
  description?:string;
  collectionGroup?:CollectibleGroup;
  region?:string;
  nativeSize?:48|64;
}
const entry=(id:string,kind:CollectibleKind,name:string,target:CollectibleTarget,source:string,activeBps=200,requiredCharacterLevel?:number,collectionGroup:CollectibleGroup='profile'):CollectibleDefinition=>({id,kind,name,bonusFamilyId:id,target,ownedBps:50,activeBps:activeBps as number,source,requiredCharacterLevel,collectionGroup});

export const LEGACY_PET_COLLECTIBLES:readonly CollectibleDefinition[]=[
  entry('pet_harvest_fox','pet','Harvest Fox','gold','Harvestwake reputation milestone',200,undefined,'legacy'),
  entry('pet_field_mouse','pet','Field Mouse','skillXp','Harvestwake event shop',250,undefined,'legacy'),
  entry('pet_straw_sparrow','pet','Straw Sparrow','gatheringYield','Golden Field Feather discovery',200,undefined,'legacy'),
  entry('pet_amber_owl','pet','Amber Owl','dropChance','Harvestwake Amber Pantry',400,undefined,'legacy'),
  entry('pet:feral_rat','pet','Feral Rat','attack','Existing legacy pet unlock',200,undefined,'legacy'),
  entry('pet:emberhound','pet','Emberhound','attack','Existing legacy pet unlock',300,undefined,'legacy'),
  entry('pet:forgebound_mooncat','pet','Forgebound Mooncat','attack','Existing legacy pet unlock',500,undefined,'legacy'),
];

export const PROFILE_COLLECTIBLES:readonly CollectibleDefinition[]=[
  entry('ironwood-dawn','background','Ironwood Dawn','skillXp','Reach character level 10',200,10,'profile'),
  entry('silverbrook-mist','background','Silverbrook Mist','gatheringYield','Reach character level 20',200,20,'profile'),
  entry('oathglass-hall','background','Oathglass Hall','hp','Reach character level 25',200,25,'profile'),
  entry('bg_harvestwake','background','Golden Fields','gold','Harvestwake event shop',200,undefined,'event'),
  entry('bg_grand_storehouse','background','Grand Storehouse','gatheringYield','Harvestwake reputation milestone',200,undefined,'event'),
  entry('bg_spirit_storehouse','background','Spirit Storehouse','defense','Guardian Lantern discovery',200,undefined,'event'),
  entry('frame_amber_vine','border','Amber Vine','defense','Harvestwake reputation milestone',200,undefined,'event'),
  entry('frame_wheat_crown','border','Wheat Crown','gold','Harvestwake event shop',200,undefined,'event'),
];

export const COLLECTIBLES:readonly CollectibleDefinition[]=[
  ...CORE_PET_COLLECTIBLES,
  ...EVENT_PET_COLLECTIBLES,
  ...LEGACY_PET_COLLECTIBLES,
  ...PROFILE_COLLECTIBLES,
];

export const COLLECTIBLE_TARGET_LABELS:Record<CollectibleTarget,string>={hp:'Maximum HP',attack:'Attack',defense:'Defense',skillXp:'Skill XP',characterXp:'Combat XP',gold:'Ordinary combat Gold',gatheringYield:'Ordinary gathered materials',miningYield:'Mining material yield',woodcuttingYield:'Woodcutting material yield',fishingYield:'Normal fishing catch yield',herbalismYield:'Normal herb yield',huntingYield:'Normal hunting material yield',gatheringSpeed:'Gathering speed',dropChance:'Ordinary drop chance',actionSpeed:'Action speed',cookingSpeed:'Cooking speed',herbalismSpeed:'Herbalism speed',healingEffectiveness:'Healing effectiveness',craftingSpeed:'Crafting speed',enchantingSpeed:'Enchanting speed',dungeonReward:'Dungeon reward quantity',fishingSpeed:'Fishing speed',materialPreservation:'Material preservation',guildContribution:'Guild contribution',monsterMasteryXp:'Monster mastery XP',explorationProgress:'Exploration progress',offlineLootCapacity:'Offline loot capacity',echoReward:'Positive Echo reward effect',foodDuration:'Food duration'};

export function validateCollectibleCatalog(catalog:readonly CollectibleDefinition[]=COLLECTIBLES){
  const ids=new Set<string>();
  for(const row of catalog){
    if(!row.id||ids.has(row.id)||row.ownedBps!==50||row.activeBps<200||!COLLECTIBLE_TARGET_LABELS[row.target])throw new Error(`Invalid collectible ${row.id}`);
    if(row.kind==='pet'&&!row.collectionGroup)throw new Error(`Pet ${row.id} is missing collectionGroup.`);
    ids.add(row.id);
  }
}
validateCollectibleCatalog();
