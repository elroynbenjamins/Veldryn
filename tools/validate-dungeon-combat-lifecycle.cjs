// Runs real React combat components and replay helpers against deterministic
// timers and native-view mocks. No network, database, image decoding or installs.
// Run after installing apps/mobile dependencies:
//   node tools/validate-dungeon-combat-lifecycle.cjs
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

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}

function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return style;
}

function makeHarness({width = 390, reducedMotion = false, motionQuery} = {}) {
  let now = 0, timerSequence = 0;
  const timers = new Map(), loaded = new Map(), animations = [], values = [], accessibilityListeners = new Set();
  const size = {width, height: 844, fontScale: 1, scale: 1};
  const originals = {setTimeout, clearTimeout, setInterval, clearInterval, now: Date.now};
  global.setTimeout = (callback, delay = 0) => {
    const id = ++timerSequence;
    timers.set(id, {callback, due: now + delay, delay, interval: false});
    return id;
  };
  global.clearTimeout = id => timers.delete(id);
  global.setInterval = (callback, delay) => {
    const id = ++timerSequence;
    timers.set(id, {callback, due: now + delay, delay, interval: true});
    return id;
  };
  global.clearInterval = id => timers.delete(id);
  Date.now = () => now;

  class AnimatedValue {
    constructor(value) { this.value = value; this.animations = new Set(); values.push(this); }
    setValue(value) { this.value = value; }
    stopAnimation() { for (const animation of this.animations) animation.running = false; }
    interpolate(range) { return {animatedValue: this, ...range}; }
  }
  const timing = (value, config) => {
    const record = {value, config, started: false, running: false};
    animations.push(record);
    return {
      start() { record.started = true; record.running = true; value.animations.add(record); },
      stop() { record.running = false; }
    };
  };
  const group = children => ({start: () => children.forEach(child => child.start()), stop: () => children.forEach(child => child.stop())});
  const theme = new Proxy({dark: true}, {get: (target, key) => key in target ? target[key] : '#557799'});
  const tr = (text, params) => text.replace(/\{([^}]+)\}/g, (_, key) => String(params?.[key] ?? key));
  const native = {
    AccessibilityInfo: {
      isReduceMotionEnabled: () => motionQuery ?? Promise.resolve(reducedMotion),
      addEventListener: (_name, callback) => { accessibilityListeners.add(callback); return {remove: () => accessibilityListeners.delete(callback)}; }
    },
    Animated: {Value: AnimatedValue, timing, parallel: group, sequence: group, View: 'Animated.View', Text: 'Animated.Text'},
    Easing: {out: value => value, in: value => value, cubic: value => value, quad: value => value, linear: value => value},
    Pressable: 'Pressable', Text: 'Text', View: 'View', Image: 'Image',
    Platform: {OS: 'android', select: options => options.android ?? options.default},
    StyleSheet: {create: value => value, flatten: flattenStyle, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1},
    useWindowDimensions: () => size
  };
  const mocks = new Map([
    ['react', React], ['react-native', native],
    [path.join(app, 'src/i18n/social'), {useSocialText: () => tr}],
    [path.join(app, 'src/theme/useCoopStyles'), {useCoopStyles: makeStyles => ({colors: theme, styles: makeStyles(theme)})}],
    [path.join(app, 'src/theme/ThemeContext'), {useGameTheme: () => theme}],
    [path.join(app, 'src/theme/coop-ui-theme'), {coopTheme: () => theme, coopRadii: {panel: 12}}],
    [path.join(app, 'src/components/coop/CoopVisualKit'), {FantasyPanel: 'FantasyPanel', StateChip: 'StateChip'}],
    [path.join(app, 'src/components/coop/CombatantProfileCard'), {CombatantProfileCard: 'CombatantProfileCard', EnemyCombatProfileCard: 'EnemyCombatProfileCard'}],
    [path.join(app, 'src/components/coop/CombatantInspectPanel'), {CombatantInspectPanel: 'CombatantInspectPanel'}],
    [path.join(app, 'src/core/dungeon-combat-avatars'), {dungeonCombatAvatar: classId => ({label: classId})}],
    [path.join(app, 'src/content/combat-companions'), {combatCompanionDef: id => ({id, name: 'Lantern Wisp'})}],
    [path.join(app, 'src/theme/companion-art'), {companionArtSource: id => ({kind: 'companion', id})}],
    [path.join(app, 'src/theme/dungeon-combat-art'), {dungeonCombatPortraitSource: classId => ({kind: 'portrait', classId})}],
    [path.join(app, 'src/theme/dungeon-enemy-art'), {dungeonEnemyPortraitSource: name => ({kind: 'enemy', name})}],
    [path.join(app, 'src/components/SocialIdentity'), {IdentityArtwork: 'IdentityArtwork'}]
  ]);
  function load(file) {
    file = path.resolve(file);
    if (mocks.has(file)) return mocks.get(file);
    if (/\.(?:png|jpe?g|webp)$/.test(file)) return {uri: file};
    if (!path.extname(file)) file += fs.existsSync(file + '.tsx') ? '.tsx' : '.ts';
    if (loaded.has(file)) return loaded.get(file).exports;
    const module = {exports: {}};
    loaded.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}
    }).outputText;
    const localRequire = name => {
      if (mocks.has(name)) return mocks.get(name);
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
      return requireApp(name);
    };
    new Function('require', 'module', 'exports', '__filename', '__dirname', source)(localRequire, module, module.exports, file, path.dirname(file));
    return module.exports;
  }
  async function tick(duration) {
    const end = now + duration;
    let steps = 0;
    for (;;) {
      const next = [...timers.entries()].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      assert.ok(++steps < 1000, 'combat timers must remain finite');
      const [id, timer] = next;
      now = timer.due;
      if (timer.interval) timer.due += timer.delay; else timers.delete(id);
      await act(async () => { timer.callback(); });
    }
    now = end;
  }
  function nextDelay() { return Math.min(...[...timers.values()].map(timer => timer.due - now)); }
  function restore() {
    global.setTimeout = originals.setTimeout; global.clearTimeout = originals.clearTimeout;
    global.setInterval = originals.setInterval; global.clearInterval = originals.clearInterval; Date.now = originals.now;
  }
  return {load, mocks, native, size, timers, tick, nextDelay, animations, values, accessibilityListeners, restore};
}

