"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockerNavigationV32 = blockerNavigationV32;
function blockerNavigationV32(b, pieceId) { switch (b.action) {
    case 'train_skill': return { screen: 'Skills', skillId: b.key };
    case 'gather':
    case 'hunt':
    case 'run_content': return { screen: 'World', source: b.source };
    case 'unlock_recipe': return { screen: 'Crafting', pieceId };
    default: return { screen: 'Inventory', section: 'Crafting' };
} }
