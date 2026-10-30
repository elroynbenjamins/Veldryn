import {gameAlert} from '../core/game-alerts';
import {accountText,accountError} from '../i18n/account';
import {GameTextInput as TextInput} from './GameTextInput';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Keyboard,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GoogleBrandButton} from './GoogleBrandButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {Panel} from './Panel';
import type {GameState} from '../core/types';
import {createOnlineAccount,finishGuestAccount,requestPasswordRecovery,resendAccountConfirmation,resendGuestAccountConfirmation,sendMagicLink,signInAsGuest,signInOrLinkGoogle,signInWithPassword,signOut,updateAccountPassword,upgradeGuestAccount} from '../online/account';
import {onlineConfigured} from '../online/supabase';
import {googleSignInConfigured} from '../online/google-signin';
import {useAuthSession} from '../online/AuthSessionProvider';
import {serverGameplayEnabled} from '../online/gameplay';
import {passwordRequirements} from '../core/auth-callback';
import {accountLinkStep,pendingAccountEmail} from '../core/auth-account-link';
import {spacing,touchTargetMin,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
declare const process:{env:Record<string,string|undefined>};
const playGamesConfigured=Platform.OS==='android'&&Boolean(process.env.EXPO_PUBLIC_GOOGLE_PLAY_GAMES_PROJECT_ID?.trim());
type VerificationPrompt={email:string;kind:'signup'|'guest';accountId:string};
export function OnlineAccountPanel({state}:{state:GameState}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

 const auth=useAuthSession();const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[username,setUsername]=useState(state.character?.name??''),[creating,setCreating]=useState(false),[showHelp,setShowHelp]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[noticeTone,setNoticeTone]=useState<'error'|'success'|'info'>('error'),[editingLink,setEditingLink]=useState(false);
 const [entryRecovery,setEntryRecovery]=useState(false),[passwordVisible,setPasswordVisible]=useState(false),[changingPassword,setChangingPassword]=useState(false),[verificationPrompt,setVerificationPrompt]=useState<VerificationPrompt|null>(null),[verificationFeedback,setVerificationFeedback]=useState<{message:string;error:boolean}|null>(null);
 const accountId=auth.session?.user.id??'',linkStep=auth.session?accountLinkStep(auth.session.user):null;
 const googleLinked=Boolean(auth.session?.user.identities?.some(identity=>identity.provider==='google'));
 const active=useRef(true),currentAccount=useRef(accountId),accountGeneration=useRef(0),running=useRef<object|null>(null),currentRecovery=useRef(auth.clearRecovery);
 if(currentAccount.current!==accountId){currentAccount.current=accountId;accountGeneration.current++;running.current=null;}
 const recoveryGeneration=useRef(0);
 if(currentRecovery.current!==auth.clearRecovery)recoveryGeneration.current++;
 currentRecovery.current=auth.clearRecovery;const generation=accountGeneration.current;
 const ownsView=()=>active.current&&currentAccount.current===accountId&&accountGeneration.current===generation;
 const editingPassword=auth.recovering||changingPassword;
 const requirements=passwordRequirements(password),showPasswordRules=creating||editingPassword||linkStep==='set_password';
 const displayedNotice=auth.error||notice,displayedTone=auth.error?'error':noticeTone;
 useEffect(()=>{active.current=true;const subscription=AppState.addEventListener('change',next=>{if(next!=='active')setPasswordVisible(false);});return()=>{active.current=false;subscription.remove();};},[]);
 useEffect(()=>{setPassword('');setPasswordVisible(false);setChangingPassword(false);setEntryRecovery(false);setBusy(false);setNotice('');setEditingLink(false);setVerificationPrompt(null);setVerificationFeedback(null);setEmail(auth.session?pendingAccountEmail(auth.session.user):'');},[accountId]);
 useEffect(()=>{setPasswordVisible(false);},[creating,editingPassword,linkStep]);
 useEffect(()=>{if(auth.recovering){setChangingPassword(false);setPassword('');setPasswordVisible(false);setNotice('');}},[auth.recovering,auth.clearRecovery]);
 useEffect(()=>{if(linkStep==='set_password'){setNotice('');setEditingLink(false);}},[linkStep]);
 useEffect(()=>{if(verificationPrompt&&(verificationPrompt.accountId!==accountId||auth.recovering||(verificationPrompt.kind==='guest'&&linkStep!=='guest'&&linkStep!=='verify_email')))setVerificationPrompt(null);},[verificationPrompt,accountId,auth.recovering,linkStep]);
 const success=(message:string)=>{if(!ownsView())return;setNoticeTone('success');setNotice(message);if(verificationPrompt)setVerificationFeedback({message,error:false});};
 const information=(message:string)=>{if(!ownsView())return;setNoticeTone('info');setNotice(message);if(verificationPrompt)setVerificationFeedback({message,error:false});};
 const run=async(action:()=>Promise<void>)=>{const ownsRequest=()=>ownsView()&&(!editingPassword||currentRecovery.current===auth.clearRecovery);if(running.current||!ownsRequest())return;const operation={};running.current=operation;setBusy(true);setPasswordVisible(false);setNoticeTone('error');setNotice('');setVerificationFeedback(null);try{await action();if(ownsRequest())setPassword('');}catch(e){if(ownsRequest()){const message=e instanceof Error?e.message:"Please try again.";setNotice(message);if(verificationPrompt)setVerificationFeedback({message,error:true});}}finally{if(running.current===operation){running.current=null;if(ownsView())setBusy(false);}}};
 const savePassword=async()=>{await updateAccountPassword(password,accountId);if(!ownsView()||currentRecovery.current!==auth.clearRecovery)return;if(auth.recovering)auth.clearRecovery(accountId);setChangingPassword(false);success('Password updated.');};
 const cancelPassword=()=>{if(running.current||!ownsView())return;setPassword('');setPasswordVisible(false);setChangingPassword(false);setNotice('');if(auth.recovering)auth.clearRecovery(accountId);};
 const showVerification=(recipient:string,kind:VerificationPrompt['kind'],message?:string)=>{if(!ownsView())return;Keyboard.dismiss();setPasswordVisible(false);setVerificationFeedback(message?{message,error:false}:null);setVerificationPrompt({email:recipient.trim().toLowerCase(),kind,accountId});};
 const closeVerification=()=>{if(verificationPrompt?.kind==='signup'){setCreating(false);setShowHelp(false);}setPasswordVisible(false);setVerificationPrompt(null);setVerificationFeedback(null);};
 const checkVerification=async()=>{const next=await auth.refreshAccount();if(!next)throw new Error('Sign in first.');const step=accountLinkStep(next.user);if(step==='linked')success('Account linked. Your characters and progress are kept.');else if(step==='set_password')success('Your email is verified. Set a password to finish securing this account.');else information('Email is not verified yet. Open the latest confirmation email, then check again.');};
 const emailInput=<><Text style={s.label}>{a("Email address")}</Text><TextInput accessibilityLabel={a("Email address")} value={email} onChangeText={setEmail} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} placeholder="you@example.com" placeholderTextColor={C.muted} style={s.input}/></>;
 const passwordLabel=editingPassword?a("New password"):a("Password");
 const passwordInput=<><View style={s.passwordLabelRow}><Text style={s.passwordLabel}>{passwordLabel}</Text><Pressable accessibilityRole="button" accessibilityLabel={a(passwordVisible?"Hide password":"Show password")} accessibilityState={{selected:passwordVisible,disabled:busy}} disabled={busy} onPress={()=>setPasswordVisible(value=>!value)} style={({pressed})=>[s.passwordToggle,pressed&&{opacity:.76},busy&&{opacity:.45}]}><Text style={s.passwordToggleText}>{a(passwordVisible?"Hide password":"Show password")}</Text></Pressable></View><TextInput accessibilityLabel={passwordLabel} value={password} onChangeText={setPassword} editable={!busy} secureTextEntry={!passwordVisible} autoCorrect={false} autoCapitalize="none" autoComplete={showPasswordRules?'new-password':'current-password'} placeholder={showPasswordRules?a("Create a strong password"):a("Password")} placeholderTextColor={C.muted} style={[s.input,s.passwordInput]}/>{showPasswordRules&&<View accessibilityLabel={a("Password requirements")} style={s.passwordRules}><Text style={s.passwordRulesTitle}>{a("Password requirements")}</Text>{([[a("8–128 characters"),requirements.length],[a("One uppercase letter"),requirements.uppercase],[a("One lowercase letter"),requirements.lowercase],[a("One number"),requirements.number],[a("One special character"),requirements.symbol]] as const).map(([label,met])=><Text key={label} style={[s.passwordRule,met&&s.passwordRuleMet]}>{met?'✓':'○'} {a(label)}</Text>)}</View>}</>;
 if(!onlineConfigured)return <Panel><Text style={s.title}>{a("Online account unavailable")}</Text><Text style={s.text}>{a("This build has no online connection configured.")}</Text></Panel>;
  return <Panel key={`${generation}:${recoveryGeneration.current}`}>
  {!auth.session&&!editingPassword?<View style={s.entryHeader}>
    <Text style={s.entryEyebrow}>{a(entryRecovery?"ACCOUNT RECOVERY":creating?"NEW ACCOUNT":"WELCOME TO VELDRYN")}</Text>
    <Text accessibilityRole="header" style={s.entryTitle}>{a(entryRecovery?"Recover your account":creating?"Begin with VELDRYN":"Continue your journey")}</Text>
    <Text style={s.entrySubtitle}>{a(entryRecovery?"Enter your account email to request a password reset.":creating?"Create an account, then choose your character.":"Sign in to your account or begin as a guest.")}</Text>
   </View>:<Text accessibilityRole="header" style={s.title}>{auth.recovering?a("Reset your password"):changingPassword?a("Change password"):a("Your account")}</Text>}
  {!!displayedNotice&&<View accessibilityRole="alert" style={[s.noticeCard,displayedTone==='success'&&s.noticeSuccessCard,displayedTone==='info'&&s.noticeInfoCard]}><Text style={displayedTone==='success'?s.noticeLabelSuccess:displayedTone==='info'?s.noticeLabelInfo:s.noticeLabel}>{displayedTone==='success'?a("ACCOUNT UPDATED"):displayedTone==='info'?a("ACCOUNT STATUS"):a("ACCOUNT NOTICE")}</Text><Text style={s.notice}>{displayedTone==='error'?accountError(language,displayedNotice):a(displayedNotice)}</Text></View>}
  {editingPassword?<>{passwordInput}<GameButton title={a("Save new password")} disabled={busy} onPress={()=>run(savePassword)}/><GameButton title={a("Cancel")} tone="secondary" disabled={busy} onPress={cancelPassword}/></>:!auth.session?<>
   {entryRecovery?<>
    <View style={s.recoveryHeader}><Pressable accessibilityRole="button" accessibilityLabel={a("Back to sign in")} disabled={busy} onPress={()=>{setEntryRecovery(false);setShowHelp(false);setNotice('')}} style={s.backButton}><Text style={s.backText}>← {a("Back to sign in")}</Text></Pressable></View>
    {emailInput}
    <GameButton title={a("Send recovery link")} disabled={busy} onPress={()=>run(async()=>{await requestPasswordRecovery(email);success('If this email has an account, a recovery link has been requested.');})}/>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showHelp}} disabled={busy} onPress={()=>setShowHelp(value=>!value)} style={s.helpToggle}><Text style={s.helpText}>{a(showHelp?"Hide sign-in help":"Other sign-in options")}</Text></Pressable>
    {showHelp&&<View style={s.help}><GameButton title={a("Email a sign-in link")} tone="secondary" disabled={busy} onPress={()=>run(async()=>{await sendMagicLink(email);success('Check your email and open the link on this device.');})}/><GameButton title={a("Resend confirmation")} tone="secondary" disabled={busy} onPress={()=>run(async()=>{await resendAccountConfirmation(email);success('If confirmation is needed, an email has been requested.');showVerification(email,'signup','If confirmation is needed, an email has been requested.');})}/></View>}
    <Text style={s.entryHint}>{a("For privacy, we do not confirm whether an email address has an account.")}</Text>
   </>:<>
    <View style={s.authTabs}>
     <Pressable accessibilityRole="tab" accessibilityLabel={a(creating?"Sign in instead":"Sign in")} accessibilityState={{selected:!creating,disabled:busy}} disabled={busy} onPress={()=>{setCreating(false);setNotice('');setPassword('');}} style={[s.authTab,!creating&&s.authTabSelected]}><Text style={[s.authTabText,!creating&&s.authTabTextSelected]}>{a("Sign in")}</Text></Pressable>
     <Pressable accessibilityRole="tab" accessibilityLabel={a("Create a new account")} accessibilityState={{selected:creating,disabled:busy}} disabled={busy} onPress={()=>{setCreating(true);setNotice('');setPassword('');}} style={[s.authTab,creating&&s.authTabSelected]}><Text style={[s.authTabText,creating&&s.authTabTextSelected]}>{a("Create account")}</Text></Pressable>
    </View>
    {googleSignInConfigured&&<><GoogleBrandButton title={busy?a("Connecting…"):a("Continue with Google")} loading={busy} onPress={()=>void run(async()=>{await signInOrLinkGoogle();success('Signed in with Google.');})}/><Text style={s.googleHint}>{a("Use your Google account. No VELDRYN password is needed.")}</Text><View style={s.divider}><View style={s.dividerRule}/><Text style={s.dividerText}>{a("OR USE EMAIL")}</Text><View style={s.dividerRule}/></View></>}
    {creating&&<><Text style={s.label}>{a("Username")}</Text><TextInput accessibilityLabel={a("Username")} value={username} onChangeText={setUsername} editable={!busy} maxLength={20} placeholder={a("Username")} placeholderTextColor={C.muted} style={s.input}/></>}
    {emailInput}{passwordInput}
    <GameButton title={busy?a("Connecting…"):creating?a("Create account"):a("Sign in")} disabled={busy} onPress={()=>run(async()=>{if(creating){const result=await createOnlineAccount(email,password,username);if(!result.confirmed){success('Confirmation email sent. Check your inbox before signing in.');showVerification(email,'signup');}}else await signInWithPassword(email,password);})}/>
    {!creating&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{setEntryRecovery(true);setNotice('');setPassword('');}} style={s.helpToggle}><Text style={s.helpText}>{a("Forgot password?")}</Text></Pressable>}
    <View style={s.guestCard}><Text style={s.guestTitle}>{a("New to VELDRYN?")}</Text><Text style={s.guestHint}>{a("Want to try the game first? A guest account can be secured with email later.")}</Text><GameButton title={a("Continue as guest")} tone="secondary" disabled={busy} onPress={()=>run(async()=>{await signInAsGuest();success('Guest account ready. Create your character to enter Asterfall.');})}/></View>
    <Text style={s.entryHint}>{serverGameplayEnabled?a("Online characters and progress are saved on the server. Your existing local save is kept separately."):a("Your local game remains on this device. Online social features use your account.")}</Text>
   </>}
  </>:<>
   <View style={[s.accountStatus,linkStep==='linked'&&s.accountStatusLinked]}>
     <View style={s.statusSymbol}><Text style={s.statusSymbolText}>{linkStep==='linked'?'✓':linkStep==='set_password'?'✦':linkStep==='verify_email'?'✉':'◇'}</Text></View>
     <View style={s.statusCopy}><Text style={s.statusTitle}>{a(linkStep==='linked'?'Linked account':linkStep==='set_password'?'Email linked':linkStep==='verify_email'?'Waiting for email verification':'Guest account')}</Text>
     <Text style={s.statusDescription}>{a(linkStep==='linked'?'Your account can be used on another device.':linkStep==='guest'?'Secure your account to protect your progress.':linkStep==='verify_email'?'Verify your email to continue linking.':'Finish securing your account with a password.')}</Text></View>
   </View>
   <Text style={s.text}>{a('Signed in as {identity}.',{identity:auth.session.user.email||a('guest')})}</Text>
   {(linkStep==='guest'||(linkStep==='verify_email'&&editingLink))&&<>
    <Text style={s.flowStep}>{a("STEP 1 OF 3 · LINK EMAIL")}</Text>
    <Text style={s.text}>{a("Add an email first. After verification, choose a password. Your characters and progress stay with this account.")}</Text>
    <Text style={s.label}>{a("Username")}</Text><TextInput accessibilityLabel={a("Username")} value={username} onChangeText={setUsername} maxLength={20} placeholder={a("Username")} placeholderTextColor={C.muted} style={s.input}/>{emailInput}
    <GameButton title={a("Secure guest account")} disabled={busy||auth.refreshing} onPress={()=>run(async()=>{await upgradeGuestAccount(email,username,accountId);if(!ownsView())return;setEditingLink(false);information('Confirmation email sent. Open the latest email, then return here.');showVerification(email,'guest');})}/>
   </>}
   {linkStep==='verify_email'&&!editingLink&&<><Text style={s.flowStep}>{a("STEP 2 OF 3 · VERIFY EMAIL")}</Text>
    <Text style={s.text}>{a('Confirm the email sent to {email}.',{email:pendingAccountEmail(auth.session.user)})}</Text>
    <Text style={s.text}>{a("Open the latest confirmation email, then return here. You can keep playing while you wait.")}</Text>
    <GameButton title={a("Resend confirmation")} tone="secondary" disabled={busy||auth.refreshing} onPress={()=>run(async()=>{await resendGuestAccountConfirmation(accountId);const next=await auth.refreshAccount();information('If confirmation is needed, an email has been requested.');if(next&&accountLinkStep(next.user)==='verify_email')showVerification(pendingAccountEmail(next.user),'guest','If confirmation is needed, an email has been requested.');})}/>
    {auth.session.user.is_anonymous&&<GameButton title={a("Use a different email")} tone="secondary" disabled={busy||auth.refreshing} onPress={()=>{setEmail(pendingAccountEmail(auth.session!.user));setEditingLink(true);setNotice('');}}/>}
   </>}
   {(linkStep==='guest'||linkStep==='verify_email')&&<GameButton title={auth.refreshing?a("Checking verification…"):a("Check verification")} tone="secondary" disabled={busy||auth.refreshing} onPress={()=>run(checkVerification)}/>}
   {linkStep==='set_password'&&<><Text style={s.flowStep}>{a("STEP 3 OF 3 · PASSWORD")}</Text>
    <Text style={s.text}>{a("Your email is verified. Set a password to finish securing this account.")}</Text>{passwordInput}
    <GameButton title={a("Save account password")} disabled={busy||auth.refreshing} onPress={()=>run(async()=>{await finishGuestAccount(password,accountId);success('Account linked. Your characters and progress are kept.');})}/>
   </>}
   {linkStep==='linked'&&<GameButton title={a("Change password")} tone="secondary" disabled={busy||auth.refreshing} onPress={()=>{if(running.current||!ownsView())return;setPassword('');setPasswordVisible(false);setNotice('');setChangingPassword(true);}}/>}
   {googleSignInConfigured&&!googleLinked&&<GoogleBrandButton title={busy?a("Connecting…"):a("Link Google account")} loading={busy||auth.refreshing} onPress={()=>void run(async()=>{await signInOrLinkGoogle();success('Google account linked. Your characters and progress are kept.');})}/>}
   {googleLinked&&<Text style={s.googleLinked}>✓ {a("Google account linked")}</Text>}
   {playGamesConfigured&&<><GoogleBrandButton title={busy?a("Connecting…"):a("Connect Google Play Games")} loading={busy||auth.refreshing} onPress={()=>void run(async()=>{const {signInPlayGames}=await import('../online/play-games');const result=await signInPlayGames();if(!result.authenticated)throw new Error('Google Play Games sign-in was not completed.');success(result.displayName?`Google Play Games connected as ${result.displayName}.`:'Google Play Games connected.');})}/><Text style={s.googleHint}>{a("Play Games is separate from your VELDRYN account and is used for Google Play game services.")}</Text></>}
   <Text style={s.text}>{serverGameplayEnabled?a("Every successful gameplay action is saved online. Sign in on another device to continue."):a("Local save uploads do not grant online progression.")}</Text>
   <GameButton title={a("Sign out")} tone="secondary" loading={busy} disabled={busy} onPress={()=>{if(auth.session?.user.is_anonymous)gameAlert.alert(a("Sign out of guest account?"),a("Add an email first so you can recover this account."),[{text:a("Stay signed in")},{text:a("Sign out"),style:'destructive',onPress:()=>void run(signOut)}]);else return run(signOut);}}/>
  </>}
  {verificationPrompt&&verificationPrompt.accountId===accountId&&<GameModalSurface visible onClose={closeVerification} presentation="fullscreen" reduceMotion={state.settings.reduceMotion} dismissOnBackdrop={false}>
   <GameModalHeader eyebrow={a("STEP 2 OF 3 · VERIFY EMAIL")} title={a("Verify your email")} onClose={closeVerification}/>
   <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={s.verificationScroll} contentContainerStyle={s.verificationContent}>
    <View style={[s.noticeCard,s.noticeSuccessCard]}><Text style={s.noticeLabelSuccess}>{a("Check your email")}</Text><Text style={s.notice}>{a("Check the inbox for this email address:")}</Text><Text selectable style={s.verificationEmail}>{verificationPrompt.email}</Text></View>
    <Text style={s.text}>{a("Open your inbox and tap the latest verification link. Check your spam or junk folder if you do not see it.")}</Text>
    <Text style={s.text}>{a(verificationPrompt.kind==='guest'?"Return to VELDRYN after verifying to finish securing your account. Your characters and progress stay with you.":"After verifying your email, return to VELDRYN and sign in.")}</Text>
    {(verificationFeedback||auth.error)&&<View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.noticeCard,!(auth.error||verificationFeedback?.error)&&s.noticeInfoCard]}><Text style={s.notice}>{auth.error?accountError(language,auth.error):verificationFeedback?.error?accountError(language,verificationFeedback.message):a(verificationFeedback?.message??'')}</Text></View>}
    {verificationPrompt.kind==='guest'?<GameButton title={auth.refreshing?a("Checking verification…"):a("Check verification")} disabled={busy||auth.refreshing} onPress={()=>run(checkVerification)}/>:<GameButton title={a("Back to sign in")} onPress={closeVerification}/>}
    <GameButton title={a("Resend confirmation")} tone="secondary" disabled={busy||auth.refreshing} onPress={()=>run(async()=>{if(verificationPrompt.kind==='guest'){await resendGuestAccountConfirmation(accountId);await auth.refreshAccount();}else await resendAccountConfirmation(verificationPrompt.email);success('If confirmation is needed, an email has been requested.');})}/>
    {verificationPrompt.kind==='guest'&&<GameButton title={a("Continue playing")} tone="secondary" onPress={closeVerification}/>}
   </ScrollView>
  </GameModalSurface>}
 </Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 entryHeader:{gap:5,marginBottom:spacing.md},entryEyebrow:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:1.1,color:C.accent},entryTitle:{fontSize:25,lineHeight:31,fontWeight:'700',color:C.text},entrySubtitle:{color:C.muted,fontSize:13,lineHeight:19},
 authTabs:{flexDirection:'row',gap:4,padding:4,marginBottom:spacing.lg,borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 authTab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:7},authTabSelected:{borderWidth:1,borderColor:C.selectionLine,backgroundColor:C.selection},
 authTabText:{color:C.muted,fontSize:12,fontWeight:'800'},authTabTextSelected:{color:C.text},
 divider:{flexDirection:'row',alignItems:'center',gap:10,marginVertical:10},dividerRule:{flex:1,height:1,backgroundColor:C.line},dividerText:{fontSize:10,fontWeight:'800',color:C.muted,letterSpacing:0.7},
 guestCard:{gap:8,padding:12,marginTop:spacing.md,borderRadius:10,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2},
 guestTitle:{fontSize:13,fontWeight:'800',color:C.text},entryHint:{fontSize:11,lineHeight:17,color:C.muted,textAlign:'center',marginTop:spacing.sm},
 recoveryHeader:{alignSelf:'flex-start'},backButton:{minHeight:44,justifyContent:'center',paddingHorizontal:2},backText:{fontSize:12,fontWeight:'800',color:C.accent},
 accountStatus:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:C.warning,borderRadius:10,backgroundColor:C.warningSurface},
 accountStatusLinked:{borderColor:C.good,backgroundColor:C.goodSurface},
 statusSymbol:{width:37,height:37,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:9,borderColor:C.lineStrong,backgroundColor:C.panel},
 statusSymbolText:{fontSize:22,fontWeight:'800',color:C.accent},statusCopy:{flex:1,gap:3},statusTitle:{fontSize:14,fontWeight:'800',color:C.text},statusDescription:{fontSize:11,lineHeight:16,color:C.muted},
 flowStep:{fontSize:10,fontWeight:'900',letterSpacing:0.7,color:C.accent,marginTop:spacing.md}, 
