"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.characterNameError = characterNameError;
exports.carouselIndex = carouselIndex;
/** Shared creation policy; existing saves are not renamed. */
function characterNameError(value) {
    const name = value.trim();
    if (name.length < 2)
        return 'Use at least 2 characters.';
    if (name.length > 20)
        return 'Use no more than 20 characters.';
    if (!/^\p{L}[\p{L}\p{M} '\-]*$/u.test(name))
        return 'Use letters, spaces, apostrophes, or hyphens.';
    return '';
}
function carouselIndex(index, direction, count) {
    return count > 0 ? ((index + direction) % count + count) % count : 0;
}
