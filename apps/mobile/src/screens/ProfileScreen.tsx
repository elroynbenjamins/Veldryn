import {useCallback,useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {ProfileScenePreview} from '../components/ProfileScenePreview';
import {PublicProfileScene} from '../components/PublicProfileScene';
import {ProfileShowcaseSection} from '../components/ProfileShowcaseSection';
import {ProfileFavoriteHighlights} from '../components/ProfileFavoriteHighlights';
import {MasteryHallPanel} from '../components/MasteryHallPanel';
import {GuildCrest} from '../components/SocialIdentity';
import type {GameState} from '../core/types';
import {JOURNAL_ACHIEVEMENTS_V42} from '../core/adventurers-journal-v42';
import {
 formatProfileRecordValue,localProfileSummary,profileAchievementLabel,profileAchievementShowcase,
 profileCollectionLabel,profileCollectionShowcase,profileRecordLabel,profileRecordShowcase,
} from '../core/profile-presentation';
import {useAuthSession} from '../online/AuthSessionProvider';
import {onlineConfigured} from '../online/supabase';
import {publicPlayerProfileV43,type PublicPlayerProfileV43} from '../online/profile-extension-v43';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {profileShowcaseArt} from '../theme/profile-showcase-art';
import {profileAchievementPrestige,profileCollectionPrestige,profileMasteryPrestige,profileRecordPrestige} from '../core/profile-prestige';
import {professionMasteryActionDefinition,professionMasteryMasteredRecords,skillIdentity} from '../core/profession-mastery-presentation';

const label=(value?:string)=>value?value.replace(/[_:-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase()):'Default';

type ProfileDestination='Customize'|'Collections'|'Achievements'|'Rankings';

export function ProfileScreen({state,onNavigate}:{state:GameState;onNavigate?:(destination:ProfileDestination)=>void}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const c=state.character,account=state.account,{session}=useAuthSession();
 const [publicSelf,setPublicSelf]=useState<PublicPlayerProfileV43|null>(null),[loadingPublic,setLoadingPublic]=useState(false),[publicError,setPublicError]=useState('');
 const summary=useMemo(()=>localProfileSummary(state),[state]);
 const refreshPublic=useCallback(async()=>{if(!onlineConfigured||!session){setPublicSelf(null);setPublicError('');return;}setLoadingPublic(true);setPublicError('');try{setPublicSelf(await publicPlayerProfileV43(session.user.id));}catch(error){setPublicSelf(null);setPublicError(error instanceof Error?error.message:'Unable to refresh your online profile.');}finally{setLoadingPublic(false)}},[session?.user.id]);
 useEffect(()=>{void refreshPublic()},[refreshPublic]);
 if(!c)return <ScrollView contentContainerStyle={s.root}><Text style={s.heading}>Profile</Text><Panel><Text style={s.copy}>Create a character to build your profile.</Text></Panel></ScrollView>;

 const achievementIds=profileAchievementShowcase(state,publicSelf),recordIds=profileRecordShowcase(state,publicSelf),collectionRefs=profileCollectionShowcase(state,publicSelf),masteryIds=publicSelf?.masteryShowcaseActionIds?.length?publicSelf.masteryShowcaseActionIds:professionMasteryMasteredRecords(state).slice(0,3).map(row=>row.actionId);
 const achievementEntries=achievementIds.map(id=>{const def=JOURNAL_ACHIEVEMENTS_V42.find(row=>row.id===id),prestige=profileAchievementPrestige(id);return {key:id,label:profileAchievementLabel(id),meta:def?label(def.category):'Achievement',prestige:prestige.tone,badge:prestige.badge}});
 const recordPrestige=profileRecordPrestige();
 const recordEntries=recordIds.map(id=>{const record=publicSelf?.recordEntries?.[id]??state.account.journalState?.records?.[id];return {key:id,label:profileRecordLabel(id),value:record?formatProfileRecordValue(id,record.value):'—',meta:record?.contextLabel,prestige:recordPrestige.tone,badge:recordPrestige.badge}});
 const collectionEntries=collectionRefs.map(ref=>{const prestige=profileCollectionPrestige(ref);return {key:ref.kind+':'+ref.id,label:profileCollectionLabel(ref),meta:label(ref.kind),art:profileShowcaseArt(ref),artMode:ref.kind==='background'?'cover' as const:'contain' as const,prestige:prestige.tone,badge:prestige.badge}});
 const masteryPrestige=profileMasteryPrestige(),masteryEntries=masteryIds.flatMap(id=>{const row=professionMasteryActionDefinition(id);return row?[{key:id,label:row.name,value:'R50',meta:skillIdentity(row.skillId).label+' · Account mastery',prestige:masteryPrestige.tone,badge:masteryPrestige.badge}]:[]});
 const favoriteSkillId=publicSelf?.favoriteSkillId??summary.highestSkill?.skillId;
 const favoriteCompanionId=publicSelf?.favoriteCompanionId??state.character?.equippedCombatCompanionId??state.account.unlockedCombatCompanionIds?.[0];
 const online=!!publicSelf,background=c.profileBackgroundId??'asterfall-night',profileStateLabel=publicError?'SYNC ISSUE':publicSelf?.visibility==='public'?'PUBLIC PROFILE':publicSelf?.visibility==='guild'?'GUILD PROFILE':publicSelf?.visibility==='private'?'PRIVATE PROFILE':'LOCAL PROFILE';
 const bioGuidance=onlineConfigured&&session?(session.user.is_anonymous?'Link this guest account before publishing biography and showcase changes.':'Add a short biography from Customize Profile to tell other players about your character or play style.'):'This local profile is fully usable on-device. Sign in when you want to publish social profile details.';

 return <ScrollView contentContainerStyle={s.root}>
  <View style={s.headingRow}><View style={s.flex}><Text style={s.kicker}>PLAYER IDENTITY</Text><Text accessibilityRole="header" style={s.heading}>Profile</Text></View>{loadingPublic?<ActivityIndicator color={C.accent}/>:<Text style={[s.onlineBadge,publicError?s.syncIssue:online?s.online:s.local]}>{profileStateLabel}</Text>}</View>

  {publicSelf?<PublicProfileScene profile={publicSelf}/>:<ProfileScenePreview state={state} backgroundId={background}/>}
  {publicError?<View accessibilityRole="alert" style={s.syncCard}><View style={s.flex}><Text style={s.syncTitle}>Online profile could not refresh</Text><Text style={s.syncText}>Your local identity is still shown safely. Retry to refresh privacy and showcase selections.</Text></View><View style={s.syncButton}><GameButton compact title="Retry" tone="secondary" onPress={()=>void refreshPublic()}/></View></View>:null}

  <Panel>
   <View style={s.aboutRow}>
    {account.guildMember?<GuildCrest size={40} bannerId={account.guildBannerId} frameId={account.guildProfileFrameId}/>:null}
    <View style={s.flex}><Text style={s.section}>ABOUT</Text>{publicSelf?.bio?<Text style={s.bio}>{publicSelf.bio}</Text>:<Text style={s.copy}>{bioGuidance}</Text>}</View>
   </View>
   <View style={s.quickActions}>
    <View style={s.customizeAction}><GameButton compact title="Customize" onPress={()=>onNavigate?.('Customize')}/></View>
    <View style={s.action}><GameButton compact title="Collections" tone="secondary" onPress={()=>onNavigate?.('Collections')}/></View>
    <View style={s.action}><GameButton compact title="Achievements" tone="secondary" onPress={()=>onNavigate?.('Achievements')}/></View>
    <View style={s.action}><GameButton compact title="Rankings" tone="secondary" onPress={()=>onNavigate?.('Rankings')}/></View>
   </View>
  </Panel>

  <View style={s.snapshot}>
   <View style={s.sectionHead}><Text style={s.section}>CAREER SNAPSHOT</Text><Text style={s.sectionMeta}>Account + active character</Text></View>
   <View style={s.stats}>
    <Stat value={summary.totalKills.toLocaleString()} label="KILLS"/>
    <Stat value={summary.bossesDefeated.toLocaleString()} label="BOSSES"/>
    <Stat value={summary.combinedSkillLevels.toLocaleString()} label="SKILL LEVELS"/>
    <Stat value={String(summary.companionOwned)} label="COMPANIONS"/>
    <Stat value={String(summary.achievementCount)} label="ACHIEVEMENTS"/>
    <Stat value={String(summary.collectionOwned)} label="COLLECTIBLES"/>
   </View>
  </View>

  <MasteryHallPanel state={state}/>

  <View style={s.highlights}>
   <View style={s.sectionHead}><Text style={s.section}>FAVORITES</Text><Text style={s.sectionMeta}>Showcased by player</Text></View>
   <ProfileFavoriteHighlights favoriteSkillId={favoriteSkillId} favoriteSkillDetail={summary.highestSkill&&favoriteSkillId===summary.highestSkill.skillId?'Highest current skill · Lv. '+summary.highestSkill.level:favoriteSkillId?'Showcased by player':undefined} favoriteCompanionId={favoriteCompanionId}/>
  </View>

  <ProfileShowcaseSection title="ACHIEVEMENT SHOWCASE" entries={achievementEntries} emptyLabel="Choose an earned achievement"/>
  <ProfileShowcaseSection title="PERSONAL RECORDS" entries={recordEntries} emptyLabel="Choose a personal record"/>
  <ProfileShowcaseSection title="COLLECTION SHOWCASE" entries={collectionEntries} emptyLabel="Choose a collectible"/>
  <ProfileShowcaseSection title="MASTERY SHOWCASE" entries={masteryEntries} emptyLabel="Master a profession action at R50" subtitle="Selected R50 profession records"/>
 </ScrollView>;
}

function Stat({value,label}:{value:string;label:string}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View style={s.stat}><Text numberOfLines={1} style={s.statValue}>{value}</Text><Text numberOfLines={1} style={s.statLabel}>{label}</Text></View>}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 root:{padding:spacing.md,gap:10,paddingBottom:104},
 headingRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},
 kicker:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},
 heading:{...typography.hero,color:C.text},
 onlineBadge:{fontSize:9,fontWeight:'900',letterSpacing:.7,paddingHorizontal:8,paddingVertical:5,borderRadius:99,borderWidth:1},online:{color:C.good,borderColor:C.good,backgroundColor:C.goodSurface},local:{color:C.muted,borderColor:C.line,backgroundColor:C.panel2},syncIssue:{color:C.warning,borderColor:C.warning,backgroundColor:C.warningSurface},syncCard:{minHeight:54,flexDirection:'row',alignItems:'center',gap:8,padding:spacing.sm,borderWidth:1,borderColor:C.warning,borderRadius:radii.md,backgroundColor:C.warningSurface},syncTitle:{...typography.bodyStrong,color:C.warning},syncText:{...typography.caption,color:C.muted},syncButton:{width:82},
 aboutRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},copy:{...typography.body,color:C.muted,lineHeight:19},bio:{...typography.body,color:C.text,lineHeight:20},
 quickActions:{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:8},customizeAction:{flex:1.2,minWidth:94},action:{flex:1,minWidth:88},
 snapshot:{gap:6,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 highlights:{gap:6},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 sectionMeta:{fontSize:8,color:C.muted,fontWeight:'800'},
 stats:{flexDirection:'row',flexWrap:'wrap',gap:5},
 stat:{width:'31.8%',minWidth:88,minHeight:50,paddingHorizontal:6,paddingVertical:5,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
 statValue:{fontSize:17,lineHeight:21,fontWeight:'900',color:C.text},
 statLabel:{fontSize:7.5,lineHeight:10,color:C.muted,fontWeight:'900',letterSpacing:.55,marginTop:1,textAlign:'center'},
});}
