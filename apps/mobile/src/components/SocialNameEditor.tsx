import {useEffect,useMemo,useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {socialIdentityT} from '../i18n/social-identity';
import {useAuthSession} from '../online/AuthSessionProvider';
import {accountSocialNameSelf,setAccountSocialName,checkAccountSocialNameAvailability,socialNameError,isValidSocialName,type AccountSocialName} from '../online/social-name';
import {invalidatePlayerIdentity} from '../online/player-identity-cache';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

/** Small account-wide identity editor: local validation, clear cooldown and resilient account switches. */
export function SocialNameEditor({onNameChange}:{onNameChange?:(name:string)=>void}={}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{session}=useAuthSession();
 const accountId=session?.user.id??'';
 const activeAccountRef=useRef(accountId),accountEpoch=useRef(0);
 if(activeAccountRef.current!==accountId){activeAccountRef.current=accountId;accountEpoch.current++;}
 const [ownedData,setOwnedData]=useState<{owner:string;epoch:number;row:AccountSocialName}|null>(null),[name,setName]=useState('');
 const data=ownedData?.owner===accountId&&ownedData.epoch===accountEpoch.current?ownedData.row:null;
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [availability,setAvailability]=useState<{accountId:string;name:string;status:'checking'|'available'|'taken'|'blocked'|'error'}|null>(null);
 const [availabilityRetry,setAvailabilityRetry]=useState(0);

 useEffect(()=>{
  let active=true;
  const epoch=accountEpoch.current;
  setOwnedData(null);setName('');setError('');setNotice('');setBusy(false);onNameChange?.('');
  if(!accountId){setLoading(false);return()=>{active=false};}
  setLoading(true);
  void accountSocialNameSelf().then(row=>{
   if(active&&activeAccountRef.current===accountId&&accountEpoch.current===epoch){setOwnedData({owner:accountId,epoch,row});setName(row.socialName);onNameChange?.(row.socialName);}
  }).catch(()=>{
   if(active&&activeAccountRef.current===accountId)setError(socialIdentityT(language,'Unable to load your social name.'));
  }).finally(()=>{if(active&&activeAccountRef.current===accountId)setLoading(false)});
  return()=>{active=false};
 },[accountId]);

 const ready=!!data&&!loading;
 const proposed=name.trim();
 const changed=!!data&&!loading&&(!data.selected||proposed.toLowerCase()!==data.socialName.toLowerCase());
 const valid=isValidSocialName(name);
 const nextChange=Date.parse(data?.nextChangeAt??'');
 const locked=!!data?.selected&&Number.isFinite(nextChange)&&nextChange>Date.now();
 const canCheck=!!accountId&&ready&&changed&&valid&&!locked;
 // Every edit cancels the previous debounce and ignores out-of-order responses.
 // An unverified name can never be submitted, including immediately after an account switch.
 useEffect(()=>{
  let active=true;
  setAvailability(null);
  if(!canCheck)return()=>{active=false};
  const owner=accountId,candidate=proposed,epoch=accountEpoch.current;
  setAvailability({accountId:owner,name:candidate,status:'checking'});
  const timer=setTimeout(()=>{
   void checkAccountSocialNameAvailability(candidate).then(available=>{
    if(active&&activeAccountRef.current===owner&&accountEpoch.current===epoch)
     setAvailability({accountId:owner,name:candidate,status:available?'available':'taken'});
   }).catch(e=>{
    if(active&&activeAccountRef.current===owner&&accountEpoch.current===epoch)
     setAvailability({accountId:owner,name:candidate,
      status:socialNameError(e)==='Choose a different social name.'?'blocked':'error'});
   });
  },450);
  return()=>{active=false;clearTimeout(timer)};
 },[accountId,canCheck,proposed,availabilityRetry]);
 const availabilityCurrent=ready&&availability?.accountId===accountId&&availability?.name===proposed;
 const availabilityStatus=availabilityCurrent?availability?.status:null;
 const canSave=canCheck&&availabilityStatus==='available'&&!busy;
 if(!accountId)return null;

 const save=async()=>{
  if(!canSave)return;
  const owner=accountId,epoch=accountEpoch.current;
  setBusy(true);setError('');setNotice('');
  try{
   const saved=await setAccountSocialName(proposed);
   if(activeAccountRef.current!==owner||accountEpoch.current!==epoch)return;
   setOwnedData({owner,epoch,row:saved});setName(saved.socialName);onNameChange?.(saved.socialName);
   invalidatePlayerIdentity(owner);
   setNotice(socialIdentityT(language,'Social name updated.'));
  }catch(e){
   if(activeAccountRef.current===owner&&accountEpoch.current===epoch){
    const reason=socialNameError(e);
    if(reason==='This name is already used by another player.'){
     setAvailability({accountId:owner,name:proposed,status:'taken'});
     setError('');
    }else setError(socialIdentityT(language,reason));
   }
  }finally{
   if(activeAccountRef.current===owner&&accountEpoch.current===epoch)setBusy(false);
  }
 };
 return <View style={s.root}>
  <Text style={s.eyebrow}>{socialIdentityT(language,'ACCOUNT SOCIAL NAME')}</Text>
  <Text style={s.help}>{socialIdentityT(language,'One name for chat, guilds, parties and rankings. Your heroes keep their own names and showcases.')}</Text>
  {ready?<View style={s.editor}>
   <GameTextInput accessibilityLabel={socialIdentityT(language,'Social name')} value={name}
    onChangeText={text=>{setName(text.slice(0,20));setError('');setNotice('')}}
    editable={!busy&&!locked} maxLength={20}
    placeholder={socialIdentityT(language,'Choose your social name')} placeholderTextColor={C.muted} style={s.input}/>
   <View style={s.action}>
    <GameButton compact title={data?.selected?socialIdentityT(language,'Change name'):socialIdentityT(language,'Choose name')}
     disabled={!canSave} loading={busy} onPress={()=>void save()}/>
   </View>
  </View>:<Text style={s.help}>{loading?socialIdentityT(language,'Loading social identity…'):socialIdentityT(language,'Social identity unavailable.')}</Text>}
  {ready?<View style={s.hintRow}>
   <Text style={[s.hint,changed&&!valid&&s.invalid]}>
    {socialIdentityT(language,'Use 2–20 letters. Spaces, hyphens and apostrophes are allowed.')}
   </Text>
   <Text style={s.counter}>{proposed.length}/20</Text>
  </View>:null}
  {ready&&changed&&valid&&!locked?<Text accessibilityLiveRegion="polite"
   accessibilityRole={availabilityStatus==='error'?'button':undefined}
   onPress={availabilityStatus==='error'?()=>setAvailabilityRetry(value=>value+1):undefined}
   style={availabilityStatus==='available'?s.success:
    availabilityStatus==='taken'||availabilityStatus==='blocked'?s.error:s.help}>
   {availabilityStatus==='available'?socialIdentityT(language,'Name available.'):
    availabilityStatus==='taken'?socialIdentityT(language,'Name already taken.'):
    availabilityStatus==='blocked'?socialIdentityT(language,'Choose a different social name.'):
    availabilityStatus==='error'?socialIdentityT(language,'Unable to check availability. Tap to retry.'):
    socialIdentityT(language,'Checking name availability…')}
  </Text>:null}
  {locked?<Text style={s.help}>{socialIdentityT(language,'You can change your name again on {date}.',{
   date:new Date(nextChange).toLocaleDateString(language),
  })}</Text>:null}
  {data&&!data.selected?<Text style={s.help}>{socialIdentityT(language,'Your first choice is free. Later changes have a 30-day cooldown.')}</Text>:null}
  {notice?<Text accessibilityLiveRegion="polite" style={s.success}>{notice}</Text>:null}
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 help:{...typography.caption,color:C.muted,lineHeight:17},
 editor:{flexDirection:'row',alignItems:'center',gap:7},
 input:{flex:1,minWidth:0,minHeight:44},
 action:{minWidth:105,maxWidth:'42%'},
 hintRow:{flexDirection:'row',alignItems:'flex-start',gap:8},
 hint:{...typography.caption,color:C.muted,flex:1,lineHeight:16},
 invalid:{color:C.warning},
 counter:{fontSize:10,color:C.muted,fontWeight:'800'},
 error:{...typography.caption,color:C.bad,fontWeight:'700'},
 success:{...typography.caption,color:C.good,fontWeight:'700'},
});}
