"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildVeldrynAdminHandlers = buildVeldrynAdminHandlers;
const region_content_admin_v21_1 = require("../content/region-content-admin-v21");
const req = (c, key) => { const v = c.parameters_json[key]; if (v === undefined || v === null || v === '')
    throw new Error(`invalid_${key}`); return v; };
const account = (c) => { if (!c.target_account_id)
    throw new Error('invalid_target_account'); return c.target_account_id; };
const character = (c) => { if (!c.target_character_id)
    throw new Error('invalid_target_character'); return c.target_character_id; };
const target = (c) => ({ ...(c.target_account_id ? { accountId: c.target_account_id } : {}), ...(c.target_character_id ? { characterId: c.target_character_id } : {}) });
const out = (summary, r, reversal) => ({ summary, detail: { before: r.before ?? null, after: r.after ?? null, ...(r.detail ?? {}) }, ...(reversal ? { reversal } : {}) });
function buildVeldrynAdminHandlers(domain) {
    const handlers = {
        'account.force_logout': async (c, x) => { await domain.forceLogout(account(c), x.idempotencyKey); return { summary: 'Sessions invalidated' }; },
        'account.schedule_deletion': async (c, x) => out('Account deletion scheduled', await domain.scheduleAccountDeletion(account(c), Number(req(c, 'graceHours')), x.idempotencyKey), { commandKey: 'account.cancel_deletion', parameters: {} }),
        'account.cancel_deletion': async (c, x) => out('Scheduled deletion cancelled', await domain.cancelAccountDeletion(account(c), x.idempotencyKey)),
        'moderation.chat_mute': async (c, x) => out('Chat mute applied', await domain.muteChat(account(c), Number(req(c, 'durationMinutes')), String(req(c, 'moderationCode')), x.idempotencyKey), { commandKey: 'moderation.chat_unmute', parameters: {} }),
        'moderation.chat_unmute': async (c, x) => out('Chat mute removed', await domain.unmuteChat(account(c), x.idempotencyKey)),
        'moderation.chat_message_hide': async (c, x) => out('Chat message hidden', await domain.hideChatMessage(String(req(c, 'messageId')), String(req(c, 'moderationCode')), x.idempotencyKey), { commandKey: 'moderation.chat_message_restore', parameters: { messageId: String(req(c, 'messageId')) } }),
        'moderation.chat_message_restore': async (c, x) => out('Chat message restored', await domain.restoreChatMessage(String(req(c, 'messageId')), x.idempotencyKey), { commandKey: 'moderation.chat_message_hide', parameters: { messageId: String(req(c, 'messageId')), moderationCode: 'other' } }),
        'moderation.suspend': async (c, x) => out('Account suspended', await domain.suspendAccount(account(c), Number(req(c, 'durationMinutes')), String(req(c, 'moderationCode')), x.idempotencyKey), { commandKey: 'moderation.unsuspend', parameters: {} }),
        'moderation.unsuspend': async (c, x) => out('Account suspension removed', await domain.unsuspendAccount(account(c), x.idempotencyKey)),
        'character.rename': async (c, x) => { const r = await domain.renameCharacter(character(c), String(req(c, 'newName')), x.idempotencyKey); const old = String(r.before?.name || ''); return out('Character renamed', r, old ? { commandKey: 'character.rename', parameters: { newName: old } } : undefined); },
        'economy.gold_adjust': async (c, x) => { const amount = Number(req(c, 'amount')); return out('Gold adjusted', await domain.adjustGold(target(c), amount, x.idempotencyKey), { commandKey: 'economy.gold_adjust', parameters: { amount: -amount } }); },
        'economy.gold_set': async (c, x) => { const balance = Number(req(c, 'balance')), r = await domain.setGold(target(c), balance, x.idempotencyKey), before = Number(r.before?.balance); return out('Gold balance repaired', r, Number.isFinite(before) ? { commandKey: 'economy.gold_set', parameters: { balance: before } } : undefined); },
        'economy.currency_adjust': async (c, x) => { const amount = Number(req(c, 'amount')), currencyId = String(req(c, 'currencyId')); return out('Currency adjusted', await domain.adjustCurrency(account(c), currencyId, amount, x.idempotencyKey), { commandKey: 'economy.currency_adjust', parameters: { currencyId, amount: -amount } }); },
        'economy.currency_set': async (c, x) => { const currencyId = String(req(c, 'currencyId')), balance = Number(req(c, 'balance')), r = await domain.setCurrency(account(c), currencyId, balance, x.idempotencyKey), before = Number(r.before?.balance); return out('Currency balance repaired', r, Number.isFinite(before) ? { commandKey: 'economy.currency_set', parameters: { currencyId, balance: before } } : undefined); },
        'economy.premium_currency_adjust': async (c, x) => { const amount = Number(req(c, 'amount')), currencyId = String(req(c, 'currencyId')), externalReference = String(req(c, 'externalReference')); return out('Premium currency adjusted', await domain.adjustPremiumCurrency(account(c), currencyId, amount, externalReference, x.idempotencyKey), { commandKey: 'economy.premium_currency_adjust', parameters: { currencyId, amount: -amount, externalReference: `reversal:${externalReference}` } }); },
        'inventory.item_adjust': async (c, x) => { const quantityDelta = Number(req(c, 'quantityDelta')), itemId = String(req(c, 'itemId')), bound = Boolean(c.parameters_json.bound); return out('Inventory adjusted', await domain.adjustItem(character(c), itemId, quantityDelta, bound, x.idempotencyKey), { commandKey: 'inventory.item_adjust', parameters: { itemId, quantityDelta: -quantityDelta, bound } }); },
        'inventory.item_set': async (c, x) => { const quantity = Number(req(c, 'quantity')), itemId = String(req(c, 'itemId')), bound = Boolean(c.parameters_json.bound), r = await domain.setItemQuantity(character(c), itemId, quantity, bound, x.idempotencyKey), before = Number(r.before?.quantity); return out('Inventory quantity repaired', r, Number.isFinite(before) ? { commandKey: 'inventory.item_set', parameters: { itemId, quantity: before, bound } } : undefined); },
        'rewards.grant_bundle': async (c, x) => out('Reward bundle granted', await domain.grantRewardBundle(account(c), String(req(c, 'bundleId')), Number(req(c, 'quantity')), x.idempotencyKey)),
        'rewards.reissue_claim': async (c, x) => out('Reward claim recovery processed', await domain.reissueRewardClaim(account(c), String(req(c, 'claimId')), x.idempotencyKey)),
        'progression.skill_xp_adjust': async (c, x) => { const skillId = String(req(c, 'skillId')), xpDelta = Number(req(c, 'xpDelta')); return out('Skill XP adjusted', await domain.adjustSkillXp(character(c), skillId, xpDelta, x.idempotencyKey), { commandKey: 'progression.skill_xp_adjust', parameters: { skillId, xpDelta: -xpDelta } }); },
        'progression.skill_xp_set': async (c, x) => { const skillId = String(req(c, 'skillId')), xp = Number(req(c, 'xp')), r = await domain.setSkillXp(character(c), skillId, xp, x.idempotencyKey), before = Number(r.before?.xp); return out('Skill XP set', r, Number.isFinite(before) ? { commandKey: 'progression.skill_xp_set', parameters: { skillId, xp: before } } : undefined); },
        'progression.recalculate_totals': async (c, x) => out('Derived progression recalculated', await domain.recalculateProgression(account(c), x.idempotencyKey)),
        'progression.cancel_stuck_activity': async (c, x) => out('Stuck activity cancelled safely', await domain.cancelStuckActivity(character(c), String(req(c, 'activityId')), x.idempotencyKey)),
        'entitlement.grant_override': async (c, x) => out('Entitlement override granted', await domain.grantEntitlementOverride(account(c), String(req(c, 'entitlementId')), c.parameters_json.expiresAt ? String(c.parameters_json.expiresAt) : null, String(req(c, 'externalReference')), x.idempotencyKey), { commandKey: 'entitlement.revoke_override', parameters: { entitlementId: String(req(c, 'entitlementId')) } }),
        'entitlement.revoke_override': async (c, x) => out('Entitlement override revoked', await domain.revokeEntitlementOverride(account(c), String(req(c, 'entitlementId')), x.idempotencyKey)),
        'collectible.grant': async (c, x) => out('Collectible granted', await domain.grantCollectible(target(c), String(req(c, 'collectibleType')), String(req(c, 'collectibleId')), x.idempotencyKey), { commandKey: 'collectible.revoke', parameters: { collectibleType: String(req(c, 'collectibleType')), collectibleId: String(req(c, 'collectibleId')) } }),
        'collectible.revoke': async (c, x) => out('Collectible revoked', await domain.revokeCollectible(target(c), String(req(c, 'collectibleType')), String(req(c, 'collectibleId')), x.idempotencyKey), { commandKey: 'collectible.grant', parameters: { collectibleType: String(req(c, 'collectibleType')), collectibleId: String(req(c, 'collectibleId')) } }),
        'companion.grant': async (c, x) => out('Companion granted', await domain.grantCompanion(account(c), String(req(c, 'companionId')), x.idempotencyKey)),
        'companion.revoke': async (c, x) => out('Companion revoked', await domain.revokeCompanion(account(c), String(req(c, 'companionInstanceId')), x.idempotencyKey)),
        'companion.xp_adjust': async (c, x) => { const xpDelta = Number(req(c, 'xpDelta')), id = String(req(c, 'companionInstanceId')); return out('Companion XP adjusted', await domain.adjustCompanionXp(account(c), id, xpDelta, x.idempotencyKey), { commandKey: 'companion.xp_adjust', parameters: { companionInstanceId: id, xpDelta: -xpDelta } }); },
        'companion.xp_set': async (c, x) => { const xp = Number(req(c, 'xp')), id = String(req(c, 'companionInstanceId')), r = await domain.setCompanionXp(account(c), id, xp, x.idempotencyKey), before = Number(r.before?.xp); return out('Companion XP repaired', r, Number.isFinite(before) ? { commandKey: 'companion.xp_set', parameters: { companionInstanceId: id, xp: before } } : undefined); },
        'social.party_remove_member': async (c, x) => out('Party membership repaired', await domain.removePartyMember(account(c), String(req(c, 'partyId')), x.idempotencyKey)),
        'social.party_disband': async (c, x) => out('Party disbanded', await domain.disbandParty(String(req(c, 'partyId')), x.idempotencyKey)),
        'social.party_rename': async (c, x) => { const partyId = String(req(c, 'partyId')), r = await domain.renameParty(partyId, String(req(c, 'newName')), x.idempotencyKey), old = String(r.before?.name || ''); return out('Party renamed', r, old ? { commandKey: 'social.party_rename', parameters: { partyId, newName: old } } : undefined); },
        'social.guild_remove_member': async (c, x) => out('Guild membership repaired', await domain.removeGuildMember(account(c), String(req(c, 'guildId')), x.idempotencyKey)),
        'social.guild_transfer_leader': async (c, x) => out('Guild leadership transferred', await domain.transferGuildLeader(account(c), String(req(c, 'guildId')), x.idempotencyKey)),
        'social.guild_disband': async (c, x) => out('Guild disbanded', await domain.disbandGuild(String(req(c, 'guildId')), x.idempotencyKey)),
        'social.guild_rename': async (c, x) => { const guildId = String(req(c, 'guildId')), r = await domain.renameGuild(guildId, String(req(c, 'newName')), x.idempotencyKey), old = String(r.before?.name || ''); return out('Guild renamed', r, old ? { commandKey: 'social.guild_rename', parameters: { guildId, newName: old } } : undefined); },
        'dungeon.cancel_stuck_run': async (c, x) => out('Dungeon run cancelled/recovered', await domain.cancelDungeonRun(target(c), String(req(c, 'runId')), Boolean(c.parameters_json.refundEntry), x.idempotencyKey)),
        'dungeon.release_queue': async (c, x) => out('Dungeon queue reservation released', await domain.releaseDungeonQueue(account(c), String(req(c, 'queueId')), x.idempotencyKey)),
        'system.sync_content_catalog': async (c, x) => out('Admin content catalog synchronized', await domain.syncAdminContentCatalog(x.idempotencyKey)),
    };
    if (domain.regionContent) {
        const regionContent = domain.regionContent;
        const activate = async (c, x) => {
            const regionId = String(req(c, 'regionId')), contentVersion = String(req(c, 'contentVersion'));
            const result = await (0, region_content_admin_v21_1.activateRegionContentVersionV21)(regionContent, { regionId, contentVersion });
            return { summary: 'Region content version activated', detail: { regionId, ...result }, reversal: result.previous ? { commandKey: 'region_content.activate_version', parameters: { regionId, contentVersion: result.previous } } : undefined };
        };
        handlers['region_content.activate_version'] = activate;
        handlers['region_content.rollback_active_version'] = activate;
    }
    return handlers;
}
