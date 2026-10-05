// Offline account-entry interactions on React 19. Native views and auth services
// are mocked; the account panel, shared inputs/buttons/dialog and link-state
// rules execute unchanged. No accounts, emails or external apps are contacted.
// Run after npm ci in apps/mobile: node tools/validate-account-entry.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const app = path.resolve(__dirname, '../apps/mobile');
const requireApp = Module.createRequire(path.join(app, 'package.json'));
const React = requireApp('react');
const {act, create} = requireApp('react-test-renderer');
const ts = requireApp('typescript');
global.IS_REACT_ACT_ENVIRONMENT = true;

const PASSWORD_PENDING = 'veldryn_guest_password_pending';
const guest = (id = 'guest-a') => ({id, is_anonymous: true, email: '', user_metadata: {display_name: 'Aster'}});
const verified = (id = 'guest-a') => ({...guest(id), is_anonymous: false, email: 'aster@example.test', email_confirmed_at: '2026-10-04T22:00:00Z', user_metadata: {[PASSWORD_PENDING]: true}});
const session = user => user ? {user, access_token: 'test-token'} : null;
const translate = (text, params) => text.replace(/\{([^}]+)\}/g, (_, key) => String(params?.[key] ?? key));

function makeHarness({user = null, recovering = false} = {}) {
  let tree;
  const listeners = new Set(), loaded = new Map();
  const calls = {create: [], upgrade: [], signIn: [], signOut: 0, guest: 0, resend: [], refresh: 0, password: [], keyboard: 0, external: 0};
  const behavior = {createResult: {confirmed: false}, createError: null, upgradeError: null, upgradePending: null, resendError: null, resendPending: null, refreshError: null, refreshedUser: undefined};
  const auth = {session: session(user), loading: false, error: '', recovering, refreshing: false, clearRecovery: () => {auth.recovering = false;}};
  auth.refreshAccount = async () => {
    calls.refresh++;
    if (behavior.refreshError) throw behavior.refreshError;
    if (behavior.refreshedUser !== undefined) auth.session = session(behavior.refreshedUser);
    return auth.session;
  };
  const AppState = {currentState: 'active', addEventListener(type, listener) {assert.equal(type, 'change'); listeners.add(listener); return {remove: () => listeners.delete(listener)};}};
  const theme = new Proxy({}, {get: () => '#4488cc'});
  const flatten = style => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean).map(flatten)) : style || {};
  const native = {
    AppState, ActivityIndicator: 'ActivityIndicator', KeyboardAvoidingView: 'KeyboardAvoidingView',
    Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View',
    Platform: {OS: 'android', select: values => values.android ?? values.default},
    StyleSheet: {create: styles => styles, flatten, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1},
    Modal: ({visible, children, ...props}) => visible ? React.createElement('NativeModal', {...props, visible}, children) : null,
    Keyboard: {dismiss: () => {calls.keyboard++;}},
    Alert: {alert: () => {throw new Error('Account-entry confirmation must use the visible in-game dialog.');}},
    Linking: {openURL: async () => {calls.external++;}, canOpenURL: async () => true},
    AccessibilityInfo: {announceForAccessibility: () => {}, setAccessibilityFocus: () => {}},
    useWindowDimensions: () => ({width: 390, height: 844, fontScale: 1}),
  };
  const api = {
    createOnlineAccount: async (...args) => {calls.create.push(args); if (behavior.createError) throw behavior.createError; return behavior.createResult;},
    upgradeGuestAccount: async (...args) => {
      calls.upgrade.push(args);
      if (behavior.upgradeError) throw behavior.upgradeError;
      if (behavior.upgradePending) return behavior.upgradePending;
      const [email, name, id] = args;
      assert.equal(auth.session?.user.id, id, 'guest upgrade uses the current account');
      auth.session = {...auth.session, user: {...auth.session.user, new_email: email.trim().toLowerCase(), user_metadata: {...auth.session.user.user_metadata, display_name: name, [PASSWORD_PENDING]: true}}};
      return auth.session.user;
    },
    resendGuestAccountConfirmation: async id => {calls.resend.push({kind: 'guest', id}); if (behavior.resendError) throw behavior.resendError; if (behavior.resendPending) await behavior.resendPending;},
    resendAccountConfirmation: async email => {calls.resend.push({kind: 'signup', email}); if (behavior.resendError) throw behavior.resendError; if (behavior.resendPending) await behavior.resendPending;},
    signInWithPassword: async (...args) => {calls.signIn.push(args);},
    signOut: async () => {calls.signOut++; auth.session = null;},
    signInAsGuest: async () => {calls.guest++; auth.session = session(guest());},
    finishGuestAccount: async (...args) => {calls.password.push(args);},
    updateAccountPassword: async (...args) => {calls.password.push(args);},
    requestPasswordRecovery: async () => {}, sendMagicLink: async () => {},
  };
  const mocks = new Map([
    ['react', React], ['react-native', native],
    ['react-native-safe-area-context', {useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0})}],
    [path.join(app, 'src/online/AuthSessionProvider'), {useAuthSession: () => auth}],
    [path.join(app, 'src/online/account'), api],
    [path.join(app, 'src/online/supabase'), {onlineConfigured: true}],
    [path.join(app, 'src/online/gameplay'), {serverGameplayEnabled: true}],
    [path.join(app, 'src/theme/ThemeContext'), {useGameTheme: () => theme}],
    [path.join(app, 'src/theme/theme'), {equipmentTheme: () => ({}), typography: {}, radii: {}, spacing: {sm: 8, md: 12, lg: 16, xl: 24}, touchTargetMin: 44, touchTargetPreferred: 48}],
    [path.join(app, 'src/i18n/account'), {accountText: (_language, text, params) => translate(text, params), accountError: (_language, error) => typeof error === 'string' ? error : error?.message || ''}],
    [path.join(app, 'src/i18n/GameLanguageProvider'), {useGameLanguage: () => 'en'}],
    [path.join(app, 'src/i18n/shared'), {sharedText: (_language, text, params) => translate(text, params)}],
  ]);
  function load(file) {
    file = path.resolve(file);
    if (mocks.has(file)) return mocks.get(file);
    if (!path.extname(file)) file += fs.existsSync(file + '.tsx') ? '.tsx' : '.ts';
    if (loaded.has(file)) return loaded.get(file).exports;
    const mod = {exports: {}}; loaded.set(file, mod);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}}).outputText;
    const localRequire = name => mocks.has(name) ? mocks.get(name) : name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : requireApp(name);
    new Function('require', 'module', 'exports', '__filename', '__dirname', source)(localRequire, mod, mod.exports, file, path.dirname(file));
    return mod.exports;
  }
  const {OnlineAccountPanel} = load(path.join(app, 'src/components/OnlineAccountPanel'));
  const gameState = {settings: {language: 'en', reduceMotion: true}, character: {name: 'Aster'}};
  const render = () => React.createElement(OnlineAccountPanel, {state: gameState});
  const root = () => tree.root;
  const dialogs = () => root().findAllByType('NativeModal');
  const dialog = () => {assert.equal(dialogs().length, 1, 'one visible confirmation dialog'); return dialogs()[0];};
  const findButton = (label, scope = root()) => scope.findAllByType('Pressable').find(node => node.props.accessibilityRole === 'button' && (node.props.accessibilityLabel === label || (!node.props.accessibilityLabel && visibleText(node).trim().replace(/^✓\s*/, '') === label)));
  const input = label => {
    const matches = root().findAllByType('TextInput').filter(node => node.props.accessibilityLabel === label);
    assert.equal(matches.length, 1, 'one input for ' + label); return matches[0];
  };
  async function press(label, scope) {
    const button = findButton(label, scope);
    assert.ok(button, 'button exists: ' + label); assert.notEqual(button.props.disabled, true, 'button enabled: ' + label);
    await act(async () => {button.props.onPress();});
  }
  async function mount() {await act(async () => {tree = create(render());});}
  async function rerender() {await act(async () => {tree.update(render());});}
  async function type(label, value) {await act(async () => {input(label).props.onChangeText(value);});}
  async function appState(next) {await act(async () => {AppState.currentState = next; for (const listener of [...listeners]) listener(next);});}
  async function closeNativeDialog() {await act(async () => {dialog().props.onRequestClose();});}
  async function cleanup() {if (tree) await act(async () => {tree.unmount(); tree = null;}); assert.equal(listeners.size, 0, 'account panel removes its background observer');}
  return {auth, behavior, calls, mount, rerender, root, dialogs, dialog, input, type, press, findButton, appState, closeNativeDialog, cleanup};
}

