import type {ImageSourcePropType} from 'react-native';

/** Dungeon Shop-exclusive pet portraits. Catalogue SKUs map to permanent reward IDs.
 * Keep the Metro requires static so Android bundles these assets at build time. */
const DUNGEON_PET_ART:Readonly<Record<string,ImageSourcePropType>>={
 DUNGEON_PET_ASTERFALL_001:require('../../assets/dungeon-shop/pets/DUNGEON_PET_ASTERFALL_001_Oathroot_Seedling.webp'),
 DUNGEON_PET_SUNSCAR_001:require('../../assets/dungeon-shop/pets/DUNGEON_PET_SUNSCAR_001_Vaultscarab.webp'),
 DUNGEON_PET_FROSTMARCH_001:require('../../assets/dungeon-shop/pets/DUNGEON_PET_FROSTMARCH_001_Choirbell_Sprite.webp'),
};
const OFFER_PET_REWARD_IDS:Readonly<Record<string,string>>={
 dshop_asterfall_pet:'DUNGEON_PET_ASTERFALL_001',
 dshop_sunscar_pet:'DUNGEON_PET_SUNSCAR_001',
 dshop_frostmarch_pet:'DUNGEON_PET_FROSTMARCH_001',
};

export function dungeonShopPetArtSource(rewardId:string):ImageSourcePropType|undefined{
 return DUNGEON_PET_ART[rewardId];
}
export function dungeonShopPetOfferArt(offerId:string):ImageSourcePropType|undefined{
 const rewardId=OFFER_PET_REWARD_IDS[offerId];
 return rewardId?dungeonShopPetArtSource(rewardId):undefined;
}
