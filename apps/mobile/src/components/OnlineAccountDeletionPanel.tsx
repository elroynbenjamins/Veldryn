import {useEffect,useMemo,useRef,useState} from 'react';
import {Linking,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {Panel} from './Panel';
import {useAuthSession} from '../online/AuthSessionProvider';
import {ONLINE_ACCOUNT_DELETION_REQUESTS_RELEASED} from '../core/release-flags';
import {ACCOUNT_DELETION_CONFIRMATION,cancelOnlineAccountDeletionRequest,readOnlineAccountDeletionRequest,requestOnlineAccountDeletion,validAccountDeletionConfirmation,type AccountDeletionRequestSnapshot} from '../online/account-deletion';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import type {Language} from '../i18n/languages';
import {accountDeletionText} from '../i18n/account-deletion';
import {formatLocalizedDate} from '../i18n/translator';

const PRIVACY_POLICY_URL='https://elroynbenjamins.github.io/veldryn/privacy/';

/** This panel cannot erase a user. Once released it requests manual privacy review.
 * Final account erasure has a separate backend safety gate and is not implemented. */
export function OnlineAccountDeletionPanel({language}:{language:Language}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),a=(value:string)=>accountDeletionText(language,value);
 const {session}=useAuthSession(),accountId=session?.user.id??'',linked=!!session&&!session.user.is_anonymous;
 const [expanded,setExpanded]=useState(false),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [status,setStatus]=useState<AccountDeletionRequestSnapshot|null>(null);
 const [statusLoading,setStatusLoading]=useState(false),[statusReady,setStatusReady]=useState(false),[refreshSequence,setRefreshSequence]=useState(0);
 const accountRef=useRef(accountId);
 if(accountRef.current!==accountId){accountRef.current=accountId;}
 useEffect(()=>{setExpanded(false);setConfirmation('');setStatus(null);setStatusLoading(false);setStatusReady(false);setBusy(false);setError('');setRefreshSequence(0);},[accountId]);
 useEffect(()=>{
  if(!expanded||!linked||!ONLINE_ACCOUNT_DELETION_REQUESTS_RELEASED)return;
  let active=true;
  setStatusLoading(true);setStatusReady(false);setError('');
  void readOnlineAccountDeletionRequest(accountId)
   .then(result=>{if(active&&accountRef.current===accountId){setStatus(result);setStatusReady(true);}})
   .catch(reason=>{if(active&&accountRef.current===accountId)setError(reason instanceof Error?reason.message:'Could not check deletion request.');})
   .finally(()=>{if(active&&accountRef.current===accountId)setStatusLoading(false);});
  return()=>{active=false;};
 },[expanded,linked,accountId,refreshSequence]);
 const request=async()=>{
  if(busy||!linked||!statusReady||!validAccountDeletionConfirmation(confirmation))return;
  setBusy(true);setError('');
  try{const next=await requestOnlineAccountDeletion(accountId,confirmation);if(accountRef.current===accountId){setStatus(next);setConfirmation('');}}
  catch(cause){if(accountRef.current===accountId){setStatusReady(false);setError(cause instanceof Error?cause.message:'Could not request deletion. Check your request status before retrying.');}}
  finally{if(accountRef.current===accountId)setBusy(false);}
 };
 const cancel=async()=>{
  if(busy||!linked||!statusReady)return;
  setBusy(true);setError('');
  try{const next=await cancelOnlineAccountDeletionRequest(accountId);if(accountRef.current===accountId)setStatus(next);}
  catch(cause){if(accountRef.current===accountId){setStatusReady(false);setError(cause instanceof Error?cause.message:'Could not withdraw request. Check your request status before retrying.');}}
  finally{if(accountRef.current===accountId)setBusy(false);}
 };
 const activeRequest=status?.status==='pending_review'||status?.status==='reviewing'||status?.status==='erasure_blocked';
 return <Panel>
  <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={a('Online account deletion')} onPress={()=>setExpanded(value=>!value)}
   style={s.heading}>
   <View style={s.headingText}>
    <Text accessibilityRole="header" style={s.title}>{a('Online account deletion')}</Text>
    <Text style={s.summary}>{a('This is different from deleting a character or removing a local save.')}</Text>
   </View>
   <Text style={s.chevron}>{expanded?'−':'+'}</Text>
  </Pressable>
  {expanded&&<View style={s.content}>
   <Text style={s.warning}>{a('Deleting your online account can permanently remove all characters, inventory, guild participation and account-wide rewards.')}</Text>
   <Text style={s.body}>{a('Purchases and transaction records may require separate handling under the Privacy Policy. Your Google Play subscription is managed through Google Play.')}</Text>
   {!ONLINE_ACCOUNT_DELETION_REQUESTS_RELEASED?<>
     <Text style={s.body}>{a('Self-service deletion requests are not yet enabled. Use the Privacy Policy contact information to request full-account deletion. This screen does not delete any data.')}</Text>
     <GameButton title={a('Privacy & deletion support')} tone="secondary" onPress={()=>{void Linking.openURL(PRIVACY_POLICY_URL);}}/>
   </>:!linked?<>
     <Text style={s.body}>{a('Sign in to a linked account first. Guest accounts require separate identity verification through support.')}</Text>
     <GameButton title={a('Privacy & deletion support')} tone="secondary" onPress={()=>{void Linking.openURL(PRIVACY_POLICY_URL);}}/>
   </>:<>
     <Text style={s.body}>{a('Submitting a request does not delete your account immediately. Your account remains usable until an authorized review completes.')}</Text>
     <View style={s.accountHint}><Text style={s.body}>{a('Signed-in VELDRYN account')}</Text><Text selectable style={s.accountIdentity}>{session?.user.email||a('Linked account')}</Text></View>
     {!statusReady?<View style={s.statusBox}>
       <Text accessibilityLiveRegion="polite" style={s.body}>{a(statusLoading?'Checking your deletion request status…':'We could not verify the latest request status. Refresh before submitting anything.')}</Text>
       {!statusLoading&&<GameButton title={a('Refresh request status')} tone="secondary" onPress={()=>setRefreshSequence(value=>value+1)}/>}
     </View>:activeRequest?<View accessibilityLiveRegion="polite" style={s.statusBox}>
       <Text style={s.status}>{a(status?.status==='pending_review'?'Deletion request received':status?.status==='reviewing'?'Deletion request under review':'Deletion request needs support review')}</Text>
       {status?.requestedAtMs!==undefined&&<Text style={s.body}>{a('Requested on')}: {formatLocalizedDate(language,status.requestedAtMs,{dateStyle:'medium'})}</Text>}
       <Text style={s.body}>{a('Do not delete your character or local save to try to complete this request.')}</Text>
       {status?.status==='pending_review'&&<GameButton title={a('Withdraw deletion request')} tone="secondary" disabled={busy} loading={busy} onPress={()=>void cancel()}/>}
     </View>:<>
       <Text style={s.label}>{a('To request deletion, type DELETE ACCOUNT exactly.')}</Text>
       <GameTextInput value={confirmation} onChangeText={setConfirmation} editable={!busy} maxLength={40} autoCorrect={false} autoCapitalize="characters"
        accessibilityLabel={a('Type DELETE ACCOUNT to request online account deletion')} placeholder={ACCOUNT_DELETION_CONFIRMATION}/>
       <GameButton title={a('Request online account deletion')} tone="danger" disabled={busy||!statusReady||!validAccountDeletionConfirmation(confirmation)} loading={busy} onPress={()=>void request()}/>
     </>}
     {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
   </>}
  </View>}
 </Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 heading:{flexDirection:'row',alignItems:'center',gap:12,minHeight:48},headingText:{flex:1,gap:4},
 title:{fontSize:14,fontWeight:'800',color:C.text},summary:{fontSize:11,lineHeight:17,color:C.muted},
 chevron:{color:C.muted,fontSize:22,fontWeight:'700'},
 content:{gap:10,paddingTop:12,marginTop:10,borderTopWidth:1,borderColor:C.line},
 warning:{fontSize:12,lineHeight:18,color:C.bad,fontWeight:'700'},
 body:{fontSize:12,lineHeight:19,color:C.muted},
 label:{fontSize:12,lineHeight:18,color:C.text,fontWeight:'700'},
 error:{fontSize:12,lineHeight:18,color:C.bad},
 statusBox:{gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:8},
 status:{fontSize:13,fontWeight:'800',color:C.text},
 accountHint:{gap:2,borderRadius:8,padding:9,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},
 accountIdentity:{fontSize:12,fontWeight:'800',color:C.text},
 });}
