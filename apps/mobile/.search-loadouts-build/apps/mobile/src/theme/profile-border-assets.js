"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileBorderSourceById = void 0;
const event_decoration_assets_1 = require("./event-decoration-assets");
exports.profileBorderSourceById = new Map([
    ['frame_amber_vine', require('../../assets/profile-borders/frame_amber_vine.png')],
    ['frame_wheat_crown', require('../../assets/profile-borders/frame_wheat_crown.png')],
    ...event_decoration_assets_1.EVENT_DECORATIONS.map(({ borderId, border }) => [borderId, border]),
]);
