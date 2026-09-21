import type {ImageSourcePropType} from 'react-native';
import type {BodyPresentation,ClassId} from '../core/types';
import {acceptedFrontCharacterSkinArtwork} from './accepted-front-character-assets';

export const DUNGEON_COMBAT_CLASS_SKIN:Readonly<Record<ClassId,string>>=Object.freeze({
 IRONWARDEN:'accepted-front-aster-iron',
 BASTION:'accepted-front-lastwall-panoply',
 DREADGUARD:'accepted-front-mournchain-harness',
 WAYFINDER:'accepted-front-regretwalker',
 RAVAGER:'accepted-front-lanternsteel-array',
 HEXWEAVER:'accepted-front-runespark-adept',
 KNIFE_DANCER:'accepted-front-gloamstep-regalia',
 DAWNKEEPER:'accepted-front-thread-of-dawn',
 STONECALLER:'accepted-front-resonant-tempest',
});

export function dungeonCombatPortraitSource(classId:string|undefined,body:BodyPresentation='male'):ImageSourcePropType|undefined{
 if(!classId||!(classId.toUpperCase() in DUNGEON_COMBAT_CLASS_SKIN))return undefined;
 const id=classId.toUpperCase() as ClassId,skinId=DUNGEON_COMBAT_CLASS_SKIN[id];
 return acceptedFrontCharacterSkinArtwork[skinId]?.[body]?.front??acceptedFrontCharacterSkinArtwork[skinId]?.male.front;
}
