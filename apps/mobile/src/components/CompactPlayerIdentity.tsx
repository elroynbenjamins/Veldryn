import {StyleSheet,Text,View} from 'react-native';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {IdentityArtwork} from './SocialIdentity';
import {compactCharacterSummary,socialGuildRolePresentation,type SocialGuildRole} from '../core/social-identity';
import {C,equipmentColors,radii,typography} from '../theme/theme';

export function CompactPlayerIdentity({
 name,guildTag,guildTagColorId,className,characterName,level,profileTitle,role,status,hint,avatarSize=42,
}:{
 name:string;guildTag?:string|null;guildTagColorId?:string|null;className?:string|null;characterName?:string|null;level?:number|null;
 profileTitle?:string|null;role?:SocialGuildRole;status?:string;hint?:string;avatarSize?:number;
}){
 const rolePresentation=role?socialGuildRolePresentation(role):undefined;
 const roleStyle=rolePresentation?.tone==='gold'?s.roleGold:rolePresentation?.tone==='info'?s.roleInfo:s.roleMuted;
 return <View style={s.root}>
  <IdentityArtwork name={name} className={className} size={avatarSize}/>
  <View style={s.copy}>
   <View style={s.nameRow}><GuildTaggedPlayerName name={name} guildTag={guildTag} tagColorId={guildTagColorId} style={s.name}/>{rolePresentation?<View style={[s.rolePill,roleStyle]}><Text style={[s.roleText,rolePresentation.tone==='gold'&&s.roleTextGold]}>{rolePresentation.label.toUpperCase()}</Text></View>:null}</View>
   {(characterName||className||level)?<Text numberOfLines={1} style={s.character}>{compactCharacterSummary(characterName,className,level)}</Text>:null}
   {profileTitle?<Text numberOfLines={1} style={s.title}>“{profileTitle}”</Text>:null}
   {(status||hint)?<View style={s.metaRow}>{status?<Text numberOfLines={1} style={s.status}>{status}</Text>:null}{hint?<Text numberOfLines={1} style={s.hint}>{hint}</Text>:null}</View>:null}
  </View>
 </View>;
}

const s=StyleSheet.create({
 root:{flexDirection:'row',alignItems:'center',gap:9,minWidth:0},
 copy:{flex:1,minWidth:0},
 nameRow:{flexDirection:'row',alignItems:'center',gap:6,minWidth:0},
 name:{...typography.bodyStrong,color:C.text},
 character:{...typography.caption,color:C.muted,marginTop:1,textTransform:'capitalize'},
 title:{fontSize:10,lineHeight:13,color:equipmentColors.goldSoft,fontStyle:'italic',marginTop:1},
 metaRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:2},
 status:{fontSize:9,color:C.accent,fontWeight:'800'},
 hint:{fontSize:9,color:C.info,fontWeight:'800'},
 rolePill:{paddingHorizontal:5,paddingVertical:2,borderWidth:1,borderRadius:99,backgroundColor:C.panel},
 roleGold:{borderColor:equipmentColors.goldSoft,backgroundColor:'#302713'},
 roleInfo:{borderColor:C.info,backgroundColor:'#132737'},
 roleMuted:{borderColor:C.line,backgroundColor:C.panel},
 roleText:{fontSize:6.5,color:C.muted,fontWeight:'900',letterSpacing:.35},
 roleTextGold:{color:equipmentColors.goldSoft},
});
