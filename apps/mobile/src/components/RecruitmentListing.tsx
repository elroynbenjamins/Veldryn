import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {recruitmentContextLabels,recruitmentPostTypePresentation,recruitmentTimeLabel,type RecruitmentCardView} from '../core/party-social';
import {CompactPlayerIdentity,type CompactIdentityStatusTone} from './CompactPlayerIdentity';
import {RoleBadge} from './SocialIdentity';
import {UiIcon} from './UiIcon';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function RecruitmentListing({card,nowMs,onPress}:{card:RecruitmentCardView;nowMs:number;onPress?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const time=recruitmentTimeLabel(card.expiresAtMs,nowMs),presentation=recruitmentPostTypePresentation(card.postType),guild=presentation.subject==='GUILD';
 const identityName=guild?(card.guildName??card.ownerName):card.ownerName;
 const statusTone:CompactIdentityStatusTone=presentation.tone==='good'?'good':presentation.tone==='info'?'info':'accent';
 const context=recruitmentContextLabels(card);
 const tags=[...new Set([...card.activityTags,...card.playstyleTags,...card.availabilityTags,...card.guildInterestTags])].slice(0,4);
 return <Pressable accessibilityRole="button" accessibilityLabel={`${card.title}, ${presentation.label}, posted by ${identityName}, ${time.text}`} onPress={onPress} style={({pressed})=>[s.card,pressed&&s.pressed]}>
  <CompactPlayerIdentity name={identityName} guildTag={card.guildTag} guildTagColorId={card.guildTagColorId} guild={guild} avatarSize={40} status={presentation.shortLabel} statusTone={statusTone} hint="OPEN DETAILS ›"/>
  <View style={s.headline}><Text numberOfLines={2} style={s.title}>{card.title}</Text><Text style={[s.time,time.urgency==='soon'&&s.soon]}>{time.text}</Text></View>
  <View style={s.meta}><View style={s.focusPill}><Text style={s.focus}>{card.focus.toUpperCase()}</Text></View>{card.openSpots!==undefined?<View style={[s.contextPill,card.openSpots>0?s.open:s.full]}><Text style={[s.contextText,card.openSpots>0?s.openText:s.fullText]}>{card.openSpots} OPEN</Text></View>:null}{context.slice(0,3).map(item=><View key={item} style={s.contextPill}><Text numberOfLines={1} style={s.contextText}>{item}</Text></View>)}</View>
  {!!card.currentObjective&&<Text numberOfLines={1} style={s.objective}>Current · {card.currentObjective}</Text>}
  <Text numberOfLines={2} style={s.body}>{card.body}</Text>
  {(card.roles.length>0||tags.length>0)?<View style={s.tags}>{[...new Set(card.roles)].map(role=><RoleBadge key={role} role={role}/>)}{tags.map(tag=><View key={tag} style={s.tag}><Text numberOfLines={1} style={s.tagText}>{tag}</Text></View>)}</View>:null}
  <View style={s.chevron}><UiIcon name="next" size={20}/></View>
 </Pressable>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 card:{position:'relative',borderWidth:1,borderColor:C.line,backgroundColor:C.panel,borderRadius:radii.md,padding:10,gap:6},
 pressed:{opacity:.74},
 headline:{flexDirection:'row',alignItems:'flex-start',gap:8},
 title:{...typography.bodyStrong,color:C.text,flex:1,minWidth:0},
 time:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'800',paddingTop:2},
 soon:{color:C.warning},
 meta:{flexDirection:'row',flexWrap:'wrap',gap:5,alignItems:'center'},
 focusPill:{paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},
 focus:{fontSize:7.5,color:C.info,fontWeight:'900',letterSpacing:.45},
 contextPill:{maxWidth:120,paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
 contextText:{fontSize:7.5,color:C.muted,fontWeight:'800'},
 open:{borderColor:C.good,backgroundColor:C.goodSurface},openText:{color:C.good},
 full:{borderColor:C.warning,backgroundColor:C.warningSurface},fullText:{color:C.warning},
 objective:{fontSize:9,lineHeight:12,color:C.info,fontWeight:'800'},
 body:{fontSize:11.5,lineHeight:16,color:C.text},
 tags:{flexDirection:'row',flexWrap:'wrap',gap:5,alignItems:'center'},
 tag:{maxWidth:112,paddingVertical:3,paddingHorizontal:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 tagText:{fontSize:8.5,lineHeight:11,color:C.muted,textTransform:'capitalize'},
 chevron:{position:'absolute',right:7,bottom:7,opacity:.55},
});}
