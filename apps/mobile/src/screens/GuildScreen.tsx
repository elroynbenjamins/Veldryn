import {gameAlert} from '../core/game-alerts';
import {canManageGuild,type GuildManagementRole} from '../core/social-management';
import {useSocialText} from '../i18n/social';
import {useGameplayText} from '../i18n/gameplay';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {socialLabel} from '../i18n/social';
import {IdentityArtwork} from '../components/SocialIdentity';
import {GuildIdentitySummary} from '../components/GuildIdentitySummary';
import {cloneElement,isValidElement,useEffect,useRef,useState,type ReactNode,type ElementRef,useMemo} from 'react';
import {ActivityIndicator,Image,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GuildDiscoveryFlow} from '../components/GuildDiscoveryFlow';
import {SectionGuide} from '../components/SectionGuide';
import {GuildTutorial} from '../components/GuildTutorial';
import {GuildGuideLibrary} from '../components/GuildGuideLibrary';
import {GUILD_TUTORIAL_STEPS,type GuildTutorialDestination} from '../core/guild-tutorial';
import {guildHallSectionGuide} from '../core/guild-hall-guide';
import {localizedGuildDetailedGuide} from '../i18n/guild-detailed-guide-locales';
import {guildTutorialText} from '../i18n/guild-tutorial';
import {useAuthSession} from '../online/AuthSessionProvider';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {GuildBoardHero} from '../components/GuildBoardHero';
import {GuildHomeActions} from '../components/GuildHomeActions';
import {GuildHallSummary} from '../components/GuildHallSummary';
import {GuildNavigation} from '../components/GuildNavigation';
import {GuildProgressPanel,type GuildProgressTab} from '../components/GuildProgressPanel';
import {GuildMemberIdentity} from '../components/GuildMemberIdentity';
import {guildDetails,myGuild,type OnlineGuild} from '../online/social';
import {guildChoiceVoteReminder} from '../online/guild-projects-v18';
import {useOnlineGuildProjectUiText} from '../i18n/online-guild-project-ui';
import {BoardTabs} from '../components/BoardTabs';
import {GUILD_SKILL_NODES,GUILD_MAJOR_BRANCHES} from '../content/guild-skill-paths';
import {guildSkillArtwork} from '../theme/guild-remaster-art';
import {GuildSpecializationPaths} from '../components/GuildSpecializationPaths';
import {OnlineGuildMusterPanel} from '../components/OnlineGuildMusterPanel';
import {GuildActivitySummaryPanel} from '../components/GuildActivitySummaryPanel';
import {GuildQuestPanel} from '../components/GuildQuestPanel';
import {GameState} from '../core/types';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {formatGameNumber} from '../core/number-format';
import {ThemedIcon} from '../components/ThemedNavigationIcon';
import {stackItems} from '../core/game';
import {itemDef} from '../content/items';
import {localizedItemName} from '../i18n/starter-item-names';
import {ResourceArtwork} from '../components/ResourceArtwork';
import {GUILD_ACTIVITY_MILESTONE_DEFS,guildActivityBonuses} from '../core/guild-activity';
import {guildSkillPointsForLevelV1,guildXpThresholdForLevelV1} from '../core/guild-progression-v1';

const ROSTER=[['Elowen','Dawnkeeper',28,'Leader'],['Brann','Ironwarden',24,'Officer'],['Mira','Wayfinder',21,'Member'],['Tovan','Ravager',19,'Member'],['Sera','Hexweaver',17,'Member']];
type GuildSection='Home'|'PvE'|'Roster'|'Skills'|'Bank';
export type OnlineGuildSection='Home'|'PvE'|'Roster'|'Activities'|'Progress'|'Hall'|'Chat'|'Manage'|'Appearance'|'Future';
/** Only non-privileged destinations survive navigation away from Guild.
 * Management permissions and live membership are rechecked on return. */