function makeRun() {
  const members = [
    {id: 'p0', name: 'Tank', role: 'tank', classId: 'IRONWARDEN', hp: 1200},
    {id: 'p1', name: 'Wayfinder', role: 'damage', classId: 'WAYFINDER', hp: 900},
    {id: 'p2', name: 'Ravager', role: 'damage', classId: 'RAVAGER', hp: 920},
    {id: 'p3', name: 'Dawnkeeper', role: 'support', classId: 'DAWNKEEPER', hp: 850}
  ];
  const states = (bossHp, tankShield = 0, ravagerHp = 920) => [
    ...members.map(member => ({id: member.id, hp: member.id === 'p2' ? ravagerHp : member.hp, shield: member.id === 'p0' ? tankShield : 0})),
    {id: 'boss', hp: bossHp, shield: 0}
  ];
  return {
    runId: 'behavior-run', mode: 'qmode', phase: 'completed', syncedLevel: 35, options: [],
    roleSlots: members.map(member => ({memberId: member.id, name: member.name, role: member.role, classId: member.classId, echo: member.id !== 'p0', companionId: member.id === 'p1' ? 'UNIT_005' : undefined, currentHp: member.id === 'p2' ? 0 : member.hp, maximumHp: member.hp, ready: member.id !== 'p2'})),
    bossMechanic: {label: 'Black Lantern', summary: 'Interrupt the burst.', tone: 'mixed', telegraph: {bossName: 'The Hollow Regent', phases: [{id: 'phase2', label: 'Black Lantern', hpPct: 70, objectiveSensitive: false}], castAbilities: [{id: 'CAST', label: 'Gloam Burst', castMs: 6000, cooldownMs: 8000, interruptible: true, objectiveSensitive: false}], suppressedAbilities: []}},
    lastCombat: {
      nodeId: 'boss', reason: 'victory', durationMs: 12000,
      combatants: [...members.map(member => ({id: member.id, name: member.name, team: 'players', maxHp: member.hp, startHp: member.hp, startShield: 0, boss: false})), {id: 'boss', name: 'The Hollow Regent', team: 'enemies', maxHp: 6000, startHp: 6000, startShield: 0, boss: true}],
      contributions: members.map(member => ({id: member.id, damage: member.id === 'p1' ? 4800 : 600, healing: member.id === 'p3' ? 3900 : 0, damageTaken: 700, interrupts: member.id === 'p0' ? 1 : 0})),
      statuses: [{targetId: 'boss', sourceId: 'p1', kind: 'debuff', tag: 'damage_taken', label: 'Hex Curse', startsAtMs: 1000, expiresAtMs: 7000}, {targetId: 'p0', sourceId: 'p3', kind: 'hot', tag: 'hot', label: 'Dawn Renewal', startsAtMs: 1500, expiresAtMs: 7000}],
      cues: [
        {atMs: 0, type: 'action', actorId: 'p1', actorName: 'Wayfinder', targetId: 'boss', targetName: 'The Hollow Regent', actionKind: 'damage', abilityName: 'Basic Attack', amount: 200, states: states(5800)},
        {atMs: 2000, type: 'phase', actorId: 'boss', actorName: 'The Hollow Regent', abilityId: 'phase2', abilityName: 'Black Lantern', states: states(3800, 160)},
        {atMs: 4000, type: 'cast', actorId: 'boss', actorName: 'The Hollow Regent', targetId: 'p0', targetName: 'Tank', abilityId: 'CAST', abilityName: 'Gloam Burst', durationMs: 6000, states: states(3800, 160)},
        {atMs: 5000, type: 'assist', actorId: 'p1', actorName: 'Wayfinder', abilityId: 'p1:UNIT_005:assist', abilityName: 'Lantern Wisp: Lantern Snuff', states: states(3000, 60)},
        {atMs: 8500, type: 'down', targetId: 'p2', targetName: 'Ravager', states: states(2000, 0, 0)},
        {atMs: 12000, type: 'victory', states: states(0, 0, 0)}
      ]
    }
  };
}

