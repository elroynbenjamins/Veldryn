"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROFILE_TITLES = exports.PROFILE_BACKGROUNDS = void 0;
exports.profileBackgroundUnlocked = profileBackgroundUnlocked;
exports.setProfileBackground = setProfileBackground;
exports.profileTitleUnlocked = profileTitleUnlocked;
exports.setProfileTitle = setProfileTitle;
exports.PROFILE_BACKGROUNDS = [{ id: 'asterfall-night', name: 'Asterfall Night', requiredLevel: 1 }, { id: 'ironwood-dawn', name: 'Ironwood Dawn', requiredLevel: 10 }, { id: 'silverbrook-mist', name: 'Silverbrook Mist', requiredLevel: 20 }, { id: 'oathglass-hall', name: 'Oathglass Hall', requiredLevel: 25 }];
exports.PROFILE_TITLES = [{ id: 'new-adventurer', name: 'New Adventurer', requiredLevel: 1 }, { id: 'pathfinder', name: 'Pathfinder', requiredLevel: 10 }, { id: 'oathbound', name: 'Oathbound', requiredLevel: 25 }, { id: 'bloomwarden', name: 'Bloomwarden', requiredGuild: true }];
function profileBackgroundUnlocked(state, id) { const c = state.character; if (!c)
    return false; const bg = exports.PROFILE_BACKGROUNDS.find(x => x.id === id); return !!bg && c.level >= bg.requiredLevel; }
function setProfileBackground(state, id) { if (!profileBackgroundUnlocked(state, id))
    throw new Error('Profile background is locked'); return state.character ? { ...state, character: { ...state.character, profileBackgroundId: id } } : state; }
function profileTitleUnlocked(state, id) { const title = exports.PROFILE_TITLES.find(x => x.id === id); return !!title && !!state.character && state.character.level >= (title.requiredLevel ?? 1) && (!title.requiredGuild || state.account.guildMember); }
function setProfileTitle(state, id) { if (!profileTitleUnlocked(state, id))
    throw new Error('Profile title is locked'); const title = exports.PROFILE_TITLES.find(x => x.id === id); return state.character ? { ...state, character: { ...state.character, profileTitle: title.name } } : state; }
