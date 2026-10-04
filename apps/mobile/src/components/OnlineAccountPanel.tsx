import {accountText,accountError} from '../i18n/account';
import {GameTextInput as TextInput} from './GameTextInput';
import {useEffect,useMemo,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import type {GameState} from '../core/types';
import {createOnlineAccount,finishGuestAccount,requestPasswordRecovery,resendAccountConfirmation,resendGuestAccountConfirmation,sendMagicLink,signInAsGuest,signInWithPassword,signOut,updateAccountPassword,upgradeGuestAccount} from '../online/account';
import {onlineConfigured} from '../online/supabase';
import {useAuthSession} from '../online/AuthSessionProvider';
import {serverGameplayEnabled} from '../online/gameplay';
import {passwordRequirements} from '../core/auth-callback';
import {accountLinkStep,pendingAccountEmail} from '../core/auth-account-link';
import {equipmentTheme,spacing,touchTargetMin,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
function AuthModeChip({label,selected,disabled,onPress}:{label:string;selected:boolean;disabled:boolean;onPress:()=>void}){const C=useGameTheme(),equipmentColors=equipmentTheme(C);return <Pressable accessibilityRole="button" accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[{minHeight:40,alignSelf:'center',paddingHorizontal:14,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},selected&&{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},disabled&&{opacity:.45},pressed&&{opacity:.76}]}><Text style={[{fontSize:12,color:C.muted,fontWeight:'700'},selected&&{color:C.primaryButtonText}]}>{selected?'✓ ':''}{label}</Text></Pressable>}
export function OnlineAccountPanel({state}:{state:GameState}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

 const auth=useAuthSession();const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[username,setUsername]=useState(state.character?.name??''),[creating,setCreating]=useState(false),[showHelp,setShowHelp]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[noticeTone,setNoticeTone]=useState<'error'|'success'|'info'>('error'),[editingLink,setEditingLink]=useState(false);
 const accountId=auth.session?.user.id??'',linkStep=auth.session?accountLinkStep(auth.session.user):null;
 const requirements=passwordRequirements(password),showPasswordRules=creating||auth.recovering||linkStep==='set_password';
 const displayedNotice=auth.error||notice,displayedTone=auth.error?'error':noticeTone;
 useEffect(()=>{setPassword('');setNotice('');setEditingLink(false);setEmail(auth.session?pendingAccountEmail(auth.session.user):'');},[accountId]);
 useEffect(()=>{if(linkStep==='set_password'){setNotice('');setEditingLink(false);}},[linkStep]);
 const success=(message:string)=>{setNoticeTone('success');setNotice(message);};
 const information=(message:string)=>{setNoticeTone('info');setNotice(message);};
 const run=async(action:()=>Promise<void>)=>{if(busy)return;setBusy(true);setNoticeTone('error');setNotice('');try{await action();setPassword('');}catch(e){setNotice(e instanceof Error?e.message:"Please try again.");}finally{setBusy(false);}};
 const checkVerification=async()=>{const next=await auth.refreshAccount();if(!next)throw new Error('Sign in first.');const step=accountLinkStep(next.user);if(step==='linked')success('Account linked. Your characters and progress are kept.');else if(step==='set_password')success('Your email is verified. Set a password to finish securing this account.');else information('Email is not verified yet. Open the latest confirmation email, then check again.');};
 const emailInput=<><Text style={s.label}>{a("Email address")}</Text><TextInput accessibilityLabel={a("Email address")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} placeholder="you@example.com" placeholderTextColor={C.muted} style={s.input}/></>;
 const passwordInput=<><Text style={s.label}>{auth.recovering?a("New password"):a("Password")}</Text><TextInput accessibilityLabel={a("Password")} value={password} onChangeText={setPassword} secureTextEntry autoCorrect={false} autoCapitalize="none" autoComplete={showPasswordRules?'new-password':'current-password'} placeholder={showPasswordRules?a("Create a strong password"):a("Password")} placeholderTextColor={C.muted} style={s.input}/>{showPasswordRules&&<View accessibilityLabel={a("Password requirements")} style={s.passwordRules}><Text style={s.passwordRulesTitle}>{a("Password requirements")}</Text>{([[a("8–128 characters"),requirements.length],[a("One uppercase letter"),requirements.uppercase],[a("One lowercase letter"),requirements.lowercase],[a("One number"),requirements.number],[a("One special character"),requirements.symbol]] as const).map(([label,met])=><Text key={label} style={[s.passwordRule,met&&s.passwordRuleMet]}>{met?'✓':'○'} {a(label)}</Text>)}</View>}</>;
 if(!onlineConfigured)return <Panel><Text style={s.title}>{a("Online account unavailable")}</Text><Text style={s.text}>{a("This build has no online connection configured.")}</Text></Panel>;
 return <Panel><Text accessibilityRole="header" style={s.title}>{auth.recovering?a("Reset your password"):auth.session?a("Your account"):creating?a("Create your VELDRYN account"):a("Welcome to VELDRYN")}</Text>
  {!!displayedNotice&&<View accessibilityRole="alert" style={[s.noticeCard,displayedTone==='success'&&s.noticeSuccessCard,displayedTone==='info'&&s.noticeInfoCard]}><Text style={displayedTone==='success'?s.noticeLabelSuccess:displayedTone==='info'?s.noticeLabelInfo:s.noticeLabel}>{displayedTone==='success'?a("ACCOUNT UPDATED"):displayedTone==='info'?a("ACCOUNT STATUS"):a("ACCOUNT NOTICE")}</Text><Text style={s.notice}>{displayedTone==='error'?accountError(language,displayedNotice):a(displayedNotice)}</Text></View>}
  {auth.recovering?<>{passwordInput}<GameButton title={a("Save new password")} disabled={busy} onPress={()=>void run(async()=>{await updateAccountPassword(password);auth.clearRecovery();success('Password updated.');})}/></>:!auth.session?<>
   {creating&&<><Text style={s.label}>{a("Username")}</Text><TextInput accessibilityLabel={a("Username")} value={username} onChangeText={setUsername} maxLength={20} placeholder={a("Username")} placeholderTextColor={C.muted} style={s.input}/></>}
   {emailInput}{passwordInput}
   <GameButton title={busy?a("Connecting…"):creating?a("Create account"):a("Sign in")} disabled={busy} onPress={()=>void run(async()=>{if(creating){const result=await createOnlineAccount(email,password,username);if(!result.confirmed){success('Confirmation email sent. Check your inbox before signing in.');Alert.alert(a("Check your email"),a("Your VELDRYN account was created. Open the confirmation link in your email, then return here to sign in."),[{text:a("Back to sign in"),onPress:()=>{setCreating(false);setShowHelp(false)}}]);}}else await signInWithPassword(email,password);})}/>
   <AuthModeChip label={creating?a("Sign in instead"):a("Create a new account")} selected={creating} disabled={busy} onPress={()=>{setCreating(!creating);setNotice('');}}/>
   {!creating&&<><Text style={s.guestHint}>{a("Want to try the game first? A guest account can be secured with email later.")}</Text><GameButton title={a("Continue as guest")} tone="secondary" disabled={busy} onPress={()=>void run(async()=>{await signInAsGuest();success('Guest account ready. Create your character to enter Asterfall.');})}/></>}
   <Pressable accessibilityRole="button" accessibilityState={{expanded:showHelp}} onPress={()=>setShowHelp(value=>!value)} style={s.helpToggle}><Text style={s.helpText}>{showHelp?a("Hide sign-in help"):a("Need help signing in?")}</Text></Pressable>
   {showHelp&&<View style={s.help}><Text style={s.text}>{a("Enter your email above to request a link.")}</Text><View style={s.row}><GameButton title={a("Resend confirmation")} tone="secondary" disabled={busy} onPress={()=>void run(async()=>{await resendAccountConfirmation(email);success('If confirmation is needed, an email has been requested.');})}/><GameButton title={a("Forgot password")} tone="secondary" disabled={busy} onPress={()=>void run(async()=>{await requestPasswordRecovery(email);success('If this email has an account, a recovery link has been requested.');})}/></View>
   <GameButton title={a("Email a sign-in link")} tone="secondary" disabled={busy} onPress={()=>void run(async()=>{await sendMagicLink(email);success('Check your email and open the link on this device.');})}/></View>}
   <Text style={s.text}>{serverGameplayEnabled?a("Online characters and progress are saved on the server. Your existing local save is kept separately."):a("Your local game remains on this device. Online social features use your account.")}</Text>
  </>:<>
   <Text style={[s.label,(linkStep==='linked'||linkStep==='set_password')&&{color:C.good}]}>{a(linkStep==='linked'?'Linked account':linkStep==='set_password'?'Email linked':linkStep==='verify_email'?'Waiting for email verification':'Guest account')}</Text>
   <Text style={s.text}>{a('Signed in as {identity}.',{identity:auth.session.user.email||a('guest')})}</Text>
   {(linkStep==='guest'||(linkStep==='verify_email'&&editingLink))&&<>
    <Text style={s.text}>{a("Add an email first. After verification, choose a password. Your characters and progress stay with this account.")}</Text>
    <Text style={s.label}>{a("Username")}</Text><TextInput accessibilityLabel={a("Username")} value={username} onChangeText={setUsername} maxLength={20} placeholder={a("Username")} placeholderTextColor={C.muted} style={s.input}/>{emailInput}
    <GameButton title={a("Secure guest account")} disabled={busy||auth.refreshing} onPress={()=>void run(async()=>{await upgradeGuestAccount(email,username,accountId);setEditingLink(false);information('Confirmation email sent. Open the latest email, then return here.');})}/>
   </>}
   {linkStep==='verify_email'&&!editingLink&&<>
    <Text style={s.text}>{a('Confirm the email sent to {email}.',{email:pendingAccountEmail(auth.session.user)})}</Text>
    <Text style={s.text}>{a("Open the latest confirmation email, then return here. You can keep playing while you wait.")}</Text>
    <GameButton title={a("Resend confirmation")} tone="secondary" disabled={busy||auth.refreshing} onPress={()=>void run(async()=>{await resendGuestAccountConfirmation(accountId);await auth.refreshAccount();information('If confirmation is needed, an email has been requested.');})}/>
    {auth.session.user.is_anonymous&&<GameButton title={a("Use a different email")} tone="secondary" disabled={busy||auth.refreshing} onPress={()=>{setEmail(pendingAccountEmail(auth.session!.user));setEditingLink(true);setNotice('');}}/>}
   </>}
   {(linkStep==='guest'||linkStep==='verify_email')&&<GameButton title={auth.refreshing?a("Checking verification…"):a("Check verification")} tone="secondary" disabled={busy||auth.refreshing} onPress={()=>void run(checkVerification)}/>}
   {linkStep==='set_password'&&<>
    <Text style={s.text}>{a("Your email is verified. Set a password to finish securing this account.")}</Text>{passwordInput}
    <GameButton title={a("Save account password")} disabled={busy||auth.refreshing} onPress={()=>void run(async()=>{await finishGuestAccount(password,accountId);success('Account linked. Your characters and progress are kept.');})}/>
   </>}
   <Text style={s.text}>{serverGameplayEnabled?a("Every successful gameplay action is saved online. Sign in on another device to continue."):a("Local save uploads do not grant online progression.")}</Text>
   <GameButton title={a("Sign out")} tone="secondary" disabled={busy} onPress={()=>{if(auth.session?.user.is_anonymous)Alert.alert(a("Sign out of guest account?"),a("Add an email first so you can recover this account."),[{text:a("Stay signed in")},{text:a("Sign out"),style:'destructive',onPress:()=>void run(signOut)}]);else void run(signOut);}}/>
  </>}
 </Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({title:{color:C.text,...typography.title},label:{color:C.text,...typography.bodyStrong,marginTop:spacing.sm},helpToggle:{minHeight:48,justifyContent:'center',alignItems:'center'},helpText:{...typography.body,color:C.info},help:{gap:spacing.sm,paddingTop:spacing.sm,borderTopWidth:1,borderColor:C.line},text:{color:C.muted,lineHeight:21,marginVertical:spacing.sm},guestHint:{color:C.muted,fontSize:12,lineHeight:18,textAlign:'center',marginTop:spacing.sm},passwordRules:{paddingHorizontal:spacing.sm,paddingBottom:spacing.sm,gap:3},passwordRulesTitle:{color:C.text,fontSize:12,fontWeight:'700',marginBottom:2},passwordRule:{color:C.muted,fontSize:12,lineHeight:18},passwordRuleMet:{color:C.good},noticeCard:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:8,backgroundColor:C.badSurface,marginVertical:spacing.sm},noticeSuccessCard:{borderColor:C.good,backgroundColor:C.goodSurface},noticeInfoCard:{borderColor:C.info,backgroundColor:C.infoSurface},noticeLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},noticeLabelSuccess:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:1},noticeLabelInfo:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:1},notice:{color:C.text,lineHeight:21},noticeSuccess:{color:C.text},input:{minHeight:touchTargetMin,borderWidth:1,borderColor:C.line,color:C.text,padding:spacing.sm,marginVertical:spacing.sm},row:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm}});}
