import {ImageSourcePropType} from 'react-native';
import {BodyPresentation,ClassId} from '../core/types';
export const firstCraftedAppearance:Record<ClassId,Record<BodyPresentation,Record<'front'|'back',ImageSourcePropType>>>={
IRONWARDEN:{male:{front:require('../../assets/first-crafted/ironwarden/male/front.png'),back:require('../../assets/first-crafted/ironwarden/male/back.png')},female:{front:require('../../assets/first-crafted/ironwarden/female/front.png'),back:require('../../assets/first-crafted/ironwarden/female/back.png')}},
BASTION:{male:{front:require('../../assets/first-crafted/bastion/male/front.png'),back:require('../../assets/first-crafted/bastion/male/back.png')},female:{front:require('../../assets/first-crafted/bastion/female/front.png'),back:require('../../assets/first-crafted/bastion/female/back.png')}},
DREADGUARD:{male:{front:require('../../assets/first-crafted/dreadguard/male/front.png'),back:require('../../assets/first-crafted/dreadguard/male/back.png')},female:{front:require('../../assets/first-crafted/dreadguard/female/front.png'),back:require('../../assets/first-crafted/dreadguard/female/back.png')}},
DAWNKEEPER:{male:{front:require('../../assets/first-crafted/dawnkeeper/male/front.png'),back:require('../../assets/first-crafted/dawnkeeper/male/back.png')},female:{front:require('../../assets/first-crafted/dawnkeeper/female/front.png'),back:require('../../assets/first-crafted/dawnkeeper/female/back.png')}},
WAYFINDER:{male:{front:require('../../assets/first-crafted/wayfinder/male/front.png'),back:require('../../assets/first-crafted/wayfinder/male/back.png')},female:{front:require('../../assets/first-crafted/wayfinder/female/front.png'),back:require('../../assets/first-crafted/wayfinder/female/back.png')}},
RAVAGER:{male:{front:require('../../assets/first-crafted/ravager/male/front.png'),back:require('../../assets/first-crafted/ravager/male/back.png')},female:{front:require('../../assets/first-crafted/ravager/female/front.png'),back:require('../../assets/first-crafted/ravager/female/back.png')}},
HEXWEAVER:{male:{front:require('../../assets/first-crafted/hexweaver/male/front.png'),back:require('../../assets/first-crafted/hexweaver/male/back.png')},female:{front:require('../../assets/first-crafted/hexweaver/female/front.png'),back:require('../../assets/first-crafted/hexweaver/female/back.png')}},
KNIFE_DANCER:{male:{front:require('../../assets/first-crafted/knife_dancer/male/front.png'),back:require('../../assets/first-crafted/knife_dancer/male/back.png')},female:{front:require('../../assets/first-crafted/knife_dancer/female/front.png'),back:require('../../assets/first-crafted/knife_dancer/female/back.png')}},
STONECALLER:{male:{front:require('../../assets/first-crafted/stonecaller/male/front.png'),back:require('../../assets/first-crafted/stonecaller/male/back.png')},female:{front:require('../../assets/first-crafted/stonecaller/female/front.png'),back:require('../../assets/first-crafted/stonecaller/female/back.png')}},
};
export const classEmblems:Record<ClassId,ImageSourcePropType>={
IRONWARDEN:require('../../assets/classes/ironwarden.png'),
BASTION:require('../../assets/classes/bastion.png'),
DREADGUARD:require('../../assets/classes/dreadguard.png'),
DAWNKEEPER:require('../../assets/classes/dawnkeeper.png'),
WAYFINDER:require('../../assets/classes/wayfinder.png'),
RAVAGER:require('../../assets/classes/ravager.png'),
HEXWEAVER:require('../../assets/classes/hexweaver.png'),
KNIFE_DANCER:require('../../assets/classes/knife_dancer.png'),
STONECALLER:require('../../assets/classes/stonecaller.png'),
};

