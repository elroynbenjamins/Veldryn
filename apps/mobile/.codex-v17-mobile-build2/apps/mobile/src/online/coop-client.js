"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.coopClient = exports.coopRequestId = exports.coopLiveReadyEnabled = exports.coopOnlineConfigured = exports.coopRogueliteEnabled = void 0;
const supabase_1 = require("./supabase");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const coop_command_journal_1 = require("../core/coop-command-journal");
const apiBase = process.env.EXPO_PUBLIC_COOP_API_URL?.replace(/\/$/, '');
exports.coopRogueliteEnabled = process.env.EXPO_PUBLIC_COOP_ROGUELITE_V1 === 'true';
exports.coopOnlineConfigured = Boolean(exports.coopRogueliteEnabled && apiBase && supabase_1.supabase);
// Internal lobby validation only; keep off until Live run/recovery gates pass.
exports.coopLiveReadyEnabled = process.env.EXPO_PUBLIC_COOP_LIVE_READY_V1 === 'true';
async function request(path, method = 'GET', body, expectedAccount) {
    if (!supabase_1.supabase || !apiBase || !exports.coopOnlineConfigured)
        throw new Error('Co-op server is not configured.');
    const session = (await supabase_1.supabase.auth.getSession()).data.session;
    if (!session)
        throw new Error('Sign in to use co-op expeditions.');
    if (expectedAccount && session.user.id !== expectedAccount)
        throw new Error('Please sign in again.');
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 25000);
    try {
        const response = await fetch(`${apiBase}${path}`, { method, signal: controller.signal, headers: { Authorization: `Bearer ${session.access_token}`, apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
        const payload = await response.json();
        if ((await supabase_1.supabase.auth.getSession()).data.session?.user.id !== session.user.id)
            throw new Error('Account changed.');
        if (!response.ok)
            throw new coop_command_journal_1.CoopRequestError(payload?.error ?? payload?.message ?? payload?.code ?? 'Co-op request failed.', response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status));
        return payload;
    }
    finally {
        clearTimeout(timeout);
    }
}
const journals = new Map();
async function journal() {
    const accountId = (await supabase_1.supabase?.auth.getSession())?.data.session?.user.id;
    if (!accountId)
        throw new Error('Sign in to use co-op expeditions.');
    let value = journals.get(accountId);
    if (!value) {
        const key = `veldryn.coop.pending.${accountId}`;
        value = new coop_command_journal_1.CoopCommandJournal({ read: async () => { const raw = await async_storage_1.default.getItem(key); return raw ? JSON.parse(raw) : null; }, write: async (command) => { if (command)
                await async_storage_1.default.setItem(key, JSON.stringify(command));
            else
                await async_storage_1.default.removeItem(key); } }, command => request(command.path, 'POST', command.body, accountId));
        journals.set(accountId, value);
    }
    return value;
}
const mutate = async (path, body) => (await (await journal()).execute({ path, body: body }));
const coopRequestId = () => `coop-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
exports.coopRequestId = coopRequestId;
exports.coopClient = {
    entry: () => request('/coop/entry'),
    liveQueue: () => request('/coop/queue'),
    joinLive: (body) => mutate('/coop/queue', body),
    heartbeatLive: (ticketId) => request(`/coop/queue/${ticketId}/heartbeat`, 'POST', { requestId: (0, exports.coopRequestId)() }),
    cancelLive: (ticketId) => mutate(`/coop/queue/${ticketId}/cancel`, { requestId: (0, exports.coopRequestId)() }),
    liveReady: (checkId) => request(`/coop/ready/${checkId}`),
    start: (mode, body) => mutate(mode === 'qmode' ? '/coop/qmode' : '/coop/queue', body),
    run: (runId) => request(`/coop/runs/${runId}`),
    choose: (runId, body) => mutate(`/coop/runs/${runId}/choose`, body),
    vote: (runId, body) => mutate(`/coop/runs/${runId}/vote`, body),
    ready: (checkId, body) => mutate(`/coop/ready/${checkId}`, body),
    chat: (partyId, text) => request(`/coop/parties/${partyId}/chat`, 'POST', { requestId: `chat-${Date.now()}`, text }),
    hasPending: async () => (await journal()).pending(),
    retryPending: async () => (await journal()).execute(),
    shareEcho: (expectedVersion, share) => mutate('/coop/echo', { requestId: (0, exports.coopRequestId)(), expectedVersion, share }),
    rewards: async (runId) => { if (!supabase_1.supabase)
        throw new Error('Sign in first.'); const { data, error } = await supabase_1.supabase.from('coop_reward_entitlements').select('id,claimed_at,reward_json').eq('run_id', runId); if (error)
        throw error; return data ?? []; },
    claim: async (id) => { if (!supabase_1.supabase)
        throw new Error('Sign in first.'); const { data, error } = await supabase_1.supabase.rpc('claim_coop_reward', { p_entitlement_id: id, p_request_id: (0, exports.coopRequestId)() }); if (error)
        throw error; return data; },
};
