import {IdentityArtwork,GuildCrest} from '../components/SocialIdentity';
import {useState,type ReactNode,useMemo} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {OnlineGuildMusterPanel} from '../components/OnlineGuildMusterPanel';
import {GuildActivitySummaryPanel} from '../components/GuildActivitySummaryPanel';
import {GameState} from '../core/types';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {formatGameNumber} from '../core/number-format';

const ROSTER=[['Elowen','Dawnkeeper',28,'Leader'],['Brann','Ironwarden',24,'Officer'],['Mira','Wayfinder',21,'Member'],['Tovan','Ravager',19,'Member'],['Sera','Hexweaver',17,'Member']];
type GuildSection='Overview'|'PvE'|'Roster';
type OnlineGuildSection='Home'|'Members'|'Activities'|'Hall'|'Chat'|'Manage'|'Future';

export function GuildScreen({state,onChange,onlineDirectory,onlineManagement,onlineBoard,onlineProjects,onlinePve,onlineHall,onlineChat,onlineCustomize,onlineChatUnread=0,onlineChatMentions=0,online=false}:{online?:boolean;state:GameState;onChange:(next:GameState)=>void;onlineDirectory?:ReactNode;onlineManagement?:ReactNode;onlineBoard?:ReactNode;onlineProjects?:ReactNode;onlinePve?:ReactNode;onlineHall?:ReactNode;onlineChat?:ReactNode;onlineCustomize?:ReactNode;onlineChatUnread?:number;onlineChatMentions?:number}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const [section,setSection]=useState<GuildSection>('Overview'),[onlineSection,setOnlineSection]=useState<OnlineGuildSection>('Home');
  if(online)return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <View style={s.onlineHead}><View style={s.flex}><Text style={s.kicker}>GUILD NETWORK</Text><Text accessibilityRole="header" style={s.h}>Guild</Text><Text style={s.sub}>One home for membership, shared activities, Hall progression, chat and Guild identity.</Text></View></View>
    <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={s.onlineTabs}>{(['Home','Members','Activities','Hall','Chat','Manage','Future'] as const).map(value=><TabChip key={value} label={value} badge={value==='Chat'?Math.max(onlineChatUnread,onlineChatMentions):0} warningBadge={value==='Chat'&&onlineChatMentions>0} selected={onlineSection===value} onPress={()=>setOnlineSection(value)}/>)}</ScrollView>
    {onlineSection==='Home'?<GuildOnlineHome onNavigate={setOnlineSection} board={onlineBoard}/>:null}
    {onlineSection==='Members'?onlineManagement:null}
    {onlineSection==='Activities'?<View style={s.sectionStack}><GuildSectionHeader label="DAILY & WEEKLY" title="Muster & Rally" copy="Daily participation rolls into the shared weekly Rally without adding another currency."/><OnlineGuildMusterPanel/><GuildSectionHeader label="SHARED PROGRESSION" title="Guild Projects" copy="Vote on the weekly board, progress active Projects through verified play, and review recent Guild activity."/>{onlineProjects}<GuildSectionHeader label="WEEKLY PVE" title="Guild Boss" copy="Shared PvE progress and personal contribution remain server-validated."/>{onlinePve}</View>:null}
    {onlineSection==='Hall'?onlineHall:null}
    {onlineSection==='Chat'?onlineChat:null}
    {onlineSection==='Manage'?<View style={s.sectionStack}><GuildSectionHeader label="RECRUITMENT" title="Directory & Creation" copy="Find another Guild when eligible, or create and configure a new Guild identity."/>{onlineDirectory}<GuildSectionHeader label="IDENTITY" title="Guild Appearance" copy="Manage the Guild tag, banner, border, colors, nameplate and motto with role-based permissions."/>{onlineCustomize}</View>:null}
    {onlineSection==='Future'?<GuildFutureContent/>:null}
  </ScrollView>;
  const joined=state.account.guildMember,contribution=state.account.guildContribution??0,project=state.account.guildProjectProgress??0,bossHp=state.account.guildBossHp??100000;
  const contribute=()=>onChange({...state,account:{...state.account,guildContribution:contribution+100,guildProjectProgress:Math.min(1000,project+100)}});
  const attack=()=>onChange({...state,account:{...state.account,guildContribution:contribution+50,guildBossHp:Math.max(0,bossHp-5000)}});
  return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <Text accessibilityRole="header" style={s.h}>Guild</Text>
    <View accessibilityRole="tablist" style={s.tabs}>{(['Overview','PvE','Roster'] as const).map(value=><TabChip key={value} label={value==='Roster'?`Roster · ${joined?ROSTER.length:0}`:value} selected={section===value} onPress={()=>setSection(value)}/>)}</View>
    {section==='Overview'&&<><Panel><GuildCrest/><Text style={s.title}>{joined?'The Bloomwardens':'Find your guild'}</Text><Text style={s.sub}>{joined?'A friendly expedition guild focused on steady PvE progress.':'Join a guild to unlock shared projects, guild PvE, and the AFK reserve bonus.'}</Text><GameButton title={joined?'Leave guild':'Join The Bloomwardens'} tone={joined?'danger':'primary'} onPress={()=>onChange({...state,account:{...state.account,guildMember:!joined}})}/></Panel>{onlineDirectory}{onlineManagement}</>}
    {section==='PvE'&&<>{onlinePve}{joined?<><Panel><Text style={s.title}>Weekly PvE project</Text><Text style={s.sub}>{formatGameNumber(project,state.settings.numberMode)}/1,000 restored · You contributed {formatGameNumber(contribution,state.settings.numberMode)}</Text><View style={s.track}><View style={[s.fill,{width:`${Math.min(100,project/10)}%`}]}/></View><GameButton title="Contribute 100" onPress={contribute}/></Panel><Panel><Text style={s.title}>Rootbound Colossus</Text><Text style={s.sub}>{formatGameNumber(bossHp,state.settings.numberMode)} HP remaining</Text><View style={s.track}><View style={[s.bossFill,{width:`${Math.max(0,bossHp/1000)}%`}]}/></View><GameButton title="Attack · 5,000 damage" onPress={attack} disabled={bossHp===0}/></Panel></>:<Panel><Text style={s.title}>Guild membership required</Text><Text style={s.sub}>Join a guild from Overview to participate in weekly projects and bosses.</Text></Panel>}</>}
    {section==='Roster'&&<Panel><Text style={s.title}>Roster · {joined?ROSTER.length:0}</Text>{joined?ROSTER.map(([name,role,level,status])=><View style={s.member} key={name}><IdentityArtwork name={String(name)} className={String(role)}/><View style={s.flex}><Text style={s.memberName}>{name}</Text><Text style={s.sub}>{role} · Level {level}</Text></View><Text style={[s.status,status==='Leader'?s.statusLeader:status==='Officer'?s.statusOfficer:s.statusMember]}>{status}</Text></View>):<Text style={s.sub}>Join a guild to view its members.</Text>}</Panel>}
  </ScrollView>;
}

