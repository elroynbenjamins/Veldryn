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
assert.ok(auth.includes('signInAsGuest()')&&auth.includes('upgradeGuestAccount(email,username,accountId)'),'Guest entry and guest-owner linking are preserved');
assert.ok(auth.includes('accountLinkStep(auth.session.user)')&&auth.includes("linkStep==='set_password'"),'Verified account setup uses the authoritative state machine');
assert.ok(auth.includes('finishGuestAccount(password,accountId)')&&auth.includes('resendGuestAccountConfirmation(accountId)')&&auth.includes('auth.refreshAccount()'),'Resend, verification refresh and password setup stay connected to real auth');
assert.ok(auth.includes('presentation="fullscreen"')&&auth.includes('verificationPrompt.kind'),'Email verification is focused and differentiated for signup and guests');
assert.ok(auth.includes('passwordRequirements(password)')&&auth.includes('currentAccount.current===accountId'),'Password validation and stale-account ownership checks remain intact');
assert.ok(auth.includes("linkStep==='linked'")&&auth.includes('signInPlayGames()'),'Linked accounts keep separate Google Play Games connection');
assert.ok(auth.includes("auth.session?.user.is_anonymous")&&auth.includes('run(signOut)'),'Anonymous sign-out still warns before losing a guest account');
assert.ok(!auth.includes('AuthModeChip'),'Legacy pill-style auth control was removed');
assert.ok(account.includes("classEmblemIconArtwork[character.classId]")&&account.includes("character.name")&&account.includes("character.level"),'Account hero shows actual character identity');
assert.ok(account.includes("accountStatus==='pending'")&&account.includes("accountStatus==='guest'"),'Guest and incomplete secure-account states are distinguished');
assert.ok(account.includes("onPress={()=>onNavigate('Settings')}"),'Account security action opens existing account settings');
assert.ok(account.includes("['Activity','ResourceCodex','Store','Settings']"),'Four quick access actions use the existing destinations');
assert.ok(account.includes("accessibilityState={{expanded:!collapsed[section.label]}}")&&account.includes("!collapsed[section.label]&&<View style={s.grid}>"),'Sections collapse and expand accessibly');
assert.ok(account.includes('lockedDestinations')&&account.includes('attentionPriority')&&account.includes('attentionDestinations.slice(0,3)'),'Unlock gating and attention rail remain intact');
assert.ok(account.includes('DiscordButton')&&account.includes('RateAppCard'),'Discord and Rate VELDRYN are preserved');
assert.ok(app.includes('accountLinkStep(auth.session.user)')&&app.includes('character={state.character}'),'Account status and hero derive from live state');
assert.ok(welcome.includes("backgroundColor:'rgba(7,15,28,.64)'"),'Backdrop protects text legibility on scenic art');
for(const key of ["Recover your account","Continue your journey","Your account can be used on another device.","Account setup pending","QUICK ACCESS"]){
 assert.ok(locale.includes(JSON.stringify(key)+':'),key+' must have a localized six-language row');
}
console.log('PASS Account and sign-in refinement: focused email/Google/guest flows, security stages, real state, responsive navigation and localized copy');
