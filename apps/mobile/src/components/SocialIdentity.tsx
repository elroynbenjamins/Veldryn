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
import {GUILD_BANNERS,GUILD_FRAMES,normalizeGuildBannerId,normalizeGuildFrameId,type GuildBannerId,type GuildFrameId} from '../core/guild-customization';
import {guildBannerSourceByKey,guildBorderSourceByKey} from '../theme/guild-customization-assets';

/** A real portrait can be supplied. Without one, show a class emblem or neutral account marker. */
export function IdentityArtwork({name,className,portrait,size=44,guild=false}:{name:string;className?:string|null;portrait?:ImageSourcePropType;size?:number;guild?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const classId=resolveIdentityClass(className),source=portrait??(guild?uiIcons.guild:classId?classIconArtwork[classId]:uiIcons.account);
 return <View accessibilityLabel={name+' identity icon'} style={[s.avatar,{width:size,height:size,borderRadius:Math.max(radii.sm,Math.round(size*.24))}]}><Image accessible={false} source={source} resizeMode="contain" style={{width:size-6,height:size-6}}/></View>;
}
export function RoleBadge({role}:{role:PartyRole}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={s.badge}><Image accessible={false} source={role==='tank'?classIconArtwork.IRONWARDEN:role==='support'?classIconArtwork.DAWNKEEPER:smallSkillIcons.combat} resizeMode="contain" style={s.roleIcon}/><Text style={s.role}>{role.charAt(0).toUpperCase()+role.slice(1)}</Text></View>;
}
export function GuildCrest({size=48,bannerId,frameId}:{size?:number;bannerId?:GuildBannerId|string;frameId?:GuildFrameId|string}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const banner=GUILD_BANNERS.find(entry=>entry.id===normalizeGuildBannerId(bannerId))??GUILD_BANNERS[0],frame=GUILD_FRAMES.find(entry=>entry.id===normalizeGuildFrameId(frameId))??GUILD_FRAMES[0],source=guildBannerSourceByKey.get(banner.assetKey),frameSource=guildBorderSourceByKey.get(frame.assetKey);
 return <View accessibilityLabel={`${banner.name} guild crest with ${frame.name} frame`} style={[s.guildCrest,{width:size,height:size,borderColor:frame.accent,backgroundColor:banner.primary}]}>{source?<Image accessible={false} source={source} resizeMode="cover" style={StyleSheet.absoluteFill}/>:<Text style={[s.guildEmblem,{fontSize:Math.max(18,Math.round(size*.48)),color:banner.secondary}]}>{banner.emblem}</Text>}{frameSource?<Image accessible={false} source={frameSource} resizeMode="stretch" style={StyleSheet.absoluteFill}/>:null}</View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 avatar:{borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
 badge:{minHeight:24,flexDirection:'row',alignItems:'center',alignSelf:'flex-start',gap:4,paddingRight:7,paddingLeft:3,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
 roleIcon:{width:20,height:20},
 role:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'800'},
 guildCrest:{borderWidth:2,borderRadius:radii.md,alignItems:'center',justifyContent:'center'},
 guildEmblem:{fontWeight:'900'},
});}