function GuildSectionHeader({label,title,copy}:{label:string;title:string;copy:string}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={s.groupHeader}><Text style={s.groupLabel}>{label}</Text><Text style={s.groupTitle}>{title}</Text><Text style={s.groupCopy}>{copy}</Text></View>;
}

function GuildOnlineHome({onNavigate,board}:{onNavigate:(section:OnlineGuildSection)=>void;board?:ReactNode}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const destinations=[
  ['Activities','MUSTER · PROJECTS · PVE','Daily Muster, weekly Projects and Guild boss progress.'],
  ['Members','ROSTER · APPLICATIONS','Members, roles, applications, invitations and leadership safety.'],
  ['Hall','HALL · TROPHIES','Guild Hall facilities, long-term progression and Trophy Room.'],
  ['Chat','GUILD CHAT','Member chat with Guild tags, roles and player profiles.'],
 ] as const;
 return <View style={s.homeStack}>
  <Panel><Text style={s.kicker}>GUILD HOME</Text><Text style={s.title}>Guild Overview</Text><Text style={s.sub}>Keep Guild Activity high through Guild Quests, Muster and shared Projects to maintain cumulative non-combat bonuses.</Text></Panel>
  <GuildActivitySummaryPanel compact/>
  {board}
  <View style={s.homeGrid}>{destinations.map(([section,label,copy])=><Pressable key={section} accessibilityRole="button" accessibilityLabel={'Open Guild '+section} onPress={()=>onNavigate(section)} style={({pressed})=>[s.homeCard,pressed&&s.pressed]}><Text style={s.homeLabel}>{label}</Text><Text style={s.homeTitle}>{section}</Text><Text style={s.homeCopy}>{copy}</Text><Text style={s.homeOpen}>OPEN ›</Text></Pressable>)}</View>
  <View style={s.homeSecondary}><GameButton compact title="Manage Guild" tone="secondary" onPress={()=>onNavigate('Manage')}/><GameButton compact title="Future Content" tone="secondary" onPress={()=>onNavigate('Future')}/></View>
 </View>;
}

