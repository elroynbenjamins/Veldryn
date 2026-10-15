import type {CollectibleDefinition} from './collectibles';

/** Only released event collectibles enter the runtime collection catalog. */
export const EVENT_PET_COLLECTIBLES:readonly CollectibleDefinition[]=[
 {id:'EVT_PET_013',kind:'pet',name:'Gloomkin',bonusFamilyId:'EVT_PET_013',target:'dropChance',ownedBps:50,activeBps:300,collectionGroup:'event',source:'The Veilbreak · October',event:'veilbreak',rarity:'Rare',buff:'+3% relative Combat Drop Chance',description:'A playful void kitten carrying a small spectral lantern.'},
 {id:'EVT_PET_014',kind:'pet',name:'Lantern Mimic',bonusFamilyId:'EVT_PET_014',target:'dungeonReward',ownedBps:50,activeBps:400,collectionGroup:'event',source:'The Veilbreak · October',event:'veilbreak',rarity:'Epic',buff:'+4% Dungeon Reward Quantity Chance',description:'A compact mimic filled with ghost-fire and lantern light.'},
];