function visibleText(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return (node?.children || []).map(visibleText).join(' ');
}
async function enterSignup(h) {
  await h.press('Create a new account');
  await h.type('Email address', ' Aster@Example.Test ');
  await h.type('Password', 'Asterfall9!');
}
async function startGuestLink(h) {
  await h.type('Email address', ' Aster@Example.Test ');
  await h.press('Secure guest account');
}

async function passwordVisibility() {
  for (const mode of ['signin', 'signup', 'recovery', 'guest-password']) {
    const h = makeHarness({user: mode === 'guest-password' || mode === 'recovery' ? verified() : null, recovering: mode === 'recovery'});
    try {
      await h.mount();
      if (mode === 'signup') await h.press('Create a new account');
      const label = mode === 'recovery' ? 'New password' : 'Password';
      assert.equal(h.input(label).props.secureTextEntry, true, mode + ' hides the password by default');
      await h.type(label, 'Asterfall9!');
      assert.equal(h.findButton('Show password').props.accessibilityRole, 'button');
      await h.press('Show password');
      assert.equal(h.input(label).props.secureTextEntry, false, mode + ' reveals the entered password');
      assert.equal(h.input(label).props.value, 'Asterfall9!', 'reveal preserves typed password');
      await h.press('Hide password');
      assert.equal(h.input(label).props.secureTextEntry, true);
      assert.equal(h.input(label).props.value, 'Asterfall9!', 'hide preserves typed password');
    } finally {await h.cleanup();}
  }
  const h = makeHarness();
  try {
    await h.mount(); await h.type('Password', 'Asterfall9!'); await h.press('Show password');
    await h.press('Create a new account');
    assert.equal(h.input('Password').props.secureTextEntry, true, 'changing authentication mode hides the password');
    await h.type('Password', 'Asterfall9!'); await h.press('Show password'); await h.appState('background');
    assert.equal(h.input('Password').props.secureTextEntry, true, 'backgrounding hides the password');
    await h.appState('active');
    assert.equal(h.input('Password').props.secureTextEntry, true, 'returning does not reveal it again');
    h.auth.session = session(verified()); await h.rerender();
    await h.type('Password', 'Asterfall9!'); await h.press('Show password');
    h.auth.session = session(verified('different-user')); await h.rerender();
    assert.equal(h.input('Password').props.secureTextEntry, true, 'account changes hide password entry');
    assert.equal(h.input('Password').props.value, '', 'account changes clear the previous password');
  } finally {await h.cleanup();}
  console.log('PASS password entry: reveal/hide preserves text across all four forms; mode, background and account changes restore privacy');
}

