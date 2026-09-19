"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classCreationPresentation = void 0;
exports.classCreationArt = classCreationArt;
const accepted_front_character_assets_1 = require("./accepted-front-character-assets");
/** Approved class illustrations for selection; these do not grant equipment or skins. */
exports.classCreationPresentation = {
    IRONWARDEN: { skin: 'aster-iron', accent: '#70BDFA', traits: 'Guard · Threat · Counterplay' },
    BASTION: { skin: 'lastwall-panoply', accent: '#E8C875', traits: 'Barriers · Fortification · Protection' },
    DREADGUARD: { skin: 'mournchain-harness', accent: '#BC91EF', traits: 'Dread · Control · Self-sustain' },
    DAWNKEEPER: { skin: 'thread-of-dawn', accent: '#F6D884', traits: 'Healing · Cleansing · Protection' },
    WAYFINDER: { skin: 'regretwalker', accent: '#9EC57F', traits: 'Range · Precision · Sustained damage' },
    RAVAGER: { skin: 'lanternsteel-array', accent: '#E99881', traits: 'Heavy melee · Breaking defenses' },
    HEXWEAVER: { skin: 'runespark-adept', accent: '#C4A0FA', traits: 'Hexes · Arcane damage · Focus' },
    KNIFE_DANCER: { skin: 'gloamstep-regalia', accent: '#EC97BC', traits: 'Precision · Critical strikes · Execution' },
    STONECALLER: { skin: 'resonant-tempest', accent: '#85D8D2', traits: 'Resonance · Geomancy · Totems' },
};
function classCreationArt(id) {
    return accepted_front_character_assets_1.acceptedFrontCharacterSkinArtwork[`accepted-front-${exports.classCreationPresentation[id].skin}`];
}
