"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverGameplayEnabled = void 0;
exports.createOnlineGameRepository = createOnlineGameRepository;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const online_game_repository_1 = require("../core/online-game-repository");
const supabase_1 = require("./supabase");
exports.serverGameplayEnabled = process.env.EXPO_PUBLIC_SERVER_GAMEPLAY === 'true';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
function createOnlineGameRepository(accountId) {
    const pendingKey = `veldryn.online.pending.${accountId}`;
    async function request(body) {
        if (!supabase_1.supabase || !url || !key)
            throw new Error('Online services are not configured.');
        const { data: { session }, error } = await supabase_1.supabase.auth.getSession();
        if (error)
            throw error;
        if (!session || session.user.id !== accountId)
            throw new Error('Please sign in again.');
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 25000);
        try {
            const response = await fetch(`${url}/functions/v1/gameplay`, { method: body ? 'POST' : 'GET', signal: controller.signal, headers: { Authorization: `Bearer ${session.access_token}`, apikey: key, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
            const payload = await response.json();
            if (!response.ok)
                throw new online_game_repository_1.OnlineCommandError(payload.error ?? payload.message ?? 'Online service unavailable.', response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429);
            return payload;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    return new online_game_repository_1.OnlineGameRepository(accountId, { read: () => request(), send: request }, { read: async () => { const raw = await async_storage_1.default.getItem(pendingKey); return raw ? JSON.parse(raw) : null; }, write: async (value) => { if (value)
            await async_storage_1.default.setItem(pendingKey, JSON.stringify(value));
        else
            await async_storage_1.default.removeItem(pendingKey); } }, () => `game-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);
}
