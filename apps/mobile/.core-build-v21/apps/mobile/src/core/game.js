"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GATHER_TIME_SCALE = exports.OFFLINE_CAP_SECONDS = exports.MAX_OFFLINE_CAP_HOURS = exports.BASE_OFFLINE_CAP_HOURS = exports.beginAlchemyBatch = void 0;
exports.offlineCapBreakdown = offlineCapBreakdown;
exports.offlineCapSeconds = offlineCapSeconds;
exports.newGame = newGame;
exports.createCharacter = createCharacter;
exports.effectiveStats = effectiveStats;
exports.startCombat = startCombat;
exports.travelToRegion = travelToRegion;
exports.stackItems = stackItems;
exports.usedSlots = usedSlots;
exports.previewActivityReward = previewActivityReward;
exports.refreshQuests = refreshQuests;
exports.claimQuest = claimQuest;
exports.claimSeasonalContract = claimSeasonalContract;
exports.claimActivity = claimActivity;
exports.finishClassDrills = finishClassDrills;
exports.startClassTraining = startClassTraining;
exports.stopActivity = stopActivity;
exports.equipItem = equipItem;
exports.equipFood = equipFood;
exports.eatFood = eatFood;
exports.usePotion = usePotion;
exports.discardPreparation = discardPreparation;
exports.unequipItem = unequipItem;
exports.sellItem = sellItem;
exports.salvageItem = salvageItem;
exports.depositToBank = depositToBank;
exports.withdrawFromBank = withdrawFromBank;
exports.storageUpgradePreview = storageUpgradePreview;
exports.upgradeStorage = upgradeStorage;
exports.depositAllMaterials = depositAllMaterials;
exports.claimOverflowToBank = claimOverflowToBank;
exports.startGathering = startGathering;
exports.startHerbalism = startHerbalism;
exports.startExploration = startExploration;
exports.equipGatheringTool = equipGatheringTool;
exports.unequipGatheringTool = unequipGatheringTool;
exports.craftRecipe = craftRecipe;
exports.equipNoviceSet = equipNoviceSet;
exports.regionalReadiness = regionalReadiness;
exports.fallenKnightWinChance = fallenKnightWinChance;
exports.challengeFallenKnightRematch = challengeFallenKnightRematch;
exports.challengeFallenKnight = challengeFallenKnight;
const classes_1 = require("../content/classes");
const class_skills_1 = require("../content/class-skills");
const monsters_1 = require("../content/monsters");
const items_1 = require("../content/items");
const skills_1 = require("../content/skills");
const herbalism_1 = require("../content/herbalism");
const exploration_1 = require("../content/exploration");
const quests_1 = require("../content/quests");
const progression_1 = require("./progression");
const rng_1 = require("./rng");
const character_creation_1 = require("./character-creation");
const novice_sets_1 = require("../content/novice-sets");
const class_combat_1 = require("./class-combat");
const world_weather_1 = require("./world-weather");
const seasonal_quests_1 = require("./seasonal-quests");
const character_skins_1 = require("./character-skins");
const permanent_boosts_1 = require("./permanent-boosts");
const live_events_1 = require("./live-events");
const quick_navigation_1 = require("./quick-navigation");
const gathering_tools_1 = require("./gathering-tools");
const gathering_tools_2 = require("../content/gathering-tools");
const combat_region_1 = require("./combat-region");
const world_map_1 = require("../content/world-map");
const equipment_enhancement_1 = require("./equipment-enhancement");
const combat_companions_1 = require("./combat-companions");
const companion_runtime_1 = require("./companion-runtime");
const monster_mastery_1 = require("./monster-mastery");
const class_skills_2 = require("./class-skills");
const faith_1 = require("./faith");
const faith_2 = require("../content/faith");
const alchemy_1 = require("./alchemy");
const alchemy_2 = require("../content/alchemy");
exports.beginAlchemyBatch = alchemy_1.startAlchemyBatch;
exports.BASE_OFFLINE_CAP_HOURS = 24;
exports.MAX_OFFLINE_CAP_HOURS = 36;
/** Base cap retained for content/tests; actual saves use offlineCapSeconds(state). */
exports.OFFLINE_CAP_SECONDS = exports.BASE_OFFLINE_CAP_HOURS * 60 * 60;
const COMBAT_SPEED_MIN = .68;
const COMBAT_SPEED_MAX = 1.3;
const COMBAT_TIME_SCALE = 1.16;
const COMBAT_EXPECTED_SCALE = 1.3;
const COMBAT_MONSTER_DAMAGE_SCALE = 1.13;
exports.GATHER_TIME_SCALE = 1.45;
function offlineCapBreakdown(state) {
    const setComplete = !!state.character && (0, novice_sets_1.noviceSetFor)(state.character.classId).slots.every(slot => state.character.craftedNoviceItemIds?.includes((0, novice_sets_1.noviceItemId)(state.character.classId, slot)));
    const questMilestone = state.quests.some(q => q.questId === 'QST_005' && q.status === 'claimed');
    const sources = [
        { id: 'class_set', name: 'Complete class set', hours: setComplete ? 2 : 0, earned: setComplete },
        { id: 'quest_milestone', name: 'Claim chapter 5', hours: questMilestone ? 2 : 0, earned: questMilestone },
        { id: 'second_character', name: 'Create second character', hours: state.account.createdCharacterCount >= 2 ? 2 : 0, earned: state.account.createdCharacterCount >= 2 },
        { id: 'third_character', name: 'Create third character', hours: state.account.createdCharacterCount >= 3 ? 2 : 0, earned: state.account.createdCharacterCount >= 3 },
        { id: 'guild', name: 'Join a guild', hours: state.account.guildMember ? 2 : 0, earned: state.account.guildMember },
        { id: 'first_boss', name: 'Defeat first boss', hours: state.defeatedBossIds.length ? 2 : 0, earned: state.defeatedBossIds.length > 0 },
        { id: 'bloom_patron', name: 'Bloom Patron', hours: state.account.patronTier === 'bloom' || state.account.patronTier === 'crown' ? 2 : 0, earned: state.account.patronTier === 'bloom' || state.account.patronTier === 'crown' },
        { id: 'crown_patron', name: 'Crown Patron', hours: state.account.patronTier === 'crown' ? 2 : 0, earned: state.account.patronTier === 'crown' },
    ];
    const earnedHours = sources.reduce((sum, source) => sum + source.hours, 0), hours = Math.min(exports.MAX_OFFLINE_CAP_HOURS, exports.BASE_OFFLINE_CAP_HOURS + earnedHours);
    return { baseHours: exports.BASE_OFFLINE_CAP_HOURS, maxHours: exports.MAX_OFFLINE_CAP_HOURS, hours, sources };
}
function offlineCapSeconds(state) { return offlineCapBreakdown(state).hours * 60 * 60; }
function newGame(nowMs) {
    return {
        version: 6, createdAtMs: nowMs, character: null, inventory: { stacks: [], capacity: 30 }, bank: { stacks: [], capacity: 120 }, overflow: { stacks: [], expiresAtMs: null }, activity: null, currentRegionId: 'GREENFIELDS',
        quests: quests_1.QUESTS.map((q, i) => ({ questId: q.id, status: i === 0 ? 'active' : 'locked', progress: 0 })),
        unlockedMonsterIds: ['MOSS_RAT'], defeatedBossIds: [],
        skills: ['mining', 'woodcutting', 'fishing', 'smithing', 'cooking', 'herbalism', 'alchemy', 'hunting', 'exploration', 'tailoring', 'enchanting', 'faith'].map(skillId => ({ skillId: skillId, xp: 0, level: 1 })),
        account: { createdCharacterCount: 1, unlockedCharacterSlots: 1, guildMember: false, patronTier: 'none', guildContribution: 0, guildProjectProgress: 0, guildBossHp: 100000, guildProjectClaimed: false, guildJoinPolicy: 'open', guildMinimumLevel: 10, guildApplicationStatus: 'none', seasonalContractClaimIds: [] },
        settings: { language: 'en', numberMode: 'abbreviated', reduceMotion: false, textScale: 1, autoEatThresholdPct: 40, stopCombatWhenOutOfFood: true, autoJoinWorldChat: true, defaultWorldChat: 1, quickNavDestinations: [...quick_navigation_1.DEFAULT_QUICK_NAV_DESTINATIONS] }
    };
}
function createCharacter(state, classId, name = 'Adventurer', bodyPresentation = 'male') {
    const c = classes_1.CLASSES.find(x => x.id === classId);
    if (!c)
        throw new Error('Unknown class');
    if (state.character)
        throw new Error('A character already exists in this save');
    if (bodyPresentation !== 'male' && bodyPresentation !== 'female')
        throw new Error('Invalid body presentation');
    const nameError = (0, character_creation_1.characterNameError)(name.trim() || 'Adventurer');
    if (nameError)
        throw new Error(nameError);
    const equipment = { weapon: c.starterEquipment.weapon };
    let maxHp = c.hp;
    for (const id of Object.values(equipment)) {
        const d = (0, items_1.itemDef)(id);
        maxHp += d.hp || 0;
    }
    return { ...state, character: { id: 'LOCAL_CHAR_1', name: name.trim() || 'Adventurer', classId, bodyPresentation, classSkills: (0, class_skills_1.classSkillsFor)(classId).map(skill => ({ skillId: skill.id, xp: 0, level: 1 })), trainingFocus: 'balanced', profileTitle: 'New Adventurer', profileBackgroundId: 'asterfall-night', unlockedEventSkinIds: [], unlockedSkinIds: ['starting'], ownedPetIds: [], ownedBoostIds: [], selectedSkinId: 'starting', faith: { favoriteBlessingIds: [], hideWeakerBlessings: true }, level: 1, xp: 0, gold: 100, hp: c.hp, currentHp: maxHp, attack: c.attack, defense: c.defense, equipment, equippedFoodId: 'TRAVEL_RATION' },
        inventory: { ...state.inventory, stacks: [{ itemId: 'TRAVEL_RATION', quantity: 20 }] } };
}
function effectiveStats(state) {
    const c = state.character;
    if (!c)
        return { hp: 0, attack: 0, defense: 0, power: 0 };
    let hp = c.hp, attack = c.attack, defense = c.defense;
    for (const id of Object.values(c.equipment)) {
        if (!id)
            continue;
        const stats = (0, equipment_enhancement_1.enhancedGearStats)(state, id);
        hp += stats.hp;
        attack += stats.attack;
        defense += stats.defense;
    }
    const set = (0, novice_sets_1.noviceSetFor)(c.classId), complete = set.slots.every(slot => c.equipment[slot] === (0, novice_sets_1.noviceItemId)(c.classId, slot));
    if (complete) {
        hp += set.setBonus.hp;
        attack += set.setBonus.attack;
        defense += set.setBonus.defense;
    }
    const gems = (0, equipment_enhancement_1.equippedGemBonuses)(state);
    hp = Math.ceil(hp * (1 + gems.hp));
    attack = Math.ceil(attack * (1 + gems.attack));
    defense = Math.ceil(defense * (1 + gems.defense));
    const mastery = (0, class_skills_2.characterClassEffects)(c);
    hp = Math.ceil(hp * mastery.hp);
    attack = Math.ceil(attack * mastery.attack);
    defense = Math.ceil(defense * mastery.defense);
    const permanent = (0, permanent_boosts_1.characterPermanentMultipliers)(state);
    attack = Math.ceil(attack * permanent.combatPowerMultiplier);
    const prep = c.preparation ? (0, alchemy_1.preparationEffects)(c.preparation) : undefined;
    if (prep)
        attack = Math.ceil(attack * prep.attack);
    const role = classes_1.CLASSES.find(def => def.id === c.classId)?.role;
    return { hp, attack, defense, power: Math.round(attack * 1.5 + defense * .8 + hp * .08 + c.level * 2.5), critChance: role === 'Damage' ? .10 : .05, critMultiplier: 1.5, accuracy: .84, evasion: role === 'Damage' ? .07 : .04, haste: .05 };
}
function startCombat(state, monsterId, nowMs) {
    state = finishClassDrills(state, nowMs);
    if (!state.character)
        throw new Error('Create a character first');
    const m = monsters_1.MONSTERS.find(x => x.id === monsterId);
    if (!m)
        throw new Error('Unknown monster');
    if (!state.unlockedMonsterIds.includes(monsterId))
        throw new Error('Monster not unlocked');
    if (m.boss)
        throw new Error('Bosses use challengeFallenKnight');
    if ((0, world_weather_1.zoneIdForTarget)(monsterId) !== (0, combat_region_1.currentRegionId)(state))
        throw new Error(`Travel to ${m.zone} before fighting ${m.name}`);
    return { ...state, activity: { kind: 'combat', targetId: monsterId, startedAtMs: nowMs, lastClaimAtMs: nowMs, classFocus: (0, class_skills_2.normalizeTrainingFocus)(state.character.trainingFocus), classTrainingSnapshot: { faithBlessingId: (0, faith_1.selectedFaithBlessing)(state)?.id }, environment: (0, world_weather_1.captureActivityEnvironment)(monsterId, nowMs) } };
}
/** Travel is instantaneous for now, but always settles and stops the prior activity. */
function travelToRegion(state, regionId, nowMs) {
    const zone = world_map_1.WORLD_ZONES.find(entry => entry.id === regionId);
    if (!zone)
        throw new Error('Unknown region');
    if (!state.character || state.character.level < zone.minLevel)
        throw new Error(`Reach character level ${zone.minLevel} to travel to ${zone.name}`);
    if ((0, combat_region_1.currentRegionId)(state) === zone.id)
        return { state, reward: { xp: 0, gold: 0, items: [], kills: 0, elapsedSeconds: 0 } };
    const settled = claimActivity(state, nowMs);
    return { state: { ...settled.state, currentRegionId: zone.id, activity: null }, reward: settled.reward };
}
function stackItems(existing, incoming) { const m = new Map(); for (const s of existing)
    m.set(s.itemId, (m.get(s.itemId) || 0) + s.quantity); for (const s of incoming)
    m.set(s.itemId, (m.get(s.itemId) || 0) + s.quantity); return [...m.entries()].filter(([, q]) => q > 0).map(([itemId, quantity]) => ({ itemId, quantity })); }
