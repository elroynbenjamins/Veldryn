import {RANKINGS_RELEASED} from '../core/release-flags';
import {accountText} from '../i18n/account';
import {useMemo} from 'react';
import {UiIcon} from '../components/UiIcon';
import {ThemedNavigationIcon} from '../components/ThemedNavigationIcon';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {t} from '../i18n';
import {GameState} from '../core/types';
import {EARLY_FEATURE_DESTINATION_ORDER} from '../core/feature-unlocks';
import type {QuickNavDestination} from '../core/quick-navigation';

export type MoreDestination='Home'|'Social'|'Activity'|'Progression'|'DailySupplies'|'AccountBonuses'|'Quests'|'Companions'|'Skills'|'Events'|'Friends'|'Guild'|'Settings'|'Arena'|'Rankings'|'Collections'|'Profile'|'Achievements'|'MasteryHall';

const sections:Array<{label:string;items:MoreDestination[]}>= [
  {label:'PLAY & PROGRESSION',items:['Home','Progression','Quests','Companions','DailySupplies','Events','AccountBonuses']},
  {label:'SOCIAL & COMPETITION',items:['Social','Friends','Guild','Arena','Rankings']},
  {label:'IDENTITY & ACCOUNT',items:['Activity','Profile','MasteryHall','Collections','Achievements','Settings']},
];

function iconForDestination(id:MoreDestination):QuickNavDestination{
  if(id==='Activity'||id==='Profile'||id==='AccountBonuses')return 'Character';
  if(id==='Progression')return 'World';
  if(id==='DailySupplies'||id==='Rankings')return 'Events';
  if(id==='Arena')return 'Party';
  if(id==='Collections')return 'Inventory';
  if(id==='Achievements')return 'Quests';
  if(id==='MasteryHall')return 'Skills';
  return id;
}
function itemMeta(language:GameState['settings']['language'],id:MoreDestination){
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  switch(id){
    case 'Home':return {title:a("Home"),description:a("Current activity and account overview")};
    case 'Social':return {title:a("Social"),description:a("Party, contracts, recruitment and chat")};
    case 'Activity':return {title:a("Characters"),description:a("Switch, reroll or safely delete characters")};
    case 'Progression':return {title:a("Working Toward"),description:a("Goals, sources and safe idle rules")};
    case 'DailySupplies':return {title:a("Daily Supplies"),description:a("28-claim track and +10% activity boosts")};
    case 'AccountBonuses':return {title:a("Account Bonuses"),description:a("Permanent and temporary modifiers")};
    case 'Quests':return {title:t(language,'more.quests'),description:t(language,'more.questsDescription')};
    case 'Companions':return {title:a("Companions"),description:a("Train, equip and master your roster")};
    case 'Skills':return {title:t(language,'more.skills'),description:t(language,'more.skillsDescription')};
    case 'Events':return {title:a("Event hub"),description:a("Annual festival calendar and past event history")};
    case 'Friends':return {title:t(language,'more.friends'),description:t(language,'more.friendsDescription')};
    case 'Guild':return {title:t(language,'more.guild'),description:t(language,'more.guildDescription')};
    case 'Settings':return {title:t(language,'more.settings'),description:t(language,'more.settingsDescription')};
    case 'Arena':return {title:a("Arena"),description:a("Three-character squad mode · In Development")};
    case 'Rankings':return {title:a("Rankings"),description:a("Server-calculated prestige boards")};
    case 'Collections':return {title:a("Collections"),description:a("Collectibles and account bonuses")};
    case 'Profile':return {title:a("Profile"),description:a("Identity, showcase and customization")};
    case 'Achievements':return {title:a("Achievements"),description:a("Prestige milestones and rewards")};
    case 'MasteryHall':return {title:a("Mastery Hall"),description:a("Account-wide R50 profession records and prestige")};
  }
}

