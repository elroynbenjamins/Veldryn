"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASE_PROFILE_BACKGROUNDS = void 0;
exports.canUseProfileCosmetic = canUseProfileCosmetic;
exports.BASE_PROFILE_BACKGROUNDS = [
    { id: 'asterfall-night', name: 'Asterfall Night', region: 'KINGS_ROAD' },
    { id: 'ironwood-dawn', name: 'Ironwood Dawn', region: 'IRONWOOD' },
    { id: 'silverbrook-mist', name: 'Silverbrook Mist', region: 'SILVERBROOK' },
    { id: 'oathglass-hall', name: 'Oathglass Hall', region: 'KINGS_ROAD' },
];
function canUseProfileCosmetic(state, kind, id) {
    if (!id)
        return kind !== 'background';
    if (kind === 'background' && exports.BASE_PROFILE_BACKGROUNDS.some(item => item.id === id))
        return true;
    const owned = kind === 'background' ? state.account.unlockedProfileBackgroundIds : kind === 'border' ? state.account.unlockedProfileBorderIds : state.account.unlockedCosmeticPetIds;
    return owned?.includes(id) ?? false;
}
