"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLiveProfileAppearance = useLiveProfileAppearance;
exports.saveShowcaseAppearance = saveShowcaseAppearance;
exports.profileEquipment = profileEquipment;
function useLiveProfileAppearance(state) { if (!state.character)
    return state; return { ...state, character: { ...state.character, profileAppearanceMode: 'live' } }; }
function saveShowcaseAppearance(state) { if (!state.character)
    return state; return { ...state, character: { ...state.character, profileAppearanceMode: 'showcase', profileEquipmentSnapshot: { ...state.character.equipment } } }; }
function profileEquipment(state) { const c = state.character; if (!c)
    return {}; return c.profileAppearanceMode === 'showcase' ? (c.profileEquipmentSnapshot ?? {}) : c.equipment; }
