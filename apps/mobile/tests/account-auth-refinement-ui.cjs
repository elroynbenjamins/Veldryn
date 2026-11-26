const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=path=>fs.readFileSync(path,'utf8');
const auth=read('src/components/OnlineAccountPanel.tsx');
const account=read('src/screens/MoreScreen.tsx');
const app=read('App.tsx');
const welcome=read('src/components/AccountWelcomeScreen.tsx');
const locale=read('src/i18n/account.ts');

for(const path of ['src/components/OnlineAccountPanel.tsx','src/screens/MoreScreen.tsx','src/components/AccountWelcomeScreen.tsx','src/i18n/account.ts']){
 const source=read(path);
 const tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.deepEqual(tree.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')),[],path+' parses without JSX or TypeScript errors');
}
assert.ok(auth.includes("entryRecovery?<")&&auth.includes('requestPasswordRecovery(email)'),'Recovery has its own view using the real provider');
assert.ok(auth.includes("!auth.session?<")&&auth.includes('creating?')&&auth.includes('setCreating(true)')&&auth.includes('setCreating(false)'),'Sign In and Create Account tabs share the real auth state');
assert.ok(auth.includes('signInWithPassword(email,password)')&&auth.includes('createOnlineAccount(email,password,username)'),'Password entry retains server-backed sign-in and registration');
assert.ok(auth.includes('googleSignInConfigured')&&auth.includes('signInOrLinkGoogle()'),'Google entry is only shown when configured');
assert.ok(auth.includes('!googleLinked&&googleAccountLinkingEnabled&&<GoogleBrandButton')&&auth.includes('googleLinked&&<View style={s.servicePill}'),'Unverified Google account linking is hidden by default without hiding already-linked status');
assert.ok(auth.includes('googleAccountLinkingEnabled&&<><GoogleBrandButton'),'Signed-out Google login also waits for verified nonce-bound Android builds');
const googleSignIn=read('src/online/google-signin.ts');
assert.ok(googleSignIn.includes("process.env.EXPO_PUBLIC_GOOGLE_ACCOUNT_LINKING_ENABLED==='true'"),'Linking requires a deliberate release flag and stays disabled by default');
assert.ok(!app.includes('signInAsGuest(')&&!app.includes('guestBootstrapRef'),'App startup never creates guest accounts without explicit input');
assert.ok(app.includes("await perform({type:'roster_switch',args:{id}},true,false,false,true)"),'Character switching awaits the authenticated gameplay command and propagates its failure, rather than performing an auth action');
assert.ok(auth.includes('signInAsGuest()')&&auth.includes('upgradeGuestAccount(email,username,accountId)'),'Guest entry and guest-owner linking are preserved');
assert.ok(auth.includes('accountLinkStep(auth.session.user)')&&auth.includes("linkStep==='set_password'"),'Verified account setup uses the authoritative state machine');
assert.ok(auth.includes('finishGuestAccount(password,accountId)')&&auth.includes('resendGuestAccountConfirmation(accountId)')&&auth.includes('auth.refreshAccount()'),'Resend, verification refresh and password setup stay connected to real auth');
assert.ok(auth.includes('presentation="fullscreen"')&&auth.includes('verificationPrompt.kind'),'Email verification is focused and differentiated for signup and guests');
assert.ok(auth.includes('passwordRequirements(password)')&&auth.includes('currentAccount.current===accountId'),'Password validation and stale-account ownership checks remain intact');
assert.ok(auth.includes("linkStep==='linked'")&&auth.includes('signInPlayGames()'),'Linked accounts keep separate Google Play Games connection');
assert.ok(auth.includes('Connected services')&&auth.includes('Account security')&&auth.includes('s.accountIdentity'),'Linked account status, services and security are clearly grouped');
assert.ok(auth.includes('redundantLinkSuccess')&&auth.includes('!redundantLinkSuccess'),'Reflected link success does not create duplicate green confirmation cards');
// Social Names production backend is migrated and owner-approved for 1.0.11. Only the exact production build triple gate can mount the editor.
const socialGate=read('src/online/social-identity-client-gate.ts');
const releaseFlags=read('src/core/release-flags.ts');
assert.ok(auth.includes("import {ACCOUNT_SOCIAL_IDENTITY_RELEASED} from '../online/social-identity-client-gate'"),'Account panel imports the staging-aware Social Names release gate');
assert.ok(auth.includes('{auth.session&&ACCOUNT_SOCIAL_IDENTITY_RELEASED?<SocialNameEditor/>:null}'),'Social Name editor mounts only for signed-in users when the feature is released');
assert.ok(releaseFlags.includes('export const ACCOUNT_SOCIAL_IDENTITY_RELEASED=false'),'Production social identity remains unavailable until production RPC migration and QA');
assert.ok(socialGate.includes("process.env.EXPO_PUBLIC_RELEASE_CHANNEL==='staging'")&&socialGate.includes("process.env.EXPO_PUBLIC_SOCIAL_NAMES_STAGING_PREVIEW==='true'"),'Explicit staging Social Names preview remains available');
const androidBuild=JSON.parse(read('eas.json'));
assert.equal(androidBuild.build.production.env.EXPO_PUBLIC_SOCIAL_NAMES_PRODUCTION_ENABLED,'true','Approved 1.0.11 production build opts into Social Names only behind exact channel and backend checks');
assert.equal(androidBuild.build.production.env.EXPO_PUBLIC_SOCIAL_NAMES_STAGING_PREVIEW,'false','Production never inherits staging preview');
assert.equal(androidBuild.build.staging.env.EXPO_PUBLIC_SOCIAL_NAMES_STAGING_PREVIEW,'true','Staging QA retains explicit preview');
assert.ok(socialGate.includes("process.env.EXPO_PUBLIC_RELEASE_CHANNEL==='production'")&&socialGate.includes("process.env.EXPO_PUBLIC_SOCIAL_NAMES_PRODUCTION_ENABLED==='true'")&&socialGate.includes("process.env.EXPO_PUBLIC_SUPABASE_URL==='https://nyjwigipamnvpdvpauuv.supabase.co'"),'Only explicitly approved production builds with the exact backend may mount the editor');
const socialRosterMigration=read('../../backend/supabase/migrations/20261118142000_social_roster_account_name_projections_v1.sql');
assert.ok(socialRosterMigration.includes('party_social_state_before_weekly_tiers_v1()')&&socialRosterMigration.includes('v_party_target')&&socialRosterMigration.includes('online_player_roster_v1()'),'Social Name migration patches production weekly-party source without dropping wrappers');

// Exercise the actual transpiled build gate, not merely the presence of flag strings.
const vm=require('node:vm');
const compiledSocialGate=ts.transpileModule(socialGate,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function socialNameVisibleWithEnv(env){
 const mod={exports:{}};
 vm.runInNewContext(compiledSocialGate,{module:mod,exports:mod.exports,process:{env}});
 return mod.exports.ACCOUNT_SOCIAL_IDENTITY_RELEASED;
}
const stagingSocialEnv={
 EXPO_PUBLIC_RELEASE_CHANNEL:'staging',
 EXPO_PUBLIC_SUPABASE_URL:'https://iqfmmpvwanvvmxcftfxw.supabase.co',
 EXPO_PUBLIC_SOCIAL_NAMES_STAGING_PREVIEW:'true',
};
const prodSocialEnv={
 EXPO_PUBLIC_RELEASE_CHANNEL:'production',
 EXPO_PUBLIC_SUPABASE_URL:'https://nyjwigipamnvpdvpauuv.supabase.co',
 EXPO_PUBLIC_SOCIAL_NAMES_PRODUCTION_ENABLED:'true',
};
assert.equal(socialNameVisibleWithEnv({}),false,'No build flag keeps Social Name hidden');
assert.equal(socialNameVisibleWithEnv(stagingSocialEnv),true,'Matching staging APK previews Social Name');
assert.equal(socialNameVisibleWithEnv({...stagingSocialEnv,EXPO_PUBLIC_SUPABASE_URL:prodSocialEnv.EXPO_PUBLIC_SUPABASE_URL}),false,'Staging preview cannot reach production');
assert.equal(socialNameVisibleWithEnv(prodSocialEnv),true,'Explicit production launch enables Social Name');
assert.equal(socialNameVisibleWithEnv({...prodSocialEnv,EXPO_PUBLIC_SOCIAL_NAMES_PRODUCTION_ENABLED:'false'}),false,'Production launch opt-out wins');
assert.equal(socialNameVisibleWithEnv({...prodSocialEnv,EXPO_PUBLIC_RELEASE_CHANNEL:'preview'}),false,'Preview builds cannot spoof production launch');
assert.equal(socialNameVisibleWithEnv({...prodSocialEnv,EXPO_PUBLIC_SUPABASE_URL:stagingSocialEnv.EXPO_PUBLIC_SUPABASE_URL}),false,'Production launch requires exact production backend');

// Regression: PostgREST returns plain objects (not always Error instances).
const socialNameSource=read('src/online/social-name.ts');
const compiledSocialName=ts.transpileModule(socialNameSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const socialModule={exports:{}};
vm.runInNewContext(compiledSocialName,{
 module:socialModule,exports:socialModule.exports,
 require:(name)=>{if(name==='./supabase')return {supabase:null};throw new Error('Unexpected Social Name import: '+name)},
});
const socialError=socialModule.exports.socialNameError;
assert.equal(socialError({message:'SOCIAL_NAME_TAKEN',code:'P0001'}),'This name is already used by another player.','Plain PostgREST error preserves name collision guidance');
assert.equal(socialError({message:'SOCIAL_NAME_COOLDOWN'}),'You can change your social name once every 30 days.','Cooldown is explained');
assert.equal(socialError({code:'23505'}),'This name is already used by another player.','Unique constraint error is actionable');
assert.equal(socialError(new Error('SOCIAL_NAME_BLOCKED')),'Choose a different social name.','Native Error stays supported');
assert.equal(socialError({message:'Internal database error',details:'private table name'}),'Could not update your social name. Please try again.','Database internals are not shown');
const socialLocaleSource=read('src/i18n/social-identity.ts');
const compiledSocialLocale=ts.transpileModule(socialLocaleSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const socialLocaleModule={exports:{}};
vm.runInNewContext(compiledSocialLocale,{
 module:socialLocaleModule,exports:socialLocaleModule.exports,
 require:(name)=>{if(name==='./languages')return {SUPPORTED_LANGUAGES:['en','de','es','nl','it','fr','ru','tr']};throw new Error('Unexpected translation import: '+name)},
});
const socialT=socialLocaleModule.exports.socialIdentityT;
for(const key of ['This name is already used by another player.','You can change your social name once every 30 days.','Choose a different social name.','Complete account setup before choosing a social name.','Could not update your social name. Please try again.']){
 for(const language of ['en','de','es','nl','it','fr','ru','tr']){
  const translated=socialT(language,key);
  assert.ok(typeof translated==='string'&&translated.length>8&&!translated.includes('undefined'),'Localized Social Name error '+key+' / '+language);
  if(language!=='en')assert.notEqual(translated,key,'No English fallback for authored Social Name error / '+language);
 }
}
const socialEditor=read('src/components/SocialNameEditor.tsx');
assert.ok(socialEditor.includes('const reason=socialNameError(e)')&&socialEditor.includes('socialIdentityT(language,reason)')&&socialEditor.includes("reason==='This name is already used by another player.'"),'Editor localizes parsed errors and handles name collisions as taken');
assert.ok(socialEditor.includes('proposed.toLowerCase()!==data.socialName.toLowerCase()'),'Case-only re-entry does not offer a pointless 30-day rename action');

assert.ok(socialNameSource.includes("rpc('account_social_name_availability_v1'"),'Client queries the protected Social Name availability RPC');
assert.ok(socialNameSource.includes("typeof data!=='boolean'"),'Malformed availability responses fail closed');
assert.ok(socialEditor.includes("checkAccountSocialNameAvailability(candidate)")&&socialEditor.includes('clearTimeout(timer)'),'Editor debounces each availability request and cancels older checks');
assert.ok(socialEditor.includes('activeAccountRef.current===owner')&&socialEditor.includes('availability?.accountId===accountId'),'A late check cannot bleed into a different account');
assert.ok(socialEditor.includes("canSave=canCheck&&availabilityStatus==='available'&&!busy"),'Save is disabled unless availability was confirmed for the current name');
assert.ok(socialEditor.includes("status:'taken'")&&socialEditor.includes('setAvailabilityRetry(value=>value+1)'),'Duplicate name races are surfaced and failed checks can be retried');
for(const key of ['Checking name availability…','Name available.','Name already taken.','Unable to check availability. Tap to retry.']){
 for(const language of ['en','de','es','nl','it','fr','ru','tr']){
  const translated=socialT(language,key);
  assert.ok(typeof translated==='string'&&translated.length>3&&!translated.includes('undefined'),'Availability UI locale: '+key+' / '+language);
  if(language!=='en')assert.notEqual(translated,key,'No English fallback for availability UI: '+key+' / '+language);
 }
}



assert.ok(auth.includes('Google Play Games is separate from your VELDRYN account'),'Play Games remains separate from VELDRYN recovery');
assert.ok(auth.includes("auth.session?.user.is_anonymous")&&auth.includes('run(signOut)'),'Anonymous sign-out still warns before losing a guest account');
assert.ok(!auth.includes('AuthModeChip'),'Legacy pill-style auth control was removed');
assert.ok(account.includes("classEmblemIconArtwork[character.classId]")&&account.includes("character.name")&&account.includes("character.level"),'Account hero shows actual character identity');
assert.ok(account.includes("accountStatus==='pending'")&&account.includes("accountStatus==='guest'"),'Guest and incomplete secure-account states are distinguished');
assert.ok(account.includes("onPress={()=>onNavigate('Settings')}"),'Account security action opens existing account settings');
assert.ok(account.includes("['Dungeon','ResourceCodex','Store','Settings']"),'Four quick access actions open Dungeons, Codex, Store and Settings');
assert.ok(account.includes("case 'Dungeon':return {title:a('Dungeons')"),'Dedicated Dungeon destination remains available in Account');
assert.ok(account.includes("accessibilityState={{expanded:!collapsed[section.label]}}")&&account.includes("!collapsed[section.label]&&<View style={s.grid}>"),'Sections collapse and expand accessibly');
assert.ok(account.includes('lockedDestinations')&&account.includes('attentionPriority')&&account.includes('attentionDestinations.slice(0,3)'),'Unlock gating and attention rail remain intact');
assert.ok(account.includes('DiscordButton')&&account.includes('RateAppCard'),'Discord and Rate VELDRYN are preserved');
assert.ok(app.includes('accountLinkStep(auth.session.user)')&&app.includes('character={state.character}'),'Account status and hero derive from live state');
assert.ok(welcome.includes("backgroundColor:'rgba(7,15,28,.64)'"),'Backdrop protects text legibility on scenic art');
for(const key of ["Recover your account","Continue your journey","Your account can be used on another device.","Account setup pending","QUICK ACCESS","Connected services","Google account","Secured","Account security"]){
 assert.ok(locale.includes(JSON.stringify(key)+':'),key+' must have a localized six-language row');
}
console.log('PASS Account and sign-in refinement: focused email/Google/guest flows, security stages, real state, responsive navigation and localized copy');
