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
 'starter:hooded-ranger':require('../../assets/profile-icons-v1/hooded-ranger.webp'),
 'starter:armored-sentinel':require('../../assets/profile-icons-v1/armored-sentinel.webp'),
 'starter:masked-spellcaster':require('../../assets/profile-icons-v1/masked-spellcaster.webp'),
 'starter:traveling-alchemist':require('../../assets/profile-icons-v1/traveling-alchemist.webp'),
 'starter:dawn-priestess':require('../../assets/profile-icons-v1/dawn-priestess.webp'),
 'starter:stonebound-explorer':require('../../assets/profile-icons-v1/stonebound-explorer.webp'),
 'companion:UNIT_001':require('../../assets/profile-icons-v1/ironwood-hound.webp'),
 'companion:UNIT_002':require('../../assets/profile-icons-v1/runebound-sentry.webp'),
 'companion:UNIT_008':require('../../assets/profile-icons-v1/dawnwing.webp'),
 'creature:MOSS_RAT':require('../../assets/profile-icons-v1/moss-rat.webp'),
 'creature:IRONWOOD_WOLF':require('../../assets/profile-icons-v1/ironwood-wolf.webp'),
 'creature:FALLEN_KNIGHT':require('../../assets/profile-icons-v1/fallen-knight.webp'),
 'event:pumpkin-piglet':require('../../assets/profile-icons-v1/pumpkin-piglet.webp'),
 'event:harvest-guardian':require('../../assets/profile-icons-v1/harvest-guardian.webp'),
 'event:spirit-lantern':require('../../assets/profile-icons-v1/spirit-lantern.webp'),
};
export function profileIconArtwork(id:string|undefined):ImageSourcePropType|undefined{
 return id?.startsWith('class:')?showcaseClassIcons[id.slice(6) as ClassId]:id?profilePortraitIcons[id]:undefined;
}
