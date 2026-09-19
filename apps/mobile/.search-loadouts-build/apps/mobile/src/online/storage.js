"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadOnlineBank = loadOnlineBank;
exports.transferOnlineStorage = transferOnlineStorage;
exports.upgradeOnlineStorage = upgradeOnlineStorage;
const supabase_1 = require("./supabase");
function client() { if (!supabase_1.supabase)
    throw new Error('Online services are not configured in this build.'); return supabase_1.supabase; }
async function loadOnlineBank() {
    const { data, error } = await client().from('account_bank_items').select('id,item_id,quantity,stackable,bound,upgrade_rank,enchant_rank,rarity,source_character_id').order('item_id');
    if (error)
        throw error;
    return (data ?? []);
}
async function transferOnlineStorage(input) {
    const { data, error } = await client().rpc('transfer_storage_item', { p_character_id: input.characterId, p_item_row_id: input.itemRowId, p_quantity: input.quantity, p_direction: input.direction, p_idempotency_key: input.idempotencyKey });
    if (error)
        throw error;
    return data;
}
async function upgradeOnlineStorage(input) {
    const { data, error } = await client().rpc('upgrade_storage_capacity', { p_character_id: input.characterId, p_location: input.location, p_idempotency_key: input.idempotencyKey });
    if (error)
        throw error;
    return data;
}