async function signupConfirmation() {
  const h = makeHarness();
  try {
    await h.mount(); await enterSignup(h); await h.press('Show password'); await h.press('Create account');
    const text = visibleText(h.dialog());
    assert.ok(text.includes('Verify your email'), 'successful creation presents the verification heading');
    assert.ok(text.includes('aster@example.test'), 'dialog shows the complete normalized recipient');
    assert.ok(/inbox/i.test(text), 'dialog explains where to open the verification message');
    assert.ok(/return|back/i.test(text), 'dialog explains returning after verification');
    assert.equal(h.calls.create.length, 1); assert.equal(h.calls.upgrade.length, 0);
    assert.ok(h.calls.keyboard > 0, 'successful creation dismisses the keyboard so the dialog is visible');
    assert.equal(h.calls.external, 0, 'confirmation does not automatically open another application');
    assert.equal(h.input('Password').props.secureTextEntry, true, 'submission hides the password');
    await h.press('Back to sign in', h.dialog());
    assert.equal(h.dialogs().length, 0); assert.ok(h.findButton('Sign in'));
    assert.equal(h.calls.signIn.length, 0, 'return action does not attempt sign-in automatically');
  } finally {await h.cleanup();}
  for (const confirmed of [false, true]) {
    const attempt = makeHarness();
    try {
      attempt.behavior.createResult = {confirmed};
      if (!confirmed) attempt.behavior.createError = new Error('Account creation failed.');
      await attempt.mount(); await enterSignup(attempt); await attempt.press('Create account');
      assert.equal(attempt.dialogs().length, 0, confirmed ? 'immediately confirmed signup needs no email prompt' : 'failed signup never claims a verification email was sent');
      assert.equal(attempt.calls.external, 0);
    } finally {await attempt.cleanup();}
  }
  console.log('PASS signup confirmation: prominent recipient/instructions, keyboard dismissal, explicit return, no false confirmation on failure or already-confirmed accounts');
}

