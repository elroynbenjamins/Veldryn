"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOnlineGame = useOnlineGame;
const react_1 = require("react");
const react_native_1 = require("react-native");
const AuthSessionProvider_1 = require("./AuthSessionProvider");
const gameplay_1 = require("./gameplay");
function useOnlineGame() {
    const { session } = (0, AuthSessionProvider_1.useAuthSession)(), accountId = session?.user.id;
    const repo = (0, react_1.useMemo)(() => gameplay_1.serverGameplayEnabled && accountId ? (0, gameplay_1.createOnlineGameRepository)(accountId) : null, [accountId]);
    const active = (0, react_1.useRef)(repo);
    active.current = repo;
    const [snapshot, setSnapshot] = (0, react_1.useState)(null), [loading, setLoading] = (0, react_1.useState)(false), [busy, setBusy] = (0, react_1.useState)(false), [error, setError] = (0, react_1.useState)(''), [pending, setPending] = (0, react_1.useState)(false);
    const refresh = (0, react_1.useCallback)(async () => { if (!repo)
        return; try {
        const next = await repo.refresh();
        if (active.current === repo) {
            setSnapshot(next);
            setPending(await repo.hasPending());
            setError('');
        }
    }
    catch (e) {
        if (active.current === repo)
            setError(e instanceof Error ? e.message : 'Online service unavailable.');
    } }, [repo]);
    (0, react_1.useEffect)(() => { setSnapshot(null); setError(''); setPending(false); setBusy(false); setLoading(Boolean(repo)); if (!repo)
        return; void refresh().finally(() => { if (active.current === repo)
        setLoading(false); }); }, [repo, refresh]);
    (0, react_1.useEffect)(() => { const sub = react_native_1.AppState.addEventListener('change', next => { if (next === 'active')
        void refresh(); }); return () => sub.remove(); }, [refresh]);
    const execute = async (command) => { if (!repo)
        throw new Error('Sign in before playing online.'); setBusy(true); setError(''); try {
        const next = await repo.execute(command);
        if (active.current !== repo)
            throw new Error('Account changed while saving.');
        setSnapshot(next);
        setPending(false);
        return next;
    }
    catch (e) {
        if (active.current === repo) {
            setPending(await repo.hasPending());
            if (repo.snapshot)
                setSnapshot(repo.snapshot);
            setError(e instanceof Error ? e.message : 'Unable to save. Retry the pending action.');
        }
        throw e;
    }
    finally {
        if (active.current === repo)
            setBusy(false);
    } };
    return { snapshot: snapshot?.accountId === accountId ? snapshot : null, loading, busy, error, pending, refresh, execute };
}
