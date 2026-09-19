"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoopExpeditionScreen = CoopExpeditionScreen;
const react_1 = require("react");
const react_native_1 = require("react-native");
const CoopDungeonBrowser_1 = require("../components/coop/CoopDungeonBrowser");
const CoopLoadoutSelection_1 = require("../components/coop/CoopLoadoutSelection");
const CoopRunOverview_1 = require("../components/coop/CoopRunOverview");
const CoopLiveLobby_1 = require("../components/coop/CoopLiveLobby");
const coop_dungeon_browsing_1 = require("../core/coop-dungeon-browsing");
const coop_client_1 = require("../online/coop-client");
const coop_qmode_1 = require("../core/coop-qmode");
const coop_qmode_source_1 = require("../online/coop-qmode-source");
const supabase_1 = require("../online/supabase");
const GameButton_1 = require("../components/GameButton");
const theme_1 = require("../theme/theme");
const coop_entry_source_1 = require("../online/coop-entry-source");
const i18n_1 = require("../i18n");
const coop_event_expeditions_1 = require("../core/coop-event-expeditions");
function CoopExpeditionScreen({ onClose, language, state, entrySource = coop_entry_source_1.realCoopEntrySource }) {
    const [entry, setEntry] = (0, react_1.useState)();
    const [selected, setSelected] = (0, react_1.useState)();
    const [mode, setMode] = (0, react_1.useState)('qmode');
    const [tier, setTier] = (0, react_1.useState)();
    const [run, setRun] = (0, react_1.useState)();
    const [showLive, setShowLive] = (0, react_1.useState)(false);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)('');
    const [notice, setNotice] = (0, react_1.useState)('');
    const [showLoadouts, setShowLoadouts] = (0, react_1.useState)(false);
    const [busy, setBusy] = (0, react_1.useState)(false), [pending, setPending] = (0, react_1.useState)(false);
    const activeRunId = (0, react_1.useRef)(undefined);
    activeRunId.current = run?.runId;
    const [rewards, setRewards] = (0, react_1.useState)([]);
    const acceptRun = (0, react_1.useCallback)((projection) => { const next = (0, coop_qmode_1.presentQModeRun)(projection); setRun(current => current && current.runId === next.runId && (current.stateVersion ?? 0) > (next.stateVersion ?? 0) ? current : next); }, []);
    const refreshRun = (0, react_1.useCallback)(async (runId) => {
        const value = await coop_client_1.coopClient.run(runId);
        if (!('team' in value))
            throw new Error('Invalid run response.');
        if (activeRunId.current !== runId)
            return;
        const next = (0, coop_qmode_1.presentQModeRun)(value);
        setRun(current => current?.runId === runId && (current.stateVersion ?? 0) <= (next.stateVersion ?? 0) ? next : current);
        if (['completed', 'failed'].includes(next.phase)) {
            const items = await coop_client_1.coopClient.rewards(runId);
            if (activeRunId.current === runId)
                setRewards(items);
        }
    }, []);
    const action = async (work) => { if (busy)
        return; setBusy(true); setNotice(''); try {
        await work();
    }
    catch (reason) {
        setNotice(reason instanceof Error ? reason.message : String(reason));
    }
    finally {
        setBusy(false);
        if (entrySource.kind === 'real')
            setPending(await coop_client_1.coopClient.hasPending().catch(() => false));
    } };
    const load = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError('');
        try {
            const next = await entrySource.load();
            next.dungeons.forEach(source => (0, coop_dungeon_browsing_1.validateCoopDungeonView)((0, coop_dungeon_browsing_1.presentCoopDungeon)(source)));
            next.eventExpeditions?.forEach(coop_event_expeditions_1.validateCoopEventExpeditionPreview);
            setEntry(next);
        }
        catch (reason) {
            setEntry(undefined);
            setError(reason instanceof Error ? reason.message : String(reason));
        }
        finally {
            setLoading(false);
        }
    }, [entrySource]);
    (0, react_1.useEffect)(() => { void load(); }, [load]);
    (0, react_1.useEffect)(() => { let cancelled = false; if (coop_client_1.coopLiveReadyEnabled && entrySource.kind === 'real')
        void coop_client_1.coopClient.liveQueue().then(value => { if (!cancelled && value.ticket && ['queued', 'reserved'].includes(value.ticket.status))
            setShowLive(true); }).catch(() => { }); return () => { cancelled = true; }; }, [entrySource]);
    (0, react_1.useEffect)(() => { if (entrySource.kind === 'real')
        void coop_client_1.coopClient.hasPending().then(setPending).catch(() => { }); }, [entrySource]);
    (0, react_1.useEffect)(() => {
        const id = run?.runId;
        if (!id || entrySource.kind !== 'real')
            return;
        let stopped = false, inFlight = false;
        const update = async () => { if (stopped || inFlight)
            return; inFlight = true; try {
            await refreshRun(id);
        }
        catch (reason) {
            if (!stopped)
                setNotice(reason instanceof Error ? reason.message : String(reason));
        }
        finally {
            inFlight = false;
        } };
        void update();
        const timer = setInterval(() => void update(), 2500);
        const channel = supabase_1.supabase?.channel('coop-snapshot-' + id).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'coop_run_client_snapshots', filter: 'run_id=eq.' + id }, () => void update()).subscribe();
        return () => { stopped = true; clearInterval(timer); if (channel)
            void supabase_1.supabase?.removeChannel(channel); };
    }, [run?.runId, entrySource.kind, refreshRun]);
    (0, react_1.useEffect)(() => { if (!showLive && !showLoadouts && !selected && !run)
        return; const subscription = react_native_1.BackHandler.addEventListener('hardwareBackPress', () => { if (showLive) {
        onClose();
        return true;
    } if (run) {
        setRun(undefined);
        return true;
    } if (showLoadouts) {
        setShowLoadouts(false);
        setNotice('');
        return true;
    } if (selected) {
        setSelected(undefined);
        setNotice('');
        return true;
    } return false; }); return () => subscription.remove(); }, [showLive, showLoadouts, selected, run, onClose]);
    const dungeons = (0, react_1.useMemo)(() => (entry?.dungeons ?? []).map(coop_dungeon_browsing_1.presentCoopDungeon), [entry]);
    function chooseDungeon(dungeon) { setSelected(dungeon); setTier(dungeon.difficulties[0]); setNotice(''); }
    const retry = pending ? <GameButton_1.GameButton title="Retry pending co-op action" disabled={busy} onPress={() => void action(async () => { const value = await coop_client_1.coopClient.retryPending(); if (value && typeof value === 'object' && 'team' in value)
        acceptRun(value); await load(); })}/> : null;
    if (showLive)
        return <CoopLiveLobby_1.CoopLiveLobby onBack={onClose}/>;
    if (run)
        return <react_native_1.View style={{ flex: 1 }}>{retry}<CoopRunOverview_1.CoopRunOverview language={language} run={run} notice={notice} busy={busy} rewards={rewards} onBack={() => { setRun(undefined); setRewards([]); void load(); }} onRefresh={() => void action(() => refreshRun(run.runId))} onChoose={nodeId => void action(async () => { if (!run.decisionId || !run.decisionRevision)
            throw new Error('Refresh this run before choosing.'); acceptRun(await coop_client_1.coopClient.choose(run.runId, { requestId: (0, coop_client_1.coopRequestId)(), decisionId: run.decisionId, decisionRevision: run.decisionRevision, optionId: nodeId })); })} onClaim={id => void action(async () => { const reward = await coop_client_1.coopClient.claim(id); setNotice(`${reward.marks} Expedition Marks collected.`); await refreshRun(run.runId); })}/></react_native_1.View>;
    if (selected && showLoadouts && tier && state.character)
        return <react_native_1.View style={{ flex: 1 }}>{retry}<CoopLoadoutSelection_1.CoopLoadoutSelection state={state} language={language} dungeonId={selected.id} dungeonName={selected.name} tier={tier} mode={mode} loadouts={entry?.loadouts ?? []} notice={notice} refreshing={loading || busy} onBack={() => { setShowLoadouts(false); setNotice(''); }} onRefresh={() => void load()} onIntent={intent => void action(async () => { if (entrySource.kind !== 'real') {
            setNotice((0, i18n_1.clt)(language, 'intentOnly'));
            return;
        } if (intent.mode === 'live') {
            if (!coop_client_1.coopLiveReadyEnabled)
                throw new Error('Live matchmaking is not enabled yet.');
            await coop_client_1.coopClient.joinLive({ requestId: (0, coop_client_1.coopRequestId)(), dungeonId: intent.dungeonId, tier: intent.tier, characterId: intent.characterId, loadoutId: intent.loadoutId, loadoutRevision: intent.loadoutRevision });
            setShowLive(true);
            return;
        } const started = await coop_qmode_source_1.realCoopQModeSource.start(intent, (0, coop_client_1.coopRequestId)()); setRun(started.run); })}/></react_native_1.View>;
    if (selected)
        return <CoopDungeonBrowser_1.CoopDungeonDetails language={language} dungeon={selected} currentLevel={state.character?.level ?? 0} mode={mode} tier={tier} notice={notice} onBack={() => { setSelected(undefined); setNotice(''); }} onMode={next => { setMode(next); setNotice(''); }} onTier={next => { setTier(next); setNotice(''); }} onContinue={() => setShowLoadouts(true)}/>;
    return <react_native_1.View style={{ flex: 1 }}>{retry}{entrySource.kind === 'real' && entry?.gameVersion && <react_native_1.View style={{ padding: 12 }}><react_native_1.Text style={{ color: theme_1.C.muted }}>Sharing an Echo lets other players recruit a snapshot of your character for 24 hours.</react_native_1.Text><GameButton_1.GameButton title={entry.echoSharing ? 'Stop sharing my Echo' : 'Share my Echo'} disabled={busy} onPress={() => void action(async () => { await coop_client_1.coopClient.shareEcho(entry.gameVersion, !entry.echoSharing); await load(); })}/>{!!notice && <react_native_1.Text accessibilityRole="alert" style={{ color: theme_1.C.warning }}>{notice}</react_native_1.Text>}</react_native_1.View>}<CoopDungeonBrowser_1.CoopDungeonList language={language} dungeons={dungeons} eventExpeditions={entry?.eventExpeditions ?? []} loading={loading} error={error} activeRun={entry?.activeRun} onBack={onClose} onRetry={() => void load()} onSelect={chooseDungeon} onResume={() => { if (entry?.activeRun)
        setRun(entry.activeRun); }}/></react_native_1.View>;
}
