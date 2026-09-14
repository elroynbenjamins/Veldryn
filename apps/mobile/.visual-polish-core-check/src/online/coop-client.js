"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coopClient = exports.coopOnlineConfigured = exports.coopRogueliteEnabled = void 0;
const supabase_1 = require("./supabase");
const apiBase = process.env.EXPO_PUBLIC_COOP_API_URL?.replace(/\/$/, '');
exports.coopRogueliteEnabled = process.env.EXPO_PUBLIC_COOP_ROGUELITE_V1 === 'true';
exports.coopOnlineConfigured = Boolean(exports.coopRogueliteEnabled && apiBase && supabase_1.supabase);
async function request(path, method = 'GET', body) {
    if (!supabase_1.supabase || !apiBase)
        throw new Error('Co-op server is not configured.');
    const session = (await supabase_1.supabase.auth.getSession()).data.session;
    if (!session)
        throw new Error('Sign in to use co-op expeditions.');
    const response = await fetch(`${apiBase}${path}`, { method, headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok)
        throw new Error(payload?.message ?? payload?.code ?? 'Co-op request failed.');
    return payload;
}
exports.coopClient = {
    entry: () => request('/coop/entry'),
    start: (mode, body) => request(mode === 'qmode' ? '/coop/qmode' : '/coop/queue', 'POST', body),
    run: (runId) => request(`/coop/runs/${runId}`),
    choose: (runId, body) => request(`/coop/runs/${runId}/choose`, 'POST', body),
    vote: (runId, body) => request(`/coop/runs/${runId}/vote`, 'POST', body),
    ready: (checkId, body) => request(`/coop/ready/${checkId}`, 'POST', body),
    chat: (partyId, text) => request(`/coop/parties/${partyId}/chat`, 'POST', { requestId: `chat-${Date.now()}`, text }),
};