export type GuildNavigationState={
 section:'Home'|'PvE'|'Roster'|'Activities'|'Progress'|'Hall'|'Future';
 activityView:'Quests'|'Muster'|'Projects';
 hallSection:'Overview'|'Construction'|'Bank'|'Skills'|'Legacy'|'Shop';
 progressTab?:GuildProgressTab;
};
type LocalGuildMember={name:string;role:'Leader'|'Officer'|'Member';className:string;level:number;online:boolean;lastOnline:string;status:string};
const LOCAL_ROSTER:LocalGuildMember[]=[{name:'Elowen',role:'Leader',className:'Dawnkeeper',level:28,online:true,lastOnline:'Online now',status:'Leading the guild'}, {name:'Brann',role:'Officer',className:'Ironwarden',level:24,online:true,lastOnline:'Online now',status:'Managing projects'}, {name:'Mira',role:'Member',className:'Wayfinder',level:21,online:false,lastOnline:'12 min ago',status:'Exploring Ironwood'}, {name:'Tovan',role:'Member',className:'Ravager',level:19,online:false,lastOnline:'Yesterday',status:'Last active in combat'}, {name:'Sera',role:'Member',className:'Hexweaver',level:17,online:false,lastOnline:'3 days ago',status:'Away'}];
const GUILD_TREE_BUFFS:Record<string,{label:string;perTier:number}>={professions:{label:'Skill XP',perTier:2},fellowship:{label:'Guild Quest rewards',perTier:2},vanguard:{label:'Guild PvE contribution',perTier:2}};
const GUILD_BANK_DAILY_CAP=1000;
const GUILD_BANK_RESOURCES=[
 {itemId:'MOSS_FIBER',label:'Moss Fiber'},
 {itemId:'GREENWOOD_LOG',label:'Greenwood Log'},
 {itemId:'IRONWOOD_LOG',label:'Ironwood Log'},
 {itemId:'ASTER_IRON_INGOT',label:'Aster-Iron Ingot'},
 {itemId:'OATHGLASS_SHARD',label:'Oathglass Shard'},
 {itemId:'OATHSTONE_INGOT',label:'Oathstone Ingot'},
 // Tailoring-side craftables so cloth classes have a direct contribution path.
 {itemId:'BOAR_HIDE',label:'Boar Hide'},
 {itemId:'WOLF_PELT',label:'Wolf Pelt'},
 {itemId:'TROLL_HIDE',label:'Troll Hide'},
 {itemId:'TORN_OATHCLOTH',label:'Torn Oathcloth'},
] as const;
const GUILD_PROJECT_COST={MOSS_FIBER:200,GREENWOOD_LOG:120,IRONWOOD_LOG:60,ASTER_IRON_INGOT:20};
export function GuildScreen({state,onChange,onlineManagement,onlineBoard,onlineProjects,onlinePve,onlineHall,onlineChat,onlineCustomize,onlineChatUnread=0,onOpenChat,onRecruitment,online=false,membershipRevision=0,onTokenRewardsChanged,initialPve=false,onInitialPveHandled,initialNavigation,onNavigationChange}:{initialNavigation?:GuildNavigationState;onNavigationChange?:(state:GuildNavigationState)=>void;onOpenChat?:()=>void;onRecruitment?:()=>void;onTokenRewardsChanged?:()=>void|Promise<unknown>;online?:boolean;membershipRevision?:number;state:GameState;onChange:(next:GameState)=>void;onlineManagement?:ReactNode;onlineBoard?:ReactNode;onlineProjects?:ReactNode;onlinePve?:ReactNode;onlineHall?:ReactNode;onlineChat?:ReactNode;onlineCustomize?:ReactNode;onlineChatUnread?:number;onlineChatMentions?:number;initialPve?:boolean;onInitialPveHandled?:()=>void}){
 const st=useSocialText();
  const {gl}=useGameplayText();
  const language=useGameLanguage();
  const guildScroll=useRef<ElementRef<typeof ScrollView>>(null);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {session}=useAuthSession();
  const [activityView,setActivityView]=useState<'Quests'|'Muster'>(initialNavigation?.activityView==='Muster'?'Muster':'Quests');
  const [progressTab,setProgressTab]=useState<GuildProgressTab>(initialNavigation?.progressTab??'Projects');
  const [rosterSection,setRosterSection]=useState<'Members'|'Requests'|'Safety'>('Members');
  const previousHallSection=initialNavigation?.hallSection as string|undefined;
  const initialHallSection:GuildNavigationState['hallSection']=previousHallSection==='Facilities'?'Overview':previousHallSection==='Trophies'?'Legacy':(['Overview','Construction','Bank','Skills','Legacy','Shop'].includes(previousHallSection??'')?previousHallSection as GuildNavigationState['hallSection']:'Overview');
  const [section,setSection]=useState<GuildSection>(initialPve?'PvE':'Home'),[onlineSection,setOnlineSection]=useState<OnlineGuildSection>(initialPve?'PvE':initialNavigation?.section==='Activities'&&initialNavigation.activityView==='Projects'?'Progress':initialNavigation?.section??'Home'),[hallSection,setHallSection]=useState<GuildNavigationState['hallSection']>(initialHallSection);
  useEffect(()=>{if(initialPve)onInitialPveHandled?.()},[]);
  // Older Hall/Skills links open the dedicated Progress → Skills screen.
  useEffect(()=>{if(online&&onlineSection==='Hall'&&hallSection==='Skills'){
    setProgressTab('Skills');setHallSection('Overview');setOnlineSection('Progress');
  }},[online,onlineSection,hallSection]);
  // Capture the visible Guild sub-route; never persist privileged Manage/Appearance
  // or the Chat overlay as a back-history destination.
  useEffect(()=>{
   if(!online)return;
   const safeSection:GuildNavigationState['section']=
    onlineSection==='Manage'||onlineSection==='Appearance'||onlineSection==='Chat'?'Home':onlineSection;
   onNavigationChange?.({section:safeSection,activityView,hallSection,progressTab});
  },[online,onlineSection,activityView,hallSection,progressTab,onNavigationChange]);
  const [guildMembership,setGuildMembership]=useState<'loading'|'member'|'none'|'error'>(online?'loading':'member');
  const [guildTourJustJoined,setGuildTourJustJoined]=useState(false);
  const [weeklyVotePending,setWeeklyVotePending]=useState(false);
  const [guideLibraryOpen,setGuideLibraryOpen]=useState(false);
  const [guildRole,setGuildRole]=useState<GuildManagementRole|null>(null);
  const canCustomize=canManageGuild(guildRole);
  const [guildLoadError,setGuildLoadError]=useState('');
  const guideIndex=onlineSection==='Progress'?2:onlineSection==='Activities'?1:onlineSection==='PvE'?3:onlineSection==='Hall'?4:0;
  const guideStep=GUILD_TUTORIAL_STEPS[guideIndex];
  const guideSection=onlineSection==='Progress'?`Progress/${progressTab}`:onlineSection==='Activities'?`Activities/${activityView}`:onlineSection==='Hall'&&hallSection!=='Overview'?`Hall/${hallSection}`:onlineSection;
  const guildGuide=onlineSection==='Activities'?(activityView==='Quests'
   ?{title:'Guild Quests',body:'Complete shared weekly objectives to support Guild Activity.',detail:'Only verified activities matching the current quest objectives count toward progress.'}
   :{title:'Muster & Rally',body:'Track your daily effort and weekly Guild Rally progress.',detail:'Qualifying activity earns daily points and Rally Marks. The full guide explains thresholds and milestones.'}):onlineSection==='Progress'?(progressTab==='Projects'?{title:'Guild Projects',body:'Work together on weekly Guild Projects and claim earned rewards.',detail:'Combat, gathering, and crafting can contribute to active projects.'}:{title:'Guild Skills',body:'Review permanent Guild bonuses and their upgrade requirements.',detail:'Guild Skills use server-verified points, materials and officer permissions.'}):onlineSection==='Hall'?guildHallSectionGuide(language,hallSection):onlineSection==='Roster'?{title:'Your Guild roster',body:'Open a member to see their role and activity. Leaders can manage members from the roster.',detail:'Use Home → Members to return here.'}:onlineSection==='Manage'?{title:'Manage your Guild',body:'Recruitment and Guild settings are available to leaders and officers.',detail:'Open Requests to review applications or Guild Appearance for cosmetics.'}:onlineSection==='Appearance'?{title:'Guild appearance',body:'Choose your Guild tag, banner and profile details here.',detail:'Changes are saved separately; review your choices before applying them.'}:{title:guideStep.title,body:guideStep.body,detail:guideStep.tip};
   const headerGuide=online&&(['Activities','Progress','PvE','Roster','Hall','Manage','Appearance'] as const).some(value=>value===onlineSection)?<SectionGuide scope={session?.user.id??''} area="guild" section={guideSection} guide={localizedGuildDetailedGuide(language,guideSection)??guildGuide} placement="header" translate={value=>guildTutorialText(language,value)}/>:null;
  const reloadGuildMembership=()=>{
   setGuildMembership('loading');setGuildLoadError('');
   void myGuild().then(membership=>{setGuildRole(membership?.role??null);setGuildMembership(membership?'member':'none')})
    .catch(reason=>{setGuildLoadError(reason instanceof Error?reason.message:'Unable to check Guild membership.');setGuildMembership('error')});
  };
  useEffect(()=>{
   if(!online)return;
   let mounted=true;
   void myGuild().then(membership=>{if(mounted){setGuildRole(membership?.role??null);setGuildMembership(membership?'member':'none')}})
    .catch(reason=>{if(mounted){setGuildLoadError(reason instanceof Error?reason.message:'Unable to check Guild membership.');setGuildMembership('error')}});
   return()=>{mounted=false};
  },[online,membershipRevision]);
  useEffect(()=>{if(onlineSection!=='Roster')setRosterSection('Members')},[onlineSection]);
  // Small in-app, actionable weekly voting reminder. The RPC is guild-member scoped,
  // cached for two minutes, and refreshed when returning Home after casting a vote.
  useEffect(()=>{
   let alive=true;
   if(!online||guildMembership!=='member'){setWeeklyVotePending(false);return;}
   void guildChoiceVoteReminder(onlineSection==='Home').then(pending=>{
    if(alive)setWeeklyVotePending(pending);
   }).catch(()=>{if(alive)setWeeklyVotePending(false)});
   return()=>{alive=false};
  },[online,guildMembership,membershipRevision,onlineSection]);

  useEffect(()=>{if(!canCustomize&&(onlineSection==='Manage'||onlineSection==='Appearance'))setOnlineSection('Home')},[canCustomize,onlineSection]);
  if(online&&guildMembership==='loading')return <Panel><Text style={s.title}>{gl('Guild')}</Text><ActivityIndicator color={C.accent}/></Panel>;
  if(online&&guildMembership==='error')return <Panel><Text style={s.title}>{gl('Unable to open Guilds')}</Text><Text style={s.sub}>{guildLoadError}</Text><GameButton title={gl('Retry')} onPress={reloadGuildMembership}/></Panel>;
  if(online&&guildMembership==='none')return <GuildDiscoveryFlow onJoined={()=>{setGuildTourJustJoined(true);setOnlineSection('Home');reloadGuildMembership()}}/>;
  const tutorialDestination:GuildTutorialDestination|null=onlineSection==='Home'?'Home'
   :onlineSection==='Activities'&&activityView==='Muster'?'Muster'
   :onlineSection==='Progress'&&progressTab==='Projects'?'Projects'
   :onlineSection==='PvE'?'PvE'
   :onlineSection==='Hall'&&hallSection==='Overview'?'Hall':null;
  const navigateGuildTutorial=(destination:GuildTutorialDestination)=>{
   if(destination==='Muster'){setActivityView('Muster');setOnlineSection('Activities')}
   else if(destination==='Projects'){setProgressTab('Projects');setOnlineSection('Progress')}
   else if(destination==='PvE')setOnlineSection('PvE');
   else if(destination==='Hall'){setHallSection('Overview');setOnlineSection('Hall')}
   else setOnlineSection('Home');
   guildScroll.current?.scrollTo({y:0,animated:false});
  };
  if(online)return <View style={{flex:1,minHeight:0}}><GuildNavigation value={onlineSection} voteReminder={weeklyVotePending} onChange={next=>{setOnlineSection(next);guildScroll.current?.scrollTo({y:0,animated:false})}}/><ScrollView ref={guildScroll} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <GuildTutorial role={guildRole} autoStart={guildTourJustJoined} home={onlineSection==='Home'}
      destination={tutorialDestination} onNavigate={navigateGuildTutorial}
      onReveal={()=>guildScroll.current?.scrollTo({y:0,animated:false})}/>
    {(['Roster','Manage','Appearance','Future'] as const).some(section=>section===onlineSection)?<GameButton compact tone="secondary" title={gl('← Guild Home')} onPress={()=>{setOnlineSection('Home');guildScroll.current?.scrollTo({y:0,animated:false})}}/>:null}
    {(['Roster','Manage'] as const).some(section=>section===onlineSection)?<GuildSectionHeader label={st('Guild')} title={gl(onlineSection==='Roster'?'Guild Roster':'Manage Guild')} copy={gl(onlineSection==='Roster'?'Roster, activity and membership.':'Guild identity and recruitment.')} action={headerGuide}/>:null}


    {onlineSection==='Home'?<GuildOnlineHome votePending={weeklyVotePending} onNavigateProjectVote={()=>{setProgressTab('Projects');setOnlineSection('Progress');guildScroll.current?.scrollTo({y:0,animated:false})}} onNavigateMuster={()=>{setActivityView('Muster');setOnlineSection('Activities')}} onNavigateQuests={()=>{setActivityView('Quests');setOnlineSection('Activities')}} onNavigateShop={()=>{setHallSection('Shop');setOnlineSection('Hall')}} onRewardsChanged={onTokenRewardsChanged} onGuide={()=>setGuideLibraryOpen(true)} canCustomize={canCustomize} onNavigate={next=>{if(next==='Chat'&&onOpenChat){onOpenChat();return;}if((next!=='Manage'&&next!=='Appearance')||canCustomize)setOnlineSection(next)}} board={onlineBoard} chatUnread={onlineChatUnread}/>:null}
    {onlineSection==='Roster'?(isValidElement<{initialView?:'Members'|'Requests'|'Safety'}>(onlineManagement)?cloneElement(onlineManagement,{initialView:rosterSection}):onlineManagement):null}
    {onlineSection==='Activities'?<View style={s.sectionStack}>
       <GuildSectionHeader label={st('Guild')} title={gl('Guild Activity Board')} copy={gl('Shared objectives and daily participation.')} action={headerGuide}/>
      <BoardTabs compact label={gl('Guild activity boards')} items={[{id:'Quests',label:gl('Quests')},{id:'Muster',label:gl('Muster')}] as const} value={activityView} onChange={setActivityView}/>
      {activityView==='Quests'?<><GuildActivitySummaryPanel compact/><GuildQuestPanel/></>:null}
      {activityView==='Muster'?<><GuildSectionHeader label={st("DAILY & WEEKLY")} title={st("Muster & Rally")} copy={guildTutorialText(language,'Track your daily effort and weekly Guild Rally progress.')}/><OnlineGuildMusterPanel/></>:null}
    </View>:null}
    {onlineSection==='Progress'?<GuildProgressPanel headerHelp={headerGuide} tab={progressTab} onChange={setProgressTab} projects={onlineProjects} onViewBank={()=>{setHallSection('Bank');setOnlineSection('Hall');guildScroll.current?.scrollTo({y:0,animated:false})}}/>:null}
    {onlineSection==='PvE'?(isValidElement<{headerHelp?:ReactNode}>(onlinePve)?cloneElement(onlinePve,{headerHelp:headerGuide}):onlinePve):null}
    {onlineSection==='Hall'?<View style={s.sectionStack}>
      {isValidElement<{playerState?:GameState;activeSection?:'Overview'|'Construction'|'Bank'|'Skills'|'Legacy'|'Shop';onSectionChange?:(section:GuildNavigationState['hallSection'])=>void;onTokenRewardsChanged?:()=>void|Promise<unknown>;headerHelp?:ReactNode}>(onlineHall)
       ?cloneElement(onlineHall,{activeSection:hallSection,playerState:state,onTokenRewardsChanged,headerHelp:headerGuide,onSectionChange:next=>{if(next==='Skills'){setProgressTab('Skills');setOnlineSection('Progress')}else setHallSection(next);guildScroll.current?.scrollTo({y:0,animated:false})}})
       :onlineHall}
    </View>:null}
    {onlineSection==='Chat'?onlineChat:null}
    {onlineSection==='Appearance'&&canCustomize?<View style={s.sectionStack}><GameButton compact title={st('Manage Guild')} tone="secondary" onPress={()=>setOnlineSection('Manage')}/><GuildSectionHeader label={st("IDENTITY")} title={st("Guild Appearance")} copy={st("Manage the Guild tag, banner, border, colors, nameplate and motto with role-based permissions.")} action={headerGuide}/>{onlineCustomize}</View>:null}
    {onlineSection==='Manage'?<View style={s.sectionStack}>{canCustomize?<><Panel><Text style={s.title}>{st('Identity & appearance')}</Text><Text style={s.sub}>{st('Manage the Guild tag, banner, border, colors, nameplate and motto with role-based permissions.')}</Text><GameButton title={st('Guild Appearance')} onPress={()=>setOnlineSection('Appearance')}/></Panel><Panel><Text style={s.title}>{st('Recruitment & members')}</Text><GameButton title={st('Requests')} tone="secondary" onPress={()=>{setRosterSection('Requests');setOnlineSection('Roster')}}/>{onRecruitment?<GameButton title={st('Guild recruitment')} tone="secondary" onPress={onRecruitment}/>:null}</Panel></>:null}<GameButton compact title={gl('Membership & leadership safety')} tone="secondary" onPress={()=>{setRosterSection('Safety');setOnlineSection('Roster')}}/><GameButton compact title={gl('Roadmap & future content')} tone="secondary" onPress={()=>setOnlineSection('Future')}/></View>:null}
    {onlineSection==='Future'?<GuildFutureContent/>:null}
  </ScrollView><GuildGuideLibrary visible={guideLibraryOpen} onClose={()=>setGuideLibraryOpen(false)} role={guildRole}/></View>;
  const joined=state.account.guildMember,contribution=state.account.guildContribution??0,project=Math.max(state.account.guildProjectProgress??0,Math.min(1000,contribution)),bossHp=state.account.guildBossHp??100000;
  // Local QA represents the player as an Officer so the permissioned upgrade path can be exercised.
  const localPlayerRole='Officer' as LocalGuildMember['role'];
  const canUpgradeSkills=localPlayerRole==='Leader'||localPlayerRole==='Officer';
  const [memberRoles,setMemberRoles]=useState<Record<string,LocalGuildMember['role']>>({}),[selectedMember,setSelectedMember]=useState<LocalGuildMember|null>(null);
  const manageMember=(member:LocalGuildMember)=>{const current=memberRoles[member.name]??member.role;gameAlert.alert(member.name,`${current} · Level ${member.level}`,[{text:'Cancel',style:'cancel'},{text:current==='Member'?'Promote to Officer':'Demote to Member',onPress:()=>setMemberRoles(previous=>({...previous,[member.name]:current==='Member'?'Officer':'Member'}))},{text:'View member activity',onPress:()=>gameAlert.alert(member.name,member.status)}])};
  return <><ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <Text accessibilityRole="header" style={s.h}>{gl('Guild')}</Text>
    <View accessibilityRole="tablist" style={s.tabs}>{(['Home','PvE','Roster','Skills','Bank'] as const).map(value=><TabChip key={value} label={value==='Roster'?st('Roster · {count}',{count:joined?ROSTER.length:0}):value} selected={section===value} onPress={()=>setSection(value)}/>)}</View>
    {section==='Home'&&<GuildLocalHome state={state} joined={joined} project={project} contribution={contribution} bossHp={bossHp} onNavigate={setSection} onChange={onChange}/>}
    {section==='Skills'&&<GuildLocalSkillsScreen state={state} contribution={contribution} canUpgrade={canUpgradeSkills} onChange={onChange} onViewBank={()=>setSection('Bank')}/>}
    {section==='Bank'&&<GuildBankPanel state={state} canManage={canUpgradeSkills} onChange={onChange}/>}
    {section==='PvE'&&onlinePve}
    {section==='Roster'&&<GuildRosterPanel joined={joined} memberRoles={memberRoles} onOpen={setSelectedMember} onManage={manageMember}/>}
  </ScrollView><LocalMemberProfileModal member={selectedMember} onClose={()=>setSelectedMember(null)}/></>;
}

