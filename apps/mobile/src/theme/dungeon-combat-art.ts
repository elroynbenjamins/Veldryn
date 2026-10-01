import type {ImageSourcePropType} from 'react-native';
import type {BodyPresentation,ClassId} from '../core/types';
import {classIconArtwork} from './character-assets';
export function dungeonCombatPortraitSource(classId:string|undefined,_body:BodyPresentation='male'):ImageSourcePropType|undefined{return classIconArtwork[classId as ClassId];}