async function guestConfirmation() {
  const h = makeHarness({user: guest()});
  try {
    await h.mount(); assert.equal(h.dialogs().length, 0, 'guest entry itself does not open a dialog');
    await startGuestLink(h);
    assert.ok(visibleText(h.dialog()).includes('Verify your email'));
    assert.ok(visibleText(h.dialog()).includes('aster@example.test'));
    assert.equal(h.calls.upgrade.length, 1); assert.equal(h.calls.create.length, 0); assert.equal(h.calls.signOut, 0);
    assert.equal(h.auth.session.user.id, 'guest-a', 'guest link keeps the same account');
    assert.ok(h.calls.keyboard > 0);
    await h.press('Continue playing', h.dialog());
    assert.equal(h.dialogs().length, 0); assert.equal(h.calls.signOut, 0);
    assert.ok(visibleText(h.root()).includes('Waiting for email verification'), 'pending state remains discoverable after closing the prompt');
    h.auth.session = {...h.auth.session, access_token: 'refreshed-token'}; await h.rerender();
    assert.equal(h.dialogs().length, 0, 'token refresh does not reopen a dismissed email prompt');
  } finally {await h.cleanup();}
  const failure = makeHarness({user: guest()});
  try {
    failure.behavior.upgradeError = new Error('Please wait before trying again.');
    await failure.mount(); await startGuestLink(failure);
    assert.equal(failure.dialogs().length, 0, 'failed guest upgrade never announces a sent email');
    assert.equal(failure.auth.session.user.id, 'guest-a'); assert.equal(failure.calls.create.length, 0); assert.equal(failure.calls.signOut, 0);
  } finally {await failure.cleanup();}
  console.log('PASS guest confirmation: explicit email prompt, unchanged guest identity/progress route, continue-playing dismissal and no token-refresh popup loop');
}

async function verifiedGuestAndDismissal() {
  const h = makeHarness({user: guest()});
  try {
    await h.mount(); await startGuestLink(h);
    h.auth.session = session(verified()); await h.rerender();
    assert.equal(h.dialogs().length, 0, 'authoritative verification closes the stale email prompt');
    assert.ok(h.findButton('Save account password'), 'verified guest can finish the password step');
    assert.equal(h.input('Password').props.secureTextEntry, true);
    assert.equal(h.calls.create.length, 0); assert.equal(h.calls.signOut, 0);
  } finally {await h.cleanup();}
  const dismissed = makeHarness({user: guest()});
  try {
    await dismissed.mount(); await startGuestLink(dismissed); await dismissed.closeNativeDialog();
    assert.equal(dismissed.dialogs().length, 0, 'Android back dismisses the verification dialog');
    assert.equal(dismissed.auth.session.user.id, 'guest-a'); assert.equal(dismissed.calls.signOut, 0);
  } finally {await dismissed.cleanup();}
  const changed = makeHarness({user: guest()});
  try {
    await changed.mount(); await startGuestLink(changed);
    changed.auth.session = session(guest('different-user')); await changed.rerender();
    assert.equal(changed.dialogs().length, 0, 'account change closes the previous recipient prompt');
  } finally {await changed.cleanup();}
  console.log('PASS verification lifecycle: verified guests reach password setup; native back and account changes clear the correct dialog');
}