function GuildRosterPanel({joined,memberRoles,onOpen,onManage}:{joined:boolean;memberRoles:Record<string,LocalGuildMember['role']>;onOpen:(member:LocalGuildMember)=>void;onManage:(member:LocalGuildMember)=>void}){
 const {gl}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>({...makeStyles(C),...makeLocalStyles(C),...makeGuildExtraStyles(C),...makeGuildBankStyles(C)}),[C]);
 const canManage=joined;
 return <View style={s.localRoster}><View style={s.localSectionHead}><View style={s.flex}><Text style={s.localSectionTitle}>{gl("Guild Roster")}</Text><Text style={s.localSectionCopy}>{gl("Open a member showcase, check presence, or manage members according to your role.")}</Text></View><Text style={s.localOnline}>{LOCAL_ROSTER.filter(row=>row.online).length} online</Text></View><View style={s.localRosterSummary}><Text style={s.localRosterSummaryText}>{gl("5 members · 2 online · weekly activity visible to the guild")}</Text></View>{joined?LOCAL_ROSTER.map(member=>{const role=memberRoles[member.name]??member.role;return <View style={s.localMemberRow} key={member.name}><Pressable accessibilityRole="button" accessibilityLabel={gl('Open player showcase')+' '+member.name} onPress={()=>onOpen({...member,role})} style={({pressed})=>[s.localMemberIdentity,pressed&&s.pressed]}><IdentityArtwork name={member.name} className={member.className}/><View style={s.flex}><Text style={s.localMemberName}>{member.name}</Text><Text style={s.localMemberMeta}>{gl(member.className)} · {gl('Level')} {member.level} · {gl(role)}</Text><View style={s.localPresence}><View style={[s.localPresenceDot,member.online?s.localPresenceOnline:s.localPresenceAway]}/><Text style={s.localPresenceText}>{gl(member.lastOnline)}</Text></View></View></Pressable>{canManage&&role!=='Leader'?<Pressable accessibilityRole="button" accessibilityLabel={gl('Manage')+' '+member.name} onPress={()=>onManage({...member,role})} style={s.localManage}><Text style={s.localManageText}>{gl("Manage")}</Text></Pressable>:null}</View>}) : <Text style={s.sub}>{gl("Join a guild to view its members.")}</Text>}</View>;
}