function usedSlots(stacks) { return stacks.filter(s => s.quantity > 0).length; }
function itemStackCap(itemId) { const d = (0, items_1.itemDef)(itemId); return d.type === 'gear' || d.type === 'tool' ? 1 : 9999; }
function addBounded(stacks, capacity, incoming) {
    let next = stacks.map(s => ({ ...s }));
    const overflow = [];
    for (const inc of incoming) {
        let remaining = inc.quantity;
        const cap = itemStackCap(inc.itemId);
        let existing = next.find(s => s.itemId === inc.itemId);
        if (existing) {
            const room = Math.max(0, cap - existing.quantity);
            const add = Math.min(room, remaining);
            existing.quantity += add;
            remaining -= add;
        }
        while (remaining > 0 && usedSlots(next) < capacity) {
            const add = Math.min(cap, remaining);
            next.push({ itemId: inc.itemId, quantity: add });
            remaining -= add;
            // Current prototype identifies stacks by itemId, so equipment duplicates are routed to overflow rather than pretending they are one stack.
            if (cap === 1)
                break;
        }
        if (remaining > 0)
            overflow.push({ itemId: inc.itemId, quantity: remaining });
    }
    return { stacks: next, overflow };
}
function routeRewards(state, incoming, nowMs) {
    const inv = addBounded(state.inventory.stacks, state.inventory.capacity, incoming);
    const bank = addBounded(state.bank.stacks, state.bank.capacity, inv.overflow);
    const overflow = stackItems(state.overflow.stacks, bank.overflow);
    return {
        inventory: { ...state.inventory, stacks: inv.stacks },
        bank: { ...state.bank, stacks: bank.stacks },
        overflow: { stacks: overflow, expiresAtMs: overflow.length ? Math.max(state.overflow.expiresAtMs || 0, nowMs + 72 * 60 * 60 * 1000) : null }
    };
}
function consume(stacks, itemId, quantity) { const f = stacks.find(s => s.itemId === itemId); if (!f || f.quantity < quantity)
    throw new Error('Not enough items'); return stacks.map(s => s.itemId === itemId ? { ...s, quantity: s.quantity - quantity } : s).filter(s => s.quantity > 0); }
