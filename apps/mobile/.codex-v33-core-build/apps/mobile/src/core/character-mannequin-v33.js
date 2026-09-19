"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHARACTER_APPEARANCE_VARIATION_V33 = exports.CHARACTER_BODY_VARIANTS_V33 = void 0;
exports.normalizeCharacterBodyVariantV33 = normalizeCharacterBodyVariantV33;
/**
 * V33 appearance policy: character art uses exactly two fixed approved mannequins.
 * There are no runtime hair, skin-tone, face, or body-composition options.
 */
exports.CHARACTER_BODY_VARIANTS_V33 = ['male', 'female'];
exports.CHARACTER_APPEARANCE_VARIATION_V33 = {
    hair: false,
    skinTone: false,
    face: false,
    runtimeComposition: false,
    equipmentPiecePaperDoll: false,
    fullSetSkinOnFixedMannequin: true,
};
function normalizeCharacterBodyVariantV33(value) {
    return value === 'female' ? 'female' : 'male';
}