function LocalMemberProfileModal({member,onClose}:{member:LocalGuildMember|null;onClose:()=>void}){
 const {gl}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>({...makeStyles(C),...makeLocalStyles(C),...makeGuildExtraStyles(C),...makeGuildBonusStyles(C)}),[C]);
 if(!member)return null;
 return <Modal transparent visible animationType="fade" onRequestClose={onClose}><Pressable style={s.localModalBackdrop} onPress={onClose}><Pressable style={s.localProfileModal} onPress={event=>event.stopPropagation()}><Text style={s.localModalKicker}>{gl("PLAYER SHOWCASE")}</Text><View style={s.localProfileHead}><IdentityArtwork name={member.name} className={member.className}/><View style={s.flex}><Text style={s.localProfileName}>{member.name}</Text><Text style={s.localProfileMeta}>{gl(member.className)} · {gl('Level')} {member.level}</Text><Text style={s.localProfileRole}>{gl(member.role)} · {gl(member.online?'Online now':member.lastOnline)}</Text></View></View><Text style={s.localProfileStatus}>{gl(member.status)}</Text><GameButton title={gl('Close')} tone="secondary" onPress={onClose}/></Pressable></Pressable></Modal>;
}

function GuildLocalHome({state,joined,project,contribution,bossHp,onNavigate,onChange}:{state:GameState;joined:boolean;project:number;contribution:number;bossHp:number;onNavigate:(section:GuildSection)=>void;onChange:(next:GameState)=>void}){
 const {gl}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>({...makeStyles(C),...makeLocalStyles(C)}),[C]);
 const metrics=state.account.longTermMetrics??{},activity=Math.min(100,Math.round(project/10)),members=joined?ROSTER.length:0;
 const guildXp=Math.max(0,Math.floor(metrics.guild_xp??0),Math.floor(contribution));
 const guildLevel=Math.max(1,Math.min(10,Array.from({length:10},(_,i)=>i+1).filter(level=>guildXp>=guildXpThresholdForLevelV1(level)).pop()??1));
 const spent=GUILD_SKILL_NODES.reduce((total,row)=>total+Math.min(3,Math.max(0,Math.floor(metrics[`guild_skill_${row.id}`]??0))),0);
 const skillPoints=Math.max(0,guildSkillPointsForLevelV1(guildLevel)-spent);
 const claimed=GUILD_ACTIVITY_MILESTONE_DEFS.filter(row=>metrics[`guild_activity_claim_${row.threshold}`]===1).map(row=>row.threshold);
 const contribute=()=>onChange({...state,account:{...state.account,guildContribution:contribution+100,guildProjectProgress:Math.min(1000,project+100),longTermMetrics:{...metrics,guild_xp:guildXp+100}}});
 const claim=(threshold:number)=>{if(activity<threshold||claimed.includes(threshold))return;const gold=threshold===100?50000:threshold===80?25000:threshold===60?15000:threshold===40?7500:2500;const items=threshold===100?[{itemId:'OATHGLASS_SHARD',quantity:2}]:threshold===60?[{itemId:'MOSS_FIBER',quantity:10}]:[];onChange({...state,character:state.character?{...state.character,gold:state.character.gold+gold}:state.character,inventory:{...state.inventory,stacks:stackItems(state.inventory.stacks,items)},account:{...state.account,longTermMetrics:{...metrics,[`guild_activity_claim_${threshold}`]:1}}})};
 const openPve=()=>onNavigate('PvE');
 return <View style={s.localHome}>
  <View style={s.localGuildHero}><View style={s.localHeroBackdrop}><GuildIdentitySummary name={joined?'The Bloomwardens':gl('Find your guild')} level={1} memberCount={members} memberCap={12} backgroundId={state.account.guildBackgroundId} bannerId={state.account.guildBannerId} frameId={state.account.guildProfileFrameId} nameplateId={state.account.guildNameplateId} motto={state.account.guildMotto}/></View><View style={s.localHeroMeta}><Text style={s.localTag}>BLOOMWARDENS</Text><Text style={s.localOnline}>{members} {gl('members · local QA guild')}</Text></View></View>
  <View style={s.localCardGrid}>
   <Pressable accessibilityRole="button" onPress={()=>onNavigate('Roster')} style={({pressed})=>[s.localFeatureCard,pressed&&s.pressed]}><View style={s.localFeatureIcon}><ThemedIcon name="chat" size={28}/></View><View style={s.localFeatureCopy}><Text style={s.localFeatureTitle}>{gl('Guild Chat')}</Text><Text style={s.localFeatureText}>{gl("Strategy, updates and casual talk.")}</Text></View><Text style={s.localArrow}>›</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={()=>onNavigate('Roster')} style={({pressed})=>[s.localFeatureCard,pressed&&s.pressed]}><View style={s.localFeatureIcon}><ThemedIcon name="friends" size={28}/></View><View style={s.localFeatureCopy}><Text style={s.localFeatureTitle}>{gl("Members")}</Text><Text style={s.localFeatureText}>{gl("View roster, roles and activity.")}</Text></View><Text style={s.localArrow}>›</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={openPve} style={({pressed})=>[s.localFeatureCard,pressed&&s.pressed]}><View style={s.localFeatureIcon}><ThemedIcon name="guild" size={28}/></View><View style={s.localFeatureCopy}><Text style={s.localFeatureTitle}>{gl("Projects")}</Text><Text style={s.localFeatureText}>{gl("Build, research and unlock bonuses.")}</Text></View><Text style={s.localArrow}>›</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={openPve} style={({pressed})=>[s.localFeatureCard,pressed&&s.pressed]}><View style={[s.localFeatureIcon,s.localBossIcon]}><ThemedIcon name="guild" size={28}/></View><View style={s.localFeatureCopy}><Text style={s.localFeatureTitle}>{gl("Guild Boss")}</Text><Text style={s.localFeatureText}>{gl("Team up for shared rewards.")}</Text></View><Text style={s.localArrow}>›</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={()=>onNavigate('Skills')} style={({pressed})=>[s.localFeatureCard,pressed&&s.pressed]}><View style={s.localFeatureIcon}><ThemedIcon name="skills" size={28}/></View><View style={s.localFeatureCopy}><Text style={s.localFeatureTitle}>{gl("Guild Skills")}</Text><Text style={s.localFeatureText}>{gl("Explore the three-branch progression tree.")}</Text></View><Text style={s.localArrow}>›</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={()=>onNavigate('Bank')} style={({pressed})=>[s.localFeatureCard,pressed&&s.pressed]}><View style={s.localFeatureIcon}><ThemedIcon name="inventory" size={28}/></View><View style={s.localFeatureCopy}><Text style={s.localFeatureTitle}>{gl("Guild Bank")}</Text><Text style={s.localFeatureText}>{gl("Donate resources and fund shared upgrades.")}</Text></View><Text style={s.localArrow}>›</Text></Pressable>
  </View>
  <View style={s.localActivity}><View style={s.localSectionHead}><View style={s.flex}><Text style={s.localSectionTitle}>{gl("Guild Activity")}</Text><Text style={s.localSectionCopy}>{gl("Complete projects, defeat the guild boss, and help your guild grow.")}</Text></View><Text style={s.localReset}>{gl("WEEKLY")}</Text></View><View style={s.localActivityRow}><View style={s.localRing}><Text style={s.localPercent}>{activity}%</Text><Text style={s.localRingLabel}>{gl("WEEKLY GOAL")}</Text><Text style={s.localRingValue}>{project.toLocaleString()} / 1,000</Text></View><View style={s.localMilestones}>{GUILD_ACTIVITY_MILESTONE_DEFS.slice(0,3).map(row=><LocalMilestone key={row.threshold} label={gl(row.name)} value={gl(claimed.includes(row.threshold)?'Claimed':activity>=row.threshold?activityRewardLabel(row.threshold):'Locked')} active={activity>=row.threshold} claimed={claimed.includes(row.threshold)} onPress={()=>claim(row.threshold)}/>)}</View></View><View style={s.localRewardStrip}>{GUILD_ACTIVITY_MILESTONE_DEFS.slice(3).map(row=><LocalMilestone key={row.threshold} label={gl(row.name)} value={gl(claimed.includes(row.threshold)?'Claimed':activity>=row.threshold?activityRewardLabel(row.threshold):'Locked')} active={activity>=row.threshold} claimed={claimed.includes(row.threshold)} onPress={()=>claim(row.threshold)}/>)}</View></View>
  <View style={s.localPriority}><View style={s.localSectionHead}><View style={s.flex}><Text style={s.localSectionTitle}>{gl("Current Priority")}</Text><Text style={s.localSectionCopy}>{gl("Sanctum Expansion · Guild Project")}</Text></View><Text style={s.localPriorityIcon}>◆</Text></View><View style={s.localPriorityBody}><View style={s.flex}><Text style={s.localPriorityTitle}>{gl("Restore the guild project")}</Text><Text style={s.localSectionCopy}>{project.toLocaleString()} / 1,000 {gl('effort restored · You contributed')} {contribution.toLocaleString()}</Text><View style={s.localTrack}><View style={[s.localTrackFill,{width:`${Math.max(3,activity)}%`}]}/></View></View><GameButton compact title={gl('Contribute 100')} onPress={contribute}/></View></View>
 </View>;
}

