import {Image,ImageBackground,StyleSheet,Text,View} from 'react-native';
import {CLASSES} from '../content/classes';
import {GameState} from '../core/types';
import {CharacterPortrait} from './CharacterVisual';
import {profileBackgroundPreviewById} from '../theme/profile-background-assets';
import {profileBorderSourceById} from '../theme/profile-border-assets';
import {eventPetSourceById} from '../theme/event-pet-assets';
import {C} from '../theme/theme';
import {LIVE_EVENT_CATALOG} from '../content/live-events';

export function ProfileScenePreview({state,backgroundId}:{state:GameState;backgroundId:string}){
  const character=state.character!;
  const background=profileBackgroundPreviewById.get(backgroundId);
  if(!background)return null;
  const className=CLASSES.find(item=>item.id===character.classId)?.name??character.classId;
  const eventRewards=LIVE_EVENT_CATALOG.flatMap(event=>event.milestones(character.classId).map(milestone=>milestone.reward).concat(event.shop.map(offer=>offer.reward))),pet=eventRewards.find(reward=>reward.id===character.selectedCosmeticPetId),petSource=eventPetSourceById.get(character.selectedCosmeticPetId??''),borderSource=profileBorderSourceById.get(character.profileBorderId??''),hasEventBorder=!!character.profileBorderId;
  return <View accessibilityLabel={`${character.name}'s profile preview with ${background.name}`} style={[s.frame,hasEventBorder&&s.eventFrame]}>
    <ImageBackground source={background.source} resizeMode="cover" style={s.scene} imageStyle={s.sceneImage}>
      <CharacterPortrait state={state} style={s.character}/>
      {pet?<View style={s.petBadge}>{petSource?<Image source={petSource} resizeMode="contain" style={s.petImage}/>:<Text style={s.petSymbol}>◆</Text>}<Text style={s.petName}>{pet.name}</Text></View>:null}
      <View style={s.info}>
        <Text numberOfLines={1} style={s.name}>{character.name}</Text>
        <Text numberOfLines={1} style={s.meta}>Lv. {character.level} · {className} · {character.profileTitle??'New Adventurer'}</Text>
      </View>
    </ImageBackground>
    {borderSource?<Image source={borderSource} resizeMode="stretch" style={s.borderOverlay}/>:null}
  </View>;
}

const s=StyleSheet.create({
  frame:{width:'100%',maxWidth:480,alignSelf:'center',aspectRatio:16/9,borderWidth:1,borderColor:C.accent,borderRadius:10,overflow:'hidden',backgroundColor:C.bg},eventFrame:{borderWidth:1,borderColor:'#d9953f',shadowColor:'#e7ae55',shadowOpacity:.45,shadowRadius:6,shadowOffset:{width:0,height:0}},borderOverlay:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%',zIndex:10},
  scene:{flex:1,justifyContent:'flex-end',alignItems:'center'},
  sceneImage:{borderRadius:9},
  character:{position:'absolute',bottom:24,width:128,height:'88%'},
  petBadge:{position:'absolute',right:8,bottom:32,alignItems:'center',paddingHorizontal:6,paddingVertical:4,borderWidth:1,borderColor:'#d9953f',borderRadius:8,backgroundColor:'#1c140de8'},petImage:{width:48,height:48},petSymbol:{color:'#e7ae55',fontSize:18},petName:{maxWidth:76,color:C.text,fontSize:9,fontWeight:'900',textAlign:'center'},
  info:{width:'100%',paddingHorizontal:10,paddingVertical:6,backgroundColor:'#06131fe8'},
  name:{color:C.text,fontSize:16,fontWeight:'900',textAlign:'center'},
  meta:{color:C.muted,fontSize:11,textAlign:'center'},
});