function findButton(tree, label) {
  const matches = tree.root.findAllByType('Pressable').filter(node => node.props.accessibilityLabel === label);
  assert.equal(matches.length, 1, `expected one actual rendered control: ${label}`);
  return matches[0];
}
async function press(tree, label) {
  const button = findButton(tree, label);
  assert.ok(!button.props.disabled, `${label} must be enabled`);
  await act(async () => { button.props.onPress(); });
}
function enemy(tree) { return tree.root.findAllByType('EnemyCombatProfileCard')[0]; }
function currentCue(tree) { return enemy(tree).props.currentCue; }
function partyCard(tree, id) { return tree.root.findAllByType('CombatantProfileCard').find(node => node.props.slot.memberId === id); }
function text(tree) { return tree.root.findAllByType('Text').map(node => node.children.filter(child => typeof child === 'string' || typeof child === 'number').join('')).join('\n'); }

async function replayControlsAndTiming() {
  const h = makeHarness(); let tree;
  try {
    const run = makeRun(), cues = run.lastCombat.cues;
    h.load(path.join(app, 'src/core/coop-presentation')).validateCoopRunView(run);
    const timing = h.load(path.join(app, 'src/core/dungeon-combat-playback'));
    const {DungeonCombatStage} = h.load(path.join(app, 'src/components/coop/DungeonCombatStage'));
    await act(async () => { tree = create(React.createElement(DungeonCombatStage, {run, boss: true})); });
    assert.strictEqual(currentCue(tree), cues[0]);
    assert.equal(partyCard(tree, 'p2').props.slot.currentHp, 920, 'opening cue uses authoritative initial HP, not final run HP');
    assert.equal(partyCard(tree, 'p2').props.slot.ready, true);
    assert.equal(h.nextDelay(), timing.playbackAdvanceDelayMs(cues[0], cues[1], 1));
    await press(tree, 'Pause combat replay');
    assert.equal(h.timers.size, 0, 'pause cancels the pending automatic advance');
    await h.tick(10000); assert.strictEqual(currentCue(tree), cues[0]);
    await press(tree, 'Resume combat replay');
    const delay = timing.playbackAdvanceDelayMs(cues[0], cues[1], 1);
    await h.tick(delay - 1); assert.strictEqual(currentCue(tree), cues[0]);
    await h.tick(1); assert.strictEqual(currentCue(tree), cues[1]);
    assert.equal(enemy(tree).props.bossPhaseLabel, 'Black Lantern');
    assert.equal(partyCard(tree, 'p0').props.combatShield, 160);
    await press(tree, 'Combat replay speed 2 times');
    assert.equal(findButton(tree, 'Combat replay speed 2 times').props.accessibilityState.selected, true);
    assert.match(findButton(tree, 'Combat replay speed 2 times').findByType('Text').children.join(''), /✓/, 'selected speed also has a visible non-color indicator');
    assert.equal(h.timers.size, 1, 'changing speed replaces the advance timer');
    await h.tick(timing.playbackAdvanceDelayMs(cues[1], cues[2], 2));
    assert.strictEqual(currentCue(tree), cues[2]);
    assert.equal(enemy(tree).props.bossCast.targetLabel, 'Tank');
    assert.equal(enemy(tree).props.bossCast.interruptible, true);
    assert.equal(h.nextDelay(), timing.playbackAdvanceDelayMs(cues[2], cues[3], 2));
    assert.equal(h.animations.filter(item => item.started && item.config.useNativeDriver === false).at(-1).config.duration, timing.playbackCastDisplayMs(cues[2], 2), 'cast-bar animation uses the selected replay speed');
    await press(tree, 'Combat replay speed 4 times');
    const fastCast = timing.playbackAdvanceDelayMs(cues[2], cues[3], 4);
    assert.equal(h.nextDelay(), fastCast);
    await h.tick(fastCast - 1); assert.strictEqual(currentCue(tree), cues[2], 'fast replay preserves the readable boss-cast hold');
    await h.tick(1); assert.strictEqual(currentCue(tree), cues[3]);
    assert.equal(partyCard(tree, 'p1').props.assistProc, true, 'companion assist remains bound to its owner');
    assert.equal(partyCard(tree, 'p0').props.assistProc, false);
    await press(tree, 'Skip combat replay to result');
    assert.strictEqual(currentCue(tree), cues[5]); assert.equal(enemy(tree).props.currentHp, 0);
    assert.equal(partyCard(tree, 'p2').props.slot.ready, false);
    assert.equal(h.timers.size, 0, 'skip cancels replay scheduling');
    assert.match(text(tree), /PARTY CONTRIBUTION/);
    await press(tree, 'Show combat battle log');
    assert.equal(findButton(tree, 'Hide combat battle log').props.accessibilityState.expanded, true);
    await press(tree, 'Replay combat recap');
    assert.strictEqual(currentCue(tree), cues[0]);
    findButton(tree, 'Pause combat replay');
    await h.tick(10000);
    assert.strictEqual(currentCue(tree), cues[5]);
    assert.equal(findButton(tree, 'Show combat battle log').props.accessibilityState.expanded, false, 'replaying through completion resets the expanded recap log');
    await act(async () => { tree.unmount(); }); tree = null;
    assert.equal(h.timers.size, 0);
    assert.equal(h.animations.filter(item => item.running).length, 0, 'unmount stops stage-owned animations');
    console.log('PASS dungeon replay controls: pause/resume, speed timers and cast hold, skip/replay, authoritative HP/shield/assist/outcome, cleanup');
  } finally { if (tree) await act(async () => tree.unmount()); h.restore(); }
}