function GuildLocalSkillsScreen({state,contribution,canUpgrade,onChange,onViewBank}:{state:GameState;contribution:number;canUpgrade:boolean;onChange:(next:GameState)=>void;onViewBank:()=>void}){
 const metrics=state.account.longTermMetrics??{};
 const guildXp=Math.max(0,Math.floor(metrics.guild_xp??0),Math.floor(contribution));
 const guildLevel=Math.max(1,Math.min(10,Array.from({length:10},(_,i)=>i+1).filter(level=>guildXp>=guildXpThresholdForLevelV1(level)).pop()??1));
 const spent=GUILD_SKILL_NODES.reduce((total,row)=>total+Math.min(3,Math.max(0,Math.floor(metrics[`guild_skill_${row.id}`]??0))),0);
 const skillPoints=Math.max(0,guildSkillPointsForLevelV1(guildLevel)-spent);
 const spend=(id:string)=>{const node=GUILD_SKILL_NODES.find(row=>row.id===id),current=Math.max(0,Math.floor(metrics[`guild_skill_${id}`]??0)),cost=node?.costs[current]??{};if(!node||!canUpgrade||skillPoints<=0||current>=3||!Object.entries(cost).every(([resource,quantity])=>Math.max(0,Math.floor(metrics[`guild_bank_${resource}`]??0))>=quantity))return;const nextMetrics:Record<string,number>={...metrics,[`guild_skill_${id}`]:current+1};for(const [resource,quantity] of Object.entries(cost))nextMetrics[`guild_bank_${resource}`]=Math.max(0,Math.floor(metrics[`guild_bank_${resource}`]??0))-quantity;onChange({...state,account:{...state.account,longTermMetrics:nextMetrics}})};
 return <View style={{gap:10}}><GuildSpecializationPaths guildLevel={guildLevel} skillPoints={skillPoints} metrics={metrics} canUpgrade={canUpgrade} onSpend={spend} onViewBank={onViewBank}/></View>;
}

function LocalMilestone({label,value,active,claimed,onPress}:{label:string;value:string;active:boolean;claimed?:boolean;onPress?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>({...makeStyles(C),...makeLocalStyles(C)}),[C]);
 return <Pressable accessibilityRole="button" disabled={!active||claimed} onPress={onPress} style={[s.localMilestone,active&&s.localMilestoneActive]}><Text style={s.localMilestoneValue}>{value}</Text><Text style={s.localMilestoneLabel}>{label}</Text></Pressable>;
}

function activityRewardLabel(threshold:number){return threshold===100?'+50K +2 shard':threshold===80?'+25K gold':threshold===60?'+15K +10 fiber':threshold===40?'+7.5K gold':'+2.5K gold'}

function stackQuantity(stacks:{itemId:string;quantity:number}[],itemId:string){return stacks.filter(row=>row.itemId===itemId).reduce((sum,row)=>sum+row.quantity,0)}
function removeStacks(stacks:{itemId:string;quantity:number}[],itemId:string,amount:number){let remaining=amount;return stacks.map(row=>{if(row.itemId!==itemId||remaining<=0)return row;const used=Math.min(remaining,row.quantity);remaining-=used;return {...row,quantity:row.quantity-used}}).filter(row=>row.quantity>0)}
function guildCostLabel(cost:Record<string,number>,language:import('../i18n/languages').Language){return Object.entries(cost).map(([id,quantity])=>`${quantity} ${localizedItemName(language,id)}`).join(' · ')}

function GuildBankPanel({state,canManage,onChange}:{state:GameState;canManage:boolean;onChange:(next:GameState)=>void}){
 const {gl,language}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>({...makeStyles(C),...makeLocalStyles(C),...makeGuildExtraStyles(C),...makeGuildBankStyles(C)}),[C]);
 const metrics=state.account.longTermMetrics??{},dayKey=new Date().toISOString().slice(0,10),dailyKey=`guild_bank_daily_${dayKey}`,dailyUsed=Math.max(0,Math.floor(metrics[dailyKey]??0));
 const bankQuantity=(id:string)=>Math.max(0,Math.floor(metrics[`guild_bank_${id}`]??0));
 const projectReady=Object.entries(GUILD_PROJECT_COST).every(([id,quantity])=>bankQuantity(id)>=quantity);
 const donate=(itemId:string,requested:number)=>{const available=stackQuantity(state.inventory.stacks,itemId),amount=Math.min(requested,available,Math.max(0,GUILD_BANK_DAILY_CAP-dailyUsed));if(amount<=0)return;onChange({...state,inventory:{...state.inventory,stacks:removeStacks(state.inventory.stacks,itemId,amount)},account:{...state.account,longTermMetrics:{...metrics,[dailyKey]:dailyUsed+amount,[`guild_bank_${itemId}`]:bankQuantity(itemId)+amount}}})};
 const fundProject=()=>{if(!canManage||!projectReady)return;const nextMetrics:Record<string,number>={...metrics,guild_project_started:1};for(const [id,quantity] of Object.entries(GUILD_PROJECT_COST))nextMetrics[`guild_bank_${id}`]=bankQuantity(id)-quantity;onChange({...state,account:{...state.account,guildProjectProgress:Math.max(state.account.guildProjectProgress??0,100),longTermMetrics:nextMetrics}})};
 const bankTotal=GUILD_BANK_RESOURCES.reduce((sum,row)=>sum+bankQuantity(row.itemId),0);
 return <View style={s.localBank}><View style={s.localSectionHead}><View style={s.flex}><Text style={s.localSectionTitle}>{gl("Guild Bank")}</Text><Text style={s.localSectionCopy}>{gl("Shared materials fund Projects and Guild Skill upgrades. Donations are permanent guild resources.")}</Text></View><Text style={s.localSkillPoints}>{bankTotal.toLocaleString(language)} {gl('units')}</Text></View><View style={s.localBankCap}><Text style={s.localBankCapTitle}>{gl("Daily donation cap")}</Text><Text style={s.localBankCapValue}>{dailyUsed} / {GUILD_BANK_DAILY_CAP}</Text><View style={s.localTrack}><View style={[s.localTrackFill,{width:`${Math.min(100,dailyUsed/GUILD_BANK_DAILY_CAP*100)}%`}]}/></View><Text style={s.localSectionCopy}>{gl("Resets automatically each day. The cap applies per member, not to the whole guild.")}</Text></View><Text style={s.localBankHeading}>{gl("Donate from inventory")}</Text>{GUILD_BANK_RESOURCES.map(row=>{const carried=stackQuantity(state.inventory.stacks,row.itemId),stored=bankQuantity(row.itemId);return <View key={row.itemId} style={s.localBankRow}><ResourceArtwork itemId={row.itemId} size={32} framed/><View style={s.flex}><Text style={s.localBankName}>{localizedItemName(language,row.itemId)}</Text><Text style={s.localBankMeta}>{gl('Guild bank')} {stored.toLocaleString(language)} · {gl('You carry')} {carried.toLocaleString(language)}</Text></View><GameButton compact title={gl('Donate 25')} tone="secondary" disabled={carried<1||dailyUsed>=GUILD_BANK_DAILY_CAP} onPress={()=>donate(row.itemId,25)}/></View>})}<View style={s.localBankProject}><View style={s.localSectionHead}><View style={s.flex}><Text style={s.localSectionTitle}>{gl("Sanctum Expansion")}</Text><Text style={s.localSectionCopy}>{gl("Officer or Leader starts this shared project once the bank has the required materials.")}</Text></View><Text style={s.localBankStatus}>{gl(metrics.guild_project_started===1?'Started':projectReady?'Ready':'Needs materials')}</Text></View><Text style={s.localBankCost}>{guildCostLabel(GUILD_PROJECT_COST,language)}</Text><GameButton compact title={gl(metrics.guild_project_started===1?'Project started':'Start project')} disabled={!canManage||metrics.guild_project_started===1||!projectReady} onPress={fundProject}/></View><View style={s.localBankProject}><Text style={s.localSectionTitle}>{gl("Upgrade costs")}</Text><Text style={s.localSectionCopy}>{gl("Each Guild Skills tier consumes materials from the Guild Bank. Members can donate, Officers and Leaders can upgrade.")}</Text><Text style={s.localBankCost}>{gl("Next tier costs vary by branch and tier; view them on Guild Skills.")}</Text></View></View>;
}

