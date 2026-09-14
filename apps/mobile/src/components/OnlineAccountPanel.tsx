import {GameTextInput as TextInput} from './GameTextInput';
import {useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import type {GameState} from '../core/types';
import {createOnlineAccount,requestPasswordRecovery,resendAccountConfirmation,sendMagicLink,signInWithPassword,signOut,updateAccountPassword,upgradeGuestAccount} from '../online/account';
import {onlineConfigured} from '../online/supabase';
import {useAuthSession} from '../online/AuthSessionProvider';
import {serverGameplayEnabled} from '../online/gameplay';
import {C,spacing,touchTargetMin,typography} from '../theme/theme';
export function OnlineAccountPanel({state}:{state:GameState}){
 const auth=useAuthSession();const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[username,setUsername]=useState(state.character?.name??''),[creating,setCreating]=useState(false),[showHelp,setShowHelp]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const run=async(action:()=>Promise<void>)=>{if(busy)return;setBusy(true);setNotice('');try{await action();setPassword('');}catch(e){setNotice(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}};
 const emailInput=<><Text style={s.label}>Email address</Text><TextInput accessibilityLabel="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} placeholder="you@example.com" placeholderTextColor={C.muted} style={s.input}/></>;
 const passwordInput=<><Text style={s.label}>{auth.recovering?'New password':'Password'}</Text><TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry autoCorrect={false} autoCapitalize="none" autoComplete={creating?'new-password':'current-password'} placeholder="Password (8+ characters)" placeholderTextColor={C.muted} style={s.input}/></>;
 if(!onlineConfigured)return <Panel><Text style={s.title}>Online account unavailable</Text><Text style={s.text}>This build has no online connection configured.</Text></Panel>;
 return <Panel><Text style={s.title}>{auth.recovering?'Reset your password':auth.session?'Your account':creating?'Create your VELDRYN account':'Welcome to VELDRYN'}</Text>
  {!!(notice||auth.error)&&<Text accessibilityRole="alert" style={s.notice}>{notice||auth.error}</Text>}
  {auth.recovering?<>{passwordInput}<GameButton title="Save new password" disabled={busy} onPress={()=>void run(async()=>{await updateAccountPassword(password);auth.clearRecovery();setNotice('Password updated.');})}/></>:!auth.session?<>
   {creating&&<><Text style={s.label}>Username</Text><TextInput accessibilityLabel="Username" value={username} onChangeText={setUsername} maxLength={20} placeholder="Username" placeholderTextColor={C.muted} style={s.input}/></>}
   {emailInput}{passwordInput}
   <GameButton title={busy?'Connecting…':creating?'Create account':'Sign in'} disabled={busy} onPress={()=>void run(async()=>{if(creating){const result=await createOnlineAccount(email,password,username);if(!result.confirmed){setNotice('Confirmation email sent. Check your inbox before signing in.');Alert.alert('Check your email','Your VELDRYN account was created. Open the confirmation link in your email, then return here to sign in.',[{text:'Back to sign in',onPress:()=>{setCreating(false);setShowHelp(false)}}]);}}else await signInWithPassword(email,password);})}/>
   <GameButton title={creating?'Already registered? Sign in':'New player? Create an account'} tone="secondary" disabled={busy} onPress={()=>{setCreating(!creating);setNotice('');}}/>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:showHelp}} onPress={()=>setShowHelp(value=>!value)} style={s.helpToggle}><Text style={s.helpText}>{showHelp?'Hide sign-in help':'Need help signing in?'}</Text></Pressable>
   {showHelp&&<View style={s.help}><Text style={s.text}>Enter your email above to request a link.</Text><View style={s.row}><GameButton title="Resend confirmation" tone="secondary" disabled={busy} onPress={()=>void run(async()=>{await resendAccountConfirmation(email);setNotice('If confirmation is needed, an email has been requested.');})}/><GameButton title="Forgot password" tone="secondary" disabled={busy} onPress={()=>void run(async()=>{await requestPasswordRecovery(email);setNotice('If this email has an account, a recovery link has been requested.');})}/></View>
   <GameButton title="Email a sign-in link" tone="secondary" disabled={busy} onPress={()=>void run(async()=>{await sendMagicLink(email);setNotice('Check your email and open the link on this device.');})}/></View>}
   <Text style={s.text}>{serverGameplayEnabled?'Online characters and progress are saved on the server. Your existing local save is kept separately.':'Your local game remains on this device. Online social features use your account.'}</Text>
  </>:<>
   <Text style={s.text}>Signed in as {auth.session.user.email??'guest'}.</Text>
   {auth.session.user.is_anonymous&&<><Text style={s.text}>Add an email and password to recover this account on another device.</Text><TextInput accessibilityLabel="Username" value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={C.muted} style={s.input}/>{emailInput}{passwordInput}<GameButton title="Secure guest account" disabled={busy} onPress={()=>void run(async()=>{await upgradeGuestAccount(email,password,username);setNotice('Confirm your email to finish securing this account.');})}/></>}
   <Text style={s.text}>{serverGameplayEnabled?'Every successful gameplay action is saved online. Sign in on another device to continue.':'Local save uploads do not grant online progression.'}</Text>
   <GameButton title="Sign out" tone="secondary" disabled={busy} onPress={()=>{if(auth.session?.user.is_anonymous)Alert.alert('Sign out of guest account?','Add an email first so you can recover this account.',[{text:'Stay signed in'},{text:'Sign out',style:'destructive',onPress:()=>void run(signOut)}]);else void run(signOut);}}/>
  </>}
 </Panel>;
}
const s=StyleSheet.create({title:{color:C.text,...typography.title},label:{color:C.text,...typography.bodyStrong,marginTop:spacing.sm},helpToggle:{minHeight:48,justifyContent:'center',alignItems:'center'},helpText:{...typography.body,color:C.info},help:{gap:spacing.sm,paddingTop:spacing.sm,borderTopWidth:1,borderColor:C.line},text:{color:C.muted,lineHeight:21,marginVertical:spacing.sm},notice:{color:C.bad,lineHeight:21,marginVertical:spacing.sm},input:{minHeight:touchTargetMin,borderWidth:1,borderColor:C.line,color:C.text,padding:spacing.sm,marginVertical:spacing.sm},row:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm}});