async function inspectionAndStepping() {
  const h = makeHarness(); let tree;
  try {
    const run = makeRun(), cues = run.lastCombat.cues;
    run.roleSlots[0] = {...run.roleSlots[0], profileIconId: 'starter:armored-sentinel', iconClassId: 'RAVAGER'};
    h.mocks.delete(path.join(app, 'src/components/coop/CombatantInspectPanel'));
    const {CombatantInspectPanel} = h.load(path.join(app, 'src/components/coop/CombatantInspectPanel'));
    const {DungeonCombatStage} = h.load(path.join(app, 'src/components/coop/DungeonCombatStage'));
    await act(async () => { tree = create(React.createElement(DungeonCombatStage, {run, boss: true})); });
    await act(async () => { partyCard(tree, 'p0').props.onPress(); });
    assert.equal(h.timers.size, 0, 'opening inspection pauses automatic replay');
    assert.equal(tree.root.findByType(CombatantInspectPanel).props.target.name, 'Tank');
    assert.equal(tree.root.findByType('IdentityArtwork').props.profileIconId, 'starter:armored-sentinel');
    assert.equal(tree.root.findByType('IdentityArtwork').props.className, 'RAVAGER');
    assert.equal(tree.root.findByType(CombatantInspectPanel).props.target.classId, 'IRONWARDEN', 'profile class never replaces the run snapshot class');
    const close = findButton(tree, 'Close combat details'), closeStyle = flattenStyle(close.props.style({pressed: false}));
    assert.ok(closeStyle.minHeight >= 44 && closeStyle.minWidth >= 44, 'inspection close retains a full-size touch target');
    assert.equal(findButton(tree, 'Previous combat event').props.disabled, true);
    assert.equal(findButton(tree, 'Previous combat event').props.accessibilityState.disabled, true);
    await act(async () => { findButton(tree, 'Previous combat event').props.onPress(); });
    assert.strictEqual(currentCue(tree), cues[0], 'previous handler clamps even when invoked at the first event');
    await press(tree, 'Next combat event');
    assert.strictEqual(currentCue(tree), cues[1]);
    let target = tree.root.findByType(CombatantInspectPanel).props.target;
    assert.equal(target.shield, 160); assert.equal(target.statuses[0].label, 'Dawn Renewal'); assert.equal(target.statuses[0].remainingMs, 5000);
    const refreshedIdentity = {...run, roleSlots: run.roleSlots.map(slot => slot.memberId === 'p0' ? {...slot, profileIconId: 'creature:IRONWOOD_WOLF'} : slot)};
    await act(async () => { tree.update(React.createElement(DungeonCombatStage, {run: refreshedIdentity, boss: true})); });
    assert.strictEqual(currentCue(tree), cues[1], 'refreshing cosmetic identity keeps the current replay event');
    assert.equal(h.timers.size, 0, 'refreshing cosmetics cannot resume paused playback');
    assert.equal(tree.root.findByType('IdentityArtwork').props.profileIconId, 'creature:IRONWOOD_WOLF', 'open inspection receives the refreshed icon');
    assert.equal(tree.root.findByType(CombatantInspectPanel).props.target.shield, 160, 'cosmetic refresh keeps replay-time combat details');
    await press(tree, 'Next combat event');
    await act(async () => { enemy(tree).props.onPress(); });
    target = tree.root.findByType(CombatantInspectPanel).props.target;
    assert.equal(target.kind, 'enemy'); assert.equal(target.currentHp, 3800);
    assert.equal(tree.root.findAllByType('IdentityArtwork').length, 0, 'enemy inspection never reuses the selected player icon');
    assert.equal(target.cast.targetLabel, 'Tank'); assert.equal(target.cast.interruptible, true);
    assert.equal(target.statuses[0].label, 'Hex Curse'); assert.equal(target.statuses[0].remainingMs, 3000);
    for (let index = 3; index <= 5; index++) await press(tree, 'Next combat event');
    assert.strictEqual(currentCue(tree), cues[5]);
    assert.equal(findButton(tree, 'Next combat event').props.disabled, true);
    assert.equal(findButton(tree, 'Next combat event').props.accessibilityState.disabled, true);
    await act(async () => { findButton(tree, 'Next combat event').props.onPress(); });
    assert.strictEqual(currentCue(tree), cues[5], 'next handler clamps at the authoritative final event');
    await press(tree, 'Previous combat event');
    assert.strictEqual(currentCue(tree), cues[4]);
    await act(async () => { partyCard(tree, 'p2').props.onPress(); });
    assert.equal(tree.root.findByType(CombatantInspectPanel).props.target.currentHp, 0);
    await press(tree, 'Close combat details');
    assert.equal(tree.root.findAllByType(CombatantInspectPanel).length, 0);
    findButton(tree, 'Resume combat replay'); assert.equal(h.timers.size, 0, 'closing inspection does not unexpectedly resume playback');
    await press(tree, 'Resume combat replay');
    await h.tick(h.nextDelay()); assert.strictEqual(currentCue(tree), cues[5]);
    await act(async () => { enemy(tree).props.onPress(); });
    findButton(tree, 'Previous combat event');
    await press(tree, 'Previous combat event'); assert.strictEqual(currentCue(tree), cues[4], 'inspection from the result can step back into replay');
    const nextRun = makeRun(); nextRun.runId = 'new-run';
    await act(async () => { tree.update(React.createElement(DungeonCombatStage, {run: nextRun, boss: true})); });
    assert.strictEqual(currentCue(tree), nextRun.lastCombat.cues[0], 'new encounter clears old cursor');
    assert.equal(tree.root.findAllByType(CombatantInspectPanel).length, 0, 'new encounter clears old inspection');
    await act(async () => { tree.unmount(); }); tree = null;
    assert.equal(h.timers.size, 0);
    console.log('PASS dungeon inspection: pause, bounded stepping, replay-time status/HP/cast details, result inspection, new-run reset');
  } finally { if (tree) await act(async () => tree.unmount()); h.restore(); }
}

