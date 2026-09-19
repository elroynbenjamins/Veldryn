"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCharacterProfile = syncCharacterProfile;
const gameplay_1 = require("./gameplay");
const supabase_1 = require("./supabase");
/** Compatibility entry point: refresh server-owned identity, never upload local progression. */
async function syncCharacterProfile(_local) {
    if (!supabase_1.supabase)
        throw new Error('Online services are not configured.');
    const { data: { user }, error } = await supabase_1.supabase.auth.getUser();
    if (error)
        throw error;
    if (!user)
        throw new Error('Sign in first.');
    const state = await (0, gameplay_1.createOnlineGameRepository)(user.id).load();
    if (!state.character)
        throw new Error('Create your online character first. Local save progress is kept separately.');
    return { characterName: state.character.name };
}
