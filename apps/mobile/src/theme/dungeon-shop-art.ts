import type {ImageSourcePropType} from 'react-native';

/** Draft Dungeon Marks pixel-art sprites. IDs match the server-only catalogue.
 * Art registration is safe before per-offer purchases are released. */
export const dungeonShopOfferArt:Readonly<Record<string,ImageSourcePropType>>={
 dshop_companion_essence:require('../../assets/companion-resources/companion_essence.webp'),
 dshop_bondstone:require('../../assets/companion-resources/bondstones.webp'),
 dshop_asterfall_icon:require('../../assets/dungeon-shop-v1/dshop_asterfall_icon.png'),
 dshop_asterfall_border:require('../../assets/dungeon-shop-v1/dshop_asterfall_border.png'),
 dshop_asterfall_background:require('../../assets/dungeon-shop-v1/dshop_asterfall_background.png'),
 dshop_asterfall_pet:require('../../assets/dungeon-shop-v1/dshop_asterfall_pet.png'),
 dshop_sunscar_icon:require('../../assets/dungeon-shop-v1/dshop_sunscar_icon.png'),
 dshop_sunscar_border:require('../../assets/dungeon-shop-v1/dshop_sunscar_border.png'),
 dshop_sunscar_background:require('../../assets/dungeon-shop-v1/dshop_sunscar_background.png'),
 dshop_sunscar_pet:require('../../assets/dungeon-shop-v1/dshop_sunscar_pet.png'),
 dshop_frostmarch_icon:require('../../assets/dungeon-shop-v1/dshop_frostmarch_icon.png'),
 dshop_frostmarch_border:require('../../assets/dungeon-shop-v1/dshop_frostmarch_border.png'),
 dshop_frostmarch_background:require('../../assets/dungeon-shop-v1/dshop_frostmarch_background.png'),
 dshop_frostmarch_pet:require('../../assets/dungeon-shop-v1/dshop_frostmarch_pet.png'),
};
export const dungeonShopMaterialAtlas=require('../../assets/dungeon-shop-v1/dungeon-shop-icons-draft.png') as ImageSourcePropType;
export const dungeonShopMaterialAtlasCell:Readonly<Record<string,number>>={
 dshop_tempering_satchel:0,
 dshop_gem_dust_cache:1,
 dshop_tempering_core_cache:2,
};
export const dungeonShopProfileIconArt:Readonly<Record<string,ImageSourcePropType>>={
 'dungeon:asterfall:wardens-lantern':dungeonShopOfferArt.dshop_asterfall_icon,
 'dungeon:sunscar:solar-vault-key':dungeonShopOfferArt.dshop_sunscar_icon,
 'dungeon:frostmarch:resonant-bell':dungeonShopOfferArt.dshop_frostmarch_icon,
};
export const dungeonShopBorderArt:Readonly<Record<string,ImageSourcePropType>>={
 'dungeon:asterfall:briarbound-frame':dungeonShopOfferArt.dshop_asterfall_border,
 'dungeon:sunscar:amberglass-loop':dungeonShopOfferArt.dshop_sunscar_border,
 'dungeon:frostmarch:frostbound-chime':dungeonShopOfferArt.dshop_frostmarch_border,
};
export const dungeonShopBackgroundArt:Readonly<Record<string,ImageSourcePropType>>={
 'dungeon:asterfall:rootbound-sanctuary':dungeonShopOfferArt.dshop_asterfall_background,
 'dungeon:sunscar:buried-observatory':dungeonShopOfferArt.dshop_sunscar_background,
 'dungeon:frostmarch:shiverlake-reflections':dungeonShopOfferArt.dshop_frostmarch_background,
};
export const dungeonShopPetArt:Readonly<Record<string,ImageSourcePropType>>={
 'DUNGEON_PET_ASTERFALL_001':dungeonShopOfferArt.dshop_asterfall_pet,
 'DUNGEON_PET_SUNSCAR_001':dungeonShopOfferArt.dshop_sunscar_pet,
 'DUNGEON_PET_FROSTMARCH_001':dungeonShopOfferArt.dshop_frostmarch_pet,
};
