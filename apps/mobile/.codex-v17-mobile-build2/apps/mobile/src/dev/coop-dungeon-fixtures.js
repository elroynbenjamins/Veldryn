"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCoopDungeonFixtureSource = createCoopDungeonFixtureSource;
const i18n_1 = require("../i18n");
const rooms = ['battle', 'elite', 'event', 'camp', 'treasure', 'echo', 'merchant', 'risk', 'boss'];
const difficulties = [1, 2, 3, 4, 5];
const definitions = [
    { id: 'EXP_001', name: 'Rootbound Vault', region: 'Asterfall', min: 15, recommended: 25, implemented: true, description: 'fixture.rootbound' },
    { id: 'EXP_002', name: 'Lanternwatch Descent', region: 'Asterfall', min: 18, recommended: 25, implemented: true, description: 'fixture.lantern' },
    { id: 'EXP_003', name: 'Buried Observatory', region: 'Sunscar', min: 36, recommended: 45, implemented: true, description: 'fixture.observatory' },
    { id: 'EXP_004', name: 'Mirage Well', region: 'Sunscar', min: 32, recommended: 45, implemented: true, description: 'fixture.mirage' },
    { id: 'EXP_005', name: 'Shiverlake Descent', region: 'Frostmarch', min: 52, recommended: 70, implemented: true, description: 'fixture.shiverlake' },
    { id: 'EXP_006', name: 'Choir Caverns', region: 'Frostmarch', min: 57, recommended: 70, implemented: true, description: 'fixture.choir' },
    { id: 'EXP_007', name: 'Blackglass Fen', region: 'Ashlands', min: 77, recommended: 94, implemented: true, description: 'fixture.blackglass' },
    { id: 'EXP_008', name: 'Crucible Depths', region: 'Ashlands', min: 82, recommended: 100, implemented: true, description: 'fixture.crucible' },
];
/** Development-only projection; values mirror the canonical backend launch registry. */
const roles = { IRONWARDEN: 'tank', BASTION: 'tank', DREADGUARD: 'tank', DAWNKEEPER: 'support', STONECALLER: 'support', WAYFINDER: 'damage', RAVAGER: 'damage', HEXWEAVER: 'damage', KNIFE_DANCER: 'damage' };
function createCoopDungeonFixtureSource(language, character) {
    const characterLevel = character?.level ?? 25;
    const dungeons = definitions.map(definition => ({
        id: definition.id, name: definition.name, region: definition.region, description: (0, i18n_1.ct)(language, definition.description), minLevel: definition.min, recommendedLevel: definition.recommended, syncLevel: definition.recommended,
        available: definition.implemented && characterLevel >= definition.min, lockedReason: !definition.implemented ? (0, i18n_1.ct)(language, 'browse.inDevelopment') : characterLevel < definition.min ? (0, i18n_1.ct)(language, 'browse.requiresLevel', { level: definition.min }) : undefined, enabledRoomTypes: rooms, difficulties, preBossRoomMin: 5, preBossRoomMax: 5, estimatedMinutes: { min: 6, max: 8 }, tierMinLevels: { 1: definition.min, 2: definition.min + 5, 3: definition.min + 10, 4: definition.min + 15, 5: definition.min + 20 }, rewardBudgetState: (0, i18n_1.coopPolicyText)(language, 'rewardCadence'),
    }));
    const role = character ? roles[character.classId] : 'damage', characterId = character?.id ?? 'fixture-character', level = characterLevel;
    const before = { maxHp: character?.hp ?? 3400, attackPower: character?.attack ?? 625, healingPower: role === 'support' ? 650 : 120, defense: character?.defense ?? 750 };
    const effective = { ...before, maxHp: Math.min(before.maxHp, role === 'tank' ? 5200 : role === 'support' ? 3800 : 3400), attackPower: Math.min(before.attackPower, role === 'damage' ? 625 : 420), healingPower: Math.min(before.healingPower, role === 'support' ? 650 : 180), defense: Math.min(before.defense, role === 'tank' ? 1500 : role === 'support' ? 900 : 750) };
    const loadouts = [
        { id: 'fixture-ready', characterId, revision: 3, verifiedRevision: 3, name: 'Expedition Build', characterName: character?.name ?? 'Preview Hero', className: character?.classId.replace('_', ' ') ?? 'WAYFINDER', role, status: 'verified', ready: true, failures: [], level, effectiveLevel: Math.min(level, 25), beforeStats: before, effectiveStats: effective, skills: role === 'tank' ? ['Guard', 'Challenge', 'Counter'] : role === 'support' ? ['Restore', 'Ward', 'Cleanse'] : ['Strike', 'Volley', 'Execute'], equipment: ['Saved weapon', 'Saved armor set', 'Saved accessories'], normalizationVersion: 'coop-normalization-v1', verifiedAt: 'development fixture' },
        { id: 'fixture-stale', characterId, revision: 5, verifiedRevision: 4, name: 'Recently Changed', characterName: character?.name ?? 'Preview Hero', className: character?.classId.replace('_', ' ') ?? 'WAYFINDER', role, status: 'stale', ready: false, failures: [], level, skills: ['Snapshot unavailable'], equipment: ['Build changed after verification'] },
    ];
    const eventExpeditions = [
        { id: 'EVENT_SUNCREST_SHATTERED_ISLES', eventName: (0, i18n_1.ct)(language, 'event.suncrest'), name: 'The Shattered Isles', description: (0, i18n_1.ct)(language, 'event.shatteredDescription'), routeHighlights: [(0, i18n_1.ct)(language, 'event.coastalRuins'), (0, i18n_1.ct)(language, 'event.sunShrine'), (0, i18n_1.ct)(language, 'event.pirateCamp')], finalBoss: 'Aureon, First Champion', status: 'preview' },
        { id: 'EVENT_STARFALL_ASTRAL_RIFT', eventName: (0, i18n_1.ct)(language, 'event.starfall'), name: 'Astral Rift Expedition', description: (0, i18n_1.ct)(language, 'event.astralDescription'), routeHighlights: [(0, i18n_1.ct)(language, 'event.meteorField'), (0, i18n_1.ct)(language, 'event.starShrine'), (0, i18n_1.ct)(language, 'event.riftGate')], finalBoss: 'The Constellation Eater', status: 'preview' },
    ];
    return { kind: 'fixture', load: async () => ({ dungeons, eventExpeditions, loadouts }) };
}
