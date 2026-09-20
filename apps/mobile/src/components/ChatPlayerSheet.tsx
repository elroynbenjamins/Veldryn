import {useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {
 cancelFriendRequest,friendRelationshipState,removeFriend,respondFriendRequest,sendFriendRequest,setPlayerBlocked,
 sendPartyInvitation,sendGuildInvitation,socialInviteCapabilities,
 type FriendRelationship,type SocialInviteCapabilities,
} from '../online/social';
import {publicPlayerProfileV43,type PublicPlayerProfileV43} from '../online/profile-extension-v43';
import {C,radii,spacing,typography} from '../theme/theme';
import {profileShowcaseArt} from '../theme/profile-showcase-art';
import {ProfileShowcaseSection} from './ProfileShowcaseSection';
import {ProfileFavoriteHighlights} from './ProfileFavoriteHighlights';
import {GameButton} from './GameButton';
import {CompactPlayerIdentity} from './CompactPlayerIdentity';
import {formatProfileRecordValue,profileAchievementLabel,profileCollectionLabel,profileRecordLabel} from '../core/profile-presentation';
import {PublicProfileScene} from './PublicProfileScene';
import {useAuthSession} from '../online/AuthSessionProvider';
import {profileAchievementPrestige,profileCollectionPrestige,profileRecordPrestige} from '../core/profile-prestige';
import {friendRelationshipActionPresentation} from '../core/social-identity';

export type ChatPlayerIdentity={id?:string;account_id:string;sender_name:string;guild_tag?:string|null;guild_tag_color_id?:string|null;relationship?:FriendRelationship};

export function ChatPlayerSheet({
 message,onClose,onBlocked,onRelationshipChanged,
}:{
 message:ChatPlayerIdentity|null;onClose:()=>void;onBlocked:(accountId:string)=>void;
 onRelationshipChanged?:(accountId:string,relationship:FriendRelationship)=>void;
}){
 const {session}=useAuthSession();
 const [profile,setProfile]=useState<PublicPlayerProfileV43|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[unavailable,setUnavailable]=useState(false),[loadError,setLoadError]=useState('');
 const [relationship,setRelationship]=useState<{relationship:FriendRelationship;requestId?:string}>({relationship:'none'}),[relationshipLoading,setRelationshipLoading]=useState(false),[relationshipError,setRelationshipError]=useState('');
 const [inviteCapabilities,setInviteCapabilities]=useState<SocialInviteCapabilities|null>(null),[inviteLoading,setInviteLoading]=useState(false),[inviteError,setInviteError]=useState('');

 const isSelf=!!session?.user.id&&!!message&&message.account_id===session.user.id;
 const setRelationshipAndNotify=(next:{relationship:FriendRelationship;requestId?:string})=>{setRelationship(next);if(message)onRelationshipChanged?.(message.account_id,next.relationship);};
 async function loadProfile(){if(!message)return;setLoading(true);setUnavailable(false);setLoadError('');try{const row=await publicPlayerProfileV43(message.account_id);setProfile(row);setUnavailable(!row);}catch(error){setProfile(null);setLoadError(error instanceof Error?error.message:'Unable to load this player profile.');}finally{setLoading(false)}}
 async function loadRelationship(){
  if(!message||isSelf){setRelationship({relationship:'none'});setRelationshipError('');return;}
  setRelationshipLoading(true);setRelationshipError('');
  try{setRelationshipAndNotify(await friendRelationshipState(message.account_id))}
  catch(error){setRelationship({relationship:message.relationship??'none'});setRelationshipError(error instanceof Error?error.message:'Friend status could not refresh.')}
  finally{setRelationshipLoading(false)}
 }
 async function loadInviteCapabilities(){
  if(!message||isSelf){setInviteCapabilities(null);setInviteError('');return;}
  setInviteLoading(true);setInviteError('');
  try{setInviteCapabilities(await socialInviteCapabilities(message.account_id))}
  catch(error){setInviteCapabilities(null);setInviteError(error instanceof Error?error.message:'Invitation actions are unavailable.')}
  finally{setInviteLoading(false)}
 }
 useEffect(()=>{
  let active=true;
  if(!message){setProfile(null);setUnavailable(false);setLoadError('');setRelationship({relationship:'none'});setRelationshipError('');setInviteCapabilities(null);setInviteError('');return;}
  setLoading(true);setUnavailable(false);setLoadError('');
  void publicPlayerProfileV43(message.account_id).then(row=>{if(!active)return;setProfile(row);setUnavailable(!row)}).catch(error=>{if(active){setProfile(null);setLoadError(error instanceof Error?error.message:'Unable to load this player profile.')}}).finally(()=>{if(active)setLoading(false)});
  if(message.account_id===session?.user.id){setRelationship({relationship:'none'});setRelationshipError('');setInviteCapabilities(null);setInviteError('');}
  else{
   setRelationshipLoading(true);setRelationshipError('');
   void friendRelationshipState(message.account_id).then(next=>{if(active){setRelationship(next);onRelationshipChanged?.(message.account_id,next.relationship)}}).catch(error=>{if(active){setRelationship({relationship:message.relationship??'none'});setRelationshipError(error instanceof Error?error.message:'Friend status could not refresh.')}}).finally(()=>{if(active)setRelationshipLoading(false)});
   setInviteLoading(true);setInviteError('');
   void socialInviteCapabilities(message.account_id).then(next=>{if(active)setInviteCapabilities(next)}).catch(error=>{if(active){setInviteCapabilities(null);setInviteError(error instanceof Error?error.message:'Invitation actions are unavailable.')}}).finally(()=>{if(active)setInviteLoading(false)});
  }
  return()=>{active=false};
 },[message?.id,message?.account_id,session?.user.id]);

 if(!message)return null;
 const target=message;

 async function runRelationship(action:()=>Promise<void>){if(busy)return;setBusy(true);try{await action()}catch(error){Alert.alert('Friends',error instanceof Error?error.message:'Unable to update this friendship.')}finally{setBusy(false)}}
 async function addFriend(){await runRelationship(async()=>{const result=await sendFriendRequest(target.account_id);if(result==='sent'||result==='already_pending')setRelationshipAndNotify({relationship:'outgoing_pending'});else if(result==='already_friends')setRelationshipAndNotify({relationship:'friend'});else await loadRelationship();});}
 function confirmRemoveFriend(){Alert.alert('Remove '+target.sender_name+'?','They will be removed from your Friends list. You can send a new request later.',[{text:'Cancel',style:'cancel'},{text:'Remove friend',style:'destructive',onPress:()=>void runRelationship(async()=>{await removeFriend(target.account_id);setRelationshipAndNotify({relationship:'none'});})}]);}
 async function cancelRequest(){if(!relationship.requestId){await loadRelationship();return;}await runRelationship(async()=>{await cancelFriendRequest(relationship.requestId!);setRelationshipAndNotify({relationship:'none'});});}
 async function acceptRequest(){if(!relationship.requestId){await loadRelationship();return;}await runRelationship(async()=>{await respondFriendRequest(relationship.requestId!,true);setRelationshipAndNotify({relationship:'friend'});});}
 async function declineRequest(){if(!relationship.requestId){await loadRelationship();return;}await runRelationship(async()=>{await respondFriendRequest(relationship.requestId!,false);setRelationshipAndNotify({relationship:'none'});});}
 function confirmBlock(){Alert.alert('Block '+target.sender_name+'?','Their messages will be hidden and they will be removed from your social lists.',[{text:'Cancel',style:'cancel'},{text:'Block',style:'destructive',onPress:async()=>{setBusy(true);try{await setPlayerBlocked(target.account_id,true);setRelationshipAndNotify({relationship:'none'});onBlocked(target.account_id);onClose();}catch(error){Alert.alert('Block player',error instanceof Error?error.message:'Unable to block player.');}finally{setBusy(false)}}}]);}
 async function inviteToParty(){if(busy)return;setBusy(true);try{const result=await sendPartyInvitation(target.account_id);Alert.alert('Party invitation',result.status==='already_pending'?'A Party invitation is already pending.':'Party invitation sent for 24 hours.');await loadInviteCapabilities()}catch(error){Alert.alert('Party invitation',error instanceof Error?error.message:'Unable to send Party invitation.')}finally{setBusy(false)}}
 async function inviteToGuild(){if(busy)return;setBusy(true);try{const result=await sendGuildInvitation(target.account_id);Alert.alert('Guild invitation',result.status==='already_pending'?'A Guild invitation is already pending.':'Guild invitation sent for 24 hours.');await loadInviteCapabilities()}catch(error){Alert.alert('Guild invitation',error instanceof Error?error.message:'Unable to send Guild invitation.')}finally{setBusy(false)}}

 const achievementEntries=profile?.achievementShowcaseIds.map(id=>{const prestige=profileAchievementPrestige(id);return {key:id,label:profileAchievementLabel(id),prestige:prestige.tone,badge:prestige.badge}})??[];
 const recordPrestige=profileRecordPrestige();
 const recordEntries=profile?.recordShowcaseIds.map(id=>{const record=profile.recordEntries?.[id];return {key:id,label:profileRecordLabel(id),value:record?formatProfileRecordValue(id,record.value):'—',meta:record?.contextLabel,prestige:recordPrestige.tone,badge:recordPrestige.badge}})??[];
 const collectionEntries=profile?.collectionShowcase.map(ref=>{const prestige=profileCollectionPrestige(ref);return {key:ref.kind+':'+ref.id,label:profileCollectionLabel(ref),meta:ref.kind.replace(/_/g,' '),art:profileShowcaseArt(ref),artMode:ref.kind==='background'?'cover' as const:'contain' as const,prestige:prestige.tone,badge:prestige.badge}})??[];
 const relationshipPresentation=friendRelationshipActionPresentation(relationship.relationship);
 const showInviteActions=!!inviteCapabilities&&(inviteCapabilities.party.available||inviteCapabilities.party.pending||inviteCapabilities.guild.available||inviteCapabilities.guild.pending);

 return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={s.scrim}><Pressable accessibilityLabel="Close player profile" onPress={onClose} style={StyleSheet.absoluteFill}/><View accessibilityViewIsModal style={s.sheet}>
  <View style={s.handle}/><View style={s.top}><Text style={s.kicker}>PLAYER PROFILE</Text><Pressable accessibilityRole="button" accessibilityLabel="Close player profile" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
   {loading?<View style={s.limitedCard}><CompactPlayerIdentity name={message.sender_name} guildTag={message.guild_tag} guildTagColorId={message.guild_tag_color_id} status="LOADING PROFILE"/><ActivityIndicator color={C.accent}/></View>:profile?<><PublicProfileScene profile={profile}/>
    {profile.bio?<View style={s.bioCard}><Text style={s.bioLabel}>PROFILE BIO</Text><Text style={s.bio}>{profile.bio}</Text></View>:null}
    {(profile.favoriteSkillId||profile.favoriteCompanionId)?<ProfileFavoriteHighlights favoriteSkillId={profile.favoriteSkillId} favoriteCompanionId={profile.favoriteCompanionId}/>:null}
    <ProfileShowcaseSection title="ACHIEVEMENT SHOWCASE" entries={achievementEntries} emptyLabel="No achievement selected"/>
    <ProfileShowcaseSection title="PERSONAL RECORDS" entries={recordEntries} emptyLabel="No record selected"/>
    <ProfileShowcaseSection title="COLLECTION SHOWCASE" entries={collectionEntries} emptyLabel="No collectible selected"/>
   </>:<View style={s.limitedCard}><CompactPlayerIdentity name={message.sender_name} guildTag={message.guild_tag} guildTagColorId={message.guild_tag_color_id} status={loadError?'PROFILE ERROR':'LIMITED PROFILE'}/><View style={s.limitedCopy}><Text style={s.privateTitle}>{loadError?'Public profile could not load':unavailable?'Full profile unavailable':'No published profile'}</Text><Text style={s.limitedText}>{loadError?'The profile service did not respond successfully. The player identity and social actions below are still available.':'This player may use Private or Guild visibility, may not have published a social profile yet, or may be hidden by a relationship rule.'}</Text></View>{loadError?<GameButton title="Retry profile" tone="secondary" onPress={()=>void loadProfile()}/>:null}</View>}
  </ScrollView>
  {isSelf?<View style={s.selfNotice}><Text style={s.selfNoticeLabel}>THIS IS YOUR PROFILE</Text><Text style={s.selfNoticeText}>Edit your biography, favorites, privacy and showcases from Account → Profile.</Text></View>:<View style={s.actionArea}>
   <View style={s.actionHead}><Text style={s.hint}>PLAYER ACTIONS</Text><View style={[s.relationshipPill,relationshipPresentation.tone==='friend'&&s.relationshipFriend]}>{relationshipLoading?<ActivityIndicator size="small" color={C.info}/>:<Text style={[s.relationshipText,relationshipPresentation.tone==='friend'&&s.relationshipFriendText]}>{relationshipPresentation.status}</Text>}</View></View>
   {relationshipError?<Text style={s.relationshipError}>Friend status could not refresh; showing the last known state.</Text>:null}
   <View style={s.actions}>
    {relationship.relationship==='none'?<View style={s.primaryAction}><GameButton title="Add friend" disabled={busy||relationshipLoading} onPress={()=>void addFriend()}/></View>:null}
    {relationship.relationship==='friend'?<View style={s.primaryAction}><GameButton title="Remove friend" tone="secondary" disabled={busy||relationshipLoading} onPress={confirmRemoveFriend}/></View>:null}
    {relationship.relationship==='outgoing_pending'?<View style={s.primaryAction}><GameButton title={relationship.requestId?'Cancel request':'Refresh request'} tone="secondary" disabled={busy||relationshipLoading} onPress={()=>void cancelRequest()}/></View>:null}
    {relationship.relationship==='incoming_pending'?<><View style={s.primaryAction}><GameButton title={relationship.requestId?'Accept request':'Refresh request'} disabled={busy||relationshipLoading} onPress={()=>void acceptRequest()}/></View><View style={s.secondaryAction}><GameButton title="Decline" tone="secondary" disabled={busy||relationshipLoading||!relationship.requestId} onPress={()=>void declineRequest()}/></View></>:null}
    <Pressable accessibilityRole="button" disabled={busy} onPress={confirmBlock} style={({pressed})=>[s.blockButton,(pressed||busy)&&s.pressed]}><Text style={s.blockText}>Block</Text></Pressable>
   </View>
   {showInviteActions?<><View style={s.inviteHead}><Text style={s.hint}>DIRECT INVITATIONS</Text>{inviteLoading?<ActivityIndicator size="small" color={C.info}/>:null}</View><View style={s.actions}>
    {inviteCapabilities?.party.available?<View style={s.primaryAction}><GameButton title="Invite to Party" tone="secondary" disabled={busy||inviteLoading} onPress={()=>void inviteToParty()}/></View>:inviteCapabilities?.party.pending?<View style={s.primaryAction}><GameButton title="Party invite sent" tone="secondary" disabled onPress={()=>{}}/></View>:null}
    {inviteCapabilities?.guild.available?<View style={s.primaryAction}><GameButton title="Invite to Guild" tone="secondary" disabled={busy||inviteLoading} onPress={()=>void inviteToGuild()}/></View>:inviteCapabilities?.guild.pending?<View style={s.primaryAction}><GameButton title="Guild invite sent" tone="secondary" disabled onPress={()=>{}}/></View>:null}
   </View></>:inviteError?<Text style={s.inviteError}>Direct invitations are temporarily unavailable.</Text>:null}
  </View>}
 </View></View></Modal>;
}

const s=StyleSheet.create({
 scrim:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.55)'},sheet:{maxHeight:'88%',paddingHorizontal:spacing.lg,paddingTop:8,paddingBottom:24,backgroundColor:'#101923',borderTopWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderTopLeftRadius:22,borderTopRightRadius:22},handle:{width:38,height:4,alignSelf:'center',borderRadius:2,backgroundColor:'#526174',marginBottom:8},top:{minHeight:44,flexDirection:'row',alignItems:'center'},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1,flex:1},close:{width:44,height:44,alignItems:'center',justifyContent:'center'},closeText:{fontSize:28,lineHeight:31,color:C.muted},scroll:{gap:spacing.md,paddingBottom:spacing.sm},
 limitedCard:{gap:10,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},limitedCopy:{gap:3},limitedText:{...typography.body,color:C.muted,lineHeight:20},privateTitle:{...typography.title,color:C.text},
 bioCard:{gap:3,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},bioLabel:{fontSize:8,color:C.accent,fontWeight:'900',letterSpacing:.75},bio:{...typography.body,color:C.text,lineHeight:20},
 selfNotice:{gap:2,marginTop:spacing.sm,padding:spacing.sm,borderWidth:1,borderColor:C.info,borderRadius:radii.md,backgroundColor:'#102536'},selfNoticeLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},selfNoticeText:{...typography.caption,color:C.muted},
 actionArea:{gap:6,marginTop:spacing.sm},actionHead:{minHeight:28,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},inviteHead:{minHeight:24,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:2},inviteError:{fontSize:9,lineHeight:12,color:C.muted},hint:{...typography.caption,color:C.muted,textTransform:'uppercase',letterSpacing:.8},relationshipPill:{minHeight:24,minWidth:82,alignItems:'center',justifyContent:'center',paddingHorizontal:7,paddingVertical:3,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},relationshipFriend:{borderColor:C.good,backgroundColor:'#152b20'},relationshipText:{fontSize:7.5,color:C.muted,fontWeight:'900',letterSpacing:.45},relationshipFriendText:{color:C.good},relationshipError:{fontSize:9,lineHeight:12,color:C.warning},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:6},primaryAction:{flex:1,minWidth:124},secondaryAction:{minWidth:92},blockButton:{minWidth:76,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:10,borderRadius:radii.md,backgroundColor:'#1a2430',borderWidth:StyleSheet.hairlineWidth,borderColor:C.line},blockText:{...typography.bodyStrong,color:C.bad},pressed:{opacity:.62},
});