function stackQty(stacks, itemId) { if (!itemId)
    return 0; return stacks.find(s => s.itemId === itemId)?.quantity || 0; }
function simulateCombat(state, monsterId, elapsed) {
    const c = state.character;
    const m = monsters_1.MONSTERS.find(x => x.id === monsterId);
    const stats = effectiveStats(state);
    const modifiers = (0, permanent_boosts_1.characterPermanentMultipliers)(state);
    const companion = (0, combat_companions_1.companionCombatContribution)(state);
    const style = (0, class_combat_1.classCombatStyle)(c.classId);
    const environment = state.activity ? (0, world_weather_1.environmentEffectForActivity)(state.activity).effect : undefined;
    const boostedDefense = Math.max(1, Math.round(stats.defense * modifiers.combatPowerMultiplier));
    const boostedPower = Math.max(1, Math.round(stats.power * modifiers.combatPowerMultiplier));
    const expected = (m.attack * 1.2 + m.defense * .8 + m.level * 2.2) * COMBAT_EXPECTED_SCALE;
    const speed = Math.max(COMBAT_SPEED_MIN, Math.min(COMBAT_SPEED_MAX, boostedPower / Math.max(1, expected))) * style.speedMultiplier * modifiers.combatSpeedMultiplier * companion.outputMultiplier * (1 + (0, monster_mastery_1.monsterMastery)(state, monsterId).damageBonus);
    const theoreticalKills = Math.floor(elapsed / (m.secondsPerKill * COMBAT_TIME_SCALE * (environment?.actionTimeMultiplier ?? 1) / speed));
    const foodId = c.equippedFoodId;
    const food = foodId ? (0, items_1.itemDef)(foodId) : undefined;
    let foodLeft = stackQty(state.inventory.stacks, foodId), foodConsumed = 0;
    let hp = Math.min(c.currentHp || stats.hp, stats.hp), kills = 0, stoppedReason = '';
    const threshold = Math.max(10, Math.min(90, state.settings.autoEatThresholdPct)) / 100;
    for (let i = 0; i < theoreticalKills; i++) {
        const raw = Math.max(1, Math.round((m.attack * COMBAT_MONSTER_DAMAGE_SCALE) - Math.floor(boostedDefense * .58)));
        const damage = Math.max(1, Math.round((raw * .48 + m.level * .16) * style.damageTakenMultiplier * modifiers.incomingDamageMultiplier * companion.incomingDamageMultiplier * (c.preparation ? (0, alchemy_1.preparationEffects)(c.preparation).damage : 1)));
        hp -= damage;
        while (food && food.heal && foodLeft > 0 && hp > 0 && hp / stats.hp <= threshold) {
            hp = Math.min(stats.hp, hp + food.heal);
            foodLeft--;
            foodConsumed++;
        }
        if (hp <= 0) {
            hp = 1;
            stoppedReason = food && state.settings.stopCombatWhenOutOfFood ? 'Out of food / too injured' : 'Too injured';
            break;
        }
        kills++;
        hp = Math.min(stats.hp, hp + Math.max(1, Math.floor(stats.hp * style.recoveryPct * companion.recoveryMultiplier)));
    }
    return { kills, foodConsumed, endHp: hp, stoppedReason };
}
function previewActivityReward(state, nowMs) {
    if (state.character?.classTraining)
        return (0, class_skills_2.settleClassDrills)(state, nowMs, offlineCapSeconds(state)).reward;
    if (state.activity?.kind === 'faith') {
        const settled = (0, faith_1.settleFaithPractice)(state, nowMs, offlineCapSeconds(state));
        return settled.reward;
    }
    if (state.activity?.kind === 'alchemy') {
        const elapsed = Math.min(offlineCapSeconds(state), Math.max(0, Math.floor((nowMs - state.activity.lastClaimAtMs) / 1000)));
        return (0, alchemy_1.previewAlchemyReward)(state, elapsed);
    }
    if (!state.activity || !state.character)
        return { xp: 0, gold: 0, items: [], kills: 0, elapsedSeconds: 0 };
    const elapsed = Math.min(offlineCapSeconds(state), Math.max(0, Math.floor((nowMs - state.activity.lastClaimAtMs) / 1000)));
    const multipliers = (0, permanent_boosts_1.characterPermanentMultipliers)(state);
    if (state.activity.kind !== 'combat') {
        if (state.activity.kind === 'exploration') {
            const route = (0, exploration_1.explorationRoute)(state.activity.targetId);
            if (!route)
                return { xp: 0, gold: 0, items: [], kills: 0, elapsedSeconds: elapsed };
            const actions = Math.floor(elapsed / route.seconds);
            return { xp: Math.floor(actions * route.xp * (0, permanent_boosts_1.characterPermanentMultipliers)(state).skillXpMultiplier), gold: 0, items: [], kills: 0, elapsedSeconds: elapsed, explorationDiscoveries: actions && route.unlockMonsterId ? [route.unlockMonsterId] : [] };
        }
        const g = [...skills_1.GATHERING, ...herbalism_1.HERB_NODES].find(x => x.id === state.activity.targetId);
        if (!g)
            return { xp: 0, gold: 0, items: [], kills: 0, elapsedSeconds: elapsed };
        const effect = (0, world_weather_1.environmentEffectForActivity)(state.activity).effect;
        const pacing = (0, gathering_tools_1.gatheringPacing)(state, g);
        const effectiveActionSeconds = g.seconds * exports.GATHER_TIME_SCALE * pacing.timeMultiplier * effect.actionTimeMultiplier / multipliers.gatheringSpeedMultiplier;
        const elapsedMs = Math.min(offlineCapSeconds(state) * 1000, Math.max(0, nowMs - state.activity.lastClaimAtMs));
        const cycleMs = effectiveActionSeconds * 1000;
        const totalMs = (state.activity.progressFraction ?? 0) * cycleMs + elapsedMs;
        const actions = Math.floor(totalMs / cycleMs);
        const quantityFloat = actions * g.min * effect.itemMultiplier + (state.rewardRemainders?.[g.itemId] ?? 0);
        const quantity = Math.floor(quantityFloat);
        const skill = state.skills.find(x => x.skillId === g.skillId);
        const rawXp = Math.floor(actions * g.xp * effect.xpMultiplier * multipliers.skillXpMultiplier);
        const xp = Math.min(Math.max(0, (0, progression_1.totalXpAtLevel)(100) - (skill?.xp ?? 0)), rawXp);
        const reward = { xp, gold: 0, items: quantity ? [{ itemId: g.itemId, quantity }] : [], kills: actions, elapsedSeconds: elapsed, nextProgressFraction: (totalMs % cycleMs) / cycleMs, nextRewardRemainders: { ...(state.rewardRemainders ?? {}), [g.itemId]: Math.max(0, quantityFloat - quantity) } };
        return { ...reward, eventDrops: (0, live_events_1.activityEventDrops)(state, reward, nowMs), eventDiscoveries: (0, live_events_1.activityEventDiscoveries)(state, 'gathering', Math.floor(reward.elapsedSeconds / 60), nowMs) };
    }
    const m = monsters_1.MONSTERS.find(x => x.id === state.activity.targetId);
    if (!m)
        throw new Error('Unknown monster');
    if (m.boss)
        return { xp: 0, gold: 0, items: [], kills: 0, elapsedSeconds: elapsed };
    const sim = simulateCombat(state, m.id, elapsed);
    const items = [];
    const effect = (0, world_weather_1.environmentEffectForActivity)(state.activity).effect;
    for (const drop of m.drops) {
        let qty = 0;
        const chance = Math.min(1, drop.chance * effect.dropChanceMultiplier * multipliers.dropChanceMultiplier);
        const seed = `${state.character.id}:${state.activity.lastClaimAtMs}:${m.id}:${drop.itemId}`;
        for (let i = 0; i < sim.kills; i++)
            if ((0, rng_1.random01)(seed, i) < chance)
                qty += drop.min + Math.floor((0, rng_1.random01)(seed, i + 50000) * (drop.max - drop.min + 1));
        if (qty > 0)
            items.push({ itemId: drop.itemId, quantity: qty });
    }
    const classGain = (0, class_skills_2.awardCombatClassXp)(state.character, sim.kills, m.xp * effect.xpMultiplier * multipliers.skillXpMultiplier, state.activity.classFocus);
    const mastery = (0, monster_mastery_1.monsterMastery)(state, m.id), materialRemainders = { ...state.character.masteryMaterialRemainders };
    if (mastery.materialBonus)
        for (const item of items) {
            if ((0, items_1.itemDef)(item.itemId).type !== 'material')
                continue;
            const extra = item.quantity * mastery.materialBonus + (materialRemainders[item.itemId] ?? 0), whole = Math.floor(extra + 1e-9);
            item.quantity += whole;
            materialRemainders[item.itemId] = Math.max(0, extra - whole);
        }
    const reward = { classSkillXp: classGain.awards, xp: Math.floor(sim.kills * m.xp * effect.xpMultiplier * multipliers.characterXpMultiplier), gold: Math.floor(sim.kills * m.gold * effect.goldMultiplier * multipliers.goldMultiplier), items, kills: sim.kills, elapsedSeconds: elapsed, foodConsumed: sim.foodConsumed, endHp: sim.endHp, stoppedReason: sim.stoppedReason };
    return { ...reward, masteryMaterialRemainders: materialRemainders, eventDrops: (0, live_events_1.activityEventDrops)(state, reward, nowMs), eventDiscoveries: (0, live_events_1.activityEventDiscoveries)(state, 'combat', reward.kills, nowMs) };
}
function refreshQuests(state, lastCombatTarget, lastKills = 0) {
    let quests = state.quests.map(q => ({ ...q }));
    if (lastCombatTarget && lastKills > 0) {
        quests = quests.map(q => { const d = quests_1.QUESTS.find(x => x.id === q.questId); return q.status === 'active' && d?.kind === 'kills' && d.targetId === lastCombatTarget ? { ...q, progress: Math.min(d.required, q.progress + lastKills) } : q; });
    }
    quests = quests.map(q => {
        const d = quests_1.QUESTS.find(x => x.id === q.questId);
        if (!d || q.status !== 'active')
            return q;
        let progress = q.progress;
        if (d.kind === 'item')
            progress = state.inventory.stacks.find(x => x.itemId === d.targetId)?.quantity || 0;
        if (d.kind === 'equip')
            progress = Object.values(state.character?.equipment || {}).filter(Boolean).length;
        if (d.kind === 'level')
            progress = state.character?.level || 0;
        if (d.kind === 'skillLevel')
            progress = Math.max(...state.skills.map(x => x.level));
        if (d.kind === 'boss')
            progress = state.defeatedBossIds.includes(d.targetId || '') ? 1 : 0;
        return { ...q, progress: Math.min(d.required, progress), status: progress >= d.required ? 'complete' : 'active' };
    });
    return { ...state, quests };
}
function claimQuest(state, questId) {
    const q = state.quests.find(x => x.questId === questId), d = quests_1.QUESTS.find(x => x.id === questId);
    if (!q || !d || q.status !== 'complete' || !state.character)
        throw new Error('Quest not claimable');
    let next = { ...state, character: { ...state.character, gold: state.character.gold + d.rewardGold }, inventory: { ...state.inventory, stacks: d.rewardItemId ? stackItems(state.inventory.stacks, [{ itemId: d.rewardItemId, quantity: d.rewardItemQty || 1 }]) : state.inventory.stacks }, quests: state.quests.map(x => x.questId === questId ? { ...x, status: 'claimed' } : x) };
    const idx = quests_1.QUESTS.findIndex(x => x.id === questId), nextDef = quests_1.QUESTS[idx + 1];
    if (nextDef)
        next = { ...next, quests: next.quests.map(x => x.questId === nextDef.id && x.status === 'locked' ? { ...x, status: 'active' } : x) };
    return (0, combat_companions_1.reconcileCombatCompanionUnlocks)(refreshQuests(next), state.activity?.lastClaimAtMs ?? state.createdAtMs);
}
/** Offline contract claims are deterministic; online mode can replace this with the same server-authoritative contract ID. */
function claimSeasonalContract(state, period, contractId, nowMs = Date.now()) {
    if (!state.character)
        throw new Error('Create a character first');
    const contract = (0, seasonal_quests_1.seasonalQuestBoard)(state, period, new Date(nowMs)).find(entry => entry.id === contractId);
    if (!contract)
        throw new Error('This contract has expired.');
    if ((state.account.seasonalContractClaimIds ?? []).includes(contract.id))
        throw new Error('This contract reward was already claimed.');
    if (contract.progress < contract.required)
        throw new Error('Complete the contract before claiming its cache.');
    const xp = state.character.xp + contract.rewardXp, level = (0, progression_1.characterLevelFromXp)(xp);
    const routed = routeRewards(state, [{ itemId: contract.rewardItemId, quantity: contract.rewardItemQty }], nowMs);
    const claimed = [...(state.account.seasonalContractClaimIds ?? []), contract.id].slice(-120);
    return refreshQuests({ ...state, ...routed, character: { ...state.character, xp, level, gold: state.character.gold + contract.rewardGold }, account: { ...state.account, seasonalContractClaimIds: claimed } });
}
function claimActivity(state, nowMs) {
    if (state.character?.classTraining) {
        const r = (0, class_skills_2.settleClassDrills)(state, nowMs, offlineCapSeconds(state));
        return { ...r, state: (0, combat_companions_1.reconcileCombatCompanionUnlocks)(r.state, nowMs) };
    }
    if (state.activity?.kind === 'faith') {
        const settled = (0, faith_1.settleFaithPractice)(state, nowMs, offlineCapSeconds(state));
        const reward = settled.reward;
        const routed = settled.refund ? routeRewards(state, [{ itemId: faith_2.HOLY_WATER_ID, quantity: settled.refund }], nowMs) : { inventory: state.inventory, bank: state.bank, overflow: state.overflow };
        const faith = (0, faith_1.normalizeFaith)(settled.state.character.faith);
        const faithXp = Math.min((0, progression_1.totalXpAtLevel)(100), Math.max(settled.state.character.faith?.xp ?? 0, (state.skills.find(x => x.skillId === 'faith')?.xp ?? 0) + (reward.faithXp ?? 0)));
        const skills = state.skills.map(x => x.skillId === 'faith' ? { ...x, xp: faithXp, level: (0, progression_1.levelFromXp)(faithXp) } : x);
        const next = { ...settled.state, ...routed, skills, activity: faith?.practice ? { ...state.activity, lastClaimAtMs: nowMs } : null };
        return { state: next, reward };
    }
    if (state.activity?.kind === 'alchemy') {
        if (nowMs <= state.activity.lastClaimAtMs)
            return { state, reward: previewActivityReward(state, state.activity.lastClaimAtMs) };
        const reward = previewActivityReward(state, nowMs), brew = state.activity.brew;
        const routed = routeRewards(state, reward.items, nowMs);
        const skills = state.skills.map(x => x.skillId === 'alchemy' ? { ...x, xp: Math.min((0, progression_1.totalXpAtLevel)(100), x.xp + (reward.xp ?? 0)), level: (0, progression_1.levelFromXp)(Math.min((0, progression_1.totalXpAtLevel)(100), x.xp + (reward.xp ?? 0))) } : x);
        const next = { ...state, ...routed, skills, rewardRemainders: reward.nextRewardRemainders, activity: reward.nextBrewRemaining ? { ...state.activity, lastClaimAtMs: nowMs, progressFraction: reward.nextProgressFraction, brew: { ...brew, remainingBatches: reward.nextBrewRemaining } } : null };
        return { state: next, reward };
    }
    const reward = previewActivityReward(state, nowMs);
    if (!state.character || !state.activity)
        return { state, reward };
    if (state.activity.kind !== 'combat') {
        const skills = state.skills.map(x => x.skillId === state.activity.kind ? { ...x, xp: x.xp + reward.xp, level: (0, progression_1.levelFromXp)(x.xp + reward.xp) } : x);
        const routed = routeRewards(state, reward.items, nowMs);
        const next = { ...state, skills, ...routed, rewardRemainders: reward.nextRewardRemainders, unlockedMonsterIds: [...new Set([...state.unlockedMonsterIds, ...(reward.explorationDiscoveries ?? [])])], activity: { ...state.activity, lastClaimAtMs: nowMs, progressFraction: reward.nextProgressFraction } };
        return { state: (0, companion_runtime_1.recordCompanionActivity)(refreshQuests((0, live_events_1.applyEventDiscoveries)((0, live_events_1.applyEventDrops)(next, reward.eventDrops ?? []), reward.eventDiscoveries ?? [])), 'gathering', state.activity.targetId, reward.kills, nowMs), reward };
    }
    const xp = state.character.xp + reward.xp, level = (0, progression_1.characterLevelFromXp)(xp);
    const activeRegion = (0, combat_region_1.currentRegionId)(state);
    const unlocked = monsters_1.MONSTERS.filter(m => !m.boss && m.unlockLevel <= level && (0, world_weather_1.zoneIdForTarget)(m.id) === activeRegion).map(m => m.id);
    let baseInventory = state.inventory.stacks;
    if (reward.foodConsumed && state.character.equippedFoodId)
        baseInventory = consume(baseInventory, state.character.equippedFoodId, reward.foodConsumed);
    const routed = routeRewards({ ...state, inventory: { ...state.inventory, stacks: baseInventory } }, reward.items, nowMs);
    const shouldStop = !!reward.stoppedReason;
    const monster = monsters_1.MONSTERS.find(m => m.id === state.activity.targetId);
    const trained = (0, class_skills_2.awardCombatClassXp)(state.character, reward.kills, monster.xp * (0, world_weather_1.environmentEffectForActivity)(state.activity).effect.xpMultiplier * (0, permanent_boosts_1.characterPermanentMultipliers)(state).skillXpMultiplier, state.activity.classFocus).character;
    const next = { ...state, ...routed, character: { ...state.character, xp, level, gold: state.character.gold + reward.gold, currentHp: reward.endHp ?? state.character.currentHp }, activity: shouldStop ? null : { ...state.activity, lastClaimAtMs: nowMs }, unlockedMonsterIds: [...new Set([...state.unlockedMonsterIds, ...unlocked])] };
    next.character = { ...next.character, classSkills: trained.classSkills, classSkillRemainders: trained.classSkillRemainders, masteryMaterialRemainders: reward.masteryMaterialRemainders };
    if (next.character.preparation && reward.kills > 0) {
        let prep = next.character.preparation;
        for (let i = 0; i < reward.kills; i++)
            prep = (0, alchemy_1.spendPreparationEncounter)(prep, prep?.itemId);
        next.character = { ...next.character, preparation: prep };
    }
    if (next.activity && reward.kills > 0)
        next.activity.classFocus = (0, class_skills_2.normalizeTrainingFocus)(next.character.trainingFocus);
    return { state: (0, companion_runtime_1.recordCompanionActivity)((0, monster_mastery_1.recordMonsterMastery)(refreshQuests((0, live_events_1.applyEventDiscoveries)((0, live_events_1.applyEventDrops)(next, reward.eventDrops ?? []), reward.eventDiscoveries ?? []), state.activity.targetId, reward.kills), state.activity.targetId, reward.kills), 'combat', state.activity.targetId, reward.kills, nowMs), reward };
}
function finishClassDrills(state, now) {
    if (!state.character?.classTraining)
        return state;
    const next = (0, class_skills_2.settleClassDrills)(state, now, offlineCapSeconds(state)).state;
    return { ...next, character: { ...next.character, classTraining: undefined } };
}
function startClassTraining(state, now) {
    const settled = claimActivity(state, now).state;
    if (!settled.character)
        throw new Error('Create a character first.');
    if ((0, class_skills_2.characterClassSkills)(settled.character).every(s => s.level === 100))
        throw new Error('Both class skills are at maximum level.');
    if (settled.character.classTraining)
        return settled;
    return { ...settled, activity: null, character: { ...settled.character, classTraining: { lastClaimAtMs: now, progressMs: 0, focus: (0, class_skills_2.normalizeTrainingFocus)(settled.character.trainingFocus), xpPerDrill: 8 * (0, permanent_boosts_1.characterPermanentMultipliers)(settled).skillXpMultiplier } } };
}
function stopActivity(state) {
    if (state.activity?.kind === 'faith') {
        const settled = claimActivity(state, state.activity.lastClaimAtMs).state;
        const cancelled = (0, faith_1.cancelFaithPractice)(settled);
        return { ...cancelled.state, ...routeRewards(cancelled.state, cancelled.refund ? [{ itemId: faith_2.HOLY_WATER_ID, quantity: cancelled.refund }] : [], state.activity.lastClaimAtMs), activity: null };
    }
    if (state.activity?.kind === 'alchemy') {
        const brew = state.activity.brew;
        if (!brew)
            return { ...state, activity: null };
        const refund = (0, alchemy_1.alchemyRefund)(brew), routed = routeRewards(state, refund.items, state.activity.lastClaimAtMs);
        return { ...state, ...routed, character: state.character ? { ...state.character, gold: state.character.gold + refund.gold } : null, activity: null };
    }
    return { ...state, activity: null, character: state.character ? { ...state.character, classTraining: undefined } : null };
}
function equipItem(state, itemId) {
    if (!state.character)
        throw new Error('No character');
    const d = (0, items_1.itemDef)(itemId);
    if (d.type !== 'gear' || !d.slot)
        throw new Error('Not gear');
    if (d.classRestriction && d.classRestriction !== state.character.classId)
        throw new Error('This gear belongs to another class');
    let stacks = consume(state.inventory.stacks, itemId, 1);
    const old = state.character.equipment[d.slot];
    if (old)
        stacks = stackItems(stacks, [{ itemId: old, quantity: 1 }]);
    const temp = { ...state, inventory: { ...state.inventory, stacks }, character: { ...state.character, equipment: { ...state.character.equipment, [d.slot]: itemId } } };
    const maxHp = effectiveStats(temp).hp;
    temp.character.currentHp = Math.min(maxHp, temp.character.currentHp + (d.hp || 0));
    return refreshQuests(temp);
}
function equipFood(state, itemId) { if (!state.character)
    throw new Error('No character'); const d = (0, items_1.itemDef)(itemId); if (d.type !== 'food')
    throw new Error('Not food'); if (stackQty(state.inventory.stacks, itemId) <= 0)
    throw new Error('No food available'); return { ...state, character: { ...state.character, equippedFoodId: itemId } }; }
