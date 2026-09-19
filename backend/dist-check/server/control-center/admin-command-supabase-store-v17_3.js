"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAdminCommandStore = void 0;
const fail = (error) => { if (error)
    throw new Error(error.message); };
class SupabaseAdminCommandStore {
    db;
    constructor(db) {
        this.db = db;
    }
    async claim(limit) {
        const r = await this.db.rpc('claim_ops_admin_commands', { p_limit: limit });
        fail(r.error);
        const rows = r.data ?? [];
        if (rows.length) {
            await this.db.from('ops_admin_command_events').insert(rows.map(row => ({ command_id: row.id, event_type: 'processing', detail_json: { attempt: row.attempts } })));
        }
        return rows;
    }
    async succeeded(id, result) {
        const now = new Date().toISOString();
        const q = await this.db.from('ops_admin_commands').update({ status: 'succeeded', result_json: result, error_text: null, completed_at: now, locked_at: null, updated_at: now }).eq('id', id).select('*').single();
        fail(q.error);
        const e = await this.db.from('ops_admin_command_events').insert({ command_id: id, event_type: 'succeeded', detail_json: { summary: result.summary, reversal: result.reversal ?? null } });
        fail(e.error);
    }
    async retry(id, error, availableAt) {
        const now = new Date().toISOString();
        const q = await this.db.from('ops_admin_commands').update({ status: 'approved', error_text: error, available_at: availableAt, locked_at: null, updated_at: now }).eq('id', id).select('*').single();
        fail(q.error);
        const e = await this.db.from('ops_admin_command_events').insert({ command_id: id, event_type: 'retry_scheduled', detail_json: { error, availableAt } });
        fail(e.error);
    }
    async failed(id, error) {
        const now = new Date().toISOString();
        const q = await this.db.from('ops_admin_commands').update({ status: 'failed', error_text: error, completed_at: now, locked_at: null, updated_at: now }).eq('id', id).select('*').single();
        fail(q.error);
        const e = await this.db.from('ops_admin_command_events').insert({ command_id: id, event_type: 'failed', detail_json: { error } });
        fail(e.error);
    }
    async heartbeat(component, result) {
        const now = new Date().toISOString();
        const q = await this.db.from('liveops_runtime_health').update({ last_started_at: now, last_completed_at: now, last_ok_at: now, last_error: null, last_result_json: result, updated_at: now }).eq('component', component).select('*').single();
        if (q.error) {
            const i = await this.db.from('liveops_runtime_health').insert({ component, last_started_at: now, last_completed_at: now, last_ok_at: now, last_result_json: result, updated_at: now });
            fail(i.error);
        }
    }
    async heartbeatError(component, error) {
        const now = new Date().toISOString();
        const q = await this.db.from('liveops_runtime_health').update({ last_completed_at: now, last_error_at: now, last_error: error, updated_at: now }).eq('component', component).select('*').single();
        if (q.error) {
            const i = await this.db.from('liveops_runtime_health').insert({ component, last_completed_at: now, last_error_at: now, last_error: error, updated_at: now });
            fail(i.error);
        }
    }
}
exports.SupabaseAdminCommandStore = SupabaseAdminCommandStore;
