// Focused offline React 19 regressions for dungeon cosmetic identities.
// Runs the actual hook, renderer, class resolver and artwork lookup with a fake
// clock and mocked native/Auth/Supabase boundaries. No network or user writes.
// Run after npm ci in apps/mobile: node tools/validate-coop-profile-icons.cjs
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

const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const viewerA = id(901), viewerB = id(902), runA = id(1), runB = id(2);
const subjectA = id(11), subjectB = id(12);
const sentinel = 'starter:armored-sentinel', ranger = 'starter:hooded-ranger';
const iconRow = (subject = subjectA, icon = sentinel, classId = 'IRONWARDEN') => ({subject_id: subject, profile_icon_id: icon, icon_class_id: classId});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
}

function makeHarness(initialState = 'active') {
  let clock = 1000, nextTimer = 0;
  const timers = new Map(), listeners = new Set(), loaded = new Map(), requests = [];
  const auth = {session: {user: {id: viewerA}}};
  const original = {setTimeout, clearTimeout, setInterval, clearInterval, dateNow: Date.now};
  global.setTimeout = (fn, delay = 0) => {const timer = ++nextTimer; timers.set(timer, {fn, due: clock + delay, delay, interval: false}); return timer;};
  global.clearTimeout = timer => timers.delete(timer);
  global.setInterval = (fn, delay) => {const timer = ++nextTimer; timers.set(timer, {fn, due: clock + delay, delay, interval: true}); return timer;};
  global.clearInterval = timer => timers.delete(timer);
  Date.now = () => clock;
  const AppState = {currentState: initialState, addEventListener(type, callback) {assert.equal(type, 'change'); listeners.add(callback); return {remove: () => listeners.delete(callback)};}};
  const supabase = {rpc(name, args) {
    const request = {...deferred(), name, args: structuredClone(args), viewer: auth.session?.user.id};
    requests.push(request); return request.promise;
  }};
  const mocks = new Map([
    ['react', React],
    ['react-native', {AppState, Image: 'Image', View: 'View', Text: 'Text', Platform: {select: choices => choices.android ?? choices.default}, StyleSheet: {create: styles => styles, absoluteFillObject: {}}}],
    [path.join(app, 'src/online/AuthSessionProvider'), {useAuthSession: () => auth}],
    [path.join(app, 'src/online/supabase'), {supabase}]
  ]);
  function load(file) {
    file = path.resolve(file);
    if (mocks.has(file)) return mocks.get(file);
    if (/\.(?:png|jpe?g|webp)$/.test(file)) return {uri: file};
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!path.extname(file)) file += fs.existsSync(file + '.tsx') ? '.tsx' : '.ts';
    if (loaded.has(file)) return loaded.get(file).exports;
    const mod = {exports: {}}; loaded.set(file, mod);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}}).outputText;
    const localRequire = name => mocks.has(name) ? mocks.get(name) : name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : requireApp(name);
    new Function('require', 'module', 'exports', '__filename', '__dirname', source)(localRequire, mod, mod.exports, file, path.dirname(file));
    return mod.exports;
  }
  async function tick(ms) {
    const end = clock + ms;
    for (;;) {
      const next = [...timers.entries()].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      const [timerId, timer] = next; clock = timer.due;
      if (timer.interval) timer.due += timer.delay; else timers.delete(timerId);
      await act(async () => {timer.fn();});
    }
    clock = end;
  }
  async function state(next) {await act(async () => {AppState.currentState = next; for (const callback of [...listeners]) callback(next);});}
  async function reply(request, data, error = null) {await act(async () => {request.resolve({data, error});});}
  function restore() {Object.assign(global, {setTimeout: original.setTimeout, clearTimeout: original.clearTimeout, setInterval: original.setInterval, clearInterval: original.clearInterval}); Date.now = original.dateNow;}
  return {auth, AppState, timers, listeners, requests, mocks, load, tick, state, reply, restore};
}

async function mountIcons(h, initial = {}) {
  const {useCoopProfileIcons} = h.load(path.join(app, 'src/online/coop-profile-icons'));
  let view, tree, props = {scope: 'run', ids: [runA], enabled: true, rosterKey: 'roster-a', ...initial};
  function Probe(current) {view = useCoopProfileIcons(current.scope, current.ids, current.enabled, current.rosterKey); return null;}
  await act(async () => {tree = create(React.createElement(Probe, props));});
  return {
    get icons() {return view;},
    async update(next = {}) {props = {...props, ...next}; await act(async () => {tree.update(React.createElement(Probe, props));});},
    async close() {if (tree) {await act(async () => tree.unmount()); tree = null;}}
  };
}