function eatFood(state, itemId) { if (!state.character)
    return state; const id = itemId || state.character.equippedFoodId; if (!id)
    return state; const d = (0, items_1.itemDef)(id); if (d.type !== 'food' || !d.heal)
    throw new Error('Not food'); const maxHp = effectiveStats(state).hp; return { ...state, inventory: { ...state.inventory, stacks: consume(state.inventory.stacks, id, 1) }, character: { ...state.character, currentHp: Math.min(maxHp, state.character.currentHp + d.heal) } }; }
function usePotion(state, itemId) { if (!state.character)
    throw new Error('Create a character first.'); const potion = (0, alchemy_2.potionDef)(itemId); if (!potion)
    throw new Error('Unknown potion.'); if (state.activity?.kind === 'combat')
    throw new Error('Potions cannot be used during a hunt.'); const stacks = consume(state.inventory.stacks, itemId, 1); if (potion.effect.kind === 'healing') {
    const max = effectiveStats(state).hp;
    return { ...state, inventory: { ...state.inventory, stacks }, character: { ...state.character, currentHp: Math.min(max, state.character.currentHp + Math.ceil(max * potion.effect.maxHpFraction)) } };
} return { ...state, inventory: { ...state.inventory, stacks }, character: { ...state.character, preparation: { itemId, remainingEncounters: potion.effect.encounters } } }; }
function discardPreparation(state) { return state.character?.preparation ? { ...state, character: { ...state.character, preparation: undefined } } : state; }
function unequipItem(state, slot) { if (!state.character)
    return state; const old = state.character.equipment[slot]; if (!old)
    return state; const eq = { ...state.character.equipment }; delete eq[slot]; const next = { ...state, inventory: { ...state.inventory, stacks: stackItems(state.inventory.stacks, [{ itemId: old, quantity: 1 }]) }, character: { ...state.character, equipment: eq } }; next.character.currentHp = Math.min(effectiveStats(next).hp, next.character.currentHp); return next; }
