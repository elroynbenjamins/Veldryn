import {useMemo,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import type {Language} from '../i18n/languages';
import {guildBankResourceName} from '../i18n/guild-bank-ui';
import {guildProjectAuthoredCopy} from '../i18n/guild-project-authored';
import {guildFlowFocusText} from '../i18n/guild-flow-ui';
import {useOnlineGuildProjectUiText} from '../i18n/online-guild-project-ui';
import type {OnlineGuildProjectMemberContribution,OnlineGuildProjectSummary} from '../online/guild-projects-v18';
import {guildProjectArtwork} from '../theme/guild-remaster-art';
import {guildUpgradeComponentArtwork} from '../theme/guild-upgrade-component-art';
import {radii,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ActivityArtwork} from './ActivityArtwork';
import {Panel} from './Panel';
import {IdentityArtwork} from './SocialIdentity';

const TOP_COUNT=5;

function sourceSummary(member:OnlineGuildProjectMemberContribution,ui:ReturnType<typeof useOnlineGuildProjectUiText>,language:Language){
 return [
  member.combatPoints?ui('Combat: {count}',{count:member.combatPoints.toLocaleString(language)}):'',
  member.gatheringPoints?ui('Gather {count}',{count:member.gatheringPoints.toLocaleString(language)}):'',
  member.craftingPoints?ui('Craft {count}',{count:member.craftingPoints.toLocaleString(language)}):'',
  member.donationPoints?ui('Donate {count}',{count:member.donationPoints.toLocaleString(language)}):'',
 ].filter(Boolean).join(' · ');
}

/** Always-visible Guild Project leaderboard. Extra members and secondary rules are optional disclosures. */
export function GuildProjectContributionsPanel({projects,embedded=false}:{
 projects:OnlineGuildProjectSummary[];embedded?:boolean;
}){
 const language=useGameLanguage(),ui=useOnlineGuildProjectUiText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [selectedProjectId,setSelectedProjectId]=useState<string|null>(null);
 const [allMembersProjectId,setAllMembersProjectId]=useState<string|null>(null);
 const [detailsProjectId,setDetailsProjectId]=useState<string|null>(null);
 const project=projects.find(row=>row.id===selectedProjectId)??projects[0];
 const members=useMemo(()=>[...(project?.memberContributions??[])].sort((a,b)=>b.points-a.points||a.displayName.localeCompare(b.displayName)),[project]);
 if(!project)return null;
 const authored=guildProjectAuthoredCopy(language,project.templateId,project.name,project.description);
 const artwork=guildProjectArtwork(project.templateId);
 const showingAll=allMembersProjectId===project.id;
 const detailsOpen=detailsProjectId===project.id;
 const shown=showingAll?members:members.slice(0,TOP_COUNT);
 const weekly=project.launchWeekly===true;
 const content=<>
  <View style={s.header}>
   <View style={s.flex}>
    <Text style={s.eyebrow}>{ui('GUILD COOPERATION')}</Text>
    <Text style={s.title}>{ui('Member contributions')}</Text>
   </View>
   <Text style={s.memberCount}>{ui('{count} members',{count:members.length})}</Text>
  </View>
  {projects.length>1?<View style={s.projectTabs}>
   {projects.map(row=>{
    const chosen=row.id===project.id;
    const tabArtwork=guildProjectArtwork(row.templateId);
    const name=guildProjectAuthoredCopy(language,row.templateId,row.name,row.description).name;
    return <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{selected:chosen}}
      onPress={()=>setSelectedProjectId(row.id)} style={({pressed})=>[s.projectTab,chosen&&s.projectTabActive,pressed&&s.pressed]}>
     {tabArtwork?<Image source={tabArtwork} resizeMode="contain" style={s.tabIcon}/>:null}
     <Text numberOfLines={2} style={[s.tabLabel,chosen&&s.tabLabelActive]}>{name}</Text>
    </Pressable>;
   })}
  </View>:null}
  <View style={s.hero}>
   {artwork?<Image source={artwork} resizeMode="contain" style={s.projectIcon}/>:<ActivityArtwork id={project.focus==='combat'?'combat':project.focus==='skilling'?'herbalism':'smithing'} size={44}/>}
   <View style={s.flex}>
    <Text numberOfLines={2} style={s.projectTitle}>{authored.name}</Text>
    <Text style={s.muted}>{guildFlowFocusText(language,project.focus)} · {ui('{count}/{minimum} contributors',{count:project.meaningfulContributors,minimum:project.minimumMeaningfulContributors})}</Text>
   </View>
  </View>
  <View style={s.sectionHead}>
   <Text style={s.sectionTitle}>{ui('Top 5 contributors')}</Text>
   <Text style={s.muted}>{ui('{count} members',{count:members.length})}</Text>
  </View>
  {shown.map((member,index)=>{
   const sources=sourceSummary(member,ui,language);
   return <View key={member.accountId} style={[s.member,index<3&&s.topMember]}>
    <Text style={[s.rank,index<3&&s.topRank]}>{'#'+(index+1)}</Text>
    <IdentityArtwork name={member.displayName} accountId={member.accountId} size={34}/>
    <View style={s.memberBody}>
     <Text numberOfLines={1} style={s.memberName}>{member.displayName}</Text>
     <Text numberOfLines={2} style={s.source}>{sources||(member.points>0?ui('Shared contribution'):ui('No effort yet'))}</Text>
     {member.meaningful?<Text style={s.qualified}>{ui('Counts toward contributor minimum')}</Text>
      :member.points>0?<Text style={s.mutedSmall}>{ui('Below contributor minimum')}</Text>:null}
    </View>
    <Text numberOfLines={2} style={s.points}>{ui('{count} effort',{count:member.points.toLocaleString(language)})}</Text>
   </View>;
  })}
  {!members.length?<Text style={s.empty}>{ui('No Guild members found.')}</Text>:null}
  {members.length>TOP_COUNT?<Pressable accessibilityRole="button" accessibilityState={{expanded:showingAll}}
    onPress={()=>setAllMembersProjectId(showingAll?null:project.id)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
    <Text style={s.disclosureLabel}>{showingAll?ui('Show top 5 only'):ui('Show {count} more members',{count:members.length-TOP_COUNT})}</Text>
    <Text style={s.disclosureArrow}>{showingAll?'▴':'▾'}</Text>
   </Pressable>:null}
  <Pressable accessibilityRole="button" accessibilityState={{expanded:detailsOpen}} onPress={()=>setDetailsProjectId(detailsOpen?null:project.id)}
   style={({pressed})=>[s.detailsToggle,pressed&&s.pressed]}>
   <Text style={s.detailsLabel}>{ui('Project details')}</Text>
   <Text style={s.disclosureArrow}>{detailsOpen?'▴':'▾'}</Text>
  </Pressable>
  {detailsOpen?<View style={s.details}>
   <Text style={s.description}>{authored.description}</Text>
   {project.kind!=='development'?<View style={s.breakdown}>
    <Text style={s.muted}>{ui('Combat: {count}',{count:project.combatPoints.toLocaleString(language)})}</Text>
    <Text style={s.muted}>{ui('Skilling: {count}',{count:project.skillingPoints.toLocaleString(language)})}</Text>
   </View>:null}
   {project.resourceGoals.map(goal=><View key={goal.resourceKind+':'+goal.resourceId} style={s.resource}>
    {guildUpgradeComponentArtwork(goal.resourceId)?<Image source={guildUpgradeComponentArtwork(goal.resourceId)} style={s.resourceIcon} resizeMode="contain" accessible={false}/>:null}
    <Text style={[s.description,s.flex]}>{guildBankResourceName(language,goal.resourceId,goal.label)}</Text>
    <Text style={s.resourceAmount}>{goal.current.toLocaleString(language)} / {goal.target.toLocaleString(language)}</Text>
   </View>)}
   {weekly?<View style={s.rules}><Text style={s.muted}>{ui(project.projectMode==='donation'
    ?'Donate eligible supplies · Each member may cover up to 50% · Claim within 7 days.'
    :project.rewardDestination==='guild_bank'
    ?'Daily cap: 2,400 effort · Max 50% per member (Guilds of 2+) · 300 effort for Guild Bank reward · Claim within 7 days.'
    :'Daily cap: 2,400 effort · Max 50% per member (Guilds of 2+) · 300 effort for 500 Gold · Claim within 7 days.')}</Text></View>:null}
   {project.endsAt?<Text style={s.muted}>{ui('Ends {date}',{date:new Date(project.endsAt).toLocaleString(language)})}</Text>:null}
  </View>:null}
 </>;
 return embedded?<View style={s.embedded}>{content}</View>:<Panel style={s.panel}>{content}</Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 panel:{gap:9},embedded:{gap:9,borderTopWidth:1,borderTopColor:C.line,paddingTop:12},
 flex:{flex:1,minWidth:0},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 eyebrow:{fontSize:10,lineHeight:14,color:C.accent,fontWeight:'900',letterSpacing:.7},
 title:{fontSize:16,lineHeight:21,color:C.text,fontWeight:'900'},
 memberCount:{fontSize:11,color:C.muted},
 projectTabs:{flexDirection:'row',gap:7},
 projectTab:{flex:1,minWidth:0,minHeight:48,flexDirection:'row',alignItems:'center',gap:5,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2,padding:6},
 projectTabActive:{borderColor:C.accent,backgroundColor:C.panelRaised},
 tabIcon:{width:28,height:28},tabLabel:{flex:1,minWidth:0,fontSize:10,lineHeight:14,color:C.muted,fontWeight:'800'},
 tabLabelActive:{color:C.text},
 hero:{flexDirection:'row',alignItems:'center',gap:8,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 projectIcon:{width:44,height:44},projectTitle:{fontSize:13,lineHeight:18,color:C.text,fontWeight:'900'},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 sectionTitle:{fontSize:13,lineHeight:18,color:C.text,fontWeight:'800'},
 muted:{fontSize:10,lineHeight:15,color:C.muted},mutedSmall:{fontSize:9,lineHeight:13,color:C.muted},
 member:{minHeight:58,flexDirection:'row',alignItems:'center',gap:7,paddingVertical:7,paddingHorizontal:6,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 topMember:{borderColor:C.lineStrong,backgroundColor:C.panelRaised},
 rank:{width:23,fontSize:11,lineHeight:16,fontWeight:'900',color:C.muted,textAlign:'center'},
 topRank:{color:C.accent},
 memberBody:{flex:1,minWidth:0,gap:1},memberName:{fontSize:12,lineHeight:17,fontWeight:'800',color:C.text},
 source:{fontSize:10,lineHeight:14,color:C.muted},
 qualified:{fontSize:9,lineHeight:13,fontWeight:'800',color:C.good},
 points:{maxWidth:75,textAlign:'right',fontSize:11,lineHeight:15,fontWeight:'900',color:C.accent},
 empty:{textAlign:'center',padding:12,fontSize:12,color:C.muted},
 pressed:{opacity:.72},disclosure:{minHeight:44,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:9,borderWidth:1,borderRadius:radii.sm,borderColor:C.line,backgroundColor:C.panel2},
 disclosureLabel:{fontSize:12,lineHeight:17,color:C.info,fontWeight:'800'},
 disclosureArrow:{fontSize:15,color:C.accent,fontWeight:'900'},
 detailsToggle:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:C.line,paddingHorizontal:2},
 detailsLabel:{color:C.muted,fontSize:11,fontWeight:'800'},
 details:{gap:8,borderTopWidth:1,borderTopColor:C.line,paddingTop:9},
 description:{fontSize:11,lineHeight:16,color:C.muted},
 breakdown:{flexDirection:'row',flexWrap:'wrap',gap:9},
 resource:{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:5},
 resourceIcon:{width:26,height:26},resourceAmount:{fontSize:11,fontWeight:'800',color:C.accent},
 rules:{padding:9,borderRadius:radii.sm,backgroundColor:C.panel2},
});}
