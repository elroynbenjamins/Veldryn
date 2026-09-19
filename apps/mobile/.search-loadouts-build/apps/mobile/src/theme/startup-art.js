"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startupWordmark = exports.STARTUP_SCENES = void 0;
exports.pickStartupScene = pickStartupScene;
exports.STARTUP_SCENES = [
    { id: 'autumn-kingdom', source: require('../../assets/events-startup-v1/backgrounds/startup_harvestwake.png') },
    { id: 'aurora-citadel', source: require('../../assets/events-startup-v1/backgrounds/startup_winters_bell.png') },
    { id: 'firstlight-kingdom', source: require('../../assets/events-startup-v1/backgrounds/startup_firstlight.png') },
];
/** Call once in a lazy state initializer, so rerenders keep the scene. */
function pickStartupScene() {
    return exports.STARTUP_SCENES[Math.floor(Math.random() * exports.STARTUP_SCENES.length)];
}
exports.startupWordmark = require('../../assets/events-startup-v1/branding/veldryn_logo.png');
