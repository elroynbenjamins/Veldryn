"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeveloperTools = DeveloperTools;
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const Panel_1 = require("./Panel");
const items_1 = require("../content/items");
const monsters_1 = require("../content/monsters");
const novice_sets_1 = require("../content/novice-sets");
const debug_tools_1 = require("../dev/debug-tools");
const theme_1 = require("../theme/theme");
const debug_tools_2 = require("../dev/debug-tools");
const live_events_1 = require("../core/live-events");
function DeveloperTools({ state, onChange, onOpenChatPilot, onOpenCoopUiGallery }) {
    const [notice, setNotice] = (0, react_1.useState)('');
    const liveEvent = (0, live_events_1.eventLifecycle)(state);
    const simulate = (seconds) => { try {
        const samples = (0, debug_tools_2.debugCombatBalanceProbe)(state, seconds);
        console.log('[combat-balance]', JSON.stringify(samples, null, 2));
        setNotice(`Logged ${samples.length} combat simulation rows`);
    }
    catch (e) {
        setNotice(e instanceof Error ? e.message : 'Action failed');
    } };
    const run = (label, fn) => { try {
        onChange(fn(state));
        setNotice(`${label} applied`);
    }
    catch (e) {
        setNotice(e instanceof Error ? e.message : 'Action failed');
    } };
    const grantSet = () => { if (!state.character)
        return; let next = state; for (const slot of (0, novice_sets_1.noviceSetFor)(state.character.classId).slots)
        next = (0, debug_tools_1.debugAddItem)(next, (0, novice_sets_1.noviceItemId)(state.character.classId, slot)); onChange(next); setNotice('Complete novice set added'); };
    return <Panel_1.Panel><react_native_1.Text style={s.title}>Developer / testing</react_native_1.Text><react_native_1.Text style={s.warn}>Offline prototype only. These shortcuts persist to the local save and are not available to normal players or future server sessions.</react_native_1.Text><react_native_1.View style={s.grid}>
  {__DEV__ && onOpenChatPilot ? <GameButton_1.GameButton title="Open Chat Pilot" onPress={onOpenChatPilot}/> : null}
  {__DEV__ && onOpenCoopUiGallery ? <GameButton_1.GameButton title="Open Co-op UI Lab" onPress={onOpenCoopUiGallery}/> : null}
  <GameButton_1.GameButton title="Set character level 25" onPress={() => run('Level 25', s => (0, debug_tools_1.debugSetLevel)(s, 25))}/><GameButton_1.GameButton title="Set character level 100" onPress={() => run('Level 100', s => (0, debug_tools_1.debugSetLevel)(s, 100))}/>
  <GameButton_1.GameButton title="Log 1h combat balance" onPress={() => simulate(60 * 60)}/><GameButton_1.GameButton title="Log 4h combat balance" onPress={() => simulate(4 * 60 * 60)}/>
  <GameButton_1.GameButton title="Add 10,000 XP" onPress={() => run('XP', s => (0, debug_tools_1.debugAddXp)(s, 10000))}/><GameButton_1.GameButton title="Add 100,000 gold" onPress={() => run('Gold', s => (0, debug_tools_1.debugAddGold)(s, 100000))}/>
  <GameButton_1.GameButton title="Add 100 of every material" onPress={() => { let next = state; for (const i of items_1.ITEMS.filter(i => i.type === 'material'))
        next = (0, debug_tools_1.debugAddItem)(next, i.id, 100); onChange(next); setNotice('Materials added'); }}/>
  <GameButton_1.GameButton title="Add enhancement test kit" onPress={() => { let next = (0, debug_tools_1.debugAddGold)(state, 500000); for (const item of items_1.ITEMS.filter(item => item.type === 'gem'))
        next = (0, debug_tools_1.debugAddItem)(next, item.id, 5); next = (0, debug_tools_1.debugAddItem)(next, 'TEMPERING_DUST', 999); next = (0, debug_tools_1.debugAddItem)(next, 'TEMPERING_CORE', 99); onChange(next); setNotice('Gems and tempering resources added'); }}/>
  <GameButton_1.GameButton title="Grant complete novice set" onPress={grantSet}/><GameButton_1.GameButton title="Grant Aster-Iron gear" onPress={() => { let next = state; for (const id of ['ASTER_IRON_BLADE', 'ASTER_IRON_HELM', 'ASTER_IRON_CHEST', 'ASTER_IRON_LEGS', 'ASTER_IRON_BOOTS', 'ASTER_IRON_GLOVES', 'IRONWOOD_GUARD']) {
        try {
            next = (0, debug_tools_1.debugAddItem)(next, id);
        }
        catch { }
    } onChange(next); setNotice('Aster-Iron gear added'); }}/>
  <GameButton_1.GameButton title="Unlock all encounters" onPress={() => { let next = state; for (const m of monsters_1.MONSTERS)
        next = (0, debug_tools_1.debugUnlockMonster)(next, m.id); onChange(next); setNotice('All encounters unlocked'); }}/><GameButton_1.GameButton title="Advance activity 24 hours" onPress={() => run('Activity time', s => (0, debug_tools_1.debugAdvanceActivity)(s, 86400))}/>
  <GameButton_1.GameButton title="Defeat Fallen Knight" onPress={() => run('Boss defeat', debug_tools_1.debugDefeatFallenKnight)}/><GameButton_1.GameButton title="Max quest rewards" onPress={() => { onChange({ ...state, quests: state.quests.map(q => ({ ...q, status: 'complete', progress: Number.MAX_SAFE_INTEGER })) }); setNotice('Quest board completed'); }}/>
  <GameButton_1.GameButton title={liveEvent ? 'Disable live event' : 'Enable Harvestwake'} onPress={() => run(liveEvent ? 'Live event disabled' : 'Harvestwake enabled', s => (0, live_events_1.setLocalEventEnabled)(s, !(0, live_events_1.eventLifecycle)(s)))}/>
  <GameButton_1.GameButton title="Add 250 event marks" disabled={!(0, live_events_1.activeLiveEvent)(state)} onPress={() => { const event = (0, live_events_1.activeLiveEvent)(state); if (event)
        run('250 event marks', s => (0, live_events_1.applyEventDrops)(s, [{ eventId: event.definition.id, currencyId: event.definition.currencyId, name: event.definition.currencyName, quantity: 250 }])); }}/>
  <GameButton_1.GameButton title="Complete event contracts" disabled={!(0, live_events_1.activeLiveEvent)(state)} onPress={() => { const event = (0, live_events_1.activeLiveEvent)(state); if (event)
        run('Event contracts completed', s => ({ ...s, account: { ...s.account, eventActivityById: { ...(s.account.eventActivityById ?? {}), [event.definition.id]: { combat: 300, gathering: 180, crafting: 12, boss: 1 } } } })); }}/>
 </react_native_1.View>{notice ? <react_native_1.Text style={s.notice}>{notice}</react_native_1.Text> : null}</Panel_1.Panel>;
}
const s = react_native_1.StyleSheet.create({ title: { color: theme_1.C.text, fontSize: 18, fontWeight: '900' }, warn: { color: theme_1.C.muted, lineHeight: 20, marginTop: 6 }, grid: { gap: 8, marginTop: 12 }, notice: { color: theme_1.C.good, marginTop: 10, fontWeight: '700' } });