function GuildResourceCost({cost,compact=false}:{cost:Record<string,number>;compact?:boolean}){
 const C=useGameTheme(),language=useGameLanguage();
 return <View style={[skillLayout.costs,compact&&skillLayout.compactCosts]}>{Object.entries(cost).map(([itemId,quantity])=>
  <View key={itemId} accessible accessibilityLabel={quantity+' '+localizedItemName(language,itemId)} style={skillLayout.resource}>
   <ResourceArtwork itemId={itemId} size={compact?20:24} framed={false}/>
   <Text style={{color:C.warning,fontSize:compact?10:12,fontWeight:'800'}}>{quantity}</Text>
  </View>)}</View>;
}

const skillLayout=StyleSheet.create({
 paths:{flexGrow:1},
 columns:{width:660,flexGrow:1,flexShrink:0,alignItems:'stretch'},
 card:{width:'100%',flexGrow:1,minHeight:215,opacity:1},
 name:{flex:1,flexShrink:1,minHeight:40,marginRight:6},
 action:{marginTop:'auto',paddingTop:8},
 tier:{minHeight:108,paddingVertical:8,opacity:1},
 costs:{flexDirection:'row',flexWrap:'wrap',gap:10,minHeight:28,alignItems:'center',marginTop:6},
 compactCosts:{flexDirection:'column',gap:4,minHeight:48},
 resource:{flexDirection:'row',alignItems:'center',gap:3},
});

function GuildSkillsPanel({guildLevel,guildXp,skillPoints,activity,metrics,canUpgrade,onSpend}:{guildLevel:number;guildXp:number;skillPoints:number;activity:number;metrics:Record<string,number>;canUpgrade:boolean;onSpend:(id:string)=>void}){
 const C=useGameTheme(),s=useMemo(()=>({...makeStyles(C),...makeLocalStyles(C),...makeGuildExtraStyles(C),...makeGuildBonusStyles(C),...makeGuildBankStyles(C)}),[C]);
 const next=guildLevel<10?guildXpThresholdForLevelV1(guildLevel+1):guildXp;
 const bonus=guildActivityBonuses(activity);
 const nextCosts=GUILD_SKILL_NODES.filter(node=>Math.floor(metrics[`guild_skill_${node.id}`]??0)<3).map(node=>node.costs[Math.min(2,Math.max(0,Math.floor(metrics[`guild_skill_${node.id}`]??0)))])[0]??{};
 return <View style={s.localSkills}>
  <View style={s.localSectionHead}><View style={s.flex}><Text style={s.localSectionTitle}>Guild Skills</Text><Text style={s.localSectionCopy}>Explore nine specialization paths across Professions, Fellowship and Vanguard.</Text></View><View><Text style={s.localSkillPoints}>{skillPoints} points</Text><GuildResourceCost cost={nextCosts}/></View></View>
  <Text style={s.localSkillLevel}>Guild Level {guildLevel} · {guildXp.toLocaleString()} / {next.toLocaleString()} XP · Activity bonuses: +{bonus.skillXpBps/100}% skill XP</Text>
  <View style={canUpgrade?s.localPermissionOpen:s.localPermissionLocked}><Text style={s.localPermissionTitle}>{canUpgrade?'Officer access · upgrades available':'Member access · view only'}</Text><Text style={s.localPermissionCopy}>{canUpgrade?'Spend points and Guild Bank materials to unlock the next tier.':'An Officer or Leader must unlock Guild Skills for the guild.'}</Text></View>
  <View style={s.localTree}><View style={s.localTreeRoot}><Text style={s.localTreeRootTitle}>Guild Hall</Text><Text style={s.localTreeRootMeta}>Shared foundation · Level {guildLevel}</Text></View><View style={s.localTreeTrunk}/>
   {GUILD_MAJOR_BRANCHES.map(major=><View key={major} style={s.localMajorBranch}><View style={s.localMajorHeader}><Text style={s.localMajorTitle}>{major}</Text><Text style={s.localMajorCopy}>Three paths · three tiers each</Text></View><ScrollView horizontal keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsHorizontalScrollIndicator={false} contentContainerStyle={skillLayout.paths} showsVerticalScrollIndicator={false}><View style={[s.localSubBranches,skillLayout.columns]}>{GUILD_SKILL_NODES.filter(node=>node.major===major).map(node=>{const level=Math.min(3,Math.max(0,Math.floor(metrics[`guild_skill_${node.id}`]??0))),nextCost=node.costs[level]??{},flatCapacity=node.id==='fellowship_membership';return <View key={node.id} style={s.localSubBranch}><View style={s.localBranchConnector}/><Pressable accessibilityRole="button" disabled={!canUpgrade||skillPoints<=0||level>=3} onPress={()=>onSpend(node.id)} style={[s.localSkillNode,skillLayout.card,level>0&&s.localSkillNodeActive]}><View style={s.localSkillNodeHead}><Image source={guildSkillArtwork(node.id)} resizeMode="contain" style={{width:40,height:40}}/><Text style={[s.localSkillName,skillLayout.name]}>{node.name}</Text><Text style={s.localSkillRank}>{level}/3</Text></View><Text style={s.localSkillScope}>{node.scope}</Text><Text style={s.localSkillSummary}>{node.summary}</Text><Text style={s.localSkillCurrent}>Current bonus: +{level*node.perTier}{flatCapacity?' members':'% '+node.label}</Text><Text style={[s.localSkillAction,skillLayout.action]}>{!canUpgrade?'Officer or Leader required':level>=3?'Maxed':skillPoints>0?'Unlock next tier':'Earn points from Guild XP'}</Text>{level<3?<GuildResourceCost cost={nextCost}/>:<Text style={s.localSkillCost}>All tiers unlocked</Text>}</Pressable><View style={s.localTierLine}/><View style={s.localTierRow}>{[1,2,3].map(tier=><View key={tier} style={[s.localTierNode,skillLayout.tier,level>=tier&&s.localTierNodeActive]}><Text style={s.localTierGlyph}>{level>=tier?'◆':'◇'}</Text><Text style={s.localTierLabel}>T{tier}</Text><Text style={s.localTierBonus}>+{tier*node.perTier}{flatCapacity?' members':'%'}</Text><GuildResourceCost cost={node.costs[tier-1]} compact/></View>)}</View></View>})}</View></ScrollView></View>)}
  </View>
 </View>;
}

function makeGuildExtraStyles(C:ThemeColors){return StyleSheet.create({localRoster:{gap:10,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:14,backgroundColor:C.panel},localRosterSummary:{padding:8,borderRadius:8,backgroundColor:C.panel2},localRosterSummaryText:{fontSize:9,color:C.muted},localMemberRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.line},localMemberIdentity:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:9,paddingVertical:3},localMemberName:{...typography.bodyStrong,color:C.info},localMemberMeta:{fontSize:9,color:C.muted,marginTop:2},localPresence:{flexDirection:'row',alignItems:'center',gap:5,marginTop:4},localPresenceDot:{width:7,height:7,borderRadius:4},localPresenceOnline:{backgroundColor:C.good},localPresenceAway:{backgroundColor:C.muted},localPresenceText:{fontSize:8,color:C.muted},localManage:{minHeight:32,justifyContent:'center',paddingHorizontal:8,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},localManageText:{fontSize:8,color:C.accent,fontWeight:'900'},localModalBackdrop:{flex:1,alignItems:'center',justifyContent:'center',padding:18,backgroundColor:'rgba(0,0,0,.72)'},localProfileModal:{width:'100%',maxWidth:420,gap:12,padding:16,borderWidth:1,borderColor:C.accent,borderRadius:16,backgroundColor:C.panel},localModalKicker:{fontSize:9,color:C.accent,fontWeight:'900',letterSpacing:1},localProfileHead:{flexDirection:'row',alignItems:'center',gap:12},localProfileName:{...typography.title,color:C.text,fontSize:22},localProfileMeta:{fontSize:10,color:C.muted,marginTop:3},localProfileRole:{fontSize:10,color:C.good,fontWeight:'800',marginTop:5},localProfileStatus:{padding:10,borderRadius:8,backgroundColor:C.panel2,color:C.info,fontSize:11},localTree:{alignItems:'center',gap:6},localTreeRoot:{alignItems:'center',padding:10,minWidth:150,borderWidth:1,borderColor:C.accent,borderRadius:12,backgroundColor:C.goodSurface},localTreeRootTitle:{...typography.bodyStrong,color:C.text},localTreeRootMeta:{fontSize:8,color:C.muted,marginTop:3},localTreeTrunk:{width:2,height:14,backgroundColor:C.accent},localBranches:{width:'100%',flexDirection:'row',gap:6},localBranch:{flex:1,alignItems:'center',gap:5},localBranchConnector:{width:2,height:10,backgroundColor:C.lineStrong},localTierLine:{width:'70%',height:1,backgroundColor:C.lineStrong},localTierRow:{width:'100%',flexDirection:'row',justifyContent:'center',gap:4},localTierNode:{flex:1,minHeight:34,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:7,backgroundColor:C.panel2,opacity:.6},localTierNodeActive:{borderColor:C.good,backgroundColor:C.goodSurface,opacity:1},localTierGlyph:{fontSize:10,color:C.accent},localTierLabel:{fontSize:7,color:C.muted,fontWeight:'900'}});}
function makeGuildBonusStyles(C:ThemeColors){return StyleSheet.create({localSkillCurrent:{fontSize:8.5,color:C.good,fontWeight:'900',marginTop:3},localTierBonus:{fontSize:7,color:C.info,fontWeight:'900',marginTop:2}});}
function makeGuildBankStyles(C:ThemeColors){return StyleSheet.create({localSkillCost:{fontSize:7.5,color:C.warning,fontWeight:'800',marginTop:2},localTierCost:{fontSize:5.5,color:C.muted,textAlign:'center',marginTop:2},localMajorBranch:{width:'100%',gap:6,padding:8,borderWidth:1,borderColor:C.lineStrong,borderRadius:12,backgroundColor:C.panel2},localMajorHeader:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:8},localMajorTitle:{fontSize:12,color:C.accent,fontWeight:'900'},localMajorCopy:{fontSize:7.5,color:C.muted},localSubBranches:{flexDirection:'row',gap:6},localSubBranch:{flex:1,alignItems:'center',gap:4},localBank:{gap:10,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:14,backgroundColor:C.panel},localBankCap:{padding:10,borderRadius:10,backgroundColor:C.panel2},localBankCapTitle:{fontSize:9,color:C.text,fontWeight:'900'},localBankCapValue:{fontSize:14,color:C.accent,fontWeight:'900',marginTop:2},localBankHeading:{fontSize:10,color:C.accentSoft,fontWeight:'900',letterSpacing:.5},localBankRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:7,borderBottomWidth:1,borderBottomColor:C.line},localBankName:{fontSize:11,color:C.text,fontWeight:'900'},localBankMeta:{fontSize:8.5,color:C.muted,marginTop:2},localBankProject:{gap:7,padding:10,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},localBankStatus:{fontSize:8,color:C.good,fontWeight:'900'},localBankCost:{fontSize:8.5,color:C.warning,fontWeight:'800',lineHeight:12}});}

