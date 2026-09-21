import {useMemo} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {CLASSES} from '../content/classes';
import type {GameState} from '../core/types';
import {CharacterPortrait} from './CharacterVisual';
import {profileBackgroundPreviewById} from '../theme/profile-background-assets';
import {profileBorderSourceById} from '../theme/profile-border-assets';
import {eventPetSourceById} from '../theme/event-collectible-assets';
import {petArtSource} from '../theme/pet-art';
import {BASE_PROFILE_BACKGROUNDS} from '../core/profile-cosmetics';
import {RegionArtwork} from './RegionArtwork';
import {typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {LIVE_EVENT_CATALOG} from '../content/live-events';
import {COLLECTIBLES} from '../content/collectibles';

export function ProfileScenePreview({state,backgroundId}:{state:GameState;backgroundId:string}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const character=state.character!,background=profileBackgroundPreviewById.get(backgroundId),base=BASE_PROFILE_BACKGROUNDS.find(item=>item.id===backgroundId);
 if(!background&&!base)return null;
 const className=CLASSES.find(item=>item.id===character.classId)?.name??character.classId;
 const rewards=LIVE_EVENT_CATALOG.flatMap(event=>[...event.milestones(character.classId).map(m=>m.reward),...event.shop.map(o=>o.reward)]);
 const pet=rewards.find(reward=>reward.id===character.selectedCosmeticPetId),petCollectible=COLLECTIBLES.find(row=>row.id===character.selectedCosmeticPetId&&row.kind==='pet'),petSource=petArtSource(character.selectedCosmeticPetId??'')??eventPetSourceById.get(character.selectedCosmeticPetId??''),borderSource=profileBorderSourceById.get(character.profileBorderId??'');
 return <View accessibilityLabel={`${character.name}'s profile preview with ${background?.name??base?.name}`} style={s.frame}>
  <View style={s.scene}>
   {background?<Image source={background.source} resizeMode="cover" style={StyleSheet.absoluteFill}/>:<RegionArtwork regionId={base!.region}/>}
   <CharacterPortrait state={state} style={s.character}/>
   {petSource&&<View style={s.petBadge}><Image source={petSource} accessibilityLabel={pet?.name??petCollectible?.name??'Pet preview'} resizeMode="contain" style={s.petImage}/></View>}
   {borderSource&&<Image accessible={false} source={borderSource} resizeMode="contain" style={s.borderOverlay}/>}
  </View>
  <View style={s.info}><Text style={s.name}>{character.name}</Text><Text style={s.meta}>Lv. {character.level} · {className}</Text><Text style={s.title}>{character.profileTitle??'New Adventurer'}</Text>{(pet||petCollectible)&&<Text style={s.meta}>{pet?.name??petCollectible?.name}</Text>}</View>
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({frame:{width:'100%',maxWidth:480,alignSelf:'center',borderWidth:1,borderColor:C.line,borderRadius:14,overflow:'hidden',backgroundColor:C.panel},scene:{width:'100%',aspectRatio:16/9,alignItems:'center',overflow:'hidden',backgroundColor:C.stage},character:{position:'absolute',bottom:0,width:128,height:'94%'},petBadge:{position:'absolute',right:16,bottom:12},petImage:{width:56,height:56},borderOverlay:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},info:{width:'100%',padding:12,gap:3,backgroundColor:C.panelRaised},name:{...typography.title,color:C.text,textAlign:'center'},meta:{...typography.caption,color:C.muted,textAlign:'center'},title:{...typography.bodyStrong,color:C.accent,textAlign:'center'}});}