async function scopedRequestsAndRefresh() {
  const h = makeHarness(); let probe;
  try {
    probe = await mountIcons(h, {scope: 'lfg', ids: [runB, 'fixture-run', runA, runA, '']});
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].name, 'coop_profile_icons_v1');
    assert.deepEqual(h.requests[0].args, {p_scope: 'lfg', p_ids: [runA, runB]}, 'request uses distinct listing IDs only; never player account IDs');
    assert.ok(!JSON.stringify(h.requests[0].args).includes(viewerA));
    await h.reply(h.requests[0], [
      {...iconRow(subjectA, sentinel, null), account_id: viewerB, private_state: 'DO NOT EXPOSE'},
      iconRow(subjectB, ranger), null, {subject_id: 'fixture-player', profile_icon_id: sentinel}
    ]);
    assert.deepEqual([...probe.icons], [[subjectA, {profileIconId: sentinel, iconClassId: null}], [subjectB, {profileIconId: ranger, iconClassId: 'IRONWARDEN'}]], 'cosmetic projection never copies account IDs or private response fields');
    const firstView = probe.icons;
    for (let poll = 0; poll < 11; poll++) {
      await h.tick(5000);
      await probe.update({ids: [runA, runB, runB], poll});
    }
    assert.equal(h.requests.length, 1, 'fresh roster arrays and gameplay rerenders do not drive cosmetic polling');
    assert.strictEqual(probe.icons, firstView, 'unchanged cosmetic data survives gameplay rerenders');
    await h.tick(4999); assert.equal(h.requests.length, 1);
    await h.tick(1); assert.equal(h.requests.length, 2, 'visible identities refresh after 60 seconds');
    await h.tick(120000); assert.equal(h.requests.length, 2, 'slow identity requests do not overlap subsequent polling intervals');
    await h.reply(h.requests[1], [iconRow(subjectA, null, null)]);
    assert.deepEqual([...probe.icons], [[subjectA, {profileIconId: null, iconClassId: null}]], 'explicit hidden icon and removed roster rows replace old cosmetic data');
    await h.tick(60000); await h.reply(h.requests.at(-1), []);
    assert.equal(probe.icons.size, 0, 'an empty authorized projection removes the previous icon');
    await h.tick(60000); await h.reply(h.requests.at(-1), [iconRow()]);
    assert.equal(probe.icons.get(subjectA).profileIconId, sentinel);
    await h.tick(60000); await h.reply(h.requests.at(-1), null, new Error('Projection not available'));
    assert.equal(probe.icons.size, 0, 'authorization/service errors clear cosmetics instead of preserving stale access');
    await h.tick(60000); await h.reply(h.requests.at(-1), [iconRow()]);
    await h.tick(60000); await act(async () => {h.requests.at(-1).reject(new Error('Connection interrupted'));});
    assert.equal(probe.icons.size, 0, 'transport errors also clear a previously shown icon');
    for (const request of h.requests) assert.deepEqual(Object.keys(request.args).sort(), ['p_ids', 'p_scope']);
    await probe.close();
    assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0);
    console.log('PASS co-op identity projection: scope IDs only, no private output fields, rerender-independent 60s singleflight refresh, explicit null/removal/error clearing');
  } finally {await probe?.close(); h.restore();}
}

async function scopeAccountAndRosterRaces() {
  const h = makeHarness(); let probe;
  try {
    probe = await mountIcons(h);
    await h.reply(h.requests.at(-1), [iconRow()]);
    const switches = [
      ['account', async () => {h.auth.session = {user: {id: viewerB}}; await probe.update();}],
      ['scope', () => probe.update({scope: 'ready'})],
      ['roster', () => probe.update({rosterKey: 'roster-b'})],
      ['scope IDs', () => probe.update({ids: [runB]})]
    ];
    for (const [label, change] of switches) {
      await h.tick(60000);
      const stale = h.requests.at(-1), before = h.requests.length;
      await change();
      assert.equal(probe.icons.size, 0, `${label} switch immediately hides the old projection`);
      assert.equal(h.requests.length, before + 1, `${label} switch starts one fresh authorized request`);
      const current = h.requests.at(-1);
      await h.reply(current, [iconRow(subjectB, ranger)]);
      const accepted = probe.icons;
      await h.reply(stale, [iconRow(subjectA, sentinel)]);
      assert.strictEqual(probe.icons, accepted, `late previous ${label} response cannot overwrite the current identity`);
      assert.equal(probe.icons.get(subjectB).profileIconId, ranger);
      assert.equal(probe.icons.has(subjectA), false);
    }
    assert.deepEqual(h.requests.at(-1).args, {p_scope: 'ready', p_ids: [runB]});
    const beforeToken = h.requests.length, beforeView = probe.icons;
    h.auth.session = {user: {id: viewerB}, access_token: 'refreshed-token'};
    await probe.update({ids: [runB]});
    assert.equal(h.requests.length, beforeToken, 'same-account token renewal does not refetch icons');
    assert.strictEqual(probe.icons, beforeView);

    await h.tick(60000); const staleDisabled = h.requests.at(-1);
    await probe.update({enabled: false});
    assert.equal(probe.icons.size, 0); assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0);
    await h.reply(staleDisabled, [iconRow()]);
    assert.equal(probe.icons.size, 0, 'a late request cannot restore disabled identities');
    const disabledReads = h.requests.length; await h.tick(120000);
    assert.equal(h.requests.length, disabledReads);
    await probe.update({enabled: true});
    await h.reply(h.requests.at(-1), [iconRow()]);
    await h.tick(60000); const staleLogout = h.requests.at(-1);
    h.auth.session = null; await probe.update();
    assert.equal(probe.icons.size, 0); assert.equal(h.timers.size, 0);
    await h.reply(staleLogout, [iconRow()]);
    assert.equal(probe.icons.size, 0, 'logout rejects outstanding responses');
    const logoutReads = h.requests.length; await h.tick(120000);
    assert.equal(h.requests.length, logoutReads);
    h.auth.session = {user: {id: viewerB}}; await probe.update();
    assert.equal(probe.icons.size, 0, 're-login starts with a fresh projection');
    const staleUnmount = h.requests.at(-1); await probe.close();
    await h.reply(staleUnmount, [iconRow()]);
    assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0);
    console.log('PASS co-op identity isolation: account/scope/roster/ID switches, token stability, stale completion races, disable/logout/unmount disposal');
  } finally {await probe?.close(); h.restore();}
}