function makeLocalStyles(C:ThemeColors){return StyleSheet.create({localHome:{gap:10},localGuildHero:{gap:4,padding:8,borderWidth:1,borderColor:C.lineStrong,borderRadius:14,backgroundColor:C.panel},localHeroBackdrop:{borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},localHeroMeta:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,paddingHorizontal:4},localTag:{fontSize:8,color:C.accent,fontWeight:'900',letterSpacing:.8},localOnline:{fontSize:8.5,color:C.good,fontWeight:'800'},localCardGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},localFeatureCard:{flexGrow:1,flexBasis:'47%',minWidth:148,minHeight:92,flexDirection:'row',alignItems:'center',gap:8,padding:10,borderWidth:1,borderColor:C.lineStrong,borderRadius:12,backgroundColor:C.panel},localFeatureIcon:{width:42,height:42,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderWidth:1,borderColor:C.lineStrong},localBossIcon:{backgroundColor:C.badSurface},localFeatureCopy:{flex:1,minWidth:0,gap:3},localFeatureTitle:{...typography.bodyStrong,color:C.text,fontSize:14},localFeatureText:{fontSize:9.5,lineHeight:13,color:C.muted},localArrow:{fontSize:24,color:C.accent,fontWeight:'900'},localActivity:{gap:10,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:14,backgroundColor:C.panel},localSectionHead:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:8},localSectionTitle:{...typography.title,color:C.text,fontSize:18},localSectionCopy:{fontSize:10,lineHeight:14,color:C.muted,marginTop:3},localReset:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.6},localActivityRow:{flexDirection:'row',alignItems:'center',gap:12},localRing:{width:116,height:116,borderRadius:58,borderWidth:9,borderColor:C.accent,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2},localPercent:{fontSize:27,color:C.text,fontWeight:'900'},localRingLabel:{fontSize:7,color:C.muted,fontWeight:'900',letterSpacing:.5},localRingValue:{fontSize:8,color:C.info,fontWeight:'800',marginTop:2},localMilestones:{flex:1,gap:6},localRewardStrip:{flexDirection:'row',gap:6},localMilestone:{flex:1,minHeight:45,justifyContent:'center',paddingHorizontal:8,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2,opacity:.55},localMilestoneActive:{borderColor:C.good,backgroundColor:C.goodSurface,opacity:1},localMilestoneValue:{fontSize:11,color:C.text,fontWeight:'900'},localMilestoneLabel:{fontSize:8,color:C.muted,fontWeight:'800'},localPriority:{gap:10,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:14,backgroundColor:C.panel},localPriorityIcon:{fontSize:22,color:C.accent},localPriorityBody:{flexDirection:'row',alignItems:'center',gap:10},localPriorityTitle:{...typography.bodyStrong,color:C.text,fontSize:14},localTrack:{height:8,marginTop:8,borderRadius:5,overflow:'hidden',backgroundColor:C.panel2},localTrackFill:{height:'100%',backgroundColor:C.accent},localSkills:{gap:10,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:14,backgroundColor:C.panel},localPermissionOpen:{padding:9,borderRadius:9,borderWidth:1,borderColor:C.good,backgroundColor:C.goodSurface},localPermissionLocked:{padding:9,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},localPermissionTitle:{fontSize:9,color:C.text,fontWeight:'900'},localPermissionCopy:{fontSize:9,color:C.muted,marginTop:2},localSkillPoints:{fontSize:10,color:C.accent,fontWeight:'900'},localSkillLevel:{fontSize:9.5,color:C.muted},localSkillTree:{gap:7},localSkillNode:{gap:3,padding:9,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2,opacity:.7},localSkillNodeActive:{borderColor:C.accent,opacity:1},localSkillNodeHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:6},localSkillName:{...typography.bodyStrong,color:C.text,flex:1,minWidth:0},localSkillRank:{fontSize:11,color:C.accent,fontWeight:'900'},localSkillScope:{fontSize:7.5,color:C.info,fontWeight:'900',letterSpacing:.6},localSkillSummary:{fontSize:9.5,lineHeight:13,color:C.muted},localSkillAction:{fontSize:8.5,color:C.accentSoft,fontWeight:'800',marginTop:3}});}

function GuildSectionHeader({label,title,copy,action}:{label:string;title:string;copy:string;action?:ReactNode}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={s.groupHeader}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1,minWidth:0,gap:2}}><Text style={s.groupLabel}>{label}</Text><Text style={s.groupTitle}>{title}</Text><Text style={s.groupCopy}>{copy}</Text></View>{action}</View></View>;
}

export function GuildOnlineHome({onNavigate,onNavigateMuster,onNavigateQuests,onNavigateShop,onRewardsChanged,onGuide,board,chatUnread=0,canCustomize=false,votePending=false,onNavigateProjectVote}:{onNavigateMuster:()=>void;onNavigateQuests?:()=>void;onNavigateShop:()=>void;onRewardsChanged?:()=>void|Promise<unknown>;onGuide?:()=>void;onNavigate:(section:OnlineGuildSection)=>void;board?:ReactNode;chatUnread?:number;canCustomize?:boolean;votePending?:boolean;onNavigateProjectVote?:()=>void}){
 const projectUi=useOnlineGuildProjectUiText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const voteReminder=votePending&&onNavigateProjectVote?<Pressable accessibilityRole="button" accessibilityLabel={projectUi("Vote for next week's project")}
  onPress={onNavigateProjectVote} style={({pressed})=>[s.weeklyVoteReminder,pressed&&s.pressed]}>
  <View style={s.weeklyVoteReminderDot}/><View style={{flex:1,minWidth:0}}>
   <Text style={s.weeklyVoteReminderTitle}>{projectUi("Vote for next week's project")}</Text>
   <Text style={s.weeklyVoteReminderMeta}>{projectUi('Voting closes Monday at 00:00 UTC')}</Text>
  </View><Text style={s.weeklyVoteReminderArrow}>›</Text>
 </Pressable>:null;
 return <View style={s.homeStack}>
  <GuildMemberIdentity onRoster={()=>onNavigate('Roster')}/>
  <GuildHomeActions summary={<GuildHallSummary compact onOpenMuster={onNavigateMuster} onOpenShop={onNavigateShop} onRewardsChanged={onRewardsChanged}/>} voteReminder={voteReminder} board={isValidElement<{compact?:boolean}>(board)?cloneElement(board,{compact:true}):board} activity={<GuildActivitySummaryPanel compact/>} canManage={canCustomize} chatUnread={chatUnread} onProjects={()=>onNavigateProjectVote?onNavigateProjectVote():onNavigate('Progress')} onQuests={()=>onNavigateQuests?onNavigateQuests():onNavigate('Activities')} onShop={onNavigateShop} onPve={()=>onNavigate('PvE')} onRoster={()=>onNavigate('Roster')} onChat={()=>onNavigate('Chat')} onManage={()=>onNavigate('Manage')} onRoadmap={()=>onNavigate('Future')} onGuide={onGuide}/>
 </View>;
}

