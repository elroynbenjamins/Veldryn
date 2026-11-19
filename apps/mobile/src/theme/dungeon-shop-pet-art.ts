import type {ImageSourcePropType} from 'react-native';

/**
 * Approved Dungeon Shop pet artwork in three packed resolutions:
 * - 72px WebP: tiny icon surfaces and low-memory fallbacks
 * - 256px WebP: shop offer rows and compact Pet Collection cards
 * - 512px PNG: enlarged Shop/Collections detail portraits
 *
 * All requires are static so Metro bundles the right files for Android.
 * The immutable reward IDs and offer SKUs must remain unchanged.
 */
const DUNGEON_PET_ART:Readonly<Record<string,ImageSourcePropType>>={
 DUNGEON_PET_ASTERFALL_001:require('../../assets/dungeon-shop/pets/DUNGEON_PET_ASTERFALL_001_Oathroot_Seedling.webp'),
 DUNGEON_PET_SUNSCAR_001:require('../../assets/dungeon-shop/pets/DUNGEON_PET_SUNSCAR_001_Vaultscarab.webp'),
 DUNGEON_PET_FROSTMARCH_001:require('../../assets/dungeon-shop/pets/DUNGEON_PET_FROSTMARCH_001_Choirbell_Sprite.webp'),
};

const DUNGEON_PET_MEDIUM_ART:Readonly<Record<string,ImageSourcePropType>>={
 DUNGEON_PET_ASTERFALL_001:require('../../assets/dungeon-shop/pets/medium/DUNGEON_PET_ASTERFALL_001_Oathroot_Seedling.webp'),
 DUNGEON_PET_SUNSCAR_001:require('../../assets/dungeon-shop/pets/medium/DUNGEON_PET_SUNSCAR_001_Vaultscarab.webp'),
 DUNGEON_PET_FROSTMARCH_001:require('../../assets/dungeon-shop/pets/medium/DUNGEON_PET_FROSTMARCH_001_Choirbell_Sprite.webp'),
};

const DUNGEON_PET_PORTRAIT_ART:Readonly<Record<string,ImageSourcePropType>>={
 DUNGEON_PET_ASTERFALL_001:require('../../assets/dungeon-shop/pets/portraits/DUNGEON_PET_ASTERFALL_001_Oathroot_Seedling.png'),
 DUNGEON_PET_SUNSCAR_001:require('../../assets/dungeon-shop/pets/portraits/DUNGEON_PET_SUNSCAR_001_Vaultscarab.png'),
 DUNGEON_PET_FROSTMARCH_001:require('../../assets/dungeon-shop/pets/portraits/DUNGEON_PET_FROSTMARCH_001_Choirbell_Sprite.png'),
};

const OFFER_PET_REWARD_IDS:Readonly<Record<string,string>>={
 dshop_asterfall_pet:'DUNGEON_PET_ASTERFALL_001',
 dshop_sunscar_pet:'DUNGEON_PET_SUNSCAR_001',
 dshop_frostmarch_pet:'DUNGEON_PET_FROSTMARCH_001',
};

/** Low-resolution pet art for tiny icons (72px). */
export function dungeonShopPetArtSource(rewardId:string):ImageSourcePropType|undefined{
 return DUNGEON_PET_ART[rewardId];
}

/** Sharper compact pet art for density-scaled mobile cards (256px). */
export function dungeonShopPetMediumArtSource(rewardId:string):ImageSourcePropType|undefined{
 return DUNGEON_PET_MEDIUM_ART[rewardId];
}

/** Full-size 512px artwork for expanded collection and shop detail panels. */
export function dungeonShopPetPortraitArtSource(rewardId:string):ImageSourcePropType|undefined{
 return DUNGEON_PET_PORTRAIT_ART[rewardId];
}

export function dungeonShopPetOfferArt(offerId:string):ImageSourcePropType|undefined{
 const rewardId=OFFER_PET_REWARD_IDS[offerId];
 return rewardId?dungeonShopPetMediumArtSource(rewardId)??dungeonShopPetArtSource(rewardId):undefined;
}

export function dungeonShopPetOfferPortraitArt(offerId:string):ImageSourcePropType|undefined{
 const rewardId=OFFER_PET_REWARD_IDS[offerId];
 return rewardId?dungeonShopPetPortraitArtSource(rewardId):undefined;
}
