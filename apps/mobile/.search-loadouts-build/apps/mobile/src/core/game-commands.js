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
exports.validateGameCommand = validateGameCommand;
exports.validateGameSettings = validateGameSettings;
exports.executeGameCommand = executeGameCommand;
const game = __importStar(require("./game"));
const events = __importStar(require("./live-events"));
const equipment_enhancement_1 = require("./equipment-enhancement");
const character_skins_1 = require("./character-skins");
const playability_1 = require("./playability");
const languages_1 = require("../i18n/languages");
const quick_navigation_1 = require("./quick-navigation");
const companions = __importStar(require("./combat-companions"));
const class_skills_1 = require("./class-skills");
const faith_1 = require("./faith");
const companion_runtime_1 = require("./companion-runtime");
const account_actions_1 = require("./account-actions");
const classes_1 = require("../content/classes");
const fields = {
    class_training: [], class_focus: ['focus'], faith_practice: ['tierId', 'count'], faith_blessing: ['id'], faith_favorite: ['id', 'enabled'], faith_hide: ['enabled'], alchemy_start: ['id', 'batches'],
    companion_monthly: ['id'], companion_supplies: [], companion_bond_reward: ['id'], companion_boss_rematch: [],
    companion_equip: ['id'], companion_unequip: [], companion_level: ['id'], companion_ascend: ['id'], companion_master: ['id'], companion_upgrade: ['id'], companion_training: [], companion_essence: [],
    companion_trial_start: ['ids', 'floor'], companion_trial_floor: ['id', 'floor'], companion_trial_abandon: ['id'], companion_assignment_start: ['id', 'ids'], companion_assignment_claim: ['id'], companion_technique: ['id', 'technique'], companion_codex: ['id'], companion_showcase: ['id', 'ids'], companion_weekly: ['id'], companion_special: ['id', 'ids'],
    create: ['classId', 'name', 'body'], claim: [], start: ['kind', 'id'], explore: ['id'], stop: [], travel: ['id'], boss: [], craft: ['id'], use_potion: ['id'], discard_preparation: [],
    roster_create: ['classId', 'name', 'body'], roster_switch: ['id'],
    equip: ['id'], unequip: ['slot'], food: ['id'], eat: ['id'], sell: ['id', 'quantity'], salvage: ['id'],
    deposit: ['id', 'quantity'], withdraw: ['id', 'quantity'], deposit_materials: [], storage: ['location'], overflow: [],
    equip_tool: ['id'], equip_set: [], upgrade: ['id'], socket: ['id', 'gemId'], unsocket: ['id', 'index'], skin: ['id'],
    quest: ['id'], seasonal: ['period', 'id'], settings: ['settings'], profile: ['profileTitle', 'profileBackgroundId', 'profileBorderId', 'selectedCosmeticPetId'],
    event_daily: [], event_cache: [], event_milestones: [], event_discovery: ['id'], event_reward: ['id'], event_accept: ['id'],
    event_objective: ['id'], event_weekly: ['id'], event_project: ['id'], event_contribute: ['quantity'], event_community: ['percent'], event_purchase: ['id'],
};
function validateGameCommand(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('invalid_command');
    const row = value;
    if (Object.keys(row).some(key => key !== 'type' && key !== 'args') || typeof row.type !== 'string' || !Object.prototype.hasOwnProperty.call(fields, row.type))
        throw new Error('invalid_command');
    const args = row.args ?? {};
    if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some(key => !fields[row.type].includes(key)))
        throw new Error('invalid_command_arguments');
    if (row.type === 'create' || row.type === 'roster_create') {
        const creation = args;
        oneOf(creation.classId, classes_1.CLASSES.map(item => item.id));
        oneOf(creation.body ?? 'male', ['male', 'female']);
    }
    if (row.type === 'roster_switch' && typeof args.id !== 'string')
        throw new Error('invalid_id');
    return { type: row.type, args: args };
}
function text(args, key, max = 100) { const value = args[key]; if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`invalid_${key}`); return value.trim(); }
function integer(args, key, min = 1, max = 100000) { const value = args[key]; if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw new Error(`invalid_${key}`); return value; }
function oneOf(value, choices) { if (typeof value !== 'string' || !choices.includes(value))
    throw new Error('invalid_choice'); return value; }
