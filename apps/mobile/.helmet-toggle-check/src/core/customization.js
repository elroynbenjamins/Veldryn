"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CUSTOMIZATION = exports.HAIR_STYLES = exports.HAIR_COLORS = exports.SKIN_TONES = void 0;
exports.normalizeCustomization = normalizeCustomization;
exports.SKIN_TONES = [{ id: 'fair', name: 'Fair', color: '#edc4a4' }, { id: 'light', name: 'Light', color: '#dca879' }, { id: 'warm', name: 'Warm', color: '#bd8956' }, { id: 'tan', name: 'Tan', color: '#98633f' }, { id: 'brown', name: 'Brown', color: '#70462f' }, { id: 'deep', name: 'Deep', color: '#432c24' }];
exports.HAIR_COLORS = [{ id: 'black', name: 'Black', color: '#242221' }, { id: 'dark-brown', name: 'Dark brown', color: '#493322' }, { id: 'chestnut', name: 'Chestnut', color: '#82502e' }, { id: 'blonde', name: 'Blonde', color: '#d5af62' }, { id: 'auburn', name: 'Auburn', color: '#9a4427' }, { id: 'white', name: 'White', color: '#e6ddca' }, { id: 'silver', name: 'Silver', color: '#aeb5bd' }, { id: 'dark-blue', name: 'Dark blue', color: '#293e59' }];
exports.HAIR_STYLES = [{ id: 'bald', name: 'Bald' }, { id: 'cropped', name: 'Cropped cut' }, { id: 'swept-back', name: 'Swept back' }, { id: 'side-part', name: 'Side part' }, { id: 'ponytail', name: 'Tied ponytail' }, { id: 'messy', name: 'Rugged messy' }, { id: 'short', name: 'Hood-compatible short' }, { id: 'bob', name: 'Layered bob' }, { id: 'wavy', name: 'Long wavy' }, { id: 'braid', name: 'Braid' }, { id: 'bun', name: 'Bun' }, { id: 'twin-braids', name: 'Twin braids' }, { id: 'side-ponytail', name: 'Side ponytail' }];
exports.DEFAULT_CUSTOMIZATION = { skinTone: 'warm', hairStyle: 'bald', hairColor: 'dark-brown' };
function normalizeCustomization(value) {
    const input = (value && typeof value === 'object' ? value : {});
    return { skinTone: exports.SKIN_TONES.find(x => x.id === input.skinTone)?.id ?? exports.DEFAULT_CUSTOMIZATION.skinTone, hairStyle: exports.HAIR_STYLES.find(x => x.id === input.hairStyle)?.id ?? exports.DEFAULT_CUSTOMIZATION.hairStyle, hairColor: exports.HAIR_COLORS.find(x => x.id === input.hairColor)?.id ?? exports.DEFAULT_CUSTOMIZATION.hairColor, showHelmet: typeof input.showHelmet === 'boolean' ? input.showHelmet : true };
}
