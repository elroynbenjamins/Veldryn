import type {CollectibleDefinition,CollectibleTarget} from './collectibles';

/** Dormant content metadata for the three regional Dungeon Marks collections.
 * This is NOT registered in COLLECTIBLES until authored, approved pixel art,
 * atomic grant delivery and the release gate are ready. */
const reward=(id:string,kind:'pet'|'background'|'border',name:string,target:CollectibleTarget,region:string,activeBps:200|300):CollectibleDefinition=>({
 id,kind,name,bonusFamilyId:id,target,ownedBps:50,activeBps,
 rarity:'Epic',collectionGroup:'profile',region,source:'Dungeon Marks Shop · '+region,
 nativeSize:kind==='pet'?64:undefined,
 description:'A permanent '+region+' Dungeon Marks collectible.',
});

export const DUNGEON_SHOP_COLLECTIBLES_V1:readonly CollectibleDefinition[] = [
 reward('dungeon:asterfall:briarbound-frame','border','Briarbound Frame','gatheringYield','Asterfall',200),
 reward('dungeon:asterfall:rootbound-sanctuary','background','Rootbound Sanctuary','hp','Asterfall',200),
 reward('DUNGEON_PET_ASTERFALL_001','pet','Oathroot Seedling','healingEffectiveness','Asterfall',300),
 reward('dungeon:sunscar:amberglass-loop','border','Amberglass Loop','craftingSpeed','Sunscar',200),
 reward('dungeon:sunscar:buried-observatory','background','Buried Observatory','skillXp','Sunscar',200),
 reward('DUNGEON_PET_SUNSCAR_001','pet','Vaultscarab','dropChance','Sunscar',300),
 reward('dungeon:frostmarch:frostbound-chime','border','Frostbound Chime','fishingSpeed','Frostmarch',200),
 reward('dungeon:frostmarch:shiverlake-reflections','background','Shiverlake Reflections','defense','Frostmarch',200),
 reward('DUNGEON_PET_FROSTMARCH_001','pet','Choirbell Sprite','actionSpeed','Frostmarch',300),
] as const;

export const DUNGEON_SHOP_PROFILE_ICONS_V1 = [
 {id:'dungeon:asterfall:wardens-lantern',name:"Warden's Lantern",rarity:'Rare',group:'Dungeon',region:'Asterfall'},
 {id:'dungeon:sunscar:solar-vault-key',name:'Solar Vault Key',rarity:'Rare',group:'Dungeon',region:'Sunscar'},
 {id:'dungeon:frostmarch:resonant-bell',name:'Resonant Bell',rarity:'Rare',group:'Dungeon',region:'Frostmarch'},
] as const;