function sellItem(state, itemId, quantity = 1) { if (!state.character || quantity <= 0)
    return state; if (itemId === faith_2.HOLY_WATER_ID)
    throw new Error('Holy Water cannot be sold.'); const discovered = (0, character_skins_1.discoverCharacterSkins)(state), d = (0, items_1.itemDef)(itemId); if (d.type === 'gear' && (0, equipment_enhancement_1.hasEnhancement)(discovered, itemId))
    throw new Error('Enhanced equipment is protected. Extract its gems before disposal; upgraded ranks cannot be recovered.'); return { ...discovered, inventory: { ...discovered.inventory, stacks: consume(discovered.inventory.stacks, itemId, quantity) }, character: { ...discovered.character, gold: discovered.character.gold + d.value * quantity } }; }
function salvageItem(state, itemId) { const discovered = (0, character_skins_1.discoverCharacterSkins)(state), d = (0, items_1.itemDef)(itemId); if (d.type !== 'gear' || !d.salvage)
    throw new Error('Cannot salvage'); if ((0, equipment_enhancement_1.hasEnhancement)(discovered, itemId))
    throw new Error('Enhanced equipment is protected. Extract its gems before disposal; upgraded ranks cannot be recovered.'); return { ...discovered, inventory: { ...discovered.inventory, stacks: stackItems(consume(discovered.inventory.stacks, itemId, 1), [d.salvage]) } }; }
