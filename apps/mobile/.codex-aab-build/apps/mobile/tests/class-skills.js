"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const classes_1 = require("../src/content/classes");
const game_1 = require("../src/core/game");
const class_skills_1 = require("../src/core/class-skills");
const game_commands_1 = require("../src/core/game-commands");
const class_skills_2 = require("../src/content/class-skills");
const progression_1 = require("../src/core/progression");
const save_transfer_1 = require("../src/core/save-transfer");
const playability_1 = require("../src/core/playability");
let checks = 0;
const ok = (v, m) => { checks++; if (!v)
    throw new Error(m); };
const rejects = (f, m) => { let threw = false; try {
    f();
}
catch {
    threw = true;
} ok(threw, m); };
const now = Date.UTC(2026, 8, 13), fresh = (id = 'IRONWARDEN') => (0, game_1.createCharacter)((0, game_1.newGame)(now), id, 'Skill Test');
const total = (s) => (0, class_skills_1.characterClassSkills)(s.character).reduce((n, r) => n + r.xp, 0);
for (const cls of classes_1.CLASSES) {
    let s = (0, game_1.startCombat)(fresh(cls.id), 'MOSS_RAT', now);
    const snap = JSON.stringify(s), preview = (0, game_1.previewActivityReward)(s, now + 60000);
    ok(preview.classSkillXp?.every(a => a.xp > 0), 'both skills gain ' + cls.id);
    ok(JSON.stringify(s) === snap, 'preview pure');
    s = (0, game_1.claimActivity)(s, now + 60000).state;
    ok(total(s) > 0, 'combat XP applied');
    ok(total((0, game_1.claimActivity)(s, now + 60000).state) === total(s), 'no replay');
    const base = fresh(cls.id), before = (0, game_1.effectiveStats)(base);
    for (let i = 0; i < 2; i++) {
        const c = structuredClone(base);
        c.character.classSkills = (0, class_skills_2.classSkillsFor)(cls.id).map((d, j) => ({ skillId: d.id, xp: i === j ? class_skills_1.MAX_CLASS_SKILL_XP : 0, level: 1 }));
        const after = (0, game_1.effectiveStats)(c);
        ok(after.hp > before.hp || after.attack > before.attack || after.defense > before.defense, 'each skill improves runtime ' + cls.id);
    }
}
let train = (0, game_1.startClassTraining)(fresh(), now);
train.character.currentHp = 5;
const inventory = JSON.stringify(train.inventory);
const first = (0, game_1.claimActivity)(train, now + 60000);
ok(first.reward.trainingActions === 1 && total(first.state) === 8, '8 XP per drill');
ok(first.state.character.currentHp === 5 && JSON.stringify(first.state.inventory) === inventory, 'drills do not heal or spend food');
ok(first.reward.xp === 0 && first.reward.gold === 0 && first.reward.kills === 0 && !first.reward.eventDrops, 'no unrelated rewards');
let chunks = train;
for (let sec = 10; sec <= 600; sec += 10)
    chunks = (0, game_1.claimActivity)(chunks, now + sec * 1000).state;
