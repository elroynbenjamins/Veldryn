"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoopLiveLobby = CoopLiveLobby;
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("../GameButton");
const coop_client_1 = require("../../online/coop-client");
const coop_live_lobby_1 = require("../../core/coop-live-lobby");
const theme_1 = require("../../theme/theme");
/** Available only behind the internal Live lobby gate. Closing/backgrounding
 * stops heartbeats; the database owns expiry and ready acceptance deadlines. */
function CoopLiveLobby({ onBack }) {
    const [queue, setQueue] = (0, react_1.useState)(), [ready, setReady] = (0, react_1.useState)();
    const [notice, setNotice] = (0, react_1.useState)(''), [busy, setBusy] = (0, react_1.useState)(false), [pending, setPending] = (0, react_1.useState)(false);
    const mounted = (0, react_1.useRef)(true), refresh = (0, react_1.useRef)(async () => { });
    (0, react_1.useEffect)(() => {
        mounted.current = true;
        let stopped = false, inFlight = false, lastHeartbeat = 0;
        const update = async () => {
            if (stopped || inFlight || react_native_1.AppState.currentState !== 'active')
                return;
            inFlight = true;
            try {
                const next = await coop_client_1.coopClient.liveQueue();
                if (stopped)
                    return;
                setQueue(next);
                if (next.ticket?.status === 'queued' && Date.now() - lastHeartbeat >= 10000) {
                    lastHeartbeat = Date.now();
                    try {
                        await coop_client_1.coopClient.heartbeatLive(next.ticket.ticketId);
                    }
                    catch { /* A match may have reserved it after the poll. The next poll resolves that race. */ }
                }
                const current = next.ticket?.status === 'reserved' && next.ticket.reservationId ? await coop_client_1.coopClient.liveReady(next.ticket.reservationId) : undefined;
                const hasPending = await coop_client_1.coopClient.hasPending();
                if (!stopped) {
                    setReady(current);
                    setPending(hasPending);
                }
            }
            catch (error) {
                if (!stopped)
                    setNotice(error instanceof Error ? error.message : String(error));
            }
            finally {
                inFlight = false;
            }
        };
        refresh.current = update;
        void update();
        const timer = setInterval(() => void update(), 2500);
        const listener = react_native_1.AppState.addEventListener('change', status => { if (status === 'active')
            void update(); });
        return () => { stopped = true; mounted.current = false; clearInterval(timer); listener.remove(); };
    }, []);
    const act = async (work) => {
        if (busy)
            return;
        setBusy(true);
        setNotice('');
        try {
            await work();
            await refresh.current();
        }
        catch (error) {
            if (mounted.current)
                setNotice(error instanceof Error ? error.message : String(error));
        }
        finally {
            if (mounted.current) {
                setBusy(false);
                setPending(await coop_client_1.coopClient.hasPending().catch(() => false));
            }
        }
    };
    const self = ready?.members.find(row => row.self), status = ready?.status ?? queue?.ticket?.status;
    return <react_native_1.View style={{ flex: 1, padding: 16, gap: 12 }}>
  <react_native_1.Text accessibilityRole="header" style={{ color: theme_1.C.text, fontSize: 22 }}>Live dungeon party</react_native_1.Text>
  <react_native_1.Text style={{ color: theme_1.C.muted }}>1 Tank · 2 Damage · 1 Support</react_native_1.Text>
  {!!notice && <react_native_1.Text accessibilityRole="alert" style={{ color: theme_1.C.warning }}>{notice}</react_native_1.Text>}
  {pending && <GameButton_1.GameButton title="Retry pending action" disabled={busy} onPress={() => void act(() => coop_client_1.coopClient.retryPending())}/>}
  {!queue && <react_native_1.Text style={{ color: theme_1.C.text }}>Loading your saved queue…</react_native_1.Text>}
  {status === 'queued' && <react_native_1.Text style={{ color: theme_1.C.text }}>Searching for your party. Keep this screen open to stay in the queue.</react_native_1.Text>}
  {ready && <>
   <react_native_1.Text style={{ color: theme_1.C.text }}>{ready.status === 'open' ? `Ready check · ${(0, coop_live_lobby_1.readySecondsRemaining)(ready)} seconds` : ready.status === 'refilling' ? `Finding replacements · ${(0, coop_live_lobby_1.readySecondsRemaining)(ready)} seconds` : ready.status === 'committed' ? 'Your party is ready. Waiting for the dungeon to start.' : 'This ready check has ended.'}</react_native_1.Text>
   {ready.members.filter(member => ready.status !== 'refilling' || member.accepted).map(member => <react_native_1.Text key={member.characterId} style={{ color: theme_1.C.text }}>{member.role}{member.self ? ' · You' : ''} · {member.accepted ? 'Accepted' : 'Waiting'}</react_native_1.Text>)}
   {ready.status === 'open' && <>
    <GameButton_1.GameButton title={self?.accepted ? 'Accepted' : 'Accept party'} disabled={busy || pending || self?.accepted || (0, coop_live_lobby_1.readySecondsRemaining)(ready) === 0} onPress={() => void act(() => coop_client_1.coopClient.ready(ready.readyCheckId, { requestId: (0, coop_client_1.coopRequestId)(), rosterRevision: ready.rosterRevision, accept: true }))}/>
    <GameButton_1.GameButton title="Decline party" disabled={busy || pending} onPress={() => void act(() => coop_client_1.coopClient.ready(ready.readyCheckId, { requestId: (0, coop_client_1.coopRequestId)(), rosterRevision: ready.rosterRevision, accept: false }))}/>
   </>}
  </>}
  {status === 'queued' && queue?.ticket && <GameButton_1.GameButton title="Cancel search" disabled={busy || pending} onPress={() => void act(() => coop_client_1.coopClient.cancelLive(queue.ticket.ticketId))}/>}
  {['cancelled', 'expired'].includes(status ?? '') && <react_native_1.Text style={{ color: theme_1.C.text }}>Your search has ended. You can start a new search.</react_native_1.Text>}
  <GameButton_1.GameButton title="Back" tone="secondary" disabled={busy} onPress={onBack}/>
 </react_native_1.View>;
}
