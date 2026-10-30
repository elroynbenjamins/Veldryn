import {RANKINGS_RELEASED} from '../core/release-flags';
import {RateAppCard} from '../components/RateAppCard';
import {DiscordButton} from '../components/DiscordButton';
import {LineworkIcon} from '../components/LineworkIcon';
import {navigationLinework} from '../components/NavigationLinework';
import {accountText} from '../i18n/account';
import {useMemo,useState} from 'react';
import {UiIcon} from '../components/UiIcon';
import {TutorialBeacon} from '../components/TutorialBeacon';
import {ThemedNavigationIcon} from '../components/ThemedNavigationIcon';
import {Image,Linking,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {t} from '../i18n';
import {GameState} from '../core/types';
import {CLASSES} from '../content/classes';
import {classEmblemIconArtwork} from '../theme/class-emblem-assets';
import {EARLY_FEATURE_DESTINATION_ORDER} from '../core/feature-unlocks';
import type {QuickNavDestination} from '../core/quick-navigation';

export type MoreDestination='Home'|'Social'|'Activity'|'DailySupplies'|'AccountBonuses'|'RewardsInbox'|'NewUnlocks'|'Quests'|'Companions'|'Skills'|'Events'|'Friends'|'Guild'|'Settings'|'Arena'|'Rankings'|'Collections'|'ResourceCodex'|'Profile'|'MasteryHall'|'Store';
const sections:Array<{label:string;items:MoreDestination[]}>= [
  {label:'PLAY & PROGRESSION',items:['Home','Quests','Companions','DailySupplies','RewardsInbox','Events','AccountBonuses']},
  {label:'SOCIAL & COMPETITION',items:['Social','Friends','Guild','Arena','Rankings']},
  {label:'IDENTITY & ACCOUNT',items:['Activity','Profile','NewUnlocks','MasteryHall','Collections','ResourceCodex','Store','Settings']},
];

function iconForDestination(id:MoreDestination):QuickNavDestination{
  if(id==='Activity'||id==='Profile'||id==='NewUnlocks'||id==='AccountBonuses')return 'Character';
  if(id==='DailySupplies'||id==='RewardsInbox'||id==='Rankings')return 'Events';
  if(id==='Arena')return 'Party';
  if(id==='Collections'||id==='ResourceCodex')return 'Inventory';
  if(id==='Store')return 'Inventory';
  if(id==='MasteryHall')return 'Skills';
  return id;
}
const customAccountIcons:Partial<Record<MoreDestination,keyof typeof navigationLinework>>={Activity:'roster',Profile:'identity',NewUnlocks:'unlocks',AccountBonuses:'bonuses',DailySupplies:'supplies',RewardsInbox:'inbox',Rankings:'trophy',Arena:'arena',Collections:'collection',ResourceCodex:'codex',MasteryHall:'mastery',Store:'store'};
function MoreIcon({id,size=28,muted=false}:{id:MoreDestination;size?:number;muted?:boolean}){
 const custom=customAccountIcons[id];return custom?<LineworkIcon name={custom} size={size} muted={muted}/>:<ThemedNavigationIcon destination={iconForDestination(id)} size={size} muted={muted}/>;
}
function itemMeta(language:GameState['settings']['language'],id:MoreDestination){
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  switch(id){
    case 'Home':return {title:a("Home"),description:a("Current activity and account overview")};
    case 'Social':return {title:a("Social"),description:a("Party, contracts, recruitment and chat")};
    case 'Activity':return {title:a("Characters"),description:a("Switch, reroll or safely delete characters")};
    case 'DailySupplies':return {title:a("Daily Supplies"),description:a("28-claim track and +10% activity boosts")};
    case 'AccountBonuses':return {title:a("Account Bonuses"),description:a("Permanent and temporary modifiers")};
    case 'RewardsInbox':return {title:a("Rewards Inbox"),description:a("Unclaimed party, guild, dungeon and event rewards")};
    case 'Quests':return {title:t(language,'more.quests'),description:t(language,'more.questsDescription')};
    case 'Companions':return {title:a("Companions"),description:a("Train, equip and master your roster")};
    case 'Skills':return {title:t(language,'more.skills'),description:t(language,'more.skillsDescription')};
    case 'Events':return {title:a("Event hub"),description:a("Annual festival calendar and past event history")};
    case 'Friends':return {title:t(language,'more.friends'),description:t(language,'more.friendsDescription')};
    case 'Guild':return {title:t(language,'more.guild'),description:t(language,'more.guildDescription')};
    case 'Store':return {title:a("Store"),description:a("VIP, VIP+, Supporter and purchase restore")};
    case 'Settings':return {title:t(language,'more.settings'),description:t(language,'more.settingsDescription')};
    case 'Arena':return {title:a("Arena"),description:a("Three-character squad mode · In Development")};
    case 'Rankings':return {title:a("Rankings"),description:a("Server-calculated prestige boards")};
    case 'Collections':return {title:a("Collections"),description:a("Collectibles and account bonuses")};
    case 'ResourceCodex':return {title:a('Codex'),description:a('Browse resources, companion materials and crafting recipes')};
    case 'Profile':return {title:a("Profile"),description:a("Identity, showcase and customization")};
    case 'NewUnlocks':return {title:a('New Unlocks'),description:a('Titles, pets, emotes and profile cosmetics you earned.')};
    case 'MasteryHall':return {title:a("Mastery Hall"),description:a("Account-wide R50 profession records and prestige")};
  }
}

export function MoreScreen({language,character,accountStatus='local',onNavigate,onOpenAdminQa,onOpenUpdates,newReleaseAvailable=false,companionAttention=false,companionUnlocked=true,lockedDestinations={},dailySuppliesAttention=false,friendRequestCount=0,guildAttentionCount=0,socialAttentionCount=0,newUnlockCount=0,storyRewardCount=0}:{language:GameState['settings']['language'];character?:GameState['character'];accountStatus?:'guest'|'pending'|'linked'|'local';onNavigate:(destination:MoreDestination)=>void;onOpenAdminQa?:()=>void;onOpenUpdates?:()=>void;newReleaseAvailable?:boolean;companionAttention?:boolean;companionUnlocked?:boolean;lockedDestinations?:Partial<Record<MoreDestination,string>>;dailySuppliesAttention?:boolean;friendRequestCount?:number;guildAttentionCount?:number;socialAttentionCount?:number;newUnlockCount?:number;storyRewardCount?:number}){
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),singleColumn=width<350||fontScale>=1.25;
  const [collapsed,setCollapsed]=useState<Record<string,boolean>>({});
  const className=CLASSES.find(row=>row.id===character?.classId)?.name??character?.classId??'';
  const quickAccess:readonly MoreDestination[]=['Activity','ResourceCodex','Store','Settings'];
  const toggleSection=(label:string)=>setCollapsed(current=>({...current,[label]:!current[label]}));
  const lockedReason=(id:MoreDestination)=>(lockedDestinations[id]?a(lockedDestinations[id]!):undefined)??(id==='Companions'&&!companionUnlocked?a("Complete Into Ironwood (Level 10)."):'');
  const attentionLabel=(id:MoreDestination)=>{
    if(lockedReason(id))return '';
    if(id==='Quests'&&storyRewardCount>0)return a('{count} story rewards ready',{count:storyRewardCount});
    if(id==='Social'&&socialAttentionCount>0)return a('{count} social updates',{count:socialAttentionCount});
    if(id==='Friends'&&friendRequestCount>0)return a('{count} incoming friend requests',{count:friendRequestCount});
    if(id==='Guild'&&guildAttentionCount>0)return a('{count} guild updates',{count:guildAttentionCount});
    if(id==='Companions'&&companionUnlocked&&companionAttention)return a("companion actions ready");
    if(id==='DailySupplies'&&dailySuppliesAttention)return a("Daily Supplies ready");
    if(id==='NewUnlocks'&&newUnlockCount>0)return a('{count} new unlocks',{count:newUnlockCount});
    return '';
  };
  const attention=(id:MoreDestination)=>{
    if(lockedReason(id))return null;
    if(id==='Quests'&&storyRewardCount>0)return <AttentionCount count={storyRewardCount} label={a('{count} story rewards ready',{count:storyRewardCount})}/>;
    if(id==='Social'&&socialAttentionCount>0)return <AttentionCount count={socialAttentionCount} label={a("Social updates")}/>;
    if(id==='Friends'&&friendRequestCount>0)return <AttentionCount count={friendRequestCount} label={a("Incoming friend requests")}/>;
    if(id==='Guild'&&guildAttentionCount>0)return <AttentionCount count={guildAttentionCount} label={a("Guild updates")}/>;
    if(id==='Companions'&&companionUnlocked&&companionAttention)return <AttentionDot label={a("Companion actions ready")}/>;
    if(id==='DailySupplies'&&dailySuppliesAttention)return <AttentionDot label={a("Daily Supplies ready")}/>;
    if(id==='NewUnlocks'&&newUnlockCount>0)return <AttentionCount count={newUnlockCount} label={a('New Unlocks')}/>;
    return null;
  };
  const attentionPriority:MoreDestination[]=['NewUnlocks','Quests','DailySupplies','Companions','Social','Friends','Guild'];
  const lockedItems=EARLY_FEATURE_DESTINATION_ORDER.filter(id=>(id!=='Rankings'||RANKINGS_RELEASED)&&!!lockedReason(id)) as MoreDestination[];
  const upcomingLocked=lockedItems.slice(0,4);
  const attentionDestinations=attentionPriority.filter(id=>!!attentionLabel(id));
  const attentionTotal=(lockedReason('Quests')?0:storyRewardCount)+(lockedReason('Social')?0:socialAttentionCount)+(lockedReason('Friends')?0:friendRequestCount)+(lockedReason('Guild')?0:guildAttentionCount)+Number(!lockedReason('Companions')&&companionAttention)+Number(!lockedReason('DailySupplies')&&dailySuppliesAttention)+newUnlockCount;
  return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <TutorialBeacon id="more-shortcuts"><View style={s.header}><Text accessibilityRole="header" style={s.heading}>{a("Account")}</Text>{attentionTotal>0?<View accessible accessibilityLabel={`${attentionTotal} ${a("NEEDS ATTENTION")}`} style={s.headerAttention}><Text style={s.headerAttentionValue}>{attentionTotal>99?'99+':attentionTotal}</Text></View>:null}</View></TutorialBeacon>

    {character&&<View style={s.profileCard}>
      <View style={s.profileAvatar}><Image accessible={false} source={classEmblemIconArtwork[character.classId]} resizeMode="contain" style={s.avatarArt}/></View>
      <View style={s.profileCopy}><Text numberOfLines={1} style={s.profileName}>{character.name}</Text><Text numberOfLines={2} style={s.profileMeta}>{className} · {a('Level')} {character.level}</Text>
        <Text style={[s.profileStatus,accountStatus==='linked'&&s.profileLinked]}>{accountStatus==='guest'?a('Guest account'):accountStatus==='pending'?a('Account setup pending'):accountStatus==='linked'?a('Linked account'):a('Local character')}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={a('Profile')} onPress={()=>onNavigate('Profile')} style={({pressed})=>[s.profileAction,pressed&&s.pressed]}><Text style={s.profileActionText}>{a('Profile')}</Text></Pressable>
    </View>}
    {(accountStatus==='guest'||accountStatus==='pending')?<Pressable accessibilityRole="button" accessibilityLabel={a('Secure guest account')} accessibilityHint={a('Open Account settings to add an email and protect your progress.')} onPress={()=>onNavigate('Settings')} style={({pressed})=>[s.securityCard,pressed&&s.pressed]}>
     <View style={s.securityIcon}><Text style={s.securityIconText}>◇</Text></View>
     <View style={s.flex}><Text style={s.securityTitle}>{a('Secure your progress')}</Text><Text style={s.securityDescription}>{a(accountStatus==='pending'?'Complete email verification or password setup in Account settings.':'Link an email to protect access to this guest account.')}</Text></View>
     <Text style={s.securityArrow}>›</Text>
    </Pressable>:null}
    {onOpenUpdates?<Pressable accessibilityRole="button" accessibilityLabel={a("What's New & Updates")} accessibilityHint={newReleaseAvailable?a("New release information available"):a("Release notes and app versions")} onPress={onOpenUpdates} style={({pressed})=>[s.releaseRow,pressed&&s.pressed]}>
      <UiIcon name="events" size={22}/><Text style={s.releaseTitle}>{a("What's New & Updates")}</Text>{newReleaseAvailable?<AttentionDot label={a("New update available")}/>:null}<UiIcon name="next" size={18}/>
    </Pressable>:null}
    {attentionDestinations.length?<View style={s.attentionRail}><Text style={s.sectionLabel}>{a("NEEDS ATTENTION")}</Text><View style={s.attentionQuickRow}>{attentionDestinations.slice(0,3).map(id=>{const meta=itemMeta(language,id),alert=attentionLabel(id);return <Pressable key={id} accessibilityRole="button" accessibilityLabel={meta.title+', '+alert} onPress={()=>onNavigate(id)} style={({pressed})=>[s.attentionQuick,singleColumn&&s.attentionQuickWide,pressed&&s.pressed]}><MoreIcon id={id} size={23}/><Text numberOfLines={1} style={s.quickTitle}>{meta.title}</Text>{attention(id)}</Pressable>})}</View></View>:null}

    <View style={s.quickSection}><Text style={s.sectionLabel}>{a('QUICK ACCESS')}</Text>
      <View style={s.quickAccessRow}>{quickAccess.map(id=><Pressable key={id} accessibilityRole="button" accessibilityLabel={itemMeta(language,id).title} onPress={()=>onNavigate(id)} style={({pressed})=>[s.quickAccessItem,pressed&&s.pressed]}>
        <MoreIcon id={id} size={24}/><Text numberOfLines={2} style={s.quickAccessLabel}>{itemMeta(language,id).title}</Text>
      </Pressable>)}</View>
    </View>
    {sections.map(section=><View key={a(section.label)} style={s.section}>
      <Pressable accessibilityRole="button" accessibilityLabel={a(section.label)} accessibilityState={{expanded:!collapsed[section.label]}} onPress={()=>toggleSection(section.label)} style={({pressed})=>[s.sectionToggle,pressed&&s.pressed]}>
       <Text style={s.sectionLabel}>{a(section.label)}</Text><Text style={s.sectionCount}>{section.items.length}</Text><Text style={s.sectionChevron}>{collapsed[section.label]?'+':'−'}</Text>
      </Pressable>
      {!collapsed[section.label]&&<View style={s.grid}>{section.items.filter(id=>(id!=='Rankings'||RANKINGS_RELEASED)&&!lockedReason(id)).map(id=>{const meta=itemMeta(language,id),alert=attentionLabel(id),reason=lockedReason(id),locked=!!reason,inDevelopment=id==='Arena';return <Pressable key={id} accessibilityRole="button" accessibilityState={{disabled:inDevelopment||locked}} accessibilityLabel={inDevelopment?a('{title}, In Development',{title:meta.title}):locked?a('{title}, Locked',{title:meta.title}):alert?`${meta.title}, ${alert}`:meta.title} accessibilityHint={locked?reason:meta.description} disabled={inDevelopment||locked} onPress={()=>onNavigate(id)} style={({pressed})=>[s.tile,alert&&s.tileAttention,(inDevelopment||locked)&&s.tileDisabled,singleColumn&&s.tileWide,pressed&&!inDevelopment&&!locked&&s.pressed]}>
        <View style={s.tileTop}><View style={[s.iconFrame,alert&&s.iconFrameAttention]}><MoreIcon id={id} size={29}/></View><View style={s.titleRow}><Text numberOfLines={2} style={s.title}>{meta.title}</Text>{locked?<View style={s.lockPill}><Text style={s.lockPillText}>{a("LOCKED")}</Text></View>:inDevelopment?<View style={s.developmentPill}><Text style={s.developmentPillText}>{a("IN DEVELOPMENT")}</Text></View>:null}</View><View style={s.attentionSlot}>{attention(id)}</View></View>
      </Pressable>})}</View>}</View>)}
    {upcomingLocked.length?<View style={s.unlockAhead}><View style={s.unlockAheadHead}><Text style={s.sectionLabel}>{a("UNLOCKS AHEAD")}</Text><Text style={s.lockCountText}>{lockedItems.length}</Text></View>{upcomingLocked.map(id=>{const meta=itemMeta(language,id),reason=lockedReason(id);return <View key={id} style={s.unlockRow}><View style={s.unlockIcon}><MoreIcon id={id} size={23} muted/></View><View style={s.flex}><Text style={s.unlockTitle}>{meta.title}</Text><Text numberOfLines={2} style={s.unlockReason}>{reason}</Text></View></View>})}</View>:null}
    {onOpenAdminQa?<View style={s.section}><Text style={s.sectionLabel}>{a("DEVELOPER")}</Text><Pressable accessibilityRole="button" accessibilityLabel={a("Open Admin QA Console")} onPress={onOpenAdminQa} style={({pressed})=>[s.devCard,pressed&&s.pressed]}><ThemedNavigationIcon destination="Character" size={32}/><View style={s.devCopy}><Text style={s.title}>{a("Admin QA Console")}</Text><Text style={s.description}>{a("Full-content, crafting and dungeon test profile")}</Text></View><UiIcon name="next" size={18}/></Pressable></View>:null}
    <DiscordButton label={a('Join Discord')} onPress={()=>void Linking.openURL('https://discord.gg/Db83APvP5y')}/>
    <RateAppCard language={language}/>
  </ScrollView>;
}

