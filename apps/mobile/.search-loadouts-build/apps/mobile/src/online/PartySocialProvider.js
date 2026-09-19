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
exports.PartySocialProvider = PartySocialProvider;
exports.usePartySocial = usePartySocial;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const party_social_1 = require("./party-social");
const supabase_1 = require("./supabase");
const empty = { party: null, contracts: [], serverTime: '' };
const Context = (0, react_1.createContext)({ ...empty, accountId: '', characterId: null, error: '', loading: false, refresh: async () => { } });
function PartySocialProvider({ children }) {
    const [state, setState] = (0, react_1.useState)({ ...empty, accountId: '', characterId: null, error: '', loading: true });
    const generation = (0, react_1.useRef)(0);
    const refresh = (0, react_1.useCallback)(async () => {
        const current = ++generation.current;
        if (!supabase_1.supabase) {
            setState({ ...empty, accountId: '', characterId: null, error: 'Online services are not configured.', loading: false });
            return;
        }
        try {
            const identity = await (0, party_social_1.partySocialIdentity)();
            const snapshot = identity ? await (0, party_social_1.partySocialSnapshot)() : empty;
            if (current === generation.current)
                setState({ ...snapshot, accountId: identity?.accountId ?? '', characterId: identity?.characterId ?? null, error: '', loading: false });
        }
        catch (error) {
            if (current === generation.current)
                setState(previous => ({ ...previous, ...empty, error: error instanceof Error ? error.message : 'Social service unavailable.', loading: false }));
        }
    }, []);
    (0, react_1.useEffect)(() => {
        void refresh();
        const timer = setInterval(() => { if (react_native_1.AppState.currentState === 'active')
            void refresh(); }, 15000);
        const foreground = react_native_1.AppState.addEventListener('change', next => { if (next === 'active')
            void refresh();
        else {
            generation.current++;
            setState(previous => ({ ...previous, ...empty }));
        } });
        const auth = supabase_1.supabase?.auth.onAuthStateChange(() => { generation.current++; setState({ ...empty, accountId: '', characterId: null, error: '', loading: true }); setTimeout(() => void refresh(), 0); });
        return () => { generation.current++; clearInterval(timer); foreground.remove(); auth?.data.subscription.unsubscribe(); };
    }, [refresh]);
    return <Context.Provider value={{ ...state, refresh }}>{children}</Context.Provider>;
}
function usePartySocial() { return (0, react_1.useContext)(Context); }
