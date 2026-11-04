import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {GameTextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {CompactPlayerIdentity} from './CompactPlayerIdentity';
import {friends,sendPartyInvitation,socialInviteCapabilities,type FriendEntry} from '../online/social';
import {radii,spacing,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {socialLabel,useSocialText} from '../i18n/social';

const invitationIssue:Record<string,string>={
 no_party:'You are no longer in a Party.',
 leader_required:'Only the Party leader can invite friends.',
 party_full:'Your Party is full.',
 target_in_party:'This friend is already in a Party.',
 already_invited:'This friend already has a pending invitation.',
 player_unavailable:'This player is unavailable for invitations.',
};
function issueMessage(reason?:string|null){return reason?invitationIssue[reason]??'This friend cannot receive a Party invitation right now.':'This friend cannot receive a Party invitation right now.';}

/** Sends private, server-authoritative Party invitations to existing friends; no chat spam or new inbox tables. */
export function PartyFriendInviteSheet({visible,partyId,openSpots,pendingAccountIds=[],onClose,onInvited}:{
 visible:boolean;partyId?:string;openSpots:number;pendingAccountIds?:readonly string[];
 onClose:()=>void;onInvited?:()=>void;
}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),language=useGameLanguage(),st=useSocialText();
 const [rows,setRows]=useState<FriendEntry[]>([]),[loading,setLoading]=useState(false),[busyId,setBusyId]=useState<string|null>(null);
 const [error,setError]=useState(''),[search,setSearch]=useState(''),[sentIds,setSentIds]=useState<string[]>([]);
 useEffect(()=>{
  if(!visible||!partyId)return;
  let cancelled=false;
  setRows([]);setSearch('');setSentIds([]);setError('');setLoading(true);
  void friends().then(list=>{if(!cancelled)setRows(list)}).catch(reason=>{if(!cancelled)setError(reason instanceof Error?reason.message:'Friends could not be loaded.')}).finally(()=>{if(!cancelled)setLoading(false)});
  return()=>{cancelled=true};
 },[visible,partyId]);
 const shown=rows.filter(friend=>friend.display_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 const send=async(friend:FriendEntry)=>{
  if(busyId||!partyId||openSpots<1||sentIds.includes(friend.account_id)||pendingAccountIds.includes(friend.account_id))return;
  setError('');setBusyId(friend.account_id);
  try{
   const capability=(await socialInviteCapabilities(friend.account_id)).party;
   if(capability.pending){setSentIds(current=>[...current,friend.account_id]);return;}
   if(!capability.available)throw new Error(issueMessage(capability.reason));
   if(capability.partyId!==partyId)throw new Error('Your Party changed. Reopen the invitation list.');
   const result=await sendPartyInvitation(friend.account_id);
   if(result.status==='sent'||result.status==='already_pending'){
    setSentIds(current=>[...current,friend.account_id]);
    onInvited?.();
   }
  }catch(reason){setError(reason instanceof Error?reason.message:'Could not send the invitation.');}
  finally{setBusyId(null);}
 };
 return <GameModalSurface visible={visible} presentation="sheet" onClose={onClose} dismissOnBackdrop={!busyId}>
  <GameModalHeader eyebrow={st('PRIVATE PARTY INVITATIONS')} title={st('Invite friends')} onClose={onClose} closeDisabled={!!busyId}/>
  <Text style={s.hint}>{st('Choose a friend to send a Party invitation. It appears with their Party invites, not in public chat. Expires after 24 hours.')}</Text>
  <Text style={s.status}>{openSpots===1?st('{count} open slot',{count:openSpots}):st('{count} open slots',{count:openSpots})} · {st('Party leader only')}</Text>
  {loading?<View style={s.loading}><ActivityIndicator color={C.accent}/><Text style={s.hint}>{st('Loading friends…')}</Text></View>:null}
  {!loading&&rows.length>0?<GameTextInput accessibilityLabel={st('Search friends for Party invites')} placeholder={st('Search friends')} placeholderTextColor={C.muted} value={search} onChangeText={setSearch} style={s.search}/>:null}
  {!!error?<Text accessibilityRole="alert" style={s.error}>{socialLabel(language,error)}</Text>:null}
  <ScrollView style={s.list} contentContainerStyle={s.listContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   {!loading&&!rows.length?<Text style={s.hint}>{st('No friends yet. Add friends through the Friends screen to invite them privately.')}</Text>:null}
   {!loading&&rows.length>0&&!shown.length?<Text style={s.hint}>{st('No matching friends.')}</Text>:null}
   {shown.map(friend=>{
    const invited=sentIds.includes(friend.account_id)||pendingAccountIds.includes(friend.account_id);
    return <View key={friend.account_id} style={s.friendRow}>
      <View style={s.identity}><CompactPlayerIdentity accountId={friend.account_id} name={friend.display_name} characterName={friend.character_name} className={friend.class_id} badges={friend.player_badges} guildTag={friend.guild_tag} guildTagColorId={friend.guild_tag_color_id} avatarSize={38}/></View>
      <GameButton compact title={invited?st('Invited'):st('Invite')} tone={invited?'secondary':undefined} disabled={!!busyId||invited||openSpots<1||!partyId} loading={busyId===friend.account_id} onPress={()=>void send(friend)}/>
     </View>;
   })}
  </ScrollView>
  <GameButton compact title={st('Done')} tone="secondary" disabled={!!busyId} onPress={onClose}/>
 </GameModalSurface>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 hint:{fontSize:11,lineHeight:17,color:C.muted,marginVertical:5},
 status:{fontSize:11,fontWeight:'800',color:C.accent,marginBottom:8},
 search:{minHeight:44,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.inputBg,color:C.text,paddingHorizontal:12,marginBottom:8},
 list:{maxHeight:340,minHeight:50,flexShrink:1},
 listContent:{paddingBottom:spacing.sm,gap:4},
 friendRow:{minHeight:62,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:C.line,paddingVertical:6},
 identity:{flex:1,minWidth:0},
 loading:{minHeight:65,flexDirection:'row',alignItems:'center',gap:10},
 error:{color:C.bad,fontSize:11,lineHeight:16,paddingVertical:5},
 });}