async function reducedMotionAndUnmount() {
  const h = makeHarness({reducedMotion: true}); let tree;
  try {
    const run = makeRun();
    const {DungeonCombatStage} = h.load(path.join(app, 'src/components/coop/DungeonCombatStage'));
    await act(async () => { tree = create(React.createElement(DungeonCombatStage, {run, boss: true})); });
    assert.strictEqual(currentCue(tree), run.lastCombat.cues.at(-1), 'reduced motion starts at the authoritative outcome');
    assert.equal(h.timers.size, 0);
    for (const card of [...tree.root.findAllByType('CombatantProfileCard'), ...tree.root.findAllByType('EnemyCombatProfileCard')]) {
      assert.equal(card.props.animateHealth, false); assert.equal(card.props.motionStyle, undefined);
    }
    await act(async () => { enemy(tree).props.onPress(); });
    assert.equal(tree.root.findByType('CombatantInspectPanel').props.target.currentHp, 0);
    await h.tick(10000); assert.strictEqual(currentCue(tree), run.lastCombat.cues.at(-1));
    assert.equal(h.animations.filter(item => item.running).length, 0, 'reduced-motion state stops stage-owned animation');
    await act(async () => { tree.unmount(); }); tree = null;
    assert.equal(h.accessibilityListeners.size, 0);
  } finally { if (tree) await act(async () => tree.unmount()); h.restore(); }

  const pending = deferred(), delayed = makeHarness({motionQuery: pending.promise}); let waiting;
  try {
    const {DungeonCombatStage} = delayed.load(path.join(app, 'src/components/coop/DungeonCombatStage'));
    await act(async () => { waiting = create(React.createElement(DungeonCombatStage, {run: makeRun(), boss: true})); });
    await act(async () => { waiting.unmount(); }); waiting = null;
    const before = delayed.animations.length;
    await act(async () => { pending.resolve(true); });
    assert.equal(delayed.animations.length, before, 'late accessibility response cannot restart an unmounted replay');
    assert.equal(delayed.timers.size, 0);
    assert.equal(delayed.animations.filter(item => item.running).length, 0);
  } finally { if (waiting) await act(async () => waiting.unmount()); delayed.restore(); }

  const failedQuery = deferred(), fallback = makeHarness({motionQuery: failedQuery.promise}); let recovering;
  try {
    const run = makeRun(), {DungeonCombatStage} = fallback.load(path.join(app, 'src/components/coop/DungeonCombatStage'));
    await act(async () => { recovering = create(React.createElement(DungeonCombatStage, {run, boss: true})); });
    await act(async () => { failedQuery.reject(new Error('Native accessibility service unavailable')); });
    assert.strictEqual(currentCue(recovering), run.lastCombat.cues[0]);
    findButton(recovering, 'Pause combat replay');
    await fallback.tick(fallback.nextDelay());
    assert.strictEqual(currentCue(recovering), run.lastCombat.cues[1], 'failed accessibility lookup retains normal controllable playback');
    await act(async () => { recovering.unmount(); }); recovering = null;
    assert.equal(fallback.timers.size, 0);
    console.log('PASS dungeon reduced motion: static outcome, inspection, cleanup, late response and native-query failure recovery');
  } finally { if (recovering) await act(async () => recovering.unmount()); fallback.restore(); }
}

