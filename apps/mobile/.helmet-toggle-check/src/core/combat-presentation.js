"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combatPresentation = combatPresentation;
const game_1 = require("./game");
const class_combat_1 = require("./class-combat");
function combatPresentation(state, monster, elapsedSeconds, cycleSeconds) {
    const stats = (0, game_1.effectiveStats)(state);
    const style = (0, class_combat_1.classCombatStyle)(state.character.classId);
    const cycle = Math.max(1, cycleSeconds), within = elapsedSeconds % cycle;
    const enemyProgress = Math.min(.96, within / cycle);
    const playerHit = Math.max(1, Math.round(stats.attack * 1.35 - monster.defense * .45));
    const enemyHit = Math.max(1, Math.round(((monster.attack - stats.defense * .58) * .48 + monster.level * .16) * style.damageTakenMultiplier));
    const ratio = stats.power / Math.max(1, monster.attack * 1.2 + monster.defense * .8 + monster.level * 2.2);
    const safety = ratio >= 1.15 ? 'safe' : ratio >= .88 ? 'steady' : 'dangerous';
    return { enemyHp: Math.max(1, Math.round(monster.hp * (1 - enemyProgress))), enemyMaxHp: monster.hp, playerHit, enemyHit, safety, style };
}