async function checkAndResendFeedback() {
  const h = makeHarness({user: guest()});
  try {
    await h.mount(); await startGuestLink(h);
    await h.press('Check verification', h.dialog());
    assert.equal(h.calls.refresh, 1);
    assert.ok(visibleText(h.dialog()).includes('Email is not verified yet.'), 'unverified feedback is inside the visible dialog');
    h.behavior.refreshError = new Error('Verification check temporarily unavailable.');
    await h.press('Check verification', h.dialog());
    assert.ok(visibleText(h.dialog()).includes(h.behavior.refreshError.message), 'verification failure is visible without scrolling the account page behind the dialog');
    h.behavior.refreshError = null;
    await h.press('Resend confirmation', h.dialog());
    assert.deepEqual(h.calls.resend, [{kind: 'guest', id: 'guest-a'}], 'guest resend uses the authenticated account route');
    assert.equal(h.calls.refresh, 3, 'guest resend refreshes current verification state');
    assert.ok(!visibleText(h.dialog()).includes('temporarily unavailable'), 'successful retry clears the stale failure');
    assert.equal(h.calls.create.length, 0); assert.equal(h.calls.signOut, 0);
    h.behavior.refreshedUser = verified();
    await h.press('Check verification', h.dialog());
    assert.equal(h.dialogs().length, 0, 'manual verification check closes the prompt when the email is verified');
    assert.ok(h.findButton('Save account password'));
  } finally {await h.cleanup();}

  const signup = makeHarness();
  try {
    await signup.mount(); await enterSignup(signup); await signup.press('Create account');
    signup.behavior.resendError = new Error('Please wait a minute before requesting another email.');
    await signup.press('Resend confirmation', signup.dialog());
    assert.ok(visibleText(signup.dialog()).includes(signup.behavior.resendError.message), 'resend rate-limit feedback remains visible inside the popup');
    signup.behavior.resendError = null;
    await signup.press('Resend confirmation', signup.dialog());
    assert.deepEqual(signup.calls.resend, [{kind: 'signup', email: 'aster@example.test'}, {kind: 'signup', email: 'aster@example.test'}]);
    assert.equal(signup.calls.create.length, 1, 'resending never creates another account');
    assert.equal(signup.calls.external, 0);
  } finally {await signup.cleanup();}

  const pending = makeHarness({user: {...guest(), new_email: 'aster@example.test', user_metadata: {[PASSWORD_PENDING]: true}}});
  try {
    await pending.mount(); assert.equal(pending.dialogs().length, 0, 'restored pending email status is quiet until an action');
    pending.behavior.resendError = new Error('Could not resend now.');
    await pending.press('Resend confirmation');
    assert.equal(pending.dialogs().length, 0, 'failed resend from the account pane does not open a sent-email prompt');
    pending.behavior.resendError = null;
    await pending.press('Resend confirmation');
    assert.ok(visibleText(pending.dialog()).includes('aster@example.test'), 'successful explicit resend reopens verification guidance');
  } finally {await pending.cleanup();}

  const signInHelp = makeHarness();
  try {
    await signInHelp.mount();
    await signInHelp.type('Email address', ' Aster@Example.Test ');
    await signInHelp.press('Need help signing in?');
    await signInHelp.press('Resend confirmation');
    const text = visibleText(signInHelp.dialog());
    assert.ok(text.includes('aster@example.test'), 'sign-in help opens guidance for the normalized recipient');
    assert.ok(text.includes('If confirmation is needed, an email has been requested.'), 'conditional resend result is visible immediately inside the newly opened popup');
    assert.equal(signInHelp.calls.resend.length, 1); assert.equal(signInHelp.calls.resend[0].kind, 'signup');
    assert.equal(signInHelp.calls.create.length, 0, 'resending from sign-in help does not create an account');
    assert.equal(signInHelp.auth.session, null);
  } finally {await signInHelp.cleanup();}
  console.log('PASS verification actions: authenticated guest checks/resends, normalized signup resend, visible errors and retry feedback, resumable pending-account guidance');
}