function GuildHomeHeader({board}:{board?:ReactNode}){
 const {gl}=useGameplayText();
 const [guild,setGuild]=useState<OnlineGuild|null>(null),[status,setStatus]=useState(gl('Loading your guild…'));
 useEffect(()=>{let active=true;void myGuild().then(mine=>mine?guildDetails(mine.guild_id):null).then(next=>{if(active){setGuild(next);setStatus(next?'':gl('Join a guild to build something together.'))}}).catch(()=>{if(active)setStatus(gl('Your guild identity is temporarily unavailable.'))});return()=>{active=false}},[]);
 return <>{guild?<GuildIdentitySummary name={guild.name} tag={guild.tag} tagColorId={guild.tag_color_id} level={guild.level} backgroundId={guild.background_id} bannerId={guild.banner_id} frameId={guild.profile_frame_id} nameColorId={guild.name_color_id} nameplateId={guild.nameplate_id} motto={guild.motto}/>:<GuildBoardHero compact title={gl('Guild Home')} subtitle={status}/>}{board}</>;
}

function GuildFutureContent(){
 const st=useSocialText();
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const entries=[
  ['Guild vs Guild','SEASONAL GUILD COMPETITION','Asynchronous guild-versus-guild matchups with contribution objectives, fair brackets and no requirement for every member to be online together.'],
  ['Guild Raids','LARGE-SCALE PVE','Longer guild encounters built around role contribution, shared boss progress and guild-wide completion rewards.'],
  ['Guild Trials','ROTATING CHALLENGES','Short rotating guild challenges with authored restrictions, score targets and cooperative mastery goals.'],
  ['Guild Expeditions','ASYNC GUILD MISSIONS','Long-form cooperative missions where members contribute different combat and skilling requirements over time.'],
  ['Guild Legacy','SEASONS & HISTORY','A permanent guild record of past seasons, raid clears, Guild vs Guild results, major Projects, trophies and notable guild milestones.'],
 ] as const;
 return <View style={s.futureWrap}><Panel><Text style={s.kicker}>{st("FUTURE GUILD CONTENT")}</Text><Text style={s.title}>{st("In Development")}</Text><Text style={s.sub}>{st("These destinations are visible for roadmap clarity only. They do not accept contributions, consume resources or affect rankings yet. Guild Legacy will eventually extend the Guild Hall Trophy Room into a permanent seasonal history.")}</Text></Panel>
  <View style={s.futureGrid}>{entries.map(([title,label,copy])=><View key={title} accessible accessibilityRole="summary" accessibilityLabel={st('{title}, In Development',{title:socialLabel(language,title)})} style={s.futureCard}><Text style={s.futureLabel}>{socialLabel(language,label)}</Text><Text style={s.futureTitle}>{socialLabel(language,title)}</Text><Text style={s.futureCopy}>{socialLabel(language,copy)}</Text><GameButton compact title={st("In Development")} tone="secondary" disabled onPress={()=>{}}/></View>)}</View>
 </View>;
}

function TabChip({label,selected,badge=0,warningBadge=false,onPress}:{label:string;selected:boolean;badge?:number;warningBadge?:boolean;onPress:()=>void}){
 const st=useSocialText();const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),badgeLabel=badge>0?st(warningBadge?'{count} mentions':'{count} updates',{count:badge}):'';return <Pressable accessibilityRole="tab" aria-selected={selected} accessibilityState={{selected}} accessibilityLabel={badgeLabel?`${label}, ${badgeLabel}`:label} onPress={onPress} style={({pressed})=>[s.tabChip,selected&&s.tabChipSelected,warningBadge&&s.tabChipWarning,pressed&&s.pressed]}><View style={s.tabLabel}><Text style={[s.tabText,selected&&s.tabTextSelected]}>{label}</Text>{badge>0?<View style={[s.tabBadge,warningBadge&&s.tabBadgeWarning]}><Text style={s.tabBadgeText}>{badge>99?'99+':badge}</Text></View>:null}</View></Pressable>}
 function makeStyles(C:ThemeColors){return StyleSheet.create({weeklyVoteReminder:{minHeight:56,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:11,paddingVertical:8,borderWidth:1,borderColor:C.lineStrong,borderRadius:9,backgroundColor:C.panelRaised},weeklyVoteReminderDot:{width:7,height:7,borderRadius:4,backgroundColor:C.notification},weeklyVoteReminderTitle:{fontSize:12,lineHeight:17,fontWeight:'800',color:C.text},weeklyVoteReminderMeta:{fontSize:10,lineHeight:14,color:C.muted},weeklyVoteReminderArrow:{fontSize:19,color:C.accent,fontWeight:'900'},sectionStack:{gap:10},groupHeader:{gap:2,paddingHorizontal:2,paddingTop:4},groupLabel:{fontSize:8,color:C.accentSoft,fontWeight:'900',letterSpacing:.7},groupTitle:{...typography.title,color:C.text,fontSize:15},groupCopy:{fontSize:9.5,lineHeight:13,color:C.muted},homeStack:{gap:10},homeWelcome:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:C.selectionLine,borderRadius:14,backgroundColor:C.selection},homeWelcomeKicker:{fontSize:8,color:C.accentSoft,fontWeight:'900',letterSpacing:.8},homeWelcomeTitle:{...typography.title,color:C.text,fontSize:18,marginTop:2},homeWelcomeCopy:{fontSize:10.5,lineHeight:14,color:C.muted,marginTop:3},priorityWrap:{gap:4},priorityLabel:{fontSize:8,color:C.accent,fontWeight:'900',letterSpacing:.8,paddingHorizontal:2},homeGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},homeCard:{flexGrow:1,flexBasis:'46%',minWidth:142,minHeight:140,flexDirection:'row',alignItems:'flex-start',gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},homeCardIcon:{width:42,height:42,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderWidth:1,borderColor:C.lineStrong},homeCardCopy:{flex:1,minWidth:0,gap:2},homeLabel:{fontSize:7.5,color:C.accentSoft,fontWeight:'900',letterSpacing:.55},homeTitle:{...typography.bodyStrong,color:C.text},homeCopy:{fontSize:10,lineHeight:14,color:C.muted},homeOpen:{fontSize:22,lineHeight:28,color:C.info,fontWeight:'900'},homeSecondary:{flexDirection:'row',flexWrap:'wrap',gap:6},futureWrap:{gap:10},futureGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},futureCard:{flexGrow:1,flexBasis:'47%',minWidth:148,gap:5,padding:10,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:10,backgroundColor:C.panel},futureLabel:{fontSize:8,color:C.accentSoft,fontWeight:'900',letterSpacing:.65},futureTitle:{...typography.bodyStrong,color:C.text},futureCopy:{fontSize:10,lineHeight:14,color:C.muted,minHeight:42},root:{padding:spacing.md,gap:10,paddingBottom:100},onlineHero:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.panel},heroIcon:{width:52,height:52,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderWidth:1,borderColor:C.lineStrong},onlinePill:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:7,paddingVertical:4,borderRadius:99,backgroundColor:C.goodSurface},onlineDot:{width:6,height:6,borderRadius:3,backgroundColor:C.good},onlinePillText:{fontSize:7,color:C.good,fontWeight:'900',letterSpacing:.5},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},onlineTabs:{gap:5,paddingVertical:2,paddingRight:8},h:{...typography.hero,color:C.text},tabs:{flexDirection:'row',flexWrap:'wrap',gap:6},tabChip:{minHeight:52,paddingHorizontal:12,justifyContent:'center',borderWidth:1,borderColor:C.line,borderBottomWidth:2,borderTopLeftRadius:9,borderTopRightRadius:9,backgroundColor:C.panel},tabChipSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},tabChipWarning:{borderColor:C.warning},tabLabel:{flexDirection:'row',alignItems:'center',gap:5},tabText:{fontSize:11,fontWeight:'800',color:C.muted},tabTextSelected:{color:C.text},tabBadge:{minWidth:17,height:17,paddingHorizontal:4,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:C.notification},tabBadgeWarning:{backgroundColor:C.warning},tabBadgeText:{fontSize:7.5,color:C.notificationText,fontWeight:'900'},pressed:{opacity:.76},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},track:{height:10,backgroundColor:C.panel2,borderRadius:5,overflow:'hidden',marginVertical:10},fill:{height:10,backgroundColor:C.accent},bossFill:{height:10,backgroundColor:C.bad},member:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.line},avatar:{width:38,height:38,borderRadius:19,backgroundColor:C.panel2,borderWidth:1,borderColor:C.accent,alignItems:'center',justifyContent:'center'},avatarText:{color:C.accent,fontWeight:'900',fontSize:18},flex:{flex:1},memberName:{color:C.text,fontWeight:'900'},status:{fontSize:12,fontWeight:'700'},statusLeader:{color:C.accent},statusOfficer:{color:C.info},statusMember:{color:C.good}});}
