"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthSession = void 0;
exports.AuthSessionProvider = AuthSessionProvider;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const Linking = __importStar(require("expo-linking"));
const account_1 = require("./account");
const supabase_1 = require("./supabase");
const Context = (0, react_1.createContext)({ session: null, loading: true, error: '', recovering: false, clearRecovery: () => { } });
function AuthSessionProvider({ children }) {
    const [session, setSession] = (0, react_1.useState)(null), [loading, setLoading] = (0, react_1.useState)(true), [error, setError] = (0, react_1.useState)(''), [recovering, setRecovering] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        let alive = true, authChanged = false;
        const seen = new Set();
        const consume = async (url) => { if (seen.has(url))
            return; seen.add(url); try {
            await (0, account_1.completeMagicLink)(url);
        }
        catch (e) {
            seen.delete(url);
            if (alive) {
                const message = e instanceof Error ? e.message : 'Account link could not be verified.';
                setError(message);
                react_native_1.Alert.alert('Account link', message);
            }
        } };
        void supabase_1.supabase?.auth.getSession().then(({ data, error }) => { if (alive && !authChanged) {
            setSession(data.session);
            setError(error?.message ?? '');
            setLoading(false);
        } });
        if (!supabase_1.supabase)
            setLoading(false);
        const auth = supabase_1.supabase?.auth.onAuthStateChange((event, next) => { authChanged = true; if (alive) {
            setSession(next);
            setLoading(false);
            if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')
                setError('');
            if (event === 'PASSWORD_RECOVERY')
                setRecovering(true);
            if (event === 'SIGNED_OUT')
                setRecovering(false);
        } });
        void Linking.getInitialURL().then(url => { if (url)
            void consume(url); });
        const links = Linking.addEventListener('url', event => void consume(event.url));
        const refresh = () => { if (react_native_1.AppState.currentState === 'active')
            supabase_1.supabase?.auth.startAutoRefresh();
        else
            supabase_1.supabase?.auth.stopAutoRefresh(); };
        refresh();
        const foreground = react_native_1.AppState.addEventListener('change', refresh);
        return () => { alive = false; auth?.data.subscription.unsubscribe(); links.remove(); foreground.remove(); };
    }, []);
    return <Context.Provider value={{ session, loading, error, recovering, clearRecovery: () => setRecovering(false) }}>{children}</Context.Provider>;
}
const useAuthSession = () => (0, react_1.useContext)(Context);
exports.useAuthSession = useAuthSession;
