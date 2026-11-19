"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncSupportAccount = syncSupportAccount;
async function syncSupportAccount(repo, input) {
    await repo.upsertSupportAccount({ account_id: input.accountId, public_player_id: input.publicPlayerId ?? null, display_name: input.displayName ?? null, primary_character_id: input.primaryCharacterId ?? null, account_created_at: input.accountCreatedAt ?? null, last_seen_at: input.lastSeenAt ?? new Date().toISOString(), tags: input.tags ?? [], metadata_json: input.metadata ?? {}, updated_at: new Date().toISOString() });
}
