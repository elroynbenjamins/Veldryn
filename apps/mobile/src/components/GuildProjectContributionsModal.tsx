import {useMemo,useState} from 'react';
import {Image,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {guildFlowFocusText} from '../i18n/guild-flow-ui';
import {useOnlineGuildProjectUiText} from '../i18n/online-guild-project-ui';
import type {OnlineGuildProjectMemberContribution,OnlineGuildProjectSummary} from '../online/guild-projects-v18';
import {guildProjectArtwork} from '../theme/guild-remaster-art';
import {guildUpgradeComponentArtwork} from '../theme/guild-upgrade-component-art';
import {radii,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ActivityArtwork} from './ActivityArtwork';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {IdentityArtwork} from './SocialIdentity';

const TOP_COUNT=5;

function sourceSummary(member:OnlineGuildProjectMemberContribution,ui:ReturnType<typeof useOnlineGuildProjectUiText>){
 return [
  member.combatPoints?ui('Combat: {count}',{count:member.combatPoints.toLocaleString()}):'',
  member.gatheringPoints?ui('Gather {count}',{count:member.gatheringPoints.toLocaleString()}):'',
  member.craftingPoints?ui('Craft {count}',{count:member.craftingPoints.toLocaleString()}):'',
  member.donationPoints?ui('Donate {count}',{count:member.donationPoints.toLocaleString()}):'',
 ].filter(Boolean).join(' · ');
}

/** Member rankings and the former inline project details in one compact, scrollable sheet. */
export function GuildProjectContributionsModal({project,title,description,onClose}:{
 project:OnlineGuildProjectSummary;title:string;description:string;onClose:()=>void;
}){
 const language=useGameLanguage(),ui=useOnlineGuildProjectUiText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [showAll,setShowAll]=useState(false);
 const members=useMemo(()=>[...project.memberContributions].sort((a,b)=>b.points-a.points||a.displayName.localeCompare(b.displayName)),[project.memberContributions]);
 const shown=showAll?members:members.slice(0,TOP_COUNT);
 const artwork=guildProjectArtwork(project.templateId);
 const weekly=project.launchWeekly===true;
 return <GameModalSurface visible onClose={onClose} surfaceStyle={s.surface}>
  <GameModalHeader eyebrow={ui('Guild Projects').toUpperCase()} title={ui('Member contribution')} onClose={onClose}/>
  <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
   <View style={s.hero}>
    {artwork?<Image source={artwork} resizeMode="contain" style={s.projectIcon}/>:<ActivityArtwork id={project.focus==='combat'?'combat':project.focus==='skilling'?'herbalism':'smithing'} size={50}/>}
    <View style={s.flex}>
     <Text style={s.projectTitle}>{title}</Text>
     <Text style={s.muted}>{guildFlowFocusText(language,project.focus)} · {ui('{count}/{minimum} contributors',{count:project.meaningfulContributors,minimum:project.minimumMeaningfulContributors})}</Text>
    </View>
   </View>
   <View style={s.sectionHead}>
    <Text style={s.sectionTitle}>{ui('Top 5 contributors')}</Text>
    <Text style={s.muted}>{ui('{count} members',{count:members.length})}</Text>
   </View>
   {shown.map((member,index)=>{
    const sources=sourceSummary(member,ui);
    return <View key={member.accountId} style={[s.member,index<3&&s.topMember]}>
     <Text style={[s.rank,index<3&&s.topRank]}>{'#'+(index+1)}</Text>
     <IdentityArtwork name={member.displayName} accountId={member.accountId} size={36}/>
     <View style={s.memberBody}>
      <Text numberOfLines={1} style={s.memberName}>{member.displayName}</Text>
      <Text numberOfLines={2} style={s.source}>{sources||ui('No effort yet')}</Text>
      {member.meaningful?<Text style={s.qualified}>{ui('Counts toward contributor minimum')}</Text>
       :member.points>0?<Text style={s.mutedSmall}>{ui('Below contributor minimum')}</Text>:null}
     </View>
     <Text numberOfLines={2} style={s.points}>{ui('{count} effort',{count:member.points.toLocaleString()})}</Text>
    </View>;
   })}
   {!members.length?<Text style={s.empty}>{ui('No Guild members found.')}</Text>:null}
   {members.length>TOP_COUNT?<GameButton compact tone="secondary"
    title={showAll?ui('Show top 5 only'):ui('Show {count} more members',{count:members.length-TOP_COUNT})}
    onPress={()=>setShowAll(value=>!value)}/>:null}
   <View style={s.details}>
    <Text style={s.sectionTitle}>{ui('Project details')}</Text>
    <Text style={s.description}>{description}</Text>
    {project.kind!=='development'?<View style={s.breakdown}>
     <Text style={s.muted}>{ui('Combat: {count}',{count:project.combatPoints.toLocaleString()})}</Text>
     <Text style={s.muted}>{ui('Skilling: {count}',{count:project.skillingPoints.toLocaleString()})}</Text>
    </View>:null}
    {project.resourceGoals.map(goal=><View key={goal.resourceKind+':'+goal.resourceId} style={s.resource}>
     {guildUpgradeComponentArtwork(goal.resourceId)?<Image source={guildUpgradeComponentArtwork(goal.resourceId)} style={s.resourceIcon} resizeMode="contain" accessible={false}/>:null}
     <Text style={[s.description,s.flex]}>{goal.label}</Text>
     <Text style={s.resourceAmount}>{goal.current.toLocaleString()} / {goal.target.toLocaleString()}</Text>
    </View>)}
    {weekly?<View style={s.rules}><Text style={s.muted}>{ui(project.projectMode==='donation'
     ?'Donate eligible supplies · Each member may cover up to 50% · Claim within 7 days.'
     :project.rewardDestination==='guild_bank'
     ?'Daily cap: 2,400 effort · Max 50% per member (Guilds of 2+) · 300 effort for Guild Bank reward · Claim within 7 days.'
     :'Daily cap: 2,400 effort · Max 50% per member (Guilds of 2+) · 300 effort for 500 Gold · Claim within 7 days.')}</Text></View>:null}
    {project.endsAt?<Text style={s.muted}>{ui('Ends {date}',{date:new Date(project.endsAt).toLocaleString(language)})}</Text>:null}
   </View>
  </ScrollView>
 </GameModalSurface>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 surface:{maxHeight:'88%'},
 scroll:{flexGrow:0},
 content:{gap:10,paddingBottom:18},
 flex:{flex:1,minWidth:0},
 hero:{flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.md,backgroundColor:C.panelRaised},
 projectIcon:{width:50,height:50},
 projectTitle:{fontSize:15,lineHeight:20,color:C.text,fontWeight:'800'},
 sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 sectionTitle:{color:C.text,fontWeight:'800',fontSize:14,lineHeight:19},
 muted:{fontSize:11,lineHeight:16,color:C.muted},
 mutedSmall:{fontSize:9,lineHeight:13,color:C.muted},
 member:{minHeight:60,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,paddingHorizontal:7,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 topMember:{backgroundColor:C.panelRaised,borderColor:C.lineStrong},
 rank:{width:25,color:C.muted,fontSize:11,lineHeight:16,fontWeight:'900',textAlign:'center'},
 topRank:{color:C.accent},
 memberBody:{flex:1,minWidth:0,gap:2},
 memberName:{fontSize:12,lineHeight:16,fontWeight:'800',color:C.text},
 source:{fontSize:10,lineHeight:14,color:C.muted},
 qualified:{fontSize:9,lineHeight:13,fontWeight:'800',color:C.good},
 points:{maxWidth:85,textAlign:'right',fontSize:11,lineHeight:15,fontWeight:'900',color:C.accent},
 empty:{textAlign:'center',paddingVertical:16,color:C.muted,fontSize:12},
 details:{gap:9,borderTopWidth:1,borderTopColor:C.line,marginTop:3,paddingTop:12},
 description:{fontSize:12,lineHeight:17,color:C.muted},
 breakdown:{flexDirection:'row',flexWrap:'wrap',gap:9},
 resource:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:5},
 resourceIcon:{width:28,height:28},
 resourceAmount:{fontSize:11,fontWeight:'800',color:C.accent},
 rules:{padding:9,borderRadius:radii.sm,backgroundColor:C.panel2},
});}
