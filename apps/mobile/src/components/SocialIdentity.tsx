import {Image,StyleSheet,Text,View} from 'react-native';
import type {ImageSourcePropType} from 'react-native';
import {resolveIdentityClass} from '../core/social-identity';
import type {PartyRole} from '../core/party-social';
import {classIconArtwork} from '../theme/character-assets';
import {smallSkillIcons} from '../theme/skill-assets';
import {uiIcons} from '../theme/ui-icons';
import {C,radii,typography} from '../theme/theme';
/** A real portrait can be supplied. Without one, show a class emblem or neutral account marker. */
export function IdentityArtwork({name,className,portrait,size=44,guild=false}:{name:string;className?:string|null;portrait?:ImageSourcePropType;size?:number;guild?:boolean}){
 const classId=resolveIdentityClass(className),source=portrait??(guild?uiIcons.guild:classId?classIconArtwork[classId]:uiIcons.account);
 return <View style={[s.avatar,{width:size,height:size}]}><Image accessible={false} source={source} resizeMode="contain" style={{width:size-6,height:size-6}}/></View>;
}
export function RoleBadge({role}:{role:PartyRole}){
 return <View style={s.badge}><Image accessible={false} source={role==='tank'?classIconArtwork.IRONWARDEN:role==='support'?classIconArtwork.DAWNKEEPER:smallSkillIcons.combat} resizeMode="contain" style={s.roleIcon}/><Text style={s.role}>{role.charAt(0).toUpperCase()+role.slice(1)}</Text></View>;
}
export function GuildCrest({size=48}:{size?:number}){return <IdentityArtwork name="Guild" guild size={size}/>;}
const s=StyleSheet.create({avatar:{borderRadius:radii.md,backgroundColor:'#101b29',alignItems:'center',justifyContent:'center'},badge:{minHeight:28,flexDirection:'row',alignItems:'center',gap:5,paddingRight:8},roleIcon:{width:24,height:24},role:{...typography.caption,color:C.muted}});
