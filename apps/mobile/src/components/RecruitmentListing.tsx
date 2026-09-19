import {Pressable,StyleSheet,Text,View} from 'react-native';
import {recruitmentTimeLabel,type RecruitmentCardView} from '../core/party-social';
import {IdentityArtwork,RoleBadge} from './SocialIdentity';
import {UiIcon} from './UiIcon';
import {C,radii,typography} from '../theme/theme';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
export function RecruitmentListing({card,nowMs,onPress}:{card:RecruitmentCardView;nowMs:number;onPress?:()=>void}){
 const time=recruitmentTimeLabel(card.expiresAtMs,nowMs),guild=card.postType==='guild_recruiting';
 return <Pressable accessibilityRole="button" accessibilityLabel={`${card.title}, posted by ${card.ownerName}, ${time.text}`} onPress={onPress} style={({pressed})=>[s.card,pressed&&s.pressed]}>
  <View style={s.head}><IdentityArtwork name={card.ownerName} guild={guild}/><View style={s.copy}><Text style={s.title}>{card.title}</Text>{card.guildName?<Text style={s.owner}>{card.guildName}</Text>:<GuildTaggedPlayerName name={card.ownerName} guildTag={card.guildTag} tagColorId={card.guildTagColorId} style={s.owner}/>}</View><UiIcon name="next" size={24}/></View>
  <View style={s.meta}><Text style={s.focus}>{card.focus}{card.openSpots!==undefined?` · ${card.openSpots} open spots`:''}</Text><Text style={[s.time,time.urgency==='soon'&&s.soon]}>{time.text}</Text></View>
  {!!card.currentObjective&&<Text style={s.objective}>Current: {card.currentObjective}</Text>}
  <Text numberOfLines={2} style={s.body}>{card.body}</Text>
  <View style={s.tags}>{[...new Set(card.roles)].map(role=><RoleBadge key={role} role={role}/>)}{[...new Set([...card.activityTags,...card.playstyleTags,...card.guildInterestTags])].slice(0,3).map(tag=><Text key={tag} style={s.tag}>{tag}</Text>)}</View>
 </Pressable>;
}
const s=StyleSheet.create({card:{borderWidth:1,borderColor:C.line,backgroundColor:'#111f2d',borderRadius:radii.md,padding:12,gap:8},pressed:{opacity:.76},head:{flexDirection:'row',gap:10,alignItems:'center'},copy:{flex:1,minWidth:0,gap:3},title:{...typography.bodyStrong,fontSize:16,lineHeight:23,color:C.text},owner:{...typography.caption,color:C.muted},meta:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:8},focus:{...typography.caption,color:C.info,textTransform:'capitalize'},time:{...typography.caption,color:C.muted},soon:{color:C.warning},objective:{...typography.caption,color:C.info},body:{...typography.body,color:C.text},tags:{flexDirection:'row',flexWrap:'wrap',gap:6,alignItems:'center'},tag:{...typography.caption,color:C.muted,paddingVertical:4,paddingHorizontal:8,backgroundColor:C.panel2,borderRadius:8}});
