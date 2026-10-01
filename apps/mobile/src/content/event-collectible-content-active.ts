import type {CollectibleDefinition} from './collectibles';

/** Only released event collectibles enter the runtime collection catalog. */
export const EVENT_PET_COLLECTIBLES:readonly CollectibleDefinition[]=[
 {id:'EVT_PET_011',kind:'pet',name:'Pumpkin Piglet',bonusFamilyId:'EVT_PET_011',target:'cookingSpeed',ownedBps:50,activeBps:200,collectionGroup:'event',source:'Harvestwake · September',event:'harvestwake',rarity:'Common',buff:'+2% Cooking Speed',description:'A cheerful piglet dressed for the autumn harvest.'},
 {id:'EVT_PET_012',kind:'pet',name:'Golden Sheafling',bonusFamilyId:'EVT_PET_012',target:'gatheringYield',ownedBps:50,activeBps:400,collectionGroup:'event',source:'Harvestwake · September',event:'harvestwake',rarity:'Epic',buff:'+4% Gathering Yield Chance',description:'A golden harvest spirit formed from grain and autumn leaves.'},
];
