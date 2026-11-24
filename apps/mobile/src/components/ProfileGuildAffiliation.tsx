import {useState} from 'react';
import {Pressable,StyleSheet,Text} from 'react-native';
import type {ProfileGuildIdentity} from '../core/profile-guild';
import {guildTagColor} from '../core/guild-tags';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {profileT} from '../i18n/profile';
import {ProfileGuildCardModal} from './ProfileGuildCardModal';

export function ProfileGuildAffiliation({guild,compact=false}:{guild?:ProfileGuildIdentity|null;compact?:boolean}){
 const C=useGameTheme(),language=useGameLanguage(),[open,setOpen]=useState(false),[focused,setFocused]=useState(false);
 if(!guild||(!guild.name&&!guild.tag))return null;
 return <>
  <Pressable accessibilityRole="button" accessibilityLabel={profileT(language,'Open guild card: {guild}',{guild:guild.tag?'['+guild.tag+']':guild.name??''})}
   accessibilityState={{expanded:open}} hitSlop={{top:8,bottom:8,left:4,right:4}} onPress={()=>setOpen(true)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
   style={({pressed})=>[s.box,compact&&s.compactBox,{borderColor:focused?C.accent:C.lineStrong,backgroundColor:C.dark?'rgba(8,15,24,.82)':'rgba(255,255,255,.88)'},pressed&&{opacity:.75}]}>
   <Text numberOfLines={1} style={[s.label,compact&&s.compactLabel,{color:C.text}]}>{profileT(language,'Guild')}{guild.tag?': ':''}{guild.tag?<Text style={{color:guildTagColor(guild.tagColorId??undefined)}}>[{guild.tag}]</Text>:null}</Text>
  </Pressable>
  {open?<ProfileGuildCardModal key={guild.id??guild.tag??guild.name} guild={guild} onClose={()=>setOpen(false)}/>:null}
 </>;
}
const s=StyleSheet.create({box:{alignSelf:'flex-start',maxWidth:'100%',minHeight:28,justifyContent:'center',paddingHorizontal:9,paddingVertical:3,borderWidth:1,borderRadius:8},compactBox:{minHeight:16,paddingHorizontal:5,paddingVertical:0,borderRadius:4},compactLabel:{fontSize:9,lineHeight:11,includeFontPadding:false},label:{fontSize:10,lineHeight:14,fontWeight:'800'}});