async function responsiveCardContract() {
  const h = makeHarness(); let tree;
  try {
    const run = makeRun();
    run.roleSlots[1] = {...run.roleSlots[1], profileIconId: 'creature:IRONWOOD_WOLF', iconClassId: 'HEXWEAVER'};
    const {DungeonCombatStage} = h.load(path.join(app, 'src/components/coop/DungeonCombatStage'));
    const {dungeonCombatLayout} = h.load(path.join(app, 'src/core/dungeon-combat-layout'));
    await act(async () => { tree = create(React.createElement(DungeonCombatStage, {run, boss: true})); });
    await press(tree, 'Pause combat replay');
    for (const width of [320, 360, 390]) {
      h.size.width = width;
      await act(async () => { tree.update(React.createElement(DungeonCombatStage, {run, boss: true})); });
      const expected = dungeonCombatLayout(width), cards = tree.root.findAllByType('CombatantProfileCard');
      assert.equal(cards.length, 4);
      for (const card of cards) {
        assert.deepEqual(card.props.layout, expected, `viewport ${width} must reach cards without fixed portrait/scene overrides`);
        const slot = flattenStyle(card.parent.props.style), field = flattenStyle(card.parent.parent.props.style);
        assert.ok(parseFloat(slot.width) > 40 && parseFloat(slot.width) <= 50, 'party cards retain intentional two-column staging');
        assert.equal(field.flexWrap, 'wrap'); assert.equal(field.flexDirection, 'row');
      }
      assert.equal(enemy(tree).props.statusLimit, expected.statusLimit);
      assert.strictEqual(currentCue(tree), run.lastCombat.cues[0], 'responsive re-render must preserve the paused cursor');
      for (const label of ['Combat replay speed 1 times', 'Combat replay speed 2 times', 'Combat replay speed 4 times', 'Resume combat replay', 'Previous combat event', 'Next combat event', 'Skip combat replay to result']) {
        const control = findButton(tree, label), style = typeof control.props.style === 'function' ? control.props.style({pressed: false}) : control.props.style;
        assert.ok(flattenStyle(style).minHeight >= 44, `${label} retains a usable touch height at width ${width}`);
      }
      const controls = flattenStyle(findButton(tree, 'Combat replay speed 1 times').parent.parent.props.style);
      if (expected.controlsWrap) assert.equal(controls.flexWrap, 'wrap', 'narrow phone playback controls wrap instead of overflowing');
    }
    await act(async () => { tree.unmount(); }); tree = null;
    h.mocks.delete(path.join(app, 'src/components/coop/CombatantProfileCard'));
    const {CombatantProfileCard} = h.load(path.join(app, 'src/components/coop/CombatantProfileCard'));
    for (const width of [320, 360, 390]) {
      h.size.width = width; h.size.fontScale = 1;
      const layout = dungeonCombatLayout(width);
      await act(async () => { tree = create(React.createElement(CombatantProfileCard, {slot: run.roleSlots[1], layout, animateHealth: false})); });
      const cardRoot = tree.root.findAllByType('Animated.View')[0], portrait = tree.root.findAllByType('Image').find(node => node.props.source?.kind === 'portrait');
      assert.equal(flattenStyle(cardRoot.props.style).minHeight, layout.cardMinHeight, 'actual card uses responsive minimum height');
      assert.equal(flattenStyle(portrait.props.style).width, layout.portraitWidth, 'actual portrait uses responsive width');
      assert.equal(flattenStyle(portrait.props.style).height, layout.portraitHeight, 'actual portrait uses responsive height');
      assert.equal(flattenStyle(portrait.parent.props.style).height, layout.sceneHeight, 'actual scene uses responsive height');
      assert.equal(portrait.props.source.classId, 'WAYFINDER', 'selected cosmetics never replace the canonical combat class artwork');
      assert.equal(tree.root.findByType('IdentityArtwork').props.profileIconId, 'creature:IRONWOOD_WOLF');
      assert.equal(tree.root.findByType('IdentityArtwork').props.className, 'HEXWEAVER');
      assert.ok(!text(tree).includes('ASSIST PROC'), 'idle companion badge does not claim an assist proc');
      await act(async () => { tree.update(React.createElement(CombatantProfileCard, {slot: run.roleSlots[1], layout, animateHealth: false, assistProc: true})); });
      assert.ok(text(tree).includes('ASSIST PROC'), 'actual card renders readable companion proc feedback');
      h.size.fontScale = 1.5;
      await act(async () => { tree.update(React.createElement(CombatantProfileCard, {slot: run.roleSlots[1], layout, animateHealth: false})); });
      const identity = tree.root.findByType('IdentityArtwork'), head = flattenStyle(identity.parent.props.style), plate = flattenStyle(identity.parent.parent.props.style);
      const namedText = label => tree.root.findAllByType('Text').find(node => node.children.join('') === label);
      const role = namedText('DAMAGE'), name = namedText('Wayfinder'), className = namedText('WAYFINDER'), echo = namedText('ECHO');
      const identityBottom = plate.top + identity.props.size + head.gap + flattenStyle(role.props.style).lineHeight * 1.5 + plate.gap * 2 + (flattenStyle(name.props.style).lineHeight + flattenStyle(className.props.style).lineHeight) * 1.5;
      assert.equal(head.flexDirection, 'column', 'enlarged role text has the full identity-column width');
      assert.ok(identityBottom <= flattenStyle(portrait.parent.props.style).height, '150% identity text fits inside the scene at every phone width');
      assert.equal(name.parent, identity.parent.parent, 'the player name keeps the full identity-column width');
      assert.ok(!portrait.parent.findAllByType('Text').includes(echo), 'Echo label is outside the companion/portrait scene');
      assert.equal(flattenStyle(echo.props.style).fontSize, 10, 'Echo label retains its readable size');
      assert.equal(flattenStyle(echo.parent.parent.props.style).flexWrap, 'wrap', 'Echo/level metadata wraps with enlarged text');
      assert.equal(tree.root.findAllByType('Image').find(node => node.props.source?.kind === 'companion').props.source.id, 'UNIT_005');
      await act(async () => { tree.unmount(); }); tree = null;
    }
    console.log('PASS dungeon responsive rendering: 320/360/390 widths, 100%/150% text, separate selected identity and class artwork, readable Echo/companion presentation');
  } finally { if (tree) await act(async () => tree.unmount()); h.restore(); }
}

