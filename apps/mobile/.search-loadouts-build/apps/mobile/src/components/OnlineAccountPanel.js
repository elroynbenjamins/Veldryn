"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineAccountPanel = OnlineAccountPanel;
const GameTextInput_1 = require("./GameTextInput");
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const Panel_1 = require("./Panel");
const account_1 = require("../online/account");
const supabase_1 = require("../online/supabase");
const AuthSessionProvider_1 = require("../online/AuthSessionProvider");
const gameplay_1 = require("../online/gameplay");
const theme_1 = require("../theme/theme");
function OnlineAccountPanel({ state }) {
    const auth = (0, AuthSessionProvider_1.useAuthSession)();
    const [email, setEmail] = (0, react_1.useState)(''), [password, setPassword] = (0, react_1.useState)(''), [username, setUsername] = (0, react_1.useState)(state.character?.name ?? ''), [creating, setCreating] = (0, react_1.useState)(false), [showHelp, setShowHelp] = (0, react_1.useState)(false), [busy, setBusy] = (0, react_1.useState)(false), [notice, setNotice] = (0, react_1.useState)('');
    const run = async (action) => { if (busy)
        return; setBusy(true); setNotice(''); try {
        await action();
        setPassword('');
    }
    catch (e) {
        setNotice(e instanceof Error ? e.message : 'Please try again.');
    }
    finally {
        setBusy(false);
    } };
    const emailInput = <><react_native_1.Text style={s.label}>Email address</react_native_1.Text><GameTextInput_1.GameTextInput accessibilityLabel="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} placeholder="you@example.com" placeholderTextColor={theme_1.C.muted} style={s.input}/></>;
    const passwordInput = <><react_native_1.Text style={s.label}>{auth.recovering ? 'New password' : 'Password'}</react_native_1.Text><GameTextInput_1.GameTextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry autoCorrect={false} autoCapitalize="none" autoComplete={creating ? 'new-password' : 'current-password'} placeholder="Password (8+ characters)" placeholderTextColor={theme_1.C.muted} style={s.input}/></>;
    if (!supabase_1.onlineConfigured)
        return <Panel_1.Panel><react_native_1.Text style={s.title}>Online account unavailable</react_native_1.Text><react_native_1.Text style={s.text}>This build has no online connection configured.</react_native_1.Text></Panel_1.Panel>;
    return <Panel_1.Panel><react_native_1.Text style={s.title}>{auth.recovering ? 'Reset your password' : auth.session ? 'Your account' : creating ? 'Create your VELDRYN account' : 'Welcome to VELDRYN'}</react_native_1.Text>
  {!!(notice || auth.error) && <react_native_1.Text accessibilityRole="alert" style={s.notice}>{notice || auth.error}</react_native_1.Text>}
  {auth.recovering ? <>{passwordInput}<GameButton_1.GameButton title="Save new password" disabled={busy} onPress={() => void run(async () => { await (0, account_1.updateAccountPassword)(password); auth.clearRecovery(); setNotice('Password updated.'); })}/></> : !auth.session ? <>
   {creating && <><react_native_1.Text style={s.label}>Username</react_native_1.Text><GameTextInput_1.GameTextInput accessibilityLabel="Username" value={username} onChangeText={setUsername} maxLength={20} placeholder="Username" placeholderTextColor={theme_1.C.muted} style={s.input}/></>}
   {emailInput}{passwordInput}
   <GameButton_1.GameButton title={busy ? 'Connecting…' : creating ? 'Create account' : 'Sign in'} disabled={busy} onPress={() => void run(async () => { if (creating) {
            const result = await (0, account_1.createOnlineAccount)(email, password, username);
            if (!result.confirmed) {
                setNotice('Confirmation email sent. Check your inbox before signing in.');
                react_native_1.Alert.alert('Check your email', 'Your VELDRYN account was created. Open the confirmation link in your email, then return here to sign in.', [{ text: 'Back to sign in', onPress: () => { setCreating(false); setShowHelp(false); } }]);
            }
        }
        else
            await (0, account_1.signInWithPassword)(email, password); })}/>
   <GameButton_1.GameButton title={creating ? 'Already registered? Sign in' : 'New player? Create an account'} tone="secondary" disabled={busy} onPress={() => { setCreating(!creating); setNotice(''); }}/>
   <react_native_1.Pressable accessibilityRole="button" accessibilityState={{ expanded: showHelp }} onPress={() => setShowHelp(value => !value)} style={s.helpToggle}><react_native_1.Text style={s.helpText}>{showHelp ? 'Hide sign-in help' : 'Need help signing in?'}</react_native_1.Text></react_native_1.Pressable>
   {showHelp && <react_native_1.View style={s.help}><react_native_1.Text style={s.text}>Enter your email above to request a link.</react_native_1.Text><react_native_1.View style={s.row}><GameButton_1.GameButton title="Resend confirmation" tone="secondary" disabled={busy} onPress={() => void run(async () => { await (0, account_1.resendAccountConfirmation)(email); setNotice('If confirmation is needed, an email has been requested.'); })}/><GameButton_1.GameButton title="Forgot password" tone="secondary" disabled={busy} onPress={() => void run(async () => { await (0, account_1.requestPasswordRecovery)(email); setNotice('If this email has an account, a recovery link has been requested.'); })}/></react_native_1.View>
   <GameButton_1.GameButton title="Email a sign-in link" tone="secondary" disabled={busy} onPress={() => void run(async () => { await (0, account_1.sendMagicLink)(email); setNotice('Check your email and open the link on this device.'); })}/></react_native_1.View>}
   <react_native_1.Text style={s.text}>{gameplay_1.serverGameplayEnabled ? 'Online characters and progress are saved on the server. Your existing local save is kept separately.' : 'Your local game remains on this device. Online social features use your account.'}</react_native_1.Text>
  </> : <>
   <react_native_1.Text style={s.text}>Signed in as {auth.session.user.email ?? 'guest'}.</react_native_1.Text>
   {auth.session.user.is_anonymous && <><react_native_1.Text style={s.text}>Add an email and password to recover this account on another device.</react_native_1.Text><GameTextInput_1.GameTextInput accessibilityLabel="Username" value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={theme_1.C.muted} style={s.input}/>{emailInput}{passwordInput}<GameButton_1.GameButton title="Secure guest account" disabled={busy} onPress={() => void run(async () => { await (0, account_1.upgradeGuestAccount)(email, password, username); setNotice('Confirm your email to finish securing this account.'); })}/></>}
   <react_native_1.Text style={s.text}>{gameplay_1.serverGameplayEnabled ? 'Every successful gameplay action is saved online. Sign in on another device to continue.' : 'Local save uploads do not grant online progression.'}</react_native_1.Text>
   <GameButton_1.GameButton title="Sign out" tone="secondary" disabled={busy} onPress={() => { if (auth.session?.user.is_anonymous)
            react_native_1.Alert.alert('Sign out of guest account?', 'Add an email first so you can recover this account.', [{ text: 'Stay signed in' }, { text: 'Sign out', style: 'destructive', onPress: () => void run(account_1.signOut) }]);
        else
            void run(account_1.signOut); }}/>
  </>}
 </Panel_1.Panel>;
}
const s = react_native_1.StyleSheet.create({ title: { color: theme_1.C.text, ...theme_1.typography.title }, label: { color: theme_1.C.text, ...theme_1.typography.bodyStrong, marginTop: theme_1.spacing.sm }, helpToggle: { minHeight: 48, justifyContent: 'center', alignItems: 'center' }, helpText: { ...theme_1.typography.body, color: theme_1.C.info }, help: { gap: theme_1.spacing.sm, paddingTop: theme_1.spacing.sm, borderTopWidth: 1, borderColor: theme_1.C.line }, text: { color: theme_1.C.muted, lineHeight: 21, marginVertical: theme_1.spacing.sm }, notice: { color: theme_1.C.bad, lineHeight: 21, marginVertical: theme_1.spacing.sm }, input: { minHeight: theme_1.touchTargetMin, borderWidth: 1, borderColor: theme_1.C.line, color: theme_1.C.text, padding: theme_1.spacing.sm, marginVertical: theme_1.spacing.sm }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme_1.spacing.sm } });
