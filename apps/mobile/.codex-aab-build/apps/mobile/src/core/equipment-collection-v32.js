"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLLECTION_FILTERS_V32 = void 0;
exports.collectionRowsV32 = collectionRowsV32;
function collectionRowsV32(skins, filter = 'All') { return skins.filter(s => filter === 'All' || filter === 'Unlocked' ? s.unlocked : !s.unlocked && s.crafted > 0).map(s => ({ id: s.setId, title: s.setName, tier: s.tier, progress: s.unlocked ? 'Unlocked' : `${s.crafted}/${s.required}`, subtitle: s.unlocked ? s.collectibleBonus : `Missing: ${s.missingSlots.join(', ')}`, unlocked: s.unlocked })); }
exports.COLLECTION_FILTERS_V32 = ['All', 'Unlocked', 'In progress'];
