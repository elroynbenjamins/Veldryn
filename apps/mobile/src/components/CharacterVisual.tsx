import type {StyleProp,ViewStyle} from 'react-native';
import type {BodyPresentation,ClassId,GameState} from '../core/types';
import {ProfileIcon} from './ProfileIcon';
export function FixedCharacterPortrait({classId,compact=false,style}:{classId:ClassId;body?:BodyPresentation;view?:'front'|'back';compact?:boolean;style?:StyleProp<ViewStyle>}){return <ProfileIcon classId={classId} size={compact?64:112} style={style}/>;}
export function CharacterPortraitSelection({classId,profileIconId,compact=false,style}:{classId:ClassId;body?:BodyPresentation;profileIconId?:string;view?:'front'|'back';compact?:boolean;style?:StyleProp<ViewStyle>}){return <ProfileIcon id={profileIconId} classId={classId} size={compact?64:112} style={style}/>;}
export function CharacterPortrait({state,compact=false,style}:{state:GameState;view?:'front'|'back';compact?:boolean;style?:StyleProp<ViewStyle>}){if(!state.character)return null;return <ProfileIcon id={state.character.profileIconId} classId={state.character.classId} size={compact?64:112} style={style}/>;}
export const EquipmentCharacterPortrait=CharacterPortrait;
export const CharacterVisual=CharacterPortrait;
