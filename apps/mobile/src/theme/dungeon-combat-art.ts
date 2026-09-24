import type {ImageSourcePropType} from 'react-native';
import type {BodyPresentation} from '../core/types';
import {startingCharacterArtwork} from './character-assets';

export function dungeonCombatPortraitSource(classId:string|undefined,body:BodyPresentation='male'):ImageSourcePropType|undefined{
 if(!classId)return undefined;
 return startingCharacterArtwork[body].front;
}
