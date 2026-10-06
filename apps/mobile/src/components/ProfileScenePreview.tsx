import {profileT} from '../i18n/profile';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useMemo} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {CLASSES} from '../content/classes';
import type {GameState} from '../core/types';
import {CharacterPortrait} from './CharacterVisual';
import {profileBackgroundPreviewById} from '../theme/profile-background-assets';
import {profileBorderSourceById} from '../theme/profile-border-assets';
import {petArtSource} from '../theme/pet-art';
import {BASE_PROFILE_BACKGROUNDS} from '../core/profile-cosmetics';
import {RegionArtwork} from './RegionArtwork';
import {type ThemeColors} from '../theme/theme';
import {profileShowcaseStyles} from '../theme/profile-showcase-styles';
import {useGameTheme} from '../theme/ThemeContext';
import {LIVE_EVENT_CATALOG} from '../content/live-events';
import {COLLECTIBLES} from '../content/collectibles';
import {effectivePlayerNameStyle} from '../core/player-name-style';
import {PlayerStyledName} from './PlayerStyledName';
import {ProfileFrameOverlay} from './ProfileFrameOverlay';
import {CardBackground} from './CardBackground';
import {personalBackgroundVariants} from '../theme/card-background-assets';
import {PlayerBadges} from './PlayerBadges';
import {usePlayerBadges} from '../online/PlayerBadgeProvider';

export function ProfileScenePreview({state,backgroundId}:{state:GameState;backgroundId:string}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),badges=usePlayerBadges();
 const character=state.character!,background=profileBackgroundPreviewById.get(backgroundId),base=BASE_PROFILE_BACKGROUNDS.find(item=>item.id===backgroundId);
 if(!background&&!base)return null;
 const className=CLASSES.find(item=>item.id===character.classId)?.name??character.classId;
 const rewards=LIVE_EVENT_CATALOG.flatMap(event=>[...event.milestones(character.classId).map(m=>m.reward),...event.shop.map(o=>o.reward)]);
 const pet=rewards.find(reward=>reward.id===character.selectedCosmeticPetId),petCollectible=COLLECTIBLES.find(row=>row.id===character.selectedCosmeticPetId&&row.kind==='pet'),petSource=petArtSource(character.selectedCosmeticPetId??''),borderSource=profileBorderSourceById.get(character.profileBorderId??'');
 return <View accessibilityLabel={profileT(language,"{name}'s profile preview with {background}",{name:character.name,background:background?.name??base?.name??''})} style={s.frame}>
  <View style={[s.surface,!!borderSource&&s.framedSurface]}>
  <View style={s.scene}>
   {background?<CardBackground sources={personalBackgroundVariants.get(backgroundId)??{wide:background.source,square:background.source}}/>:<RegionArtwork regionId={base!.region}/>}
   <View style={{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(3,4,5,.72)':'rgba(255,255,255,.68)'}}/><View style={s.identityPlate}>
    <Text style={s.eyebrow}>{profileT(language,"PLAYER SHOWCASE")}</Text>
    <View style={s.nameRow}><PlayerStyledName name={character.name} nameStyle={effectivePlayerNameStyle(state)} reduceMotion={state.settings.reduceMotion} numberOfLines={1} style={s.name}/><PlayerBadges identity={badges.identity}/></View>
    <Text numberOfLines={1} style={s.title}>{character.profileTitle??profileT(language,"New Adventurer")}</Text>
    <Text style={s.meta}>{profileT(language,'Lv. {level}',{level:character.level})} · {className}</Text>
   </View>
   <CharacterPortrait state={state} style={s.character}/>
   {petSource&&<View style={s.petBadge}><Image source={petSource} accessibilityLabel={pet?.name??petCollectible?.name??profileT(language,"Pet preview")} resizeMode="contain" style={s.petImage}/></View>}
  </View>
  </View>
  {borderSource?<ProfileFrameOverlay source={borderSource}/>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 ...profileShowcaseStyles(C),
 frame:{width:'100%',maxWidth:480,alignSelf:'center',position:'relative'},
 surface:{borderRadius:14,overflow:'hidden',backgroundColor:C.panel},
 framedSurface:{margin:8,borderRadius:4},
 scene:{width:'100%',minHeight:190,alignItems:'center',overflow:'hidden',backgroundColor:C.stage},
 character:{position:'absolute',left:20,top:24,width:96,height:96,zIndex:2},
 petBadge:{position:'absolute',right:22,bottom:20,zIndex:3},petImage:{width:56,height:56},
 nameRow:{flexDirection:'row',alignItems:'center',gap:5},
});}