const long = (0, game_1.claimActivity)(train, now + 600000).state;
ok(JSON.stringify(chunks.character) === JSON.stringify(long.character), 'drills independent of claim chunking');
let focused = (0, game_commands_1.executeGameCommand)(train, { type: 'class_focus', args: { focus: 'primary' } }, now + 30000).state;
focused = (0, game_1.claimActivity)(focused, now + 60000).state;
ok((0, class_skills_1.characterClassSkills)(focused.character).every(s => s.xp === 4), 'partial drill keeps old focus');
focused = (0, game_1.claimActivity)(focused, now + 120000).state;
ok((0, class_skills_1.characterClassSkills)(focused.character)[0].xp === 10 && (0, class_skills_1.characterClassSkills)(focused.character)[1].xp === 6, 'next drill uses focus');
const capped = (0, game_1.claimActivity)(train, now + 10 * 86400000);
ok(capped.reward.trainingActions === (0, game_1.offlineCapSeconds)(train) / 60, 'offline cap');
ok(total((0, game_1.claimActivity)(capped.state, now + 10 * 86400000).state) === total(capped.state), 'no old excess replay');
const saved = (0, save_transfer_1.parseSaveBackup)((0, save_transfer_1.createSaveBackup)(focused));
ok(total(saved) === total(focused) && saved.character.classTraining?.progressMs === 0, 'save round trip');
ok((0, playability_1.settleStartupActivity)(train, now + 60000).reward?.classSkillXp?.length === 2, 'startup training settlement');
ok(!(0, game_1.startCombat)(train, 'MOSS_RAT', now + 60000).character.classTraining, 'combat replaces drills');
ok(!(0, game_1.startGathering)(train, 'GREENWOOD_TREE', now + 60000).character.classTraining, 'gathering replaces drills');
const gathering = (0, game_1.claimActivity)((0, game_1.startGathering)(fresh(), 'GREENWOOD_TREE', now), now + 60000).state;
ok(total(gathering) === 0, 'gathering gives no class XP');
let maximum = fresh();
maximum.character.classSkills = (0, class_skills_2.classSkillsFor)('IRONWARDEN').map(d => ({ skillId: d.id, xp: class_skills_1.MAX_CLASS_SKILL_XP - 1, level: 99 }));
maximum = (0, game_1.claimActivity)((0, game_1.startClassTraining)(maximum, now), now + 60000).state;
ok((0, class_skills_1.characterClassSkills)(maximum.character).every(s => s.level === 100) && !maximum.character.classTraining, 'drills stop at cap');
rejects(() => (0, game_1.startClassTraining)(maximum, now + 60000), 'cannot restart maxed');
let shade = fresh('KNIFE_DANCER');
shade.character.classSkills = (0, class_skills_2.classSkillsFor)('KNIFE_DANCER').map(d => ({ skillId: d.id, xp: (0, progression_1.totalXpAtLevel)(40), level: 40 }));
shade = (0, game_commands_1.executeGameCommand)(shade, { type: 'claim' }, now).state;
ok(shade.account.unlockedCombatCompanionIds?.includes('UNIT_007'), 'actual class total unlocks Shade');
const normalized = (0, class_skills_1.normalizeClassSkills)('IRONWARDEN', [{ skillId: 'guardcraft', xp: NaN, level: 100 }, { skillId: 'spellcraft', xp: class_skills_1.MAX_CLASS_SKILL_XP }]);
ok(normalized.every(s => s.level === 1), 'invalid XP and cross-class skills discarded');
const a = (0, class_skills_1.awardClassSkillXp)(fresh().character, 14, 'primary');
const b = (0, class_skills_1.awardClassSkillXp)(a.character, 14, 'primary');
ok(b.character.classSkills[0].xp === 21 && b.character.classSkills[1].xp === 7, 'fractional focus XP retained');
rejects(() => (0, game_commands_1.validateGameCommand)({ type: 'class_focus', args: { focus: 'primary', xp: 1000 } }), 'forged XP rejected');
rejects(() => (0, game_commands_1.executeGameCommand)(fresh(), { type: 'class_focus', args: { focus: 'fake' } }, now), 'invalid focus rejected');
const nearCap = fresh();
nearCap.character.classSkills = (0, class_skills_2.classSkillsFor)('IRONWARDEN').map(d => ({ skillId: d.id, xp: class_skills_1.MAX_CLASS_SKILL_XP - 1, level: 99 }));
const capClaim = (0, game_1.claimActivity)((0, game_1.startClassTraining)(nearCap, now), now + 3600000);
ok(capClaim.reward.trainingActions === 1, 'stop counting drills when both skills cap');
console.log(`PASS class skills: ${checks} checks`);