async function backgroundAndFixtureLifecycle() {
  const h = makeHarness('background'); let probe;
  try {
    probe = await mountIcons(h);
    await h.tick(120000); assert.equal(h.requests.length, 0, 'background mount performs no identity requests');
    await h.state('active'); assert.equal(h.requests.length, 1);
    await h.reply(h.requests.at(-1), [iconRow()]);
    await h.tick(60000); const staleBackground = h.requests.at(-1);
    await h.state('background');
    assert.equal(probe.icons.size, 0, 'background immediately clears visible identities');
    await h.reply(staleBackground, [iconRow()]);
    assert.equal(probe.icons.size, 0, 'background cannot accept an outstanding foreground result');
    const backgroundReads = h.requests.length; await h.tick(120000);
    assert.equal(h.requests.length, backgroundReads, 'background intervals never make RPCs');
    await h.state('active'); const staleForeground = h.requests.at(-1);
    await h.state('inactive'); await h.state('active'); const current = h.requests.at(-1);
    assert.notStrictEqual(current, staleForeground);
    await h.reply(staleForeground, [iconRow(subjectA, ranger)]);
    assert.equal(probe.icons.size, 0, 'old foreground completion cannot cross an inactive/active cycle');
    const pendingReads = h.requests.length; await h.tick(60000);
    assert.equal(h.requests.length, pendingReads, 'obsolete request finalization cannot release the new singleflight guard');
    await h.reply(current, [iconRow(subjectB)]);
    assert.equal(probe.icons.get(subjectB).profileIconId, sentinel);
    await probe.update({ids: ['demo-run', 'fixture-ready', 'offline-party', '']});
    assert.equal(probe.icons.size, 0); assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0);
    const fixtureReads = h.requests.length;
    await h.tick(120000); await h.state('background'); await h.state('active');
    assert.equal(h.requests.length, fixtureReads, 'offline fixtures never invoke the online projection');
    await probe.update({scope: 'lfg', ids: [runA], enabled: false});
    await h.tick(60000); assert.equal(h.requests.length, fixtureReads, 'disabled valid IDs never invoke the projection');
    await probe.update({scope: 'lfg', ids: [runA], enabled: true});
    assert.deepEqual(h.requests.at(-1).args, {p_scope: 'lfg', p_ids: [runA]}, 'recruitment identity request contains listing IDs and scope only');
    await probe.close();
    assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0);
    console.log('PASS co-op visibility: background suppression/clearing, foreground reload, inactive races, singleflight ownership, fixture/disabled gating');
  } finally {await probe?.close(); h.restore();}
}

async function initialNullAppState() {
  const h = makeHarness(null); let probe;
  try {
    probe = await mountIcons(h);
    assert.equal(h.requests.length, 1, 'initial null native AppState permits the first identity request');
    await h.reply(h.requests.at(-1), [iconRow()]);
    assert.equal(probe.icons.get(subjectA).profileIconId, sentinel, 'initial icons can appear before native AppState reports active');
    await h.state('active');
    assert.equal(h.requests.length, 2, 'the native active event performs one foreground revalidation');
    await h.reply(h.requests.at(-1), [iconRow(subjectA, ranger)]);
    assert.equal(probe.icons.get(subjectA).profileIconId, ranger);
    await probe.close();
    assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0);
    console.log('PASS co-op initial null AppState: immediate first projection, native active revalidation, complete cleanup');
  } finally {await probe?.close(); h.restore();}
}