function validateGameSettings(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('invalid_settings');
    const row = value;
    const keys = Object.keys(game.newGame(0).settings);
    if (Object.keys(row).some(key => !keys.includes(key)))
        throw new Error('invalid_settings');
    const defaults = game.newGame(0).settings, result = { ...defaults, ...row };
    oneOf(result.language, languages_1.SUPPORTED_LANGUAGES);
    oneOf(result.numberMode, ['abbreviated', 'exact']);
    if (![1, 1.15, 1.3, 1.5].includes(result.textScale) || !Number.isFinite(result.autoEatThresholdPct) || result.autoEatThresholdPct < 0 || result.autoEatThresholdPct > 100)
        throw new Error('invalid_settings');
    for (const key of ['reduceMotion', 'stopCombatWhenOutOfFood', 'autoJoinWorldChat'])
        if (typeof result[key] !== 'boolean')
            throw new Error('invalid_settings');
    if (![1, 2, 3, 4].includes(result.defaultWorldChat ?? 0) || !Array.isArray(result.quickNavDestinations) || result.quickNavDestinations.length > 8 || result.quickNavDestinations.some(id => !quick_navigation_1.QUICK_NAV_DESTINATIONS.includes(id)))
        throw new Error('invalid_settings');
    return result;
}
/** The caller provides a trusted clock, character ID and random roll on the server. */
function executeGameCommand(previous, value, now, options = {}) {
    var _a, _b;
    const command = validateGameCommand(value), a = command.args ?? {}, activity = previous.activity, contributions = [];
    let state = structuredClone(previous), reward, message, won, upgrade;
    if (!Number.isSafeInteger(now) || now < previous.createdAtMs)
        throw new Error('invalid_server_clock');
    const credit = (source, earned) => { if (source && earned.kills > 0)
        contributions.push({ kind: source.kind === 'combat' ? 'combat' : 'gathering', contentId: source.targetId, units: earned.kills, startedAtMs: Math.max(source.lastClaimAtMs, now - earned.elapsedSeconds * 1000) }); };
    const settle = () => { const source = state.activity, result = game.claimActivity(state, now); state = result.state; reward = result.reward; credit(source, result.reward); };
    // Settle before any mutation that can alter past activity rates, food, gear or inventory.
    if (state.character && command.type !== 'create')
        settle();
    state = (0, companion_runtime_1.refreshCompanions)(state, now);
    if (['companion_equip', 'companion_level', 'companion_ascend', 'companion_master'].includes(command.type))
        (0, companion_runtime_1.assertCompanionIdle)(state, text(a, 'id'));
    switch (command.type) {
        case 'class_training':
            state = game.startClassTraining(state, now);
            break;
        case 'faith_practice':
            state = (0, faith_1.reserveFaithPractice)(state, text(a, 'tierId'), integer(a, 'count', 1, 1000), now);
            break;
        case 'faith_blessing':
            state = (0, faith_1.updateFaithPreference)(state, 'blessing', text(a, 'id'));
            break;
        case 'faith_favorite':
            state = (0, faith_1.updateFaithPreference)(state, 'favorite', text(a, 'id'), a.enabled === true);
            break;
        case 'faith_hide':
            state = (0, faith_1.updateFaithPreference)(state, 'hide', undefined, a.enabled === true);
            break;
        case 'alchemy_start':
            state = game.beginAlchemyBatch(state, text(a, 'id'), integer(a, 'batches', 1, 100), now);
            break;
        case 'class_focus': {
            const focus = oneOf(a.focus, ['balanced', 'primary', 'secondary']);
            if (!state.character)
                throw new Error('character_required');
            state.character = { ...state.character, trainingFocus: focus };
            if (state.character.classTraining?.progressMs === 0)
                state.character.classTraining = { ...state.character.classTraining, focus };
            if (state.activity?.startedAtMs === now)
                state.activity.classFocus = (0, class_skills_1.normalizeTrainingFocus)(focus);
            break;
        }
        case 'companion_boss_rematch': {
            const result = game.challengeFallenKnightRematch(state, now);
            state = result.state;
            message = result.message;
            won = result.won;
            break;
        }
        case 'companion_monthly':
        case 'companion_supplies':
        case 'companion_bond_reward':
            state = (0, companion_runtime_1.executeCompanionActivity)(state, command.type, a, now);
            break;
        case 'companion_equip':
            state = companions.equipCombatCompanion(state, text(a, 'id'));
            break;
        case 'companion_unequip':
            state = companions.unequipCombatCompanion(state);
            break;
        case 'companion_level':
            state = companions.purchaseCompanionLevel(state, text(a, 'id'));
            break;
        case 'companion_ascend':
            state = companions.ascendCombatCompanion(state, text(a, 'id'));
            break;
        case 'companion_master':
            state = companions.masterPrestigeCompanion(state, text(a, 'id'));
            break;
        case 'companion_upgrade': {
            const id = oneOf(a.id, ['trainingGround', 'essenceBasin', 'bondHall', 'expeditionPens', 'masteryChamber']);
            if (id === 'trainingGround')
                state = (0, companion_runtime_1.claimCompanionTraining)(state, now);
            if (id === 'essenceBasin')
                state = companions.claimSanctuaryEssence(state, now);
            state = companions.upgradeCompanionSanctuary(state, id);
            if (id === 'trainingGround')
                (_a = state.account.companionSanctuary).lastTrainingClaimAtMs ?? (_a.lastTrainingClaimAtMs = now);
            if (id === 'essenceBasin')
                (_b = state.account.companionSanctuary).lastEssenceClaimAtMs ?? (_b.lastEssenceClaimAtMs = now);
            break;
        }
        case 'companion_training':
            state = (0, companion_runtime_1.claimCompanionTraining)(state, now);
            break;
        case 'companion_essence':
            state = companions.claimSanctuaryEssence(state, now);
            break;
        case 'companion_trial_start':
        case 'companion_trial_floor':
        case 'companion_trial_abandon':
        case 'companion_assignment_start':
        case 'companion_assignment_claim':
        case 'companion_technique':
        case 'companion_codex':
        case 'companion_showcase':
        case 'companion_weekly':
        case 'companion_special':
            state = (0, companion_runtime_1.executeCompanionActivity)(state, command.type, a, now);
            break;
        case 'create':
            state = game.createCharacter(state, text(a, 'classId'), text(a, 'name', 20), oneOf(a.body ?? 'male', ['male', 'female']));
            if (options.characterId)
                state.character.id = options.characterId;
            break;
        case 'roster_create': {
            state = (0, account_actions_1.createAccountCharacter)(state, text(a, 'classId'), text(a, 'name', 20), oneOf(a.body ?? 'male', ['male', 'female']), now);
            if (options.characterId && state.character)
                state.character.id = options.characterId;
            break;
        }
        case 'roster_switch':
            state = (0, account_actions_1.switchAccountCharacter)(state, text(a, 'id'), now);
            break;
        case 'claim': break;
        case 'start':
            state = (0, playability_1.transitionActivity)(state, now, { kind: oneOf(a.kind, ['combat', 'gathering']), id: text(a, 'id') }).state;
            break;
        case 'explore':
            state = game.startExploration(state, text(a, 'id'), now);
            break;
        case 'stop':
            state = game.stopActivity(state);
            break;
        case 'travel':
            state = game.travelToRegion(state, text(a, 'id'), now).state;
            break;
        case 'boss': {
            const result = game.challengeFallenKnight(state, now);
            state = result.state;
            message = result.message;
            won = result.won;
            if (won)
                contributions.push({ kind: 'boss', contentId: 'FALLEN_KNIGHT', units: 1 });
            break;
        }
        case 'craft': {
            const id = text(a, 'id');
            state = game.craftRecipe(state, id, now);
            contributions.push({ kind: 'crafting', contentId: id, units: 1 });
            break;
        }
        case 'use_potion':
            state = game.usePotion(state, text(a, 'id'));
            break;
        case 'discard_preparation':
            state = game.discardPreparation(state);
            break;
        case 'equip':
            state = game.equipItem(state, text(a, 'id'));
            break;
        case 'unequip':
            state = game.unequipItem(state, oneOf(a.slot, ['weapon', 'offhand', 'helmet', 'chest', 'legs', 'boots', 'gloves', 'cape', 'amulet', 'ring']));
            break;
        case 'food':
            state = game.equipFood(state, text(a, 'id'));
            break;
        case 'eat':
            state = game.eatFood(state, a.id === undefined ? undefined : text(a, 'id'));
            break;
        case 'sell':
            state = game.sellItem(state, text(a, 'id'), a.quantity === undefined ? 1 : integer(a, 'quantity'));
            break;
        case 'salvage':
            state = game.salvageItem(state, text(a, 'id'));
            break;
        case 'deposit':
            state = game.depositToBank(state, text(a, 'id'), integer(a, 'quantity'));
            break;
        case 'withdraw':
            state = game.withdrawFromBank(state, text(a, 'id'), integer(a, 'quantity'));
            break;
        case 'deposit_materials':
            state = game.depositAllMaterials(state);
            break;
        case 'storage':
            state = game.upgradeStorage(state, oneOf(a.location, ['inventory', 'bank']));
            break;
        case 'overflow':
            state = game.claimOverflowToBank(state);
            break;
        case 'equip_tool':
            state = game.equipGatheringTool(state, text(a, 'id'));
            break;
        case 'equip_set':
            state = game.equipNoviceSet(state);
            break;
        case 'upgrade': {
            if (options.randomRoll === undefined)
                throw new Error('trusted_random_required');
            const result = (0, equipment_enhancement_1.attemptEquipmentUpgrade)(state, text(a, 'id'), options.randomRoll);
            state = result.state;
            upgrade = result.result;
            break;
        }
        case 'socket':
            state = (0, equipment_enhancement_1.socketGem)(state, text(a, 'id'), text(a, 'gemId'));
            break;
        case 'unsocket':
            state = (0, equipment_enhancement_1.unsocketGem)(state, text(a, 'id'), integer(a, 'index', 0, 9));
            break;
        case 'skin':
            state = (0, character_skins_1.selectCharacterSkin)(state, text(a, 'id'));
            break;
        case 'quest':
            state = game.claimQuest(state, text(a, 'id'));
            break;
        case 'seasonal':
            state = game.claimSeasonalContract(state, oneOf(a.period, ['daily', 'weekly']), text(a, 'id'), now);
            break;
        case 'settings':
            state = { ...state, settings: validateGameSettings(a.settings) };
            break;
        case 'profile': {
            if (!state.character)
                throw new Error('character_required');
            const patch = {};
            for (const [key, input] of Object.entries(a)) {
                if (input !== null && (typeof input !== 'string' || input.length > 80))
                    throw new Error('invalid_profile');
                patch[key] = input === null ? undefined : input;
            }
            if (patch.profileTitle !== undefined && patch.profileTitle.length > 32)
                throw new Error('invalid_profile_title');
            if (patch.profileBackgroundId && !['asterfall-night', 'ironwood-dawn', 'silverbrook-mist', 'oathglass-hall', ...(state.account.unlockedProfileBackgroundIds ?? [])].includes(patch.profileBackgroundId))
                throw new Error('cosmetic_not_owned');
            if (patch.profileBorderId && !state.account.unlockedProfileBorderIds?.includes(patch.profileBorderId))
                throw new Error('cosmetic_not_owned');
            if (patch.selectedCosmeticPetId && !state.account.unlockedCosmeticPetIds?.includes(patch.selectedCosmeticPetId))
                throw new Error('cosmetic_not_owned');
            state = { ...state, character: { ...state.character, ...patch } };
            break;
        }
        case 'event_daily':
            state = events.claimEventDailyGift(state, now);
            break;
        case 'event_cache':
            state = events.claimEventRepeatCache(state, now);
            break;
        case 'event_milestones':
            state = events.claimAllEventMilestones(state, now);
            break;
        case 'event_discovery':
            state = events.claimEventDiscovery(state, text(a, 'id'), now);
            break;
        case 'event_reward':
            state = events.claimEventReward(state, text(a, 'id'), now);
            break;
        case 'event_accept':
            state = events.acceptEventContract(state, text(a, 'id'), now);
            break;
        case 'event_objective':
            state = events.claimEventObjective(state, text(a, 'id'), now);
            break;
        case 'event_weekly':
            state = events.claimEventWeeklyObjective(state, text(a, 'id'), now);
            break;
        case 'event_project':
            state = events.chooseEventProject(state, text(a, 'id'), now);
            break;
        case 'event_contribute':
            state = events.contributeEventCurrency(state, integer(a, 'quantity'), now);
            break;
        case 'event_community':
            state = events.claimEventCommunityMilestone(state, integer(a, 'percent', 1, 100), now);
            break;
        case 'event_purchase':
            state = events.purchaseEventOffer(state, text(a, 'id'), now);
            break;
        default: throw new Error('invalid_command');
    }
    if (state.character && (!Number.isSafeInteger(state.character.gold) || state.character.gold < 0))
        throw new Error('invalid_wallet');
    return { state: (0, character_skins_1.discoverCharacterSkins)(state), reward, activity, message, won, upgrade, contributions };
}
