import {Image,StyleSheet,Text,View} from 'react-native';
import type {StyleProp,ViewStyle} from 'react-native';
import type {BodyPresentation,ClassId,GameState} from '../core/types';
import {approvedCharacterSkinArtwork,startingCharacterArtwork} from '../theme/character-assets';
import {characterSkinSetsFor} from '../content/character-skin-sets';
import {C,spacing,typography} from '../theme/theme';

export function FixedCharacterPortrait({classId,body='male',view='front',compact=false,style}:{classId:ClassId;body?:BodyPresentation;view?:'front'|'back';compact?:boolean;style?:StyleProp<ViewStyle>}){
  return <View accessibilityLabel={`${body} ${classId.replace('_',' ')} starting character, ${view} view`} style={[compact?s.compact:s.portrait,style]}>
    <Image source={startingCharacterArtwork[body][view]} resizeMode="contain" style={s.layer}/>
  </View>;
}

function selectedSkin(state:GameState){
  const character=state.character;
  const set=character&&characterSkinSetsFor(character.classId).find(candidate=>`equipment-set:${candidate.id}`===character.selectedSkinId);
  return {name:set?.name??'Starting skin'};
}

export function CharacterPortraitSelection({classId,body='male',skinId='starting',view='front',compact=false,style}:{classId:ClassId;body?:BodyPresentation;skinId?:string;view?:'front'|'back';compact?:boolean;style?:StyleProp<ViewStyle>}){
  const artwork=classId==='IRONWARDEN'?approvedCharacterSkinArtwork[skinId]?.[body]:undefined;
  if(!artwork)return <FixedCharacterPortrait classId={classId} body={body} view={view} compact={compact} style={style}/>;
  return <View accessibilityLabel={`${body} ${classId.replace('_',' ')} ${skinId} skin, ${view} view`} style={[compact?s.compact:s.portrait,style]}>
    <Image source={view==='back'?artwork.back??artwork.front:artwork.front} resizeMode="contain" style={s.layer}/>
  </View>;
}

export function CharacterPortrait({state,view='front',compact=false,style}:{state:GameState;view?:'front'|'back';compact?:boolean;style?:StyleProp<ViewStyle>}){
  const character=state.character!;
  return <CharacterPortraitSelection classId={character.classId} body={character.bodyPresentation??'male'} skinId={character.selectedSkinId??'starting'} view={view} compact={compact} style={style}/>;
}

export function EquipmentCharacterPortrait({state,style}:{state:GameState;style?:StyleProp<ViewStyle>}){
  const character=state.character!;
  return <CharacterPortraitSelection classId={character.classId} body={character.bodyPresentation??'male'} skinId={character.selectedSkinId??'starting'} style={[s.equipmentPortrait,style]}/>;
}

export function CharacterVisual({state,compact=false}:{state:GameState;compact?:boolean}){
  const character=state.character!,skin=selectedSkin(state);
  return <View style={s.frame}>
    <Text style={s.label}>{character.classId.replace('_',' ')} · {skin.name}</Text>
    <CharacterPortrait state={state} compact={compact}/>
    <Text style={s.note}>Skin choice is cosmetic. Equipping or removing individual items never changes this appearance.</Text>
  </View>;
}

const s=StyleSheet.create({frame:{backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:12,padding:spacing.md,gap:spacing.sm,alignItems:'center'},label:{...typography.bodyStrong,color:C.accent,textAlign:'center'},portrait:{width:240,height:300,maxWidth:'100%'},equipmentPortrait:{width:'100%',maxWidth:330,aspectRatio:128/160},compact:{width:96,height:120},layer:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},note:{...typography.caption,color:C.muted,textAlign:'center'}});
