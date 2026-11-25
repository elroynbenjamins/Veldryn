import type {ImageSourcePropType} from 'react-native';
import type {ClassId} from '../core/types';

/** Transparent showcase masters; separate from small navigation/class glyphs. */
export const showcaseClassIcons:Record<ClassId,ImageSourcePropType>={
 IRONWARDEN:require('../../assets/profile-icons-v1/ironwarden.webp'),
 BASTION:require('../../assets/profile-icons-v1/bastion.webp'),
 DREADGUARD:require('../../assets/profile-icons-v1/dreadguard.webp'),
 DAWNKEEPER:require('../../assets/profile-icons-v1/dawnkeeper.webp'),
 WAYFINDER:require('../../assets/profile-icons-v1/wayfinder.webp'),
 RAVAGER:require('../../assets/profile-icons-v1/ravager.webp'),
 HEXWEAVER:require('../../assets/profile-icons-v1/hexweaver.webp'),
 KNIFE_DANCER:require('../../assets/profile-icons-v1/knife_dancer.webp'),
 STONECALLER:require('../../assets/profile-icons-v1/stonecaller.webp'),
};

export const profilePortraitIcons:Record<string,ImageSourcePropType>={
 'ascendant-celestial-crown-icon':require('../../assets/ascendant/shared/celestial_crown.webp'),
 'ascendant-draconic-ruby-icon':require('../../assets/ascendant/shared/draconic_ruby.webp'),
 'starter:hooded-ranger':require('../../assets/profile-icons-v1/hooded-ranger.webp'),
 'starter:armored-sentinel':require('../../assets/profile-icons-v1/armored-sentinel.webp'),
 'starter:masked-spellcaster':require('../../assets/profile-icons-v1/masked-spellcaster.webp'),
 'starter:traveling-alchemist':require('../../assets/profile-icons-v1/traveling-alchemist.webp'),
 'starter:dawn-priestess':require('../../assets/profile-icons-v1/dawn-priestess.webp'),
 'starter:stonebound-explorer':require('../../assets/profile-icons-v1/stonebound-explorer.webp'),
 'starter:gilded-duelist':require('../../assets/profile-icons-v1/gilded-duelist.webp'),
 'starter:runic-scholar':require('../../assets/profile-icons-v1/runic-scholar.webp'),
 'starter:dune-warden':require('../../assets/profile-icons-v1/dune-warden.webp'),
 'creature:MOSS_RAT':require('../../assets/profile-icons-v1/moss-rat.webp'),
 'creature:IRONWOOD_WOLF':require('../../assets/profile-icons-v1/ironwood-wolf.webp'),
 'creature:FALLEN_KNIGHT':require('../../assets/profile-icons-v1/fallen-knight.webp'),
 'event:spirit-lantern':require('../../assets/profile-icons-v1/spirit-lantern.webp'),
 'event:veilbreak-2026-lantern-warden':require('../../assets/profile-icons-v1/veilbreak-2026-lantern-warden_runtime.webp'),
 'event:veilbreak-2026-pumpkin-moon':require('../../assets/profile-icons-v1/veilbreak-2026-pumpkin-moon_runtime.webp'),
 'event:frostfall-2026-snowbell':require('../../assets/profile-icons-v1/frostfall-2026-snowman.webp'),
 'event:frostfall-2026-maiden':require('../../assets/profile-icons-v1/frostfall-2026-maiden.webp'),
 'event:frostfall-2026-adventurer':require('../../assets/profile-icons-v1/frostfall-2026-adventurer.webp'),
 'guild:stormwatch-crest':require('../../assets/profile-icons-v1/guild-stormwatch-crest.png'),
 'dungeon:asterfall:wardens-lantern':require('../../assets/profile-icons-v1/dungeon-asterfall-wardens-lantern.webp'),
 'dungeon:sunscar:solar-vault-key':require('../../assets/profile-icons-v1/dungeon-sunscar-solar-vault-key.webp'),
 'dungeon:frostmarch:resonant-bell':require('../../assets/profile-icons-v1/dungeon-frostmarch-resonant-bell.webp'),
};
export function profileIconArtwork(id:string|undefined):ImageSourcePropType|undefined{
 return id?.startsWith('class:')?showcaseClassIcons[id.slice(6) as ClassId]:id?profilePortraitIcons[id]:undefined;
}

/** Approved standard-set human portraits packed row-major: 4 columns × 2 rows. */
export const profileCosmeticPortraitAtlas=require('../../assets/profile-icons-v1/standard-set-portraits-atlas.webp') as ImageSourcePropType;
export const PROFILE_COSMETIC_PORTRAIT_ATLAS_CELLS:Record<string,{column:number;row:number}>={
 'cosmetic:gloamward:portrait-seer':{column:0,row:0},
 'cosmetic:gloamward:portrait-magus':{column:1,row:0},
 'cosmetic:frostbound:portrait-oracle':{column:2,row:0},
 'cosmetic:frostbound:portrait-warden':{column:3,row:0},
 'cosmetic:amberglass:portrait-duelist':{column:0,row:1},
 'cosmetic:amberglass:portrait-vanguard':{column:1,row:1},
 'cosmetic:briarbound:portrait-ranger':{column:2,row:1},
 'cosmetic:briarbound:portrait-warden':{column:3,row:1},
};
export function profileCosmeticPortraitAtlasCell(id:string|undefined){return id?PROFILE_COSMETIC_PORTRAIT_ATLAS_CELLS[id]:undefined}