googleHint:{color:C.muted,fontSize:12,lineHeight:18,textAlign:'center',marginBottom:spacing.sm},googleLinked:{color:C.good,...typography.bodyStrong,marginVertical:spacing.sm},title:{color:C.text,...typography.title},label:{color:C.text,...typography.bodyStrong,marginTop:spacing.sm},helpToggle:{minHeight:48,justifyContent:'center',alignItems:'center'},helpText:{...typography.body,color:C.info},help:{gap:spacing.sm,paddingTop:spacing.sm,borderTopWidth:1,borderColor:C.line},text:{color:C.muted,fontSize:12,lineHeight:19,marginVertical:spacing.sm},guestHint:{color:C.muted,fontSize:11,lineHeight:17},passwordLabelRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},passwordLabel:{color:C.text,...typography.bodyStrong,flexShrink:1},passwordToggle:{minHeight:48,minWidth:48,maxWidth:'70%',paddingHorizontal:spacing.sm,justifyContent:'center',borderRadius:8},passwordToggleText:{color:C.info,...typography.bodyStrong,textAlign:'center',flexShrink:1},passwordInput:{marginTop:0},verificationScroll:{flexShrink:1},verificationContent:{gap:spacing.md,paddingBottom:spacing.xl,maxWidth:520,width:'100%',alignSelf:'center'},verificationEmail:{color:C.text,...typography.bodyStrong,lineHeight:22,flexShrink:1},passwordRules:{paddingHorizontal:spacing.sm,paddingBottom:spacing.sm,gap:3},passwordRulesTitle:{color:C.text,fontSize:12,fontWeight:'700',marginBottom:2},passwordRule:{color:C.muted,fontSize:12,lineHeight:18},passwordRuleMet:{color:C.good},noticeCard:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:8,backgroundColor:C.badSurface,marginVertical:spacing.sm},noticeSuccessCard:{borderColor:C.good,backgroundColor:C.goodSurface},noticeInfoCard:{borderColor:C.info,backgroundColor:C.infoSurface},noticeLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},noticeLabelSuccess:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:1},noticeLabelInfo:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:1},notice:{color:C.text,lineHeight:21},noticeSuccess:{color:C.text},input:{minHeight:touchTargetMin,borderWidth:1,borderColor:C.lineStrong,borderRadius:9,backgroundColor:C.inputBg,color:C.text,padding:spacing.md,marginVertical:spacing.xs},row:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm}});}