function depositToBank(state, itemId, quantity) {
    if (quantity <= 0)
        return state;
    const invQty = stackQty(state.inventory.stacks, itemId);
    if (invQty < quantity)
        throw new Error('Not enough items in inventory');
    const removed = consume(state.inventory.stacks, itemId, quantity);
    const added = addBounded(state.bank.stacks, state.bank.capacity, [{ itemId, quantity }]);
    if (added.overflow.length)
        throw new Error('Bank is full');
    return { ...state, inventory: { ...state.inventory, stacks: removed }, bank: { ...state.bank, stacks: added.stacks } };
}
function withdrawFromBank(state, itemId, quantity) {
    if (quantity <= 0)
        return state;
    const bankQty = stackQty(state.bank.stacks, itemId);
    if (bankQty < quantity)
        throw new Error('Not enough items in Bank');
    const removed = consume(state.bank.stacks, itemId, quantity);
    const added = addBounded(state.inventory.stacks, state.inventory.capacity, [{ itemId, quantity }]);
    if (added.overflow.length)
        throw new Error('Inventory is full');
    return { ...state, bank: { ...state.bank, stacks: removed }, inventory: { ...state.inventory, stacks: added.stacks } };
}
const STORAGE_UPGRADES = {
    inventory: [{ capacity: 40, cost: 500 }, { capacity: 50, cost: 1500 }, { capacity: 60, cost: 4000 }, { capacity: 75, cost: 10000 }, { capacity: 100, cost: 25000 }],
    bank: [{ capacity: 160, cost: 1000 }, { capacity: 220, cost: 3000 }, { capacity: 300, cost: 8000 }, { capacity: 400, cost: 20000 }, { capacity: 500, cost: 50000 }],
};
function storageUpgradePreview(state, location) { const current = state[location].capacity; return STORAGE_UPGRADES[location].find(tier => tier.capacity > current) ?? null; }
function upgradeStorage(state, location) {
    if (!state.character)
        throw new Error('Create a character first');
    const next = storageUpgradePreview(state, location);
    if (!next)
        throw new Error(`${location === 'bank' ? 'Bank' : 'Inventory'} capacity is already maxed`);
    if (state.character.gold < next.cost)
        throw new Error(`Requires ${next.cost.toLocaleString()} gold`);
    return { ...state, [location]: { ...state[location], capacity: next.capacity }, character: { ...state.character, gold: state.character.gold - next.cost } };
}
/** Moves every material stack that fits. Food, gear and quest items remain carried. */
function depositAllMaterials(state) {
    let next = state, moved = 0;
    for (const stack of state.inventory.stacks.filter(entry => (0, items_1.itemDef)(entry.itemId).type === 'material')) {
        try {
            next = depositToBank(next, stack.itemId, stack.quantity);
            moved += stack.quantity;
        }
        catch (error) {
            if (!(error instanceof Error) || error.message !== 'Bank is full')
                throw error;
        }
    }
    if (!moved)
        throw new Error(state.inventory.stacks.some(entry => (0, items_1.itemDef)(entry.itemId).type === 'material') ? 'Bank has no room for these materials' : 'No carried materials to deposit');
    return next;
}
function combinedQty(state, itemId) { return stackQty(state.inventory.stacks, itemId) + stackQty(state.bank.stacks, itemId); }
function consumeInventoryThenBank(state, itemId, quantity) {
    if (combinedQty(state, itemId) < quantity)
        throw new Error('Not enough items');
    const fromInv = Math.min(stackQty(state.inventory.stacks, itemId), quantity);
    const inv = fromInv ? consume(state.inventory.stacks, itemId, fromInv) : state.inventory.stacks;
    const left = quantity - fromInv;
    const bank = left ? consume(state.bank.stacks, itemId, left) : state.bank.stacks;
    return { inventory: inv, bank };
}
function claimOverflowToBank(state) {
    if (!state.overflow.stacks.length)
        return state;
    const added = addBounded(state.bank.stacks, state.bank.capacity, state.overflow.stacks);
    return { ...state, bank: { ...state.bank, stacks: added.stacks }, overflow: { stacks: added.overflow, expiresAtMs: added.overflow.length ? state.overflow.expiresAtMs : null } };
}
function startGathering(state, targetId, nowMs) { if (herbalism_1.HERB_NODES.some(x => x.id === targetId))
    return startHerbalism(state, targetId, nowMs); state = finishClassDrills(state, nowMs); const g = skills_1.GATHERING.find(x => x.id === targetId); if (!g)
    throw new Error('Unknown gathering target'); const skill = state.skills.find(x => x.skillId === g.skillId); if (!skill || skill.level < g.unlockLevel)
    throw new Error('Skill level too low'); if (g.zoneId !== (0, combat_region_1.currentRegionId)(state)) {
    const zone = world_map_1.WORLD_ZONES.find(entry => entry.id === g.zoneId);
    throw new Error(`Travel to ${zone?.name ?? g.zoneId} before gathering ${g.name}`);
} return { ...state, activity: { kind: g.skillId, targetId, startedAtMs: nowMs, lastClaimAtMs: nowMs, environment: (0, world_weather_1.captureActivityEnvironment)(targetId, nowMs) } }; }
function startHerbalism(state, targetId, nowMs) { state = finishClassDrills(state, nowMs); const g = herbalism_1.HERB_NODES.find(x => x.id === targetId); if (!g)
    throw new Error('Unknown herbalism node'); const skill = state.skills.find(x => x.skillId === 'herbalism'); if (!skill || skill.level < g.unlockLevel)
    throw new Error('Herbalism level too low'); if (g.zoneId !== (0, combat_region_1.currentRegionId)(state))
    throw new Error(`Travel to ${g.zoneId} before gathering ${g.name}`); if (state.activity)
    throw new Error('Settle and stop the current activity first'); return { ...state, activity: { kind: 'herbalism', targetId, startedAtMs: nowMs, lastClaimAtMs: nowMs, environment: (0, world_weather_1.captureActivityEnvironment)(targetId, nowMs) } }; }