async function dungeonRosterIdentityRendering() {
  const h = makeHarness(); let tree;
  try {
    h.native.ScrollView = 'ScrollView'; h.native.ActivityIndicator = 'ActivityIndicator';
    h.mocks.set(path.join(app, 'src/theme/coop-ui-theme'), {...h.mocks.get(path.join(app, 'src/theme/coop-ui-theme')), coopSpacing: {xs: 4, sm: 8, md: 12, lg: 16}, coopTypography: {meta: {}, section: {}, body: {}}});
    h.mocks.set(path.join(app, 'src/theme/coop-ui-assets'), {coopUiAssets: {role_tank: {kind: 'role', role: 'tank'}, role_damage: {kind: 'role', role: 'damage'}, role_support: {kind: 'role', role: 'support'}}});
    h.mocks.set(path.join(app, 'src/components/coop/CoopVisualKit'), {FantasyPanel: 'FantasyPanel', StateChip: 'StateChip', PrimaryAction: 'PrimaryAction', RoleBadge: 'RoleBadge', ExpeditionScreenShell: 'ExpeditionScreenShell', CoopImageSlot: 'CoopImageSlot'});
    h.mocks.set(path.join(app, 'src/i18n'), {ct: (_language, key) => key, t: (_language, key) => key});
    for (const name of ['GameButton', 'GameTextInput']) h.mocks.set(path.join(app, 'src/components', name), {[name]: name});
    for (const name of ['CoopPartyChat', 'SeasonalBossTelegraphPanel', 'DungeonCombatStage']) h.mocks.set(path.join(app, 'src/components/coop', name), {[name]: name});
    const {CoopLiveLobbyView} = h.load(path.join(app, 'src/components/coop/CoopLobbyPresentation'));
    const noop = () => {}, callbacks = {onBack: noop, onRetry: noop, onRetryPending: noop, onCancel: noop, onAccept: noop, onDecline: noop};
    const ready = {readyCheckId: 'ready', rosterRevision: 1, status: 'open', closesAtMs: 30000, refillEndsAtMs: 60000, serverNow: 0, members: [{characterId: 'self', role: 'tank', self: true, accepted: true}, {characterId: 'other', role: 'damage', self: false, accepted: false, profileIconId: 'starter:hooded-ranger', iconClassId: 'WAYFINDER'}]};
    await act(async () => { tree = create(React.createElement(CoopLiveLobbyView, {...callbacks, ready, selfPortrait: {kind: 'self'}})); });
    assert.deepEqual(tree.root.findAllByType('IdentityArtwork').map(node => node.props.profileIconId), ['starter:hooded-ranger'], 'only an actual disclosed ready member receives the remote icon');
    assert.equal(tree.root.findAllByType('Image').filter(node => node.props.source?.kind === 'self').length, 1, 'local selected portrait remains visible');
    assert.equal(tree.root.findAllByType('Image').filter(node => node.props.source?.kind === 'role').length, 4, 'self/remote role badges and both empty-role placeholders remain');
    await h.tick(1500);
    assert.ok(text(tree).includes('29s'), 'ready countdown advances from the server clock');
    const refreshedReady = {...ready, members: ready.members.map(member => member.self ? member : {...member, profileIconId: 'creature:IRONWOOD_WOLF'})};
    await act(async () => { tree.update(React.createElement(CoopLiveLobbyView, {...callbacks, ready: refreshedReady, selfPortrait: {kind: 'self'}})); });
    assert.ok(text(tree).includes('29s'), 'an icon-only refresh cannot rewind the ready countdown');
    await h.tick(1000);
    await act(async () => { tree.update(React.createElement(CoopLiveLobbyView, {...callbacks, ready: {...refreshedReady}, busy: true, notice: 'Checking party', selfPortrait: {kind: 'self'}})); });
    assert.ok(text(tree).includes('28s'), 'unrelated screen changes retain elapsed ready time');
    await act(async () => { tree.update(React.createElement(CoopLiveLobbyView, {...callbacks, ready: {...refreshedReady, serverNow: 10000}, selfPortrait: {kind: 'self'}})); });
    assert.ok(text(tree).includes('20s'), 'a new authoritative server clock rebases the countdown');
    await act(async () => { tree.update(React.createElement(CoopLiveLobbyView, {...callbacks, ready: {...ready, status: 'refilling'}, selfPortrait: {kind: 'self'}})); });
    assert.equal(tree.root.findAllByType('IdentityArtwork').length, 0, 'a departed member icon does not remain on a waiting refill slot');
    await act(async () => { tree.unmount(); }); tree = null;

    const {CoopLiveRecruitmentBoard} = h.load(path.join(app, 'src/components/coop/CoopLiveRecruitmentBoard'));
    const post = {id: 'post', dungeonId: 'EXP_001', ownerName: 'Public owner', role: 'support', maxTier: 2, note: '', createdAtMs: 0, expiresAtMs: 60000, mine: false, profileIconId: 'starter:dawn-priestess', iconClassId: 'DAWNKEEPER'};
    await act(async () => { tree = create(React.createElement(CoopLiveRecruitmentBoard, {posts: [post], dungeons: [], nowMs: 0, onQuickMatch: noop, onJoin: noop, onPublish: noop, onCloseMine: noop, onRefresh: noop})); });
    assert.equal(tree.root.findByType('IdentityArtwork').props.name, post.ownerName);
    assert.equal(tree.root.findByType('IdentityArtwork').props.profileIconId, post.profileIconId);
    await act(async () => { tree.unmount(); }); tree = null;

    const {CoopRunOverview} = h.load(path.join(app, 'src/components/coop/CoopRunOverview'));
    const run = makeRun(); run.phase = 'awaiting_choice'; delete run.lastCombat; delete run.bossMechanic;
    run.roleSlots[1] = {...run.roleSlots[1], profileIconId: 'creature:IRONWOOD_WOLF', iconClassId: 'HEXWEAVER'};
    await act(async () => { tree = create(React.createElement(CoopRunOverview, {language: 'en', run, onBack: noop})); });
    const identities = tree.root.findAllByType('IdentityArtwork');
    assert.deepEqual(identities.map(node => node.props.name), run.roleSlots.map(slot => slot.name), 'the noncombat roster keeps each selected icon with its own player');
    assert.equal(identities[1].props.profileIconId, 'creature:IRONWOOD_WOLF');
    assert.equal(identities[1].props.className, 'HEXWEAVER');
    assert.ok(text(tree).includes('WAYFINDER'), 'roster class text still comes from the frozen run loadout');
    await act(async () => { tree.unmount(); }); tree = null;
    assert.equal(h.timers.size, 0);
    console.log('PASS dungeon roster identities: ready members, waiting/refill placeholders, local portrait, LFG owner and Echo run overview');
  } finally { if (tree) await act(async () => tree.unmount()); h.restore(); }
}

async function main() {
  await replayControlsAndTiming();
  await inspectionAndStepping();
  await reducedMotionAndUnmount();
  await responsiveCardContract();
  await dungeonRosterIdentityRendering();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
