import type {ImageSourcePropType} from 'react-native';
import type {ClassId} from '../core/types';

/** Transparent showcase masters; separate from small navigation/class glyphs. */
export const showcaseClassIcons:Record<ClassId,ImageSourcePropType>={
 IRONWARDEN:require('../../assets/profile-icons-v1/ironwarden.png'),
 BASTION:require('../../assets/profile-icons-v1/bastion.png'),
 DREADGUARD:require('../../assets/profile-icons-v1/dreadguard.png'),
 DAWNKEEPER:require('../../assets/profile-icons-v1/dawnkeeper.png'),
 WAYFINDER:require('../../assets/profile-icons-v1/wayfinder.png'),
 RAVAGER:require('../../assets/profile-icons-v1/ravager.png'),
 HEXWEAVER:require('../../assets/profile-icons-v1/hexweaver.png'),
 KNIFE_DANCER:require('../../assets/profile-icons-v1/knife_dancer.png'),
 STONECALLER:require('../../assets/profile-icons-v1/stonecaller.png'),
};

export const profilePortraitIcons:Record<string,ImageSourcePropType>={
 'starter:hooded-ranger':require('../../assets/profile-icons-v1/hooded-ranger.png'),
 'starter:armored-sentinel':require('../../assets/profile-icons-v1/armored-sentinel.png'),
 'starter:masked-spellcaster':require('../../assets/profile-icons-v1/masked-spellcaster.png'),
 'starter:traveling-alchemist':require('../../assets/profile-icons-v1/traveling-alchemist.png'),
 'starter:dawn-priestess':require('../../assets/profile-icons-v1/dawn-priestess.png'),
 'starter:stonebound-explorer':require('../../assets/profile-icons-v1/stonebound-explorer.png'),
 'companion:UNIT_001':require('../../assets/profile-icons-v1/ironwood-hound.png'),
 'companion:UNIT_002':require('../../assets/profile-icons-v1/runebound-sentry.png'),
 'companion:UNIT_008':require('../../assets/profile-icons-v1/dawnwing.png'),
 'creature:MOSS_RAT':require('../../assets/profile-icons-v1/moss-rat.png'),
 'creature:IRONWOOD_WOLF':require('../../assets/profile-icons-v1/ironwood-wolf.png'),
 'creature:FALLEN_KNIGHT':require('../../assets/profile-icons-v1/fallen-knight.png'),
 'event:pumpkin-piglet':require('../../assets/profile-icons-v1/pumpkin-piglet.png'),
 'event:harvest-guardian':require('../../assets/profile-icons-v1/harvest-guardian.png'),
 'event:spirit-lantern':require('../../assets/profile-icons-v1/spirit-lantern.png'),
};
export function profileIconArtwork(id:string|undefined):ImageSourcePropType|undefined{
 return id?.startsWith('class:')?showcaseClassIcons[id.slice(6) as ClassId]:id?profilePortraitIcons[id]:undefined;
}
