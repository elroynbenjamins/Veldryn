import {useIdentityIcon} from '../online/PlayerBadgeProvider';
import {profileIconSource} from './ProfileIcon';
import {profileIconArtwork} from '../theme/profile-icon-assets';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {visualText} from '../i18n/visuals';
import {useMemo} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import type {ImageSourcePropType} from 'react-native';
import {resolveIdentityClass} from '../core/social-identity';
import type {PartyRole} from '../core/party-social';
import {classIconArtwork} from '../theme/character-assets';
import {smallSkillIcons} from '../theme/skill-assets';
import {uiIcons} from '../theme/ui-icons';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import type {GuildBannerId,GuildFrameId} from '../core/guild-customization';
import {GuildBannerArtwork} from './GuildHeraldry';

/** Use the selected public icon, then a class emblem or neutral account marker. */
export function IdentityArtwork({name,accountId,profileIconId,className,portrait,size=44,guild=false}:{name:string;accountId?:string;profileIconId?:string|null;className?:string|null;portrait?:ImageSourcePropType;size?:number;guild?:boolean}){
 const language=useGameLanguage(),tr=(source:string,params?:Record<string,string|number>)=>visualText(language,source,params);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const identity=useIdentityIcon(guild||profileIconId!==undefined?undefined:accountId),classId=resolveIdentityClass(identity?.class_id??className);
 const selectedIcon=profileIconArtwork((profileIconId!==undefined?profileIconId:identity?.profile_icon_id)??undefined);
 const source=portrait??(guild?uiIcons.guild:selectedIcon??(classId?profileIconSource(undefined,classId):uiIcons.account));
 return <View accessibilityLabel={tr('{name} identity icon',{name})} style={[s.avatar,{width:size,height:size,borderRadius:Math.max(radii.sm,Math.round(size*.24))}]}><Image accessible={false} source={source} resizeMode="contain" style={{width:size-6,height:size-6}}/></View>;
}
export function RoleBadge({role}:{role:PartyRole}){
 const language=useGameLanguage(),tr=(source:string,params?:Record<string,string|number>)=>visualText(language,source,params);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={s.badge}><Image accessible={false} source={role==='tank'?classIconArtwork.IRONWARDEN:role==='support'?classIconArtwork.DAWNKEEPER:smallSkillIcons.combat} resizeMode="contain" style={s.roleIcon}/><Text style={s.role}>{tr(role)}</Text></View>;
}
/** Compact surfaces show the full, unframed banner. Profile frames belong on the profile card. */
export function GuildCrest({size=48,bannerId}:{size?:number;bannerId?:GuildBannerId|string;frameId?:GuildFrameId|string}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={[s.guildCrest,{width:size,height:size}]}><GuildBannerArtwork height={size} bannerId={bannerId}/></View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 avatar:{borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
 badge:{minHeight:24,flexDirection:'row',alignItems:'center',alignSelf:'flex-start',gap:4,paddingRight:7,paddingLeft:3,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
 roleIcon:{width:20,height:20},
 role:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'800'},
 guildCrest:{alignItems:'center',justifyContent:'center',flexShrink:0},
});}