async function pendingRequestIsolation() {
  let resolveUpgrade;
  const h = makeHarness({user: guest()});
  try {
    h.behavior.upgradePending = new Promise(resolve => {resolveUpgrade = resolve;});
    await h.mount(); await h.type('Email address', ' Aster@Example.Test ');
    const submit = h.findButton('Secure guest account').props.onPress;
    await act(async () => {submit(); submit();});
    assert.equal(h.calls.upgrade.length, 1, 'two taps before React updates use one account-link request');
    assert.equal(h.findButton('Secure guest account').props.disabled, true, 'in-flight linking disables duplicate submission');
    h.auth.session = session(guest('different-user')); await h.rerender();
    await act(async () => {resolveUpgrade({...guest(), new_email: 'aster@example.test', user_metadata: {[PASSWORD_PENDING]: true}});});
    assert.equal(h.dialogs().length, 0, 'late success cannot show the previous account recipient');
    assert.equal(h.calls.keyboard, 0, 'late success cannot dismiss another account keyboard');
    assert.equal(h.auth.session.user.id, 'different-user');
  } finally {await h.cleanup();}
  let resolveResend;
  const closed = makeHarness({user: guest()});
  try {
    await closed.mount(); await startGuestLink(closed);
    closed.behavior.resendPending = new Promise(resolve => {resolveResend = resolve;});
    await closed.press('Resend confirmation', closed.dialog());
    await closed.press('Continue playing', closed.dialog());
    assert.equal(closed.dialogs().length, 0);
    await act(async () => {resolveResend();});
    assert.equal(closed.dialogs().length, 0, 'resend completion does not reopen a dialog dismissed during the request');
    assert.equal(closed.auth.session.user.id, 'guest-a');
  } finally {await closed.cleanup();}
  console.log('PASS pending requests: same-turn double-tap protection, previous-account completion isolation and no reopening after mid-resend dismissal');
}

function newCopyTranslations() {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
    new Function('exports', 'require', source)(exports, name => load(path.resolve(path.dirname(file), name)));
    return exports;
  }
  const {accountTranslationRows, accountText} = load(path.join(app, 'src/i18n/account.ts'));
  const keys = [
    'Show password', 'Hide password', 'Verify your email', 'Check your email',
    'Check the inbox for this email address:',
    'Open your inbox and tap the latest verification link. Check your spam or junk folder if you do not see it.',
    'Return to VELDRYN after verifying to finish securing your account. Your characters and progress stay with you.',
    'After verifying your email, return to VELDRYN and sign in.', 'Continue playing',
  ];
  const languages = ['en', 'de', 'es', 'nl', 'it', 'fr'];
  for (const key of keys) {
    const row = accountTranslationRows[key];
    assert.ok(row, 'account copy has a translation contract: ' + key);
    assert.equal(row.length, languages.length); assert.equal(row[0], key);
    languages.forEach((language, index) => {
      const text = accountText(language, key);
      assert.equal(text, row[index]); assert.ok(text.trim(), 'nonempty ' + language + ' translation');
      if (language !== 'en') assert.notEqual(text, key, language + ' must not fall back to English');
    });
  }
  console.log('PASS account-entry translations: 9 labels/instructions (8 new and 1 existing) resolve in all 6 supported languages');
}

async function main() {
  await passwordVisibility();
  await signupConfirmation();
  await guestConfirmation();
  await verifiedGuestAndDismissal();
  await checkAndResendFeedback();
  await pendingRequestIsolation();
  newCopyTranslations();
}
main().catch(error => {console.error(error); process.exitCode = 1;});
