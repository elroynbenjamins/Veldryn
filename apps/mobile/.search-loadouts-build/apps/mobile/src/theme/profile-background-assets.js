"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileBackgroundPreviewById = exports.PROFILE_BACKGROUND_PREVIEWS = void 0;
/** Approved 320x180 exports. Unlock bindings remain intentionally unassigned. */
exports.PROFILE_BACKGROUND_PREVIEWS = [
    { id: 'bg_bloomwake', name: 'Bloomwake Ancient Sanctum', source: require('../../assets/profile-backgrounds/bg_bloomwake.png'), status: 'export_prepared', unlockBinding: null },
    { id: 'bg_veilbreak', name: 'Veilbreak Gothic Moonruins', source: require('../../assets/profile-backgrounds/bg_veilbreak.png'), status: 'export_prepared', unlockBinding: null },
    { id: 'bg_frostfall', name: 'Frostfall Festive Village', source: require('../../assets/profile-backgrounds/bg_frostfall.png'), status: 'export_prepared', unlockBinding: null },
    { id: 'bg_harvestwake', name: 'Harvestwake Autumn Market', source: require('../../assets/profile-backgrounds/bg_harvestwake.png'), status: 'export_prepared', unlockBinding: null },
    { id: 'bg_grand_storehouse', name: 'Grand Storehouse', source: require('../../assets/profile-backgrounds/bg_harvestwake.png'), status: 'export_prepared', unlockBinding: null },
    { id: 'bg_heartbond', name: 'Heartbond Rose Garden', source: require('../../assets/profile-backgrounds/bg_heartbond.png'), status: 'export_prepared', unlockBinding: null },
    { id: 'bg_starfall', name: 'Starfall Observatory', source: require('../../assets/profile-backgrounds/bg_starfall.png'), status: 'export_prepared', unlockBinding: null },
    { id: 'bg_kingdom_approach', name: 'Kingdom Approach', source: require('../../assets/profile-backgrounds/bg_kingdom_approach.png'), status: 'export_prepared', unlockBinding: null },
    { id: 'bg_forest_sanctum', name: 'Forest Sanctum', source: require('../../assets/profile-backgrounds/bg_forest_sanctum.png'), status: 'export_prepared', unlockBinding: null },
    { id: 'bg_volcanic_stronghold', name: 'Volcanic Stronghold', source: require('../../assets/profile-backgrounds/bg_volcanic_stronghold.png'), status: 'export_prepared', unlockBinding: null },
    { id: 'bg_aurora_citadel', name: 'Aurora Citadel', source: require('../../assets/profile-backgrounds/bg_aurora_citadel.png'), status: 'export_prepared', unlockBinding: null },
    { id: 'bg_cosmic_gate', name: 'Cosmic Rift Gate', source: require('../../assets/profile-backgrounds/bg_cosmic_gate.png'), status: 'export_prepared', unlockBinding: null },
];
exports.profileBackgroundPreviewById = new Map(exports.PROFILE_BACKGROUND_PREVIEWS.map(background => [background.id, background]));
