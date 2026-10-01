import {useEffect,useState} from 'react';
import {ActivityIndicator,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import type {ProfileGuildIdentity,ProfileGuildCard} from '../core/profile-guild';
import {loadProfileGuildCard} from '../online/profile-guild-card';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {profileT} from '../i18n/profile';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {GameButton} from './GameButton';
import {GuildIdentitySummary} from './GuildIdentitySummary';

/** Mounted only while open; closing/identity changes discard late responses. */
export function ProfileGuildCardModal({guild,onClose}:{guild:ProfileGuildIdentity;onClose:()=>void}){
 const C=useGameTheme(),language=useGameLanguage();
 const {height}=useWindowDimensions();
 const [result,setResult]=useState<{card?:ProfileGuildCard;error?:boolean}>({}),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let cancelled=false;setResult({});
  void loadProfileGuildCard(guild).then(card=>{if(!cancelled)setResult({card})},()=>{if(!cancelled)setResult({error:true})});
  return()=>{cancelled=true};
 },[guild,attempt]);
 const card=result.card;
 return <GameModalSurface visible onClose={onClose} presentation="dialog" surfaceStyle={{maxHeight:Math.max(160,height-100)}}>
  <GameModalHeader title={profileT(language,'Guild card')} onClose={onClose}/>
  <ScrollView style={{flexGrow:0}} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingVertical:12}}>
   {card?<GuildIdentitySummary name={card.name} tag={card.tag} tagColorId={card.tagColorId} nameColorId={card.nameColorId??undefined} level={card.level} bannerId={card.bannerId??undefined} frameId={card.frameId} backgroundId={card.backgroundId} motto={card.motto} memberCap={card.memberCap}/>
    :result.error?<View style={{gap:12}}><Text accessibilityRole="alert" style={{color:C.muted}}>{profileT(language,'Unable to load this guild card.')}</Text><GameButton title={profileT(language,'Retry')} onPress={()=>setAttempt(value=>value+1)}/></View>
    :<ActivityIndicator accessibilityLabel={profileT(language,'Loading guild card')} color={C.accent}/>}
  </ScrollView>
 </GameModalSurface>;
}
