"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchActiveEventRuntime = fetchActiveEventRuntime;
const supabase_1 = require("./supabase");
/** Reads only the server's public active-event window; reward settlement remains server-authoritative online. */
async function fetchActiveEventRuntime(nowMs = Date.now()) {
    if (!supabase_1.supabase)
        return undefined;
    const { data, error } = await supabase_1.supabase.rpc('visible_live_events');
    if (error)
        throw error;
    const row = data?.[0];
    if (!row)
        return undefined;
    return { eventId: row.event_id, enabled: true, startsAtMs: row.starts_at ? Date.parse(row.starts_at) : nowMs - 60_000, endsAtMs: row.ends_at ? Date.parse(row.ends_at) : nowMs + 86400_000 };
}