export function MoreScreen({language,onNavigate,onOpenAdminQa,companionAttention=false,companionUnlocked=true,lockedDestinations={},workingTowardAttention=false,dailySuppliesAttention=false,friendRequestCount=0,guildAttentionCount=0,socialAttentionCount=0,profileAttention=false}:{language:GameState['settings']['language'];onNavigate:(destination:MoreDestination)=>void;onOpenAdminQa?:()=>void;companionAttention?:boolean;companionUnlocked?:boolean;lockedDestinations?:Partial<Record<MoreDestination,string>>;workingTowardAttention?:boolean;dailySuppliesAttention?:boolean;friendRequestCount?:number;guildAttentionCount?:number;socialAttentionCount?:number;profileAttention?:boolean}){
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),singleColumn=width<350||fontScale>=1.25;
  const lockedReason=(id:MoreDestination)=>(lockedDestinations[id]?a(lockedDestinations[id]!):undefined)??(id==='Companions'&&!companionUnlocked?a("Complete Into Ironwood (Level 10)."):'');
  const attentionLabel=(id:MoreDestination)=>{
    if(lockedReason(id))return '';
    if(id==='Social'&&socialAttentionCount>0)return a('{count} social updates',{count:socialAttentionCount});
    if(id==='Friends'&&friendRequestCount>0)return a('{count} incoming friend requests',{count:friendRequestCount});
    if(id==='Guild'&&guildAttentionCount>0)return a('{count} guild updates',{count:guildAttentionCount});
    if(id==='Companions'&&companionUnlocked&&companionAttention)return a("companion actions ready");
    if(id==='Progression'&&workingTowardAttention)return a("Working Toward goal complete");
    if(id==='DailySupplies'&&dailySuppliesAttention)return a("Daily Supplies ready");
    if(id==='Profile'&&profileAttention)return a("new profile customization available");
    return '';
  };
  const attention=(id:MoreDestination)=>{
    if(lockedReason(id))return null;
    if(id==='Social'&&socialAttentionCount>0)return <AttentionCount count={socialAttentionCount} label={a("Social updates")}/>;
    if(id==='Friends'&&friendRequestCount>0)return <AttentionCount count={friendRequestCount} label={a("Incoming friend requests")}/>;
    if(id==='Guild'&&guildAttentionCount>0)return <AttentionCount count={guildAttentionCount} label={a("Guild updates")}/>;
    if(id==='Companions'&&companionUnlocked&&companionAttention)return <AttentionDot label={a("Companion actions ready")}/>;
    if(id==='Progression'&&workingTowardAttention)return <AttentionDot label={a("Working Toward goal complete")}/>;
    if(id==='DailySupplies'&&dailySuppliesAttention)return <AttentionDot label={a("Daily Supplies ready")}/>;
    if(id==='Profile'&&profileAttention)return <AttentionDot label={a("New profile customization available")}/>;
    return null;
  };
  const attentionPriority:MoreDestination[]=['DailySupplies','Progression','Companions','Social','Friends','Guild','Profile'];
  const lockedItems=EARLY_FEATURE_DESTINATION_ORDER.filter(id=>(id!=='Rankings'||RANKINGS_RELEASED)&&!!lockedReason(id)) as MoreDestination[];
  const upcomingLocked=lockedItems.slice(0,4);
  const attentionDestinations=attentionPriority.filter(id=>!!attentionLabel(id));
  const attentionTotal=(lockedReason('Social')?0:socialAttentionCount)+(lockedReason('Friends')?0:friendRequestCount)+(lockedReason('Guild')?0:guildAttentionCount)+Number(!lockedReason('Companions')&&companionAttention)+Number(!lockedReason('Progression')&&workingTowardAttention)+Number(!lockedReason('DailySupplies')&&dailySuppliesAttention)+Number(profileAttention);
  return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.header}><View style={s.flex}><Text style={s.kicker}>{a("ACCOUNT HUB")}</Text><Text accessibilityRole="header" style={s.heading}>{a("Account")}</Text><Text style={s.sub}>{t(language,'more.intro')}</Text></View>{attentionTotal>0?<View style={s.headerAttention}><Text style={s.headerAttentionValue}>{attentionTotal>99?'99+':attentionTotal}</Text><Text style={s.headerAttentionLabel}>{a("NEEDS ATTENTION")}</Text></View>:<View style={s.headerClear}><Text style={s.headerClearText}>{a("CAUGHT UP")}</Text></View>}</View>
    {attentionDestinations.length?<View style={s.attentionRail}><View style={s.attentionRailHead}><Text style={s.sectionLabel}>{a("NEEDS ATTENTION")}</Text><Text style={s.attentionRailMeta}>{a('{count} destinations',{count:attentionDestinations.length})}</Text></View><View style={s.attentionQuickRow}>{attentionDestinations.slice(0,3).map(id=>{const meta=itemMeta(language,id),alert=attentionLabel(id);return <Pressable key={id} accessibilityRole="button" accessibilityLabel={meta.title+', '+alert} onPress={()=>onNavigate(id)} style={({pressed})=>[s.attentionQuick,singleColumn&&s.attentionQuickWide,pressed&&s.pressed]}><View style={s.quickIconFrame}><ThemedNavigationIcon destination={iconForDestination(id)} size={25}/></View><View style={s.quickCopy}><Text numberOfLines={1} style={s.quickTitle}>{meta.title}</Text><Text numberOfLines={1} style={s.quickDetail}>{alert}</Text></View><UiIcon name="next" size={16}/></Pressable>})}</View>{attentionDestinations.length>3?<Text style={s.attentionMore}>{a('+{count} more highlighted below',{count:attentionDestinations.length-3})}</Text>:null}</View>:null}
    {sections.map(section=><View key={a(section.label)} style={s.section}>
      <Text style={s.sectionLabel}>{a(section.label)}</Text>
      <View style={s.grid}>{section.items.filter(id=>(id!=='Rankings'||RANKINGS_RELEASED)&&!lockedReason(id)).map(id=>{const meta=itemMeta(language,id),alert=attentionLabel(id),reason=lockedReason(id),locked=!!reason,inDevelopment=id==='Arena';return <Pressable key={id} accessibilityRole="button" accessibilityState={{disabled:inDevelopment||locked}} accessibilityLabel={inDevelopment?a('{title}, In Development',{title:meta.title}):locked?a('{title}, Locked',{title:meta.title}):alert?`${meta.title}, ${alert}`:meta.title} accessibilityHint={locked?reason:meta.description} disabled={inDevelopment||locked} onPress={()=>onNavigate(id)} style={({pressed})=>[s.tile,alert&&s.tileAttention,(inDevelopment||locked)&&s.tileDisabled,singleColumn&&s.tileWide,pressed&&!inDevelopment&&!locked&&s.pressed]}>
        <View style={s.tileTop}><View style={[s.iconFrame,alert&&s.iconFrameAttention]}><ThemedNavigationIcon destination={iconForDestination(id)} size={32}/></View><View style={s.attentionSlot}>{attention(id)}</View><UiIcon name="next" size={18}/></View>
        <View style={s.titleRow}><Text numberOfLines={singleColumn?2:1} style={s.title}>{meta.title}</Text>{locked?<View style={s.lockPill}><Text style={s.lockPillText}>{a("LOCKED")}</Text></View>:inDevelopment?<View style={s.developmentPill}><Text style={s.developmentPillText}>{a("IN DEVELOPMENT")}</Text></View>:null}</View>
        <Text numberOfLines={singleColumn?2:1} style={s.description}>{locked?reason:meta.description}</Text>
      </Pressable>})}</View>
    </View>)}
    {upcomingLocked.length?<View style={s.unlockAhead}><View style={s.unlockAheadHead}><View style={s.flex}><Text style={s.sectionLabel}>{a("UNLOCKS AHEAD")}</Text><Text style={s.unlockAheadMeta}>{a("More systems appear as the campaign teaches their prerequisites.")}</Text></View><View style={s.lockCount}><Text style={s.lockCountText}>{lockedItems.length}</Text></View></View>{upcomingLocked.map(id=>{const meta=itemMeta(language,id),reason=lockedReason(id);return <View key={id} style={s.unlockRow}><View style={s.unlockIcon}><ThemedNavigationIcon destination={iconForDestination(id)} size={25} muted/></View><View style={s.flex}><Text style={s.unlockTitle}>{meta.title}</Text><Text style={s.unlockReason}>{reason}</Text></View><Text style={s.unlockMark}>◆</Text></View>})}{lockedItems.length>upcomingLocked.length?<Text style={s.unlockMore}>{a('+{count} later systems stay hidden for now',{count:lockedItems.length-upcomingLocked.length})}</Text>:null}</View>:null}
    {onOpenAdminQa?<View style={s.section}><Text style={s.sectionLabel}>{a("DEVELOPER")}</Text><Pressable accessibilityRole="button" accessibilityLabel={a("Open Admin QA Console")} onPress={onOpenAdminQa} style={({pressed})=>[s.devCard,pressed&&s.pressed]}><ThemedNavigationIcon destination="Character" size={32}/><View style={s.devCopy}><Text style={s.title}>{a("Admin QA Console")}</Text><Text style={s.description}>{a("Full-content, crafting and dungeon test profile")}</Text></View><UiIcon name="next" size={18}/></Pressable></View>:null}
  </ScrollView>;
}

