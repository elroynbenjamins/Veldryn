"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvedCharacterSkinArtwork = exports.startingCharacterArtwork = exports.classIconArtwork = exports.classArtwork = void 0;
const accepted_front_character_assets_1 = require("./accepted-front-character-assets");
const event_character_assets_1 = require("./event-character-assets");
var class_emblem_assets_1 = require("./class-emblem-assets");
Object.defineProperty(exports, "classArtwork", { enumerable: true, get: function () { return class_emblem_assets_1.classEmblemArtwork; } });
Object.defineProperty(exports, "classIconArtwork", { enumerable: true, get: function () { return class_emblem_assets_1.classEmblemIconArtwork; } });
/** Shared neutral creation skin used by every class until a set skin is chosen. */
exports.startingCharacterArtwork = {
    male: {
        front: require('../../assets/character-base-v1/male-front.png'),
        back: require('../../assets/character-base-v1/male-back.png'),
    },
    female: {
        front: require('../../assets/character-base-v1/female-front.png'),
        back: require('../../assets/character-base-v1/female-back.png'),
    },
};
exports.approvedCharacterSkinArtwork = {
    ...accepted_front_character_assets_1.acceptedFrontCharacterSkinArtwork,
    ...event_character_assets_1.eventCharacterSkinArtwork,
    'beginner-ironwarden-recruit': {
        male: { front: require('../../assets/character-runtime/beginner/ironwarden-recruit/male-front.png'), back: require('../../assets/character-runtime/beginner/ironwarden-recruit/male-back.png') },
        female: { front: require('../../assets/character-runtime/beginner/ironwarden-recruit/female-front.png'), back: require('../../assets/character-runtime/beginner/ironwarden-recruit/female-back.png') },
    },
    'beginner-wallkeeper-initiate': {
        male: { front: require('../../assets/character-runtime/beginner/wallkeeper-initiate/male-front.png'), back: require('../../assets/character-runtime/beginner/wallkeeper-initiate/male-back.png') },
        female: { front: require('../../assets/character-runtime/beginner/wallkeeper-initiate/female-front.png'), back: require('../../assets/character-runtime/beginner/wallkeeper-initiate/female-back.png') },
    },
    'beginner-chainwatch-novice': {
        male: { front: require('../../assets/character-runtime/beginner/chainwatch-novice/male-front.png'), back: require('../../assets/character-runtime/beginner/chainwatch-novice/male-back.png') },
        female: { front: require('../../assets/character-runtime/beginner/chainwatch-novice/female-front.png'), back: require('../../assets/character-runtime/beginner/chainwatch-novice/female-back.png') },
    },
    'beginner-sunlamp-acolyte': {
        male: { front: require('../../assets/character-runtime/beginner/sunlamp-acolyte/male-front.png'), back: require('../../assets/character-runtime/beginner/sunlamp-acolyte/male-back.png') },
        female: { front: require('../../assets/character-runtime/beginner/sunlamp-acolyte/female-front.png'), back: require('../../assets/character-runtime/beginner/sunlamp-acolyte/female-back.png') },
    },
    'beginner-trailbow-scout': {
        male: { front: require('../../assets/character-runtime/beginner/trailbow-scout/male-front.png'), back: require('../../assets/character-runtime/beginner/trailbow-scout/male-back.png') },
        female: { front: require('../../assets/character-runtime/beginner/trailbow-scout/female-front.png'), back: require('../../assets/character-runtime/beginner/trailbow-scout/female-back.png') },
    },
    'beginner-breaksteel-marauder': {
        male: { front: require('../../assets/character-runtime/beginner/breaksteel-marauder/male-front.png'), back: require('../../assets/character-runtime/beginner/breaksteel-marauder/male-back.png') },
        female: { front: require('../../assets/character-runtime/beginner/breaksteel-marauder/female-front.png'), back: require('../../assets/character-runtime/beginner/breaksteel-marauder/female-back.png') },
    },
    'beginner-runespark-adept': {
        male: { front: require('../../assets/character-runtime/beginner/runespark-adept/male-front.png'), back: require('../../assets/character-runtime/beginner/runespark-adept/male-back.png') },
        female: { front: require('../../assets/character-runtime/beginner/runespark-adept/female-front.png'), back: require('../../assets/character-runtime/beginner/runespark-adept/female-back.png') },
    },
    'beginner-twinstep-initiate': {
        male: { front: require('../../assets/character-runtime/beginner/twinstep-initiate/male-front.png'), back: require('../../assets/character-runtime/beginner/twinstep-initiate/male-back.png') },
        female: { front: require('../../assets/character-runtime/beginner/twinstep-initiate/female-front.png'), back: require('../../assets/character-runtime/beginner/twinstep-initiate/female-back.png') },
    },
    'beginner-earthseal-disciple': {
        male: { front: require('../../assets/character-runtime/beginner/earthseal-disciple/male-front.png'), back: require('../../assets/character-runtime/beginner/earthseal-disciple/male-back.png') },
        female: { front: require('../../assets/character-runtime/beginner/earthseal-disciple/female-front.png'), back: require('../../assets/character-runtime/beginner/earthseal-disciple/female-back.png') },
    },
};
