import {Image,StyleSheet,Text,View} from 'react-native';
import type {StyleProp,ViewStyle} from 'react-native';
import type {BodyPresentation,ClassId,GameState} from '../core/types';
import {CHARACTER_SKIN_SETS} from '../content/character-skin-sets';
import {equipmentSetSkinId} from '../core/character-skins';
import {approvedCharacterSkinArtwork,startingCharacterArtwork} from '../theme/character-assets';
import {C,spacing,typography} from '../theme/theme';

const equipmentShowcaseSkin:Record<ClassId,string>={
  IRONWARDEN:'accepted-front-aster-iron',BASTION:'accepted-front-lastwall-panoply',DREADGUARD:'accepted-front-mournchain-harness',
  DAWNKEEPER:'accepted-front-thread-of-dawn',WAYFINDER:'accepted-front-regretwalker',RAVAGER:'accepted-front-lanternsteel-array',
  HEXWEAVER:'accepted-front-runespark-adept',KNIFE_DANCER:'accepted-front-gloamstep-regalia',STONECALLER:'accepted-front-resonant-tempest',
};

export function FixedCharacterPortrait({classId,body='male',view='front',compact=false,style}:{classId:ClassId;body?:BodyPresentation;view?:'front'|'back';compact?:boolean;style?:StyleProp<ViewStyle>}){
  return <View accessibilityLabel={`${body} ${classId.replace('_',' ')} starting character, ${view} view`} style={[compact?s.compact:s.portrait,style]}>
    <Image source={startingCharacterArtwork[body][view]} resizeMode="contain" style={s.layer}/>
  </View>;
}

function skinSelection(selectedId:string){
  const set=CHARACTER_SKIN_SETS.find(candidate=>equipmentSetSkinId(candidate.id)===selectedId);
  const artwork=set?.appearanceId?approvedCharacterSkinArtwork[set.appearanceId]:undefined;
  return {name:artwork&&set?set.name:'Starting skin',artwork};
}
function selectedSkin(state:GameState){return skinSelection(state.character?.selectedSkinId??'starting');}

export function CharacterPortraitSelection({classId,body='male',skinId='starting',view='front',compact=false,style}:{classId:ClassId;body?:BodyPresentation;skinId?:string;view?:'front'|'back';compact?:boolean;style?:StyleProp<ViewStyle>}){
  const skin=skinSelection(skinId);
  if(!skin.artwork)return <FixedCharacterPortrait classId={classId} body={body} view={view} compact={compact} style={style}/>;
  const source=skin.artwork[body][view]??skin.artwork[body].front;
  return <View accessibilityLabel={`${body} ${classId.replace('_',' ')} character wearing ${skin.name}, ${view} view`} style={[compact?s.compact:s.portrait,style]}><Image source={source} resizeMode="contain" style={s.layer}/></View>;
}

export function CharacterPortrait({state,view='front',compact=false,style}:{state:GameState;view?:'front'|'back';compact?:boolean;style?:StyleProp<ViewStyle>}){
  const character=state.character!;
  return <CharacterPortraitSelection classId={character.classId} body={character.bodyPresentation??'male'} skinId={character.selectedSkinId??'starting'} view={view} compact={compact} style={style}/>;
}

/** Equipment uses a complete class figure. A starting cosmetic falls back to approved class showcase art. */
export function EquipmentCharacterPortrait({state,style}:{state:GameState;style?:StyleProp<ViewStyle>}){
  const character=state.character!,body=character.bodyPresentation??'male',skin=selectedSkin(state);
  const artwork=skin.artwork??approvedCharacterSkinArtwork[equipmentShowcaseSkin[character.classId]];
  const source=artwork?.[body]?.front;
  if(!source)return <FixedCharacterPortrait classId={character.classId} body={body} style={style}/>;
  const label=skin.artwork?`${body} ${character.classId.replace('_',' ')} character wearing ${skin.name}`:`${body} ${character.classId.replace('_',' ')} approved class equipment preview`;
  return <View accessibilityLabel={label} style={[s.equipmentPortrait,style]}><Image source={source} resizeMode="contain" fadeDuration={0} style={s.layer}/></View>;
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
