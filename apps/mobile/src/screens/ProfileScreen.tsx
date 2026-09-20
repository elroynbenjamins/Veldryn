import {useCallback,useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Image,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {ProfileScenePreview} from '../components/ProfileScenePreview';
import {PublicProfileScene} from '../components/PublicProfileScene';
import {ProfileShowcaseSection} from '../components/ProfileShowcaseSection';
import {OnlineProfileExtensionPanel} from '../components/OnlineProfileExtensionPanel';
import {GuildTaggedPlayerName} from '../components/GuildTaggedPlayerName';
import {GuildCrest} from '../components/SocialIdentity';
import type {GameState} from '../core/types';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {JOURNAL_ACHIEVEMENTS_V42} from '../core/adventurers-journal-v42';
import {
 formatProfileRecordValue,localProfileSummary,profileAchievementLabel,profileAchievementShowcase,
 profileCollectionLabel,profileCollectionShowcase,profileRecordLabel,profileRecordShowcase,
} from '../core/profile-presentation';
import {useAuthSession} from '../online/AuthSessionProvider';
import {onlineConfigured} from '../online/supabase';
import {publicPlayerProfileV43,type PublicPlayerProfileV43} from '../online/profile-extension-v43';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';
import {companionArtSource} from '../theme/companion-art';
import {profileShowcaseArt} from '../theme/profile-showcase-art';

const label=(value?:string)=>value?value.replace(/[_:-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase()):'Default';

type ProfileDestination='Appearance'|'Collections'|'Achievements'|'Rankings';

export function ProfileScreen({state,onNavigate}:{state:GameState;onNavigate?:(destination:ProfileDestination)=>void}){
 const c=state.character,account=state.account,{session}=useAuthSession();
 const [publicSelf,setPublicSelf]=useState<PublicPlayerProfileV43|null>(null),[loadingPublic,setLoadingPublic]=useState(false);
 const summary=useMemo(()=>localProfileSummary(state),[state]);
 const refreshPublic=useCallback(async()=>{if(!onlineConfigured||!session)return;setLoadingPublic(true);try{setPublicSelf(await publicPlayerProfileV43(session.user.id));}catch{setPublicSelf(null);}finally{setLoadingPublic(false)}},[session?.user.id]);
 useEffect(()=>{void refreshPublic()},[refreshPublic]);
 if(!c)return <ScrollView contentContainerStyle={s.root}><Text style={s.heading}>Profile</Text><Panel><Text style={s.copy}>Create a character to build your profile.</Text></Panel></ScrollView>;

 const achievementIds=profileAchievementShowcase(state,publicSelf),recordIds=profileRecordShowcase(state,publicSelf),collectionRefs=profileCollectionShowcase(state,publicSelf);
 const achievementEntries=achievementIds.map(id=>{const def=JOURNAL_ACHIEVEMENTS_V42.find(row=>row.id===id);return {key:id,label:profileAchievementLabel(id),meta:def?label(def.category)+' · '+label(def.tier):'Achievement'}});
 const recordEntries=recordIds.map(id=>{const record=publicSelf?.recordEntries?.[id]??state.account.journalState?.records?.[id];return {key:id,label:profileRecordLabel(id),value:record?formatProfileRecordValue(id,record.value):'—',meta:record?.contextLabel}});
 const collectionEntries=collectionRefs.map(ref=>({key:ref.kind+':'+ref.id,label:profileCollectionLabel(ref),meta:label(ref.kind),art:profileShowcaseArt(ref)}));
 const favoriteSkillId=publicSelf?.favoriteSkillId??summary.highestSkill?.skillId;
 const favoriteCompanionId=publicSelf?.favoriteCompanionId??state.character?.equippedCombatCompanionId??state.account.unlockedCombatCompanionIds?.[0];
 const favoriteCompanion=favoriteCompanionId?COMBAT_COMPANIONS.find(row=>row.id===favoriteCompanionId):undefined,favoriteCompanionArt=favoriteCompanionId?companionArtSource(favoriteCompanionId):undefined;
 const online=!!publicSelf,background=c.profileBackgroundId??'asterfall-night',displayName=publicSelf?.character.name??c.name,displayLevel=publicSelf?.character.level??c.level,displayClass=publicSelf?.character.classId??c.classId,profileStateLabel=publicSelf?.visibility==='public'?'PUBLIC PROFILE':publicSelf?.visibility==='guild'?'GUILD PROFILE':publicSelf?.visibility==='private'?'PRIVATE PROFILE':'LOCAL PROFILE';

 return <ScrollView contentContainerStyle={s.root}>
  <View style={s.headingRow}><View style={s.flex}><Text style={s.kicker}>PLAYER IDENTITY</Text><Text accessibilityRole="header" style={s.heading}>Profile</Text></View>{loadingPublic?<ActivityIndicator color={C.accent}/>:<Text style={[s.onlineBadge,online?s.online:s.local]}>{profileStateLabel}</Text>}</View>

  {publicSelf?<PublicProfileScene profile={publicSelf}/>:<ProfileScenePreview state={state} backgroundId={background}/>}

  <Panel>
   <View style={s.identityHead}>{account.guildMember?<GuildCrest size={48} bannerId={account.guildBannerId}/>:null}<View style={s.flex}><GuildTaggedPlayerName name={displayName} guildTag={publicSelf?.guildTag} tagColorId={publicSelf?.guildTagColorId} style={s.name}/><Text style={s.title}>“{publicSelf?.title??c.profileTitle??'New Adventurer'}”</Text><Text style={s.copy}>Level {displayLevel} · {label(displayClass)}{account.guildMember?' · Guild member':''}</Text></View></View>
   {publicSelf?.bio?<Text style={s.bio}>{publicSelf.bio}</Text>:<Text style={s.copy}>Add a short biography in Online Profile settings to tell other players about your character or play style.</Text>}
   <View style={s.quickActions}>
    <View style={s.action}><GameButton compact title="Appearance" tone="secondary" onPress={()=>onNavigate?.('Appearance')}/></View>
    <View style={s.action}><GameButton compact title="Collections" tone="secondary" onPress={()=>onNavigate?.('Collections')}/></View>
    <View style={s.action}><GameButton compact title="Achievements" tone="secondary" onPress={()=>onNavigate?.('Achievements')}/></View>
    <View style={s.action}><GameButton compact title="Rankings" tone="secondary" onPress={()=>onNavigate?.('Rankings')}/></View>
   </View>
  </Panel>

  <View style={s.stats}>
   <Stat value={summary.totalKills.toLocaleString()} label="KILLS"/>
   <Stat value={summary.combinedSkillLevels.toLocaleString()} label="SKILL LEVELS"/>
   <Stat value={String(summary.companionOwned)} label="COMPANIONS"/>
   <Stat value={String(summary.collectionOwned)} label="COLLECTIBLES"/>
   <Stat value={String(summary.achievementCount)} label="ACHIEVEMENTS"/>
   <Stat value={String(summary.recordCount)} label="RECORDS"/>
  </View>

  <Panel>
   <Text style={s.section}>PROFILE HIGHLIGHTS</Text>
   <View style={s.highlights}>
    <View style={s.highlight}><Text style={s.highlightLabel}>FAVORITE SKILL</Text><Text style={s.highlightValue}>{favoriteSkillId?label(favoriteSkillId):'Not selected'}</Text>{summary.highestSkill?<Text style={s.highlightMeta}>Highest current skill · Lv. {summary.highestSkill.level}</Text>:null}</View>
    <View style={s.highlight}>{favoriteCompanionArt?<Image source={favoriteCompanionArt} resizeMode="contain" style={s.favoriteCompanionArt}/>:null}<Text style={s.highlightLabel}>FAVORITE COMPANION</Text><Text style={s.highlightValue}>{favoriteCompanion?.name??'Not selected'}</Text><Text style={s.highlightMeta}>{favoriteCompanion?label(favoriteCompanion.role)+' · '+label(favoriteCompanion.rarity):'Choose one in Online Profile settings'}</Text></View>
   </View>
   <View style={s.identityRows}><IdentityRow label="Bosses defeated" value={summary.bossesDefeated.toLocaleString()}/><IdentityRow label="Owned titles" value={(account.unlockedTitleIds?.length??0).toLocaleString()}/><IdentityRow label="Profile cosmetics" value={summary.collectionOwned.toLocaleString()}/><IdentityRow label="Published visibility" value={publicSelf?label(publicSelf.visibility):'Local only'}/></View>
  </Panel>

  <ProfileShowcaseSection title="ACHIEVEMENT SHOWCASE" entries={achievementEntries} emptyLabel="Choose an earned achievement"/>
  <ProfileShowcaseSection title="PERSONAL RECORDS" entries={recordEntries} emptyLabel="No record selected"/>
  <ProfileShowcaseSection title="COLLECTION SHOWCASE" entries={collectionEntries} emptyLabel="Choose a collectible"/>

  <OnlineProfileExtensionPanel state={state} onSaved={refreshPublic}/>
 </ScrollView>;
}

function Stat({value,label}:{value:string;label:string}){return <View style={s.stat}><Text numberOfLines={1} style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>}
function IdentityRow({label:rowLabel,value}:{label:string;value:string}){return <View style={s.row}><Text style={s.rowLabel}>{rowLabel}</Text><Text style={s.rowValue}>{value}</Text></View>}

const s=StyleSheet.create({
 root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},
 headingRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},
 kicker:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},
 heading:{...typography.hero,color:C.text},
 onlineBadge:{fontSize:9,fontWeight:'900',letterSpacing:.7,paddingHorizontal:8,paddingVertical:5,borderRadius:99,borderWidth:1},online:{color:C.good,borderColor:C.good,backgroundColor:'#14261d'},local:{color:C.muted,borderColor:C.line,backgroundColor:C.panel},
 identityHead:{flexDirection:'row',alignItems:'center',gap:spacing.sm},name:{...typography.hero,color:C.text},title:{...typography.bodyStrong,color:equipmentColors.goldSoft,fontStyle:'italic'},copy:{...typography.body,color:C.muted,lineHeight:20},bio:{...typography.body,color:C.text,lineHeight:21,marginTop:spacing.sm},
 quickActions:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:spacing.md},action:{width:'48%',minWidth:130},
 stats:{flexDirection:'row',flexWrap:'wrap',gap:6},stat:{width:'31.5%',minWidth:92,minHeight:66,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel,alignItems:'center',justifyContent:'center'},statValue:{...typography.title,color:C.text},statLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.7,marginTop:2,textAlign:'center'},
 section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},highlights:{flexDirection:'row',gap:8,marginTop:spacing.sm},highlight:{flex:1,minWidth:0,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},favoriteCompanionArt:{width:52,height:52,alignSelf:'center',marginBottom:3},highlightLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.7},highlightValue:{...typography.bodyStrong,color:C.text,marginTop:2},highlightMeta:{fontSize:9,lineHeight:12,color:C.info,marginTop:2},
 identityRows:{marginTop:spacing.sm},row:{minHeight:34,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm,borderTopWidth:1,borderTopColor:C.line},rowLabel:{...typography.caption,color:C.muted},rowValue:{...typography.bodyStrong,color:C.text},
});