function startExploration(state, routeId, nowMs) { state = finishClassDrills(state, nowMs); const route = (0, exploration_1.explorationRoute)(routeId); if (!route)
    throw new Error('Unknown exploration route'); if (!state.character || state.character.level < route.requiredLevel)
    throw new Error(`Reach character level ${route.requiredLevel} to explore this route`); if (route.zoneId !== (0, combat_region_1.currentRegionId)(state))
    throw new Error(`Travel to ${route.zoneId} before exploring`); if (state.activity)
    throw new Error('Settle and stop the current activity first'); return { ...state, activity: { kind: 'exploration', targetId: routeId, startedAtMs: nowMs, lastClaimAtMs: nowMs, environment: (0, world_weather_1.captureActivityEnvironment)(routeId, nowMs) } }; }
function equipGatheringTool(state, itemId) {
    if (!state.character)
        throw new Error('Create a character first');
    const tool = (0, gathering_tools_2.gatheringToolDef)(itemId);
    if (!tool)
        throw new Error('Not a gathering tool');
    const skill = state.skills.find(entry => entry.skillId === tool.skillId);
    if (!skill || skill.level < tool.unlockLevel)
        throw new Error(`Requires ${tool.skillId} level ${tool.unlockLevel}`);
    const currentId = state.character.equippedToolIds?.[tool.skillId];
    if (currentId === itemId)
        return state;
    let stacks = consume(state.inventory.stacks, itemId, 1);
    if (currentId)
        stacks = stackItems(stacks, [{ itemId: currentId, quantity: 1 }]);
    return { ...state, inventory: { ...state.inventory, stacks }, character: { ...state.character, equippedToolIds: { ...(state.character.equippedToolIds ?? {}), [tool.skillId]: itemId } } };
}
function unequipGatheringTool(state, skillId) {
    if (!state.character)
        return state;
    const currentId = state.character.equippedToolIds?.[skillId];
    if (!currentId)
        return state;
    const equippedToolIds = { ...(state.character.equippedToolIds ?? {}) };
    delete equippedToolIds[skillId];
    const added = addBounded(state.inventory.stacks, state.inventory.capacity, [{ itemId: currentId, quantity: 1 }]);
    if (added.overflow.length)
        throw new Error('Free one Inventory slot before unequipping this tool');
    return { ...state, inventory: { ...state.inventory, stacks: added.stacks }, character: { ...state.character, equippedToolIds } };
}
function craftRecipe(state, recipeId, nowMs = Date.now()) {
    if (!state.character)
        throw new Error('No character');
    if (recipeId.startsWith('BREW_'))
        throw new Error('Timed alchemy recipes must be started as a batch.');
    const r = skills_1.RECIPES.find(x => x.id === recipeId);
    if (!r)
        throw new Error('Unknown recipe');
    if (r.classId && r.classId !== state.character.classId)
        throw new Error('This recipe belongs to another class');
    if (state.character.level < (r.characterLevel ?? 1))
        throw new Error(`Requires character level ${r.characterLevel}`);
    if (r.requiresCraftedItemId && !state.character.craftedNoviceItemIds?.includes(r.requiresCraftedItemId))
        throw new Error(`Craft ${(0, items_1.itemDef)(r.requiresCraftedItemId).name} first`);
    const sk = state.skills.find(x => x.skillId === r.skillId);
    if (!sk || sk.level < r.level)
        throw new Error('Skill level too low');
    if (state.character.gold < r.gold)
        throw new Error('Not enough gold');
    let inv = state.inventory.stacks, bank = state.bank.stacks;
    let temp = { ...state, inventory: { ...state.inventory, stacks: inv }, bank: { ...state.bank, stacks: bank } };
    for (const i of r.inputs) {
        const consumed = consumeInventoryThenBank(temp, i.itemId, i.quantity);
        inv = consumed.inventory;
        bank = consumed.bank;
        temp = { ...temp, inventory: { ...temp.inventory, stacks: inv }, bank: { ...temp.bank, stacks: bank } };
    }
    const output = addBounded(inv, state.inventory.capacity, [r.output]);
    inv = output.stacks;
    if (output.overflow.length) {
        const b = addBounded(bank, state.bank.capacity, output.overflow);
        bank = b.stacks;
        if (b.overflow.length)
            throw new Error('Inventory and Bank are full');
    }
    const multipliers = (0, permanent_boosts_1.characterPermanentMultipliers)(state);
    const xp = sk.xp + Math.floor(r.xp * multipliers.skillXpMultiplier);
    const next = { ...state, character: { ...state.character, gold: state.character.gold - r.gold, ...(r.noviceSetId ? { craftedNoviceItemIds: [...new Set([...(state.character.craftedNoviceItemIds ?? []), r.output.itemId])] } : {}) }, inventory: { ...state.inventory, stacks: inv }, bank: { ...state.bank, stacks: bank }, skills: state.skills.map(x => x.skillId === r.skillId ? { ...x, xp, level: (0, progression_1.levelFromXp)(xp) } : x) };
    return (0, items_1.itemDef)(r.output.itemId).type === 'gear' ? (0, companion_runtime_1.recordCompanionActivity)(refreshQuests((0, live_events_1.grantEventActivity)(next, 'crafting', nowMs)), 'crafting', r.output.itemId, r.output.quantity, nowMs) : refreshQuests((0, live_events_1.grantEventActivity)(next, 'crafting', nowMs));
}
/** Equip owned novice pieces atomically. No gear is granted, discarded or taken from overflow. */
function equipNoviceSet(state) {
    if (!state.character)
        throw new Error('No character');
    const set = (0, novice_sets_1.noviceSetFor)(state.character.classId), equipment = { ...state.character.equipment };
    let next = state;
    const replaced = [];
    for (const slot of set.slots) {
        const id = (0, novice_sets_1.noviceItemId)(set.classId, slot);
        if (equipment[slot] === id)
            continue;
        if (combinedQty(next, id) < 1)
            throw new Error(`Missing ${(0, items_1.itemDef)(id).name} in Inventory or Bank`);
        const consumed = consumeInventoryThenBank(next, id, 1);
        next = { ...next, inventory: { ...next.inventory, stacks: consumed.inventory }, bank: { ...next.bank, stacks: consumed.bank } };
        if (equipment[slot])
            replaced.push({ itemId: equipment[slot], quantity: 1 });
        equipment[slot] = id;
    }
    // Full-state artwork has no independent cape or unrelated offhand overlay.
    for (const slot of ['cape', 'offhand']) {
        if (!set.slots.includes(slot) && equipment[slot]) {
            replaced.push({ itemId: equipment[slot], quantity: 1 });
            delete equipment[slot];
        }
    }
    const inv = addBounded(next.inventory.stacks, next.inventory.capacity, replaced);
    const bank = addBounded(next.bank.stacks, next.bank.capacity, inv.overflow);
    if (bank.overflow.length)
        throw new Error('Free Inventory or Bank space for replaced equipment');
    next = { ...next, inventory: { ...next.inventory, stacks: inv.stacks }, bank: { ...next.bank, stacks: bank.stacks }, character: { ...state.character, equipment } };
    next.character.currentHp = Math.min(state.character.currentHp, effectiveStats(next).hp);
    return refreshQuests(next);
}
function regionalReadiness(state) {
    if (!state.character)
        return { total: 0, level: 0, quest: 0, equipment: 0, food: 0, mastery: 0, recommended: false };
    const level = Math.min(30, Math.floor(state.character.level / 25 * 30));
    const q14 = state.quests.find(q => q.questId === 'QST_014');
    const quest = q14 && q14.status !== 'locked' ? 15 : 0;
    let equipment = 0;
    for (const id of Object.values(state.character.equipment)) {
        if (id)
            equipment += (0, items_1.itemDef)(id).readiness || 0;
    }
    equipment = Math.min(35, equipment);
    const foodDef = state.character.equippedFoodId ? (0, items_1.itemDef)(state.character.equippedFoodId) : undefined;
    const foodQty = stackQty(state.inventory.stacks, state.character.equippedFoodId);
    const food = Math.min(10, (foodDef?.readiness || 0) + (foodQty >= 10 ? 3 : foodQty >= 5 ? 2 : foodQty > 0 ? 1 : 0));
    const get = (id) => state.skills.find(s => s.skillId === id)?.level || 1;
    let mastery = 0;
    if (get('mining') >= 15)
        mastery += 2;
    if (get('smithing') >= 18)
        mastery += 3;
    if (get('fishing') >= 14)
        mastery += 2;
    if (get('cooking') >= 16)
        mastery += 3;
    mastery = Math.min(10, mastery);
    const total = level + quest + equipment + food + mastery;
    return { total, level, quest, equipment, food, mastery, recommended: total >= 80 };
}
function fallenKnightWinChance(state) { const r = regionalReadiness(state).total; if (r < 50)
    return .10; if (r < 60)
    return .18; if (r < 70)
    return .34; if (r < 80)
    return .48; if (r < 90)
    return .64; if (r < 100)
    return .82; return .90; }