function AttentionDot({label}:{label:string}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View accessible={false} accessibilityLabel={label} style={s.attentionDot}/>}
function AttentionCount({count,label}:{count:number;label:string}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View accessible={false} accessibilityLabel={`${count} ${label}`} style={s.attentionCount}><Text style={s.attentionCountText}>{count>99?'99+':count}</Text></View>}
function makeStyles(C:ThemeColors){return StyleSheet.create({
  profileCard:{flexDirection:'row',alignItems:'center',gap:11,borderWidth:1,borderColor:C.lineStrong,borderRadius:12,backgroundColor:C.panelRaised,padding:12},
  profileAvatar:{width:61,height:64,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.selectionLine,borderRadius:9,backgroundColor:C.stage},
  avatarArt:{height:54,width:54},profileCopy:{flex:1,minWidth:0,gap:3},
  profileName:{fontSize:19,lineHeight:24,fontWeight:'800',color:C.text},profileMeta:{fontSize:11,lineHeight:16,color:C.muted},
  profileStatus:{fontSize:10,fontWeight:'800',color:C.warning},profileLinked:{color:C.good},
  profileAction:{minHeight:44,minWidth:65,alignItems:'center',justifyContent:'center',backgroundColor:C.secondaryButton,borderWidth:1,borderColor:C.secondaryButtonBorder,borderRadius:9,paddingHorizontal:9},
  profileActionText:{fontSize:11,fontWeight:'800',color:C.secondaryButtonText},
  securityCard:{minHeight:68,flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:1,borderColor:C.warning,borderRadius:10,backgroundColor:C.warningSurface},
  securityIcon:{width:37,height:37,alignItems:'center',justifyContent:'center',borderRadius:9,borderWidth:1,borderColor:C.warning},
  securityIconText:{fontSize:23,color:C.warning},securityTitle:{fontSize:12,fontWeight:'800',color:C.text},securityDescription:{fontSize:10,lineHeight:15,color:C.muted,marginTop:3},securityArrow:{fontSize:23,color:C.warning},
  quickSection:{gap:8,paddingTop:7},quickAccessRow:{flexDirection:'row',gap:6},quickAccessItem:{flex:1,minWidth:0,minHeight:69,alignItems:'center',justifyContent:'center',gap:6,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel,paddingHorizontal:3,paddingVertical:8},quickAccessLabel:{fontSize:9,color:C.text,fontWeight:'800',textAlign:'center'},
  sectionToggle:{minHeight:44,flexDirection:'row',alignItems:'center',gap:9,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:9,paddingHorizontal:11,paddingVertical:8},
  sectionCount:{color:C.muted,fontSize:10,fontWeight:'700'},sectionChevron:{color:C.accent,fontSize:20,fontWeight:'800',marginLeft:'auto'}, 

  root:{padding:spacing.md,gap:10,paddingBottom:spacing.xl},
  flex:{flex:1,minWidth:0},
  header:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,paddingHorizontal:3},
  heading:{...typography.hero,color:C.text},
  headerAttention:{minWidth:28,height:28,alignItems:'center',justifyContent:'center',paddingHorizontal:7,borderWidth:1,borderColor:C.notification,borderRadius:14,backgroundColor:C.badSurface},
  headerAttentionValue:{fontSize:12,color:C.notification,fontWeight:'900'},
  releaseRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:10,borderRadius:radii.md,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,backgroundColor:C.panel},
  releaseTitle:{...typography.bodyStrong,color:C.text,flex:1},
  section:{gap:6,marginTop:4},
  sectionLabel:{...typography.caption,color:C.accentSoft,fontWeight:'900',letterSpacing:.7},
  attentionRail:{gap:8,padding:9,borderWidth:1,borderColor:C.info,borderRadius:radii.md,backgroundColor:C.infoSurface},
  attentionQuickRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
  attentionQuick:{flex:1,minWidth:132,minHeight:44,flexDirection:'row',alignItems:'center',gap:7,padding:8,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
  attentionQuickWide:{flexBasis:'100%'},
  quickTitle:{flex:1,minWidth:0,fontSize:11,color:C.text,fontWeight:'800'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:7},
  tile:{flexGrow:1,flexBasis:'47%',minWidth:138,minHeight:62,paddingHorizontal:9,paddingVertical:8,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
  tileAttention:{borderWidth:1,borderColor:C.selectionLine,backgroundColor:C.panelRaised},
  tileDisabled:{opacity:.62,borderStyle:'dashed'},
  tileWide:{flexBasis:'100%',minWidth:0},
  tileTop:{flex:1,flexDirection:'row',alignItems:'center',gap:7},
  iconFrame:{width:32,height:32,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},
  iconFrameAttention:{borderColor:C.selectionLine,backgroundColor:C.selection},
  titleRow:{flex:1,minWidth:0,gap:3,justifyContent:'center'},
  title:{...typography.bodyStrong,color:C.text,fontSize:12.5},
  attentionSlot:{alignItems:'center',justifyContent:'center'},
  lockPill:{alignSelf:'flex-start',paddingHorizontal:5,paddingVertical:2,borderWidth:1,borderColor:C.muted,borderRadius:99},
  lockPillText:{fontSize:7,color:C.muted,fontWeight:'900',letterSpacing:.5},
  developmentPill:{alignSelf:'flex-start',paddingHorizontal:5,paddingVertical:2,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
  developmentPillText:{fontSize:6.5,color:C.muted,fontWeight:'900',letterSpacing:.45},
  unlockAhead:{gap:5,marginTop:5,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
  unlockAheadHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  lockCountText:{fontSize:10,color:C.muted,fontWeight:'900'},
  unlockRow:{minHeight:40,flexDirection:'row',alignItems:'center',gap:8,paddingTop:5,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},
  unlockIcon:{width:27,height:27,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:C.panel2,opacity:.72},
  unlockTitle:{fontSize:11,color:C.text,fontWeight:'800'},
  unlockReason:{fontSize:9,color:C.muted,lineHeight:12},
  pressed:{opacity:.72,transform:[{translateY:1}]},
  attentionDot:{width:10,height:10,borderRadius:5,backgroundColor:C.notification,borderWidth:1,borderColor:C.notificationText},
  attentionCount:{minWidth:22,height:22,paddingHorizontal:5,borderRadius:11,backgroundColor:C.notification,alignItems:'center',justifyContent:'center'},
  attentionCountText:{fontSize:9,lineHeight:11,color:C.notificationText,fontWeight:'900'},
  devCard:{minHeight:52,flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:StyleSheet.hairlineWidth,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
  devCopy:{flex:1,minWidth:0,gap:2},
  description:{...typography.caption,color:C.muted,fontSize:10,lineHeight:13},
});}
