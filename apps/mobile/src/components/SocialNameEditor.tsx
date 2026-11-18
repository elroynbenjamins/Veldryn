import {useEffect,useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {useAuthSession} from '../online/AuthSessionProvider';
import {accountSocialNameSelf,setAccountSocialName,socialNameError,type AccountSocialName} from '../online/social-name';
import {invalidatePlayerIdentity} from '../online/player-identity-cache';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

/** Compact account-wide name editor, shared by Account and Customize > Identity. */
export function SocialNameEditor(){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{session}=useAuthSession();
 const accountId=session?.user.id??'';
 const [data,setData]=useState<AccountSocialName|null>(null),[name,setName]=useState('');
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{
  let alive=true;
  setData(null);setName('');setError('');setNotice('');
  if(!accountId)return()=>{alive=false};
  setLoading(true);
  void accountSocialNameSelf().then(row=>{if(alive){setData(row);setName(row.socialName);}}).catch(()=>{
   if(alive)setError('Unable to load your social name.');
  }).finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[accountId]);
 if(!accountId)return null;
 const ready=!!data&&!loading;
 const proposed=name.trim();
 const changed=ready&&proposed!==data.socialName;
 const nextChange=Date.parse(data?.nextChangeAt??'');
 const locked=!!data?.selected&&Number.isFinite(nextChange)&&nextChange>Date.now();
 const save=async()=>{
  if(!ready||busy||!changed||locked)return;
  setBusy(true);setError('');setNotice('');
  try{
   const saved=await setAccountSocialName(proposed);
   setData(saved);setName(saved.socialName);invalidatePlayerIdentity(accountId);
   setNotice('Social name updated across chat, guild and party.');
  }catch(e){setError(socialNameError(e))}
  finally{setBusy(false)}
 };
 return <View style={s.root}>
  <Text style={s.eyebrow}>ACCOUNT SOCIAL NAME</Text>
  <Text style={s.help}>One name for chat, guilds, parties and rankings. Your character names and showcases stay separate.</Text>
  {ready?<View style={s.editor}>
   <GameTextInput accessibilityLabel="Social name" value={name} onChangeText={text=>{setName(text.slice(0,20));setError('');setNotice('')}}
    editable={!busy&&!locked} maxLength={20} placeholder="Choose your social name" placeholderTextColor={C.muted} style={s.input}/>
   <View style={s.action}><GameButton compact title={busy?'Saving…':data?.selected?'Change name':'Choose name'} disabled={!changed||locked||busy} loading={busy} onPress={()=>void save()}/></View>
  </View>:<Text style={s.help}>{loading?'Loading social identity…':'Social identity unavailable.'}</Text>}
  {locked?<Text style={s.help}>You can change your name again on {new Date(nextChange).toLocaleDateString()}.</Text>:null}
  {!data?.selected?<Text style={s.help}>Your first choice is free. Later changes have a 30-day cooldown.</Text>:null}
  {notice?<Text accessibilityLiveRegion="polite" style={s.success}>{notice}</Text>:null}
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:7,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 help:{...typography.caption,color:C.muted,lineHeight:17},
 editor:{flexDirection:'row',alignItems:'center',gap:7},
 input:{flex:1,minWidth:0,minHeight:44},action:{minWidth:105},
 error:{...typography.caption,color:C.bad,fontWeight:'700'},
 success:{...typography.caption,color:C.good,fontWeight:'700'},
});}