/** One optional rematch attempt per UTC day, without repeating story loot. */
function challengeFallenKnightRematch(state, nowMs) {
    if (!state.character || state.character.level < 25 || !state.defeatedBossIds.includes('FALLEN_KNIGHT'))
        throw new Error('Defeat the Fallen Knight in the story first.');
    if (nowMs < (state.account.companionBossRematchReadyAtMs ?? 0))
        throw new Error('The next rematch unlocks at 00:00 UTC.');
    const readyAt = (Math.floor(nowMs / 86400000) + 1) * 86400000;
    let next = { ...state, account: { ...state.account, companionBossRematchReadyAtMs: readyAt } };
    const chance = Math.min(.95, fallenKnightWinChance(state) * (0, combat_companions_1.companionCombatContribution)(state).outputMultiplier);
    const won = (0, rng_1.random01)(`${state.character.id}:COMPANION_FALLEN_KNIGHT:${Math.floor(nowMs / 86400000)}`, 0) < chance;
    next.account.companionLastBattle = { title: 'Fallen Knight rematch', won, durationMs: 0, gold: 0, essence: won ? 40 : 0, bondstones: won ? 1 : 0, atMs: nowMs };
    if (!won)
        return { state: next, won: false, message: 'The Fallen Knight won the rematch. Improve your readiness and try again after 00:00 UTC.' };
    // Count an existing story clear even when upgrading a save predating companion counters.
    next.account.companionBossClears = { ...next.account.companionBossClears, FALLEN_KNIGHT: Math.max(1, next.account.companionBossClears?.FALLEN_KNIGHT ?? 0) };
    next = (0, companion_runtime_1.recordCompanionActivity)((0, combat_companions_1.grantBondstones)((0, combat_companions_1.grantCompanionEssence)(next, 40), 1), 'boss', 'FALLEN_KNIGHT', 1, nowMs);
    return { state: next, won: true, message: 'Fallen Knight rematch won: +40 Companion Essence, +1 Bondstone. Companion boss progression recorded.' };
}
function challengeFallenKnight(state, nowMs = Date.now()) {
    if (!state.character)
        throw new Error('No character');
    if (state.character.level < 25)
        return { state, won: false, message: 'Reach level 25 first.' };
    if (state.defeatedBossIds.includes('FALLEN_KNIGHT'))
        return { state, won: true, message: 'The Fallen Knight is already defeated.' };
    const q14 = state.quests.find(q => q.questId === 'QST_014');
    if (q14 && q14.status === 'locked')
        return { state, won: false, message: 'Advance the Asterfall questline before challenging the Fallen Knight.' };
    const ready = regionalReadiness(state);
    const chance = fallenKnightWinChance(state);
    const roll = (0, rng_1.random01)(`${state.character.id}:FALLEN_KNIGHT:${nowMs}`, 0);
    const won = roll < chance;
    if (!won)
        return { state, won: false, message: `Fallen Knight repelled you. Readiness ${ready.total}/100 (gear ${ready.equipment}/35, food ${ready.food}/10, mastery ${ready.mastery}/10). Recommended: 80+.` };
    const xp = state.character.xp + 3000;
    let next = { ...state, defeatedBossIds: [...state.defeatedBossIds, 'FALLEN_KNIGHT'], character: { ...state.character, gold: state.character.gold + 900, xp, level: (0, progression_1.characterLevelFromXp)(xp), currentHp: effectiveStats(state).hp }, inventory: { ...state.inventory, stacks: stackItems(state.inventory.stacks, [{ itemId: 'FALLEN_KNIGHT_SIGIL', quantity: 1 }]) }, activity: null };
    next.character = (0, class_skills_2.awardClassSkillXp)(next.character, 3000 * (0, permanent_boosts_1.characterPermanentMultipliers)(state).skillXpMultiplier).character;
    next = (0, companion_runtime_1.recordCompanionActivity)((0, combat_companions_1.grantBondstones)((0, combat_companions_1.grantCompanionEssence)(refreshQuests((0, live_events_1.grantEventActivity)(next, 'boss', nowMs)), 40), 1), 'boss', 'FALLEN_KNIGHT', 1, nowMs);
    return { state: next, won: true, message: `Fallen Knight defeated at readiness ${ready.total}/100. +40 Companion Essence, +1 Bondstone. The road toward Sunscar is open.` };
}
