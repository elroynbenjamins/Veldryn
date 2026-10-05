import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {IdentityArtwork} from './SocialIdentity';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {ChatMessageText} from './ChatMessageText';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import type {PlayerNameStylePreference} from '../core/player-name-style';
import type {PlayerBadgeIdentity} from '../core/player-badges';

export function ChatMessageRow({accountId,name,body,createdAt,guildTag,tagColorId,nameStyle,badges,role,mentionName,onPress,reduceMotion=false,avatar=true}:{accountId?:string;name:string;body:string;createdAt?:string;guildTag?:string|null;tagColorId?:string|null;nameStyle?:PlayerNameStylePreference|null;badges?:PlayerBadgeIdentity;role?:'leader'|'officer'|'member'|null;mentionName?:string;onPress?:()=>void;reduceMotion?:boolean;avatar?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={s.row}>
  {avatar?<IdentityArtwork name={name} accountId={accountId} size={36}/>:null}
  <View style={s.content}>
   <View style={s.head}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${name}'s player profile`} onPress={onPress} disabled={!onPress} style={s.nameButton}>
     <GuildTaggedPlayerName numberOfLines={1} style={s.name} name={name} accountId={accountId} badges={badges} guildTag={guildTag} tagColorId={tagColorId} nameStyle={nameStyle??undefined} reduceMotion={reduceMotion}/>
     {onPress?<Text style={s.profileMark}>›</Text>:null}
    </Pressable>
    {role?<View style={[s.rolePill,role==='leader'?s.roleLeader:role==='officer'?s.roleOfficer:s.roleMember]}><Text style={[s.roleText,role==='leader'?s.roleTextLeader:role==='officer'?s.roleTextOfficer:s.roleTextMember]}>{role.toUpperCase()}</Text></View>:null}
    {createdAt?<Text style={s.time}>{new Date(createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text>:null}
   </View>
   <ChatMessageText body={body} mentionName={mentionName} style={s.message}/>
  </View>
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 row:{flexDirection:'row',alignItems:'flex-start',gap:10,paddingHorizontal:10,paddingVertical:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 content:{flex:1,minWidth:0},head:{minHeight:44,flexDirection:'row',alignItems:'center',gap:5},nameButton:{flex:1,minWidth:0,minHeight:44,alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:4,paddingRight:4},name:{...typography.bodyStrong,color:C.info},profileMark:{fontSize:16,lineHeight:18,color:C.info,fontWeight:'900'},time:{...typography.caption,color:C.muted,fontSize:10},message:{...typography.body,color:C.text,paddingRight:2},rolePill:{paddingHorizontal:5,paddingVertical:2,borderWidth:1,borderRadius:99},roleLeader:{borderColor:C.lineStrong,backgroundColor:C.warningSurface},roleOfficer:{borderColor:C.info,backgroundColor:C.infoSurface},roleMember:{borderColor:C.line,backgroundColor:C.panel2},roleText:{fontSize:6.5,fontWeight:'900',letterSpacing:.45},roleTextLeader:{color:C.accent},roleTextOfficer:{color:C.info},roleTextMember:{color:C.muted},
 });}
