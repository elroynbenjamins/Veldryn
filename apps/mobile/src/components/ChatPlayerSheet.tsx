import {useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Image,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {sendFriendRequest,setPlayerBlocked} from '../online/social';
import {publicPlayerProfileV43,type PublicPlayerProfileV43} from '../online/profile-extension-v43';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';
import {CharacterPortraitSelection} from './CharacterVisual';
import {RegionArtwork} from './RegionArtwork';
import {profileBackgroundPreviewById} from '../theme/profile-background-assets';
import {profileBorderSourceById} from '../theme/profile-border-assets';
import {eventPetSourceById} from '../theme/event-pet-assets';
import {BASE_PROFILE_BACKGROUNDS} from '../core/profile-cosmetics';
import {JOURNAL_ACHIEVEMENTS_V42} from '../core/adventurers-journal-v42';
import {personalRecordDefinition} from '../core/personal-records-v43';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {CLASSES} from '../content/classes';
import type {ClassId} from '../core/types';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';

export type ChatPlayerIdentity={id?:string;account_id:string;sender_name:string;guild_tag?:string|null;guild_tag_color_id?:string|null};

function recordValue(profile:PublicPlayerProfileV43,id:string){
 const def=personalRecordDefinition(id),record=profile.recordEntries?.[id];if(!def||!record)return '—';const value=record.value;
 if(def.unit==='milliseconds'){const seconds=value/1000;return seconds>=60?Math.floor(seconds/60)+'m '+Math.round(seconds%60)+'s':seconds.toFixed(seconds<10?2:1)+'s';}
 if(def.unit==='seconds'){const h=Math.floor(value/3600),m=Math.floor((value%3600)/60);return h?h+'h '+m+'m':m?m+'m':Math.floor(value)+'s';}
 return Math.floor(value).toLocaleString();
}

export function ChatPlayerSheet({message,onClose,onBlocked}:{message:ChatPlayerIdentity|null;onClose:()=>void;onBlocked:(accountId:string)=>void}){
 const [profile,setProfile]=useState<PublicPlayerProfileV43|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[unavailable,setUnavailable]=useState(false);
 useEffect(()=>{let active=true;if(!message){setProfile(null);setUnavailable(false);return;}setLoading(true);setUnavailable(false);void publicPlayerProfileV43(message.account_id).then(row=>{if(!active)return;setProfile(row);setUnavailable(!row)}).catch(()=>{if(active){setProfile(null);setUnavailable(true)}}).finally(()=>{if(active)setLoading(false)});return()=>{active=false};},[message?.id,message?.account_id]);
 if(!message)return null;
 async function addFriend(){if(busy)return;setBusy(true);try{const result=await sendFriendRequest(message!.account_id);Alert.alert('Friend request',result==='sent'?'Request sent to '+message!.sender_name+'.':result==='already_friends'?'You are already friends.':result==='already_pending'?'Your request is already pending.':'This player has already sent you a request. Open Friends to respond.');}catch(error){Alert.alert('Friend request',error instanceof Error?error.message:'Unable to send request.');}finally{setBusy(false)}}
 function confirmBlock(){Alert.alert('Block '+message!.sender_name+'?','Their messages will be hidden and they will be removed from your social lists.',[{text:'Cancel',style:'cancel'},{text:'Block',style:'destructive',onPress:async()=>{setBusy(true);try{await setPlayerBlocked(message!.account_id,true);onBlocked(message!.account_id);onClose();}catch(error){Alert.alert('Block player',error instanceof Error?error.message:'Unable to block player.');}finally{setBusy(false)}}}]);}
 const background=profile?profileBackgroundPreviewById.get(profile.backgroundId):undefined,base=profile?BASE_PROFILE_BACKGROUNDS.find(row=>row.id===profile.backgroundId):undefined,border=profile?.borderId?profileBorderSourceById.get(profile.borderId):undefined,pet=profile?.petId?eventPetSourceById.get(profile.petId):undefined;
 const classId=(profile&&CLASSES.some(row=>row.id===profile.character.classId)?profile.character.classId:'IRONWARDEN') as ClassId;
 const favoriteCompanion=profile?.favoriteCompanionId?COMBAT_COMPANIONS.find(row=>row.id===profile.favoriteCompanionId):undefined;
 return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={s.scrim}><Pressable accessibilityLabel="Close player profile" onPress={onClose} style={StyleSheet.absoluteFill}/><View accessibilityViewIsModal style={s.sheet}>
  <View style={s.handle}/><View style={s.top}><Text style={s.kicker}>PLAYER PROFILE</Text><Pressable accessibilityRole="button" accessibilityLabel="Close player profile" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
   {loading?<View style={s.loading}><ActivityIndicator color={C.accent}/><Text style={s.meta}>Loading public profile…</Text></View>:profile?<><View style={[s.scene,!!border&&s.sceneBorder]}>
      {background?<Image source={background.source} resizeMode="cover" style={StyleSheet.absoluteFill}/>:base?<RegionArtwork regionId={base.region}/>:<View style={[StyleSheet.absoluteFill,{backgroundColor:'#101d2b'}]}/>}
      <View style={s.sceneShade}/>
      <CharacterPortraitSelection classId={classId} body={profile.character.bodyPresentation} skinId={profile.character.selectedSkinId} compact style={s.character}/>
      {pet?<Image source={pet} resizeMode="contain" style={s.pet}/>:null}
      {border?<Image accessible={false} source={border} resizeMode="stretch" style={StyleSheet.absoluteFill}/>:null}
    </View>
    <View style={s.identity}><GuildTaggedPlayerName name={profile.character.name||profile.displayName} guildTag={profile.guildTag??message.guild_tag} tagColorId={profile.guildTagColorId??message.guild_tag_color_id} style={s.name}/><Text style={s.title}>“{profile.title}”</Text><Text style={s.meta}>Level {profile.character.level} · {profile.character.classId.replace(/_/g,' ')}</Text>{profile.bio?<Text style={s.bio}>{profile.bio}</Text>:null}</View>
    {(profile.favoriteSkillId||favoriteCompanion)?<View style={s.quickFacts}>{profile.favoriteSkillId?<View style={s.fact}><Text style={s.factLabel}>FAVORITE SKILL</Text><Text style={s.factValue}>{profile.favoriteSkillId.replace(/_/g,' ')}</Text></View>:null}{favoriteCompanion?<View style={s.fact}><Text style={s.factLabel}>FAVORITE COMPANION</Text><Text style={s.factValue}>{favoriteCompanion.name}</Text></View>:null}</View>:null}
    {profile.achievementShowcaseIds.length?<View style={s.block}><Text style={s.blockTitle}>ACHIEVEMENT SHOWCASE</Text>{profile.achievementShowcaseIds.map(id=>{const def=JOURNAL_ACHIEVEMENTS_V42.find(row=>row.id===id);return <Text key={id} style={s.showcase}>✦ {def?.title??id.replace(/_/g,' ')}</Text>})}</View>:null}
    {profile.recordShowcaseIds.length?<View style={s.block}><Text style={s.blockTitle}>PERSONAL RECORDS</Text>{profile.recordShowcaseIds.map(id=>{const def=personalRecordDefinition(id);return <View key={id} style={s.record}><Text style={s.recordName}>{def?.label??id.replace(/_/g,' ')}</Text><Text style={s.recordValue}>{recordValue(profile,id)}</Text></View>})}</View>:null}
    {profile.collectionShowcase.length?<View style={s.block}><Text style={s.blockTitle}>COLLECTION SHOWCASE</Text><View style={s.chips}>{profile.collectionShowcase.map(ref=><View key={ref.kind+':'+ref.id} style={s.chip}><Text numberOfLines={1} style={s.chipText}>{ref.kind.toUpperCase()} · {ref.id.replace(/_/g,' ')}</Text></View>)}</View></View>:null}
   </>:<View style={s.loading}><Text style={s.privateTitle}>{unavailable?'Profile unavailable':'No public profile'}</Text><Text style={s.meta}>This player’s profile is private, guild-only, unavailable, or has not been published yet.</Text></View>}
  </ScrollView>
  <Text style={s.hint}>PLAYER ACTIONS</Text><View style={s.actions}><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void addFriend()} style={({pressed})=>[s.primary,(pressed||busy)&&s.pressed]}><Text style={s.primaryText}>Add friend</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={confirmBlock} style={({pressed})=>[s.secondary,(pressed||busy)&&s.pressed]}><Text style={s.blockText}>Block</Text></Pressable></View>
 </View></View></Modal>;
}
const s=StyleSheet.create({
 scrim:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.55)'},sheet:{maxHeight:'88%',paddingHorizontal:spacing.lg,paddingTop:8,paddingBottom:24,backgroundColor:'#101923',borderTopWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderTopLeftRadius:22,borderTopRightRadius:22},handle:{width:38,height:4,alignSelf:'center',borderRadius:2,backgroundColor:'#526174',marginBottom:8},top:{minHeight:44,flexDirection:'row',alignItems:'center'},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1,flex:1},close:{width:44,height:44,alignItems:'center',justifyContent:'center'},closeText:{fontSize:28,lineHeight:31,color:C.muted},scroll:{gap:spacing.md,paddingBottom:spacing.sm},loading:{minHeight:180,alignItems:'center',justifyContent:'center',gap:8,padding:spacing.lg},scene:{height:205,borderRadius:radii.lg,overflow:'hidden',alignItems:'center',justifyContent:'flex-end',backgroundColor:'#101d2b',borderWidth:1,borderColor:C.line},sceneBorder:{borderWidth:2,borderColor:equipmentColors.goldSoft},sceneShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,12,20,.22)'},character:{width:130,height:162,zIndex:2},pet:{position:'absolute',right:14,bottom:12,width:58,height:58,zIndex:3},identity:{alignItems:'center',gap:3},name:{...typography.hero,color:C.text,textAlign:'center'},title:{...typography.body,color:equipmentColors.goldSoft,fontStyle:'italic',textAlign:'center'},meta:{...typography.body,color:C.muted,textAlign:'center',textTransform:'capitalize'},bio:{...typography.body,color:C.text,textAlign:'center',lineHeight:20,marginTop:5},quickFacts:{flexDirection:'row',gap:8},fact:{flex:1,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},factLabel:{fontSize:9,color:C.muted,fontWeight:'900'},factValue:{fontSize:12,color:C.text,fontWeight:'900',textTransform:'capitalize',marginTop:2},block:{gap:6,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},blockTitle:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},showcase:{...typography.body,color:C.text},record:{flexDirection:'row',justifyContent:'space-between',gap:8,paddingVertical:4},recordName:{...typography.caption,color:C.text,flex:1},recordValue:{...typography.bodyStrong,color:C.good},chips:{flexDirection:'row',flexWrap:'wrap',gap:5},chip:{maxWidth:'100%',paddingHorizontal:7,paddingVertical:4,borderRadius:99,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},chipText:{fontSize:9,color:C.muted,fontWeight:'800',textTransform:'capitalize'},privateTitle:{...typography.title,color:C.text},hint:{...typography.caption,color:C.muted,marginTop:spacing.sm,marginBottom:spacing.sm,textTransform:'uppercase',letterSpacing:.8},actions:{flexDirection:'row',gap:spacing.sm},primary:{flex:1,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:radii.md,backgroundColor:'#23658a'},secondary:{minWidth:100,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:radii.md,backgroundColor:'#1a2430',borderWidth:StyleSheet.hairlineWidth,borderColor:C.line},primaryText:{...typography.bodyStrong,color:'#f4fbff'},blockText:{...typography.bodyStrong,color:C.bad},pressed:{opacity:.62}
});
