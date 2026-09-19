"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classSkillsFor = exports.CLASS_SKILLS = void 0;
const skill = (id, name, theme) => ({ id, name, theme });
const guard = skill('guardcraft', 'Guardcraft', 'Physical protection'), ward = skill('warding', 'Warding', 'Magical protection');
/** Seven workbook pairs, with the two additional tank classes using matching disciplines. */
exports.CLASS_SKILLS = {
    IRONWARDEN: [guard, ward], BASTION: [guard, ward], DREADGUARD: [skill('might', 'Might', 'Weapon power'), ward],
    DAWNKEEPER: [skill('restoration', 'Restoration', 'Healing and recovery'), skill('sanctity', 'Sanctity', 'Protection and cleansing')],
    WAYFINDER: [skill('marksmanship', 'Marksmanship', 'Ranged power'), skill('tracking', 'Tracking', 'Hunting precision')],
    RAVAGER: [skill('might', 'Might', 'Weapon power'), skill('breaking', 'Breaking', 'Armor pressure')],
    HEXWEAVER: [skill('spellcraft', 'Spellcraft', 'Magical power'), skill('hexcraft', 'Hexcraft', 'Hex potency')],
    KNIFE_DANCER: [skill('blade_rhythm', 'Blade Rhythm', 'Attack rhythm'), skill('precision', 'Precision', 'Accuracy and evasion')],
    STONECALLER: [skill('resonance', 'Resonance', 'Support and recovery'), skill('geomancy', 'Geomancy', 'Protection and resilience')],
};
const classSkillsFor = (id) => exports.CLASS_SKILLS[id];
exports.classSkillsFor = classSkillsFor;
