import type {CollectibleDefinition} from './collectibles';
import {FROSTFALL_REWARDS_RELEASED} from '../core/release-flags';

/** Frostfall definitions are staged but hidden from the runtime catalog until launch approval. */
export const FROSTFALL_PETS:readonly CollectibleDefinition[]=[
 {id:'EVT_PET_015',kind:'pet',name:'Snowbell Pup',bonusFamilyId:'EVT_PET_015',target:'fishingSpeed',ownedBps:50,activeBps:200,collectionGroup:'event',source:'Frostfall Festival · December',event:'frostfall_festival',rarity:'Common',buff:'+2% Fishing Speed',description:'A fluffy winter pup with a bell collar and scarf.'},
 {id:'EVT_PET_017',kind:'pet',name:'Aurora Fox',bonusFamilyId:'EVT_PET_017',target:'skillXp',ownedBps:50,activeBps:500,collectionGroup:'event',source:'Frostfall Festival · December',event:'frostfall_festival',rarity:'Mythic',buff:'+5% Offline Skill XP',description:'A luminous frost fox wrapped in aurora ribbons and ice crystal ornaments.'}
];

/** Only released event collectibles enter the runtime collection catalog. */
export const EVENT_PET_COLLECTIBLES:readonly CollectibleDefinition[]=[
 {id:'EVT_PET_013',kind:'pet',name:'Gloomkin',bonusFamilyId:'EVT_PET_013',target:'dropChance',ownedBps:50,activeBps:300,collectionGroup:'event',source:'The Veilbreak · October',event:'veilbreak',rarity:'Rare',buff:'+3% relative Combat Drop Chance',description:'A playful void kitten carrying a small spectral lantern.'},
 {id:'EVT_PET_014',kind:'pet',name:'Lantern Mimic',bonusFamilyId:'EVT_PET_014',target:'dungeonReward',ownedBps:50,activeBps:400,collectionGroup:'event',source:'The Veilbreak · October',event:'veilbreak',rarity:'Epic',buff:'+4% Dungeon Reward Quantity Chance',description:'A compact mimic filled with ghost-fire and lantern light.'},

 ...(FROSTFALL_REWARDS_RELEASED?FROSTFALL_PETS:[]),
];
