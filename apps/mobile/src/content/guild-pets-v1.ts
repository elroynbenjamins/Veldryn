import type {CollectibleDefinition} from './collectibles';

/** Permanent account-bound Guild Token pets. Standard passive / selected-active
 * collectible bonuses apply, without introducing another hidden power tier. */
export const GUILD_PET_COLLECTIBLES:readonly CollectibleDefinition[]=[
 {
  id:'GUILD_PET_001',kind:'pet',name:'Stormwatch Fox',
  bonusFamilyId:'GUILD_PET_001',target:'guildContribution',ownedBps:50,activeBps:200,
  source:'Guild Token Shop · Guild Level 3',collectionGroup:'profile',region:'Guild',
  nativeSize:48,rarity:'Rare',description:'A loyal guild scout with a watchful silver tail.',
 },
 {
  id:'GUILD_PET_002',kind:'pet',name:'Oathwood Wyrmling',
  bonusFamilyId:'GUILD_PET_002',target:'skillXp',ownedBps:50,activeBps:300,
  source:'Guild Token Shop · Guild Level 7',collectionGroup:'profile',region:'Guild',
  nativeSize:64,rarity:'Epic',description:'A tiny guardian hatched under an ancient guild oath.',
 },
];