function AttentionDot({label}:{label:string}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View accessible={false} accessibilityLabel={label} style={s.attentionDot}/>}
function AttentionCount({count,label}:{count:number;label:string}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View accessible={false} accessibilityLabel={`${count} ${label}`} style={s.attentionCount}><Text style={s.attentionCountText}>{count>99?'99+':count}</Text></View>}
function makeStyles(C:ThemeColors){return StyleSheet.create({
  root:{padding:spacing.md,gap:8,paddingBottom:spacing.xl},
  header:{minHeight:86,flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panelRaised},
  flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
  heading:{...typography.hero,color:C.text},
  sub:{...typography.body,color:C.muted},
  headerAttention:{minWidth:58,alignItems:'center',justifyContent:'center',paddingHorizontal:7,paddingVertical:6,borderWidth:1,borderColor:C.notification,borderRadius:10,backgroundColor:C.badSurface},
  headerAttentionValue:{...typography.title,color:C.notification,fontWeight:'900'},headerAttentionLabel:{fontSize:7,color:C.muted,fontWeight:'900',letterSpacing:.45,textAlign:'center'},
  headerClear:{paddingHorizontal:8,paddingVertical:5,borderWidth:1,borderColor:C.good,borderRadius:99,backgroundColor:C.goodSurface},headerClearText:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.55},
  attentionRail:{gap:6,padding:8,borderWidth:1,borderColor:C.info,borderRadius:radii.md,backgroundColor:C.infoSurface},
  attentionRailHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},attentionRailMeta:{fontSize:9,color:C.info,fontWeight:'900'},
  attentionQuickRow:{flexDirection:'row',flexWrap:'wrap',gap:6},attentionQuick:{flex:1,minWidth:132,minHeight:48,flexDirection:'row',alignItems:'center',gap:6,padding:7,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},attentionQuickWide:{flexBasis:'100%'},quickIconFrame:{width:28,height:28,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:C.panel2},quickIcon:{width:20,height:20},quickCopy:{flex:1,minWidth:0},quickTitle:{fontSize:11,color:C.text,fontWeight:'900'},quickDetail:{fontSize:8.5,color:C.info,fontWeight:'800'},attentionMore:{fontSize:9,color:C.muted,fontWeight:'700'},
  section:{gap:5,marginTop:4},unlockAhead:{gap:6,marginTop:6,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},unlockAheadHead:{flexDirection:'row',alignItems:'center',gap:8},unlockAheadMeta:{fontSize:9,color:C.muted,lineHeight:13,marginTop:1},lockCount:{minWidth:26,height:26,borderRadius:13,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},lockCountText:{fontSize:9,color:C.muted,fontWeight:'900'},unlockRow:{minHeight:42,flexDirection:'row',alignItems:'center',gap:8,paddingTop:5,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},unlockIcon:{width:28,height:28,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:C.panel2,opacity:.72},unlockTitle:{fontSize:11,color:C.text,fontWeight:'900'},unlockReason:{fontSize:9,color:C.muted,lineHeight:12},unlockMark:{fontSize:10,color:C.disabled},unlockMore:{fontSize:9,color:C.muted,fontStyle:'italic',textAlign:'center',paddingTop:2},
  sectionLabel:{...typography.caption,color:C.accentSoft,fontWeight:'900',letterSpacing:1},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:7},
  tile:{flexGrow:1,flexBasis:'47%',minWidth:138,minHeight:86,gap:3,padding:8,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
  tileAttention:{borderWidth:1,borderColor:C.selectionLine,backgroundColor:C.panelRaised},
  tileDisabled:{opacity:.62,borderStyle:'dashed'},lockPill:{paddingHorizontal:5,paddingVertical:2,borderWidth:1,borderColor:C.muted,borderRadius:99},lockPillText:{fontSize:7,color:C.muted,fontWeight:'900',letterSpacing:.5},
  tileWide:{flexBasis:'100%',minWidth:0},tileTop:{minHeight:30,flexDirection:'row',alignItems:'center',gap:6},
  iconFrame:{width:30,height:30,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},
  iconFrameAttention:{borderColor:C.selectionLine,backgroundColor:C.selection},
  icon:{width:24,height:24},
  attentionSlot:{flex:1,alignItems:'flex-start'},
  titleRow:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:5},
  title:{...typography.bodyStrong,color:C.text,fontSize:13},
  developmentPill:{paddingHorizontal:5,paddingVertical:2,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
  developmentPillText:{fontSize:6.5,color:C.muted,fontWeight:'900',letterSpacing:.45},
  description:{...typography.caption,color:C.muted,fontSize:10,lineHeight:13},
  pressed:{opacity:.72,transform:[{translateY:1}]},
  attentionDot:{width:10,height:10,borderRadius:5,backgroundColor:C.notification,borderWidth:1,borderColor:C.notificationText},
  attentionCount:{minWidth:22,height:22,paddingHorizontal:5,borderRadius:11,backgroundColor:C.notification,alignItems:'center',justifyContent:'center'},
  attentionCountText:{fontSize:9,lineHeight:11,color:C.notificationText,fontWeight:'900'},
  devCard:{minHeight:58,flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:StyleSheet.hairlineWidth,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
  devCopy:{flex:1,minWidth:0,gap:2},
});}