function GuildFutureContent(){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const entries=[
  ['Guild vs Guild','SEASONAL GUILD COMPETITION','Asynchronous guild-versus-guild matchups with contribution objectives, fair brackets and no requirement for every member to be online together.'],
  ['Guild Raids','LARGE-SCALE PVE','Longer guild encounters built around role contribution, shared boss progress and guild-wide completion rewards.'],
  ['Guild Trials','ROTATING CHALLENGES','Short rotating guild challenges with authored restrictions, score targets and cooperative mastery goals.'],
  ['Guild Expeditions','ASYNC GUILD MISSIONS','Long-form cooperative missions where members contribute different combat and skilling requirements over time.'],
  ['Guild Legacy','SEASONS & HISTORY','A permanent guild record of past seasons, raid clears, Guild vs Guild results, major Projects, trophies and notable guild milestones.'],
 ] as const;
 return <View style={s.futureWrap}><Panel><Text style={s.kicker}>FUTURE GUILD CONTENT</Text><Text style={s.title}>In Development</Text><Text style={s.sub}>These destinations are visible for roadmap clarity only. They do not accept contributions, consume resources or affect rankings yet. Guild Legacy will eventually extend the Guild Hall Trophy Room into a permanent seasonal history.</Text></Panel>
  <View style={s.futureGrid}>{entries.map(([title,label,copy])=><View key={title} accessible accessibilityRole="summary" accessibilityLabel={title+', In Development'} style={s.futureCard}><Text style={s.futureLabel}>{label}</Text><Text style={s.futureTitle}>{title}</Text><Text style={s.futureCopy}>{copy}</Text><GameButton compact title="In Development" tone="secondary" disabled onPress={()=>{}}/></View>)}</View>
 </View>;
}

function TabChip({label,selected,badge=0,warningBadge=false,onPress}:{label:string;selected:boolean;badge?:number;warningBadge?:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),badgeLabel=badge>0?`${badge} ${warningBadge?'mention':'update'}${badge===1?'':'s'}`:'';return <Pressable accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={badgeLabel?`${label}, ${badgeLabel}`:label} onPress={onPress} style={({pressed})=>[s.tabChip,selected&&s.tabChipSelected,warningBadge&&s.tabChipWarning,pressed&&s.pressed]}><View style={s.tabLabel}><Text style={[s.tabText,selected&&s.tabTextSelected]}>{label}</Text>{badge>0?<View style={[s.tabBadge,warningBadge&&s.tabBadgeWarning]}><Text style={s.tabBadgeText}>{badge>99?'99+':badge}</Text></View>:null}</View></Pressable>}
function makeStyles(C:ThemeColors){return StyleSheet.create({sectionStack:{gap:10},groupHeader:{gap:2,paddingHorizontal:2,paddingTop:4},groupLabel:{fontSize:8,color:C.accentSoft,fontWeight:'900',letterSpacing:.7},groupTitle:{...typography.title,color:C.text,fontSize:15},groupCopy:{fontSize:9.5,lineHeight:13,color:C.muted},homeStack:{gap:10},homeGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},homeCard:{flexGrow:1,flexBasis:'47%',minWidth:148,minHeight:104,gap:4,padding:10,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},homeLabel:{fontSize:7.5,color:C.accentSoft,fontWeight:'900',letterSpacing:.55},homeTitle:{...typography.bodyStrong,color:C.text},homeCopy:{fontSize:9.5,lineHeight:13,color:C.muted,flex:1},homeOpen:{fontSize:8,color:C.info,fontWeight:'900',textAlign:'right'},homeSecondary:{flexDirection:'row',flexWrap:'wrap',gap:6},futureWrap:{gap:10},futureGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},futureCard:{flexGrow:1,flexBasis:'47%',minWidth:148,gap:5,padding:10,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:10,backgroundColor:C.panel},futureLabel:{fontSize:8,color:C.accentSoft,fontWeight:'900',letterSpacing:.65},futureTitle:{...typography.bodyStrong,color:C.text},futureCopy:{fontSize:10,lineHeight:14,color:C.muted,minHeight:42},root:{padding:spacing.md,gap:10,paddingBottom:100},onlineHead:{flexDirection:'row',alignItems:'flex-start',gap:8},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},onlineTabs:{gap:5,paddingVertical:2,paddingRight:8},h:{...typography.hero,color:C.text},tabs:{flexDirection:'row',flexWrap:'wrap',gap:6},tabChip:{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},tabChipSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},tabChipWarning:{borderColor:C.warning},tabLabel:{flexDirection:'row',alignItems:'center',gap:5},tabText:{fontSize:10.5,fontWeight:'800',color:C.muted},tabTextSelected:{color:C.text},tabBadge:{minWidth:17,height:17,paddingHorizontal:4,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:C.notification},tabBadgeWarning:{backgroundColor:C.warning},tabBadgeText:{fontSize:7.5,color:C.notificationText,fontWeight:'900'},pressed:{opacity:.76},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},track:{height:10,backgroundColor:C.panel2,borderRadius:5,overflow:'hidden',marginVertical:10},fill:{height:10,backgroundColor:C.accent},bossFill:{height:10,backgroundColor:C.bad},member:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.line},avatar:{width:38,height:38,borderRadius:19,backgroundColor:C.panel2,borderWidth:1,borderColor:C.accent,alignItems:'center',justifyContent:'center'},avatarText:{color:C.accent,fontWeight:'900',fontSize:18},flex:{flex:1},memberName:{color:C.text,fontWeight:'900'},status:{fontSize:12,fontWeight:'700'},statusLeader:{color:C.accent},statusOfficer:{color:C.info},statusMember:{color:C.good}});}
