import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {IdentityArtwork} from './SocialIdentity';
import {compactCharacterSummary,socialGuildRolePresentation,type SocialGuildRole} from '../core/social-identity';
import {equipmentTheme,radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export type CompactIdentityStatusTone='accent'|'good'|'warning'|'info'|'muted';

export function CompactPlayerIdentity({
 name,guildTag,guildTagColorId,className,characterName,level,profileTitle,role,status,statusTone='accent',hint,avatarSize=42,guild=false,
}:{
 name:string;guildTag?:string|null;guildTagColorId?:string|null;className?:string|null;characterName?:string|null;level?:number|null;
 profileTitle?:string|null;role?:SocialGuildRole;status?:string;statusTone?:CompactIdentityStatusTone;hint?:string;avatarSize?:number;guild?:boolean;
}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const rolePresentation=role?socialGuildRolePresentation(role):undefined;
 const roleStyle=rolePresentation?.tone==='gold'?s.roleGold:rolePresentation?.tone==='info'?s.roleInfo:s.roleMuted;
 const statusStyle=statusTone==='good'?s.statusGood:statusTone==='warning'?s.statusWarning:statusTone==='info'?s.statusInfo:statusTone==='muted'?s.statusMuted:s.statusAccent;
 return <View style={s.root}>
  <IdentityArtwork name={name} className={className} size={avatarSize} guild={guild}/>
  <View style={s.copy}>
   <View style={s.nameRow}><View style={s.nameWrap}><GuildTaggedPlayerName name={name} guildTag={guildTag} tagColorId={guildTagColorId} style={s.name}/></View>{rolePresentation?<View style={[s.rolePill,roleStyle]}><Text style={[s.roleText,rolePresentation.tone==='gold'&&s.roleTextGold,rolePresentation.tone==='info'&&s.roleTextInfo]}>{rolePresentation.label.toUpperCase()}</Text></View>:null}</View>
   {(characterName||className||level)?<Text numberOfLines={1} style={s.character}>{compactCharacterSummary(characterName??name,className,level)}</Text>:null}
   {profileTitle?<Text numberOfLines={1} style={s.title}>“{profileTitle}”</Text>:null}
   {(status||hint)?<View style={s.metaRow}>{status?<Text numberOfLines={1} style={[s.status,statusStyle]}>{status}</Text>:null}{hint?<Text numberOfLines={1} style={s.hint}>{hint}</Text>:null}</View>:null}
  </View>
 </View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 root:{flexDirection:'row',alignItems:'center',gap:8,minWidth:0},
 copy:{flex:1,minWidth:0},
 nameRow:{flexDirection:'row',alignItems:'center',gap:5,minWidth:0},
 nameWrap:{flex:1,minWidth:0},name:{...typography.bodyStrong,color:C.text},
 character:{fontSize:10,lineHeight:13,color:C.muted,marginTop:1,textTransform:'capitalize'},
 title:{fontSize:9.5,lineHeight:12,color:equipmentColors.goldSoft,fontStyle:'italic',marginTop:1},
 metaRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:2,minWidth:0},
 status:{fontSize:8.5,fontWeight:'900',letterSpacing:.35},
 statusAccent:{color:C.accent},statusGood:{color:C.good},statusWarning:{color:C.warning},statusInfo:{color:C.info},statusMuted:{color:C.muted},
 hint:{fontSize:8.5,color:C.info,fontWeight:'800'},
 rolePill:{maxWidth:96,paddingHorizontal:5,paddingVertical:2,borderWidth:1,borderRadius:99,backgroundColor:C.panel},
 roleGold:{borderColor:C.lineStrong,backgroundColor:C.warningSurface},
 roleInfo:{borderColor:C.info,backgroundColor:C.infoSurface},
 roleMuted:{borderColor:C.line,backgroundColor:C.panel2},
 roleText:{fontSize:6.5,color:C.muted,fontWeight:'900',letterSpacing:.35},
 roleTextGold:{color:equipmentColors.goldSoft},roleTextInfo:{color:C.info},
});}