async function selectedArtworkAndFallbacks() {
  const h = makeHarness(); let tree;
  const cache = new Map(), watched = [];
  try {
    const theme = new Proxy({}, {get: () => '#4488cc'});
    h.mocks.set(path.join(app, 'src/online/PlayerBadgeProvider'), {useIdentityIcon: accountId => {watched.push(accountId); return accountId ? cache.get(accountId) : undefined;}});
    h.mocks.set(path.join(app, 'src/i18n/GameLanguageProvider'), {useGameLanguage: () => 'en'});
    h.mocks.set(path.join(app, 'src/i18n/visuals'), {visualText: (_language, text, params) => text.replace(/\{([^}]+)\}/g, (_, key) => String(params?.[key] ?? key))});
    h.mocks.set(path.join(app, 'src/theme/ThemeContext'), {useGameTheme: () => theme});
    h.mocks.set(path.join(app, 'src/components/GuildHeraldry'), {GuildBannerArtwork: 'GuildBannerArtwork'});
    const {IdentityArtwork} = h.load(path.join(app, 'src/components/SocialIdentity'));
    const {profilePortraitIcons, showcaseClassIcons} = h.load(path.join(app, 'src/theme/profile-icon-assets'));
    const {uiIcons} = h.load(path.join(app, 'src/theme/ui-icons'));
    async function render(props) {
      await act(async () => {const element = React.createElement(IdentityArtwork, {name: 'Player', ...props}); if (tree) tree.update(element); else tree = create(element);});
      return tree.root.findByType('Image').props.source;
    }
    for (const className of [undefined, null, 'UNKNOWN_CLASS']) {
      assert.strictEqual(await render({profileIconId: sentinel, className}), profilePortraitIcons[sentinel], 'selected icon renders without a recognized class');
    }
    for (const classId of [null, 'UNKNOWN_CLASS']) {
      cache.set(viewerA, {profile_icon_id: sentinel, class_id: classId});
      assert.strictEqual(await render({accountId: viewerA}), profilePortraitIcons[sentinel], 'cached public selection also renders without a recognized class');
    }
    cache.set(viewerA, {profile_icon_id: ranger, class_id: 'IRONWARDEN'});
    assert.strictEqual(await render({accountId: viewerA, profileIconId: null, className: 'DAWNKEEPER'}), showcaseClassIcons.DAWNKEEPER, 'explicit hidden icon uses the supplied class, not stale cached selection/class');
    assert.equal(watched.at(-1), undefined, 'explicit null bypasses the cached public identity lookup');
    assert.strictEqual(await render({accountId: viewerA, profileIconId: null}), uiIcons.account, 'hidden icon without an allowed class uses neutral artwork');
    assert.strictEqual(await render({accountId: viewerA, profileIconId: sentinel}), profilePortraitIcons[sentinel], 'explicit current selection wins over cached public identity');
    assert.equal(watched.at(-1), undefined);
    assert.strictEqual(await render({accountId: viewerA, guild: true, profileIconId: sentinel}), uiIcons.guild, 'guild identities keep guild artwork');
    assert.equal(watched.at(-1), undefined);
    const portrait = {uri: 'test-explicit-portrait'};
    assert.strictEqual(await render({accountId: viewerA, guild: true, profileIconId: sentinel, portrait}), portrait, 'explicit supplied portrait retains highest priority');
    assert.strictEqual(await render({profileIconId: 'unknown-icon', className: 'IRONWARDEN'}), showcaseClassIcons.IRONWARDEN, 'unknown artwork falls back to a valid class');
    assert.strictEqual(await render({profileIconId: 'unknown-icon', className: 'UNKNOWN_CLASS'}), uiIcons.account, 'unknown artwork and class fall back to a neutral identity');
    assert.strictEqual(await render({accountId: viewerA}), profilePortraitIcons[ranger], 'ordinary account identities still use the public selected icon');
    await act(async () => tree.unmount()); tree = null;
    assert.equal(h.requests.length, 0, 'artwork choice performs no direct server calls');
    console.log('PASS real IdentityArtwork: selected art without class, current/null override of cache, guild/custom-portrait precedence, class/neutral fallbacks');
  } finally {if (tree) await act(async () => tree.unmount()); h.restore();}
}

async function main() {
  await scopedRequestsAndRefresh();
  await scopeAccountAndRosterRaces();
  await backgroundAndFixtureLifecycle();
  await initialNullAppState();
  await selectedArtworkAndFallbacks();
}
main().catch(error => {console.error(error); process.exitCode = 1;});
