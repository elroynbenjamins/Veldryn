"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const frostmarch_equipment_v33_1 = require("./frostmarch-equipment-v33");
strict_1.default.deepEqual((0, frostmarch_equipment_v33_1.validateFrostmarchEquipmentPolicyV33)(), []);
strict_1.default.equal(frostmarch_equipment_v33_1.FROSTMARCH_EQUIPMENT_POLICY_V33.slotCount, 10);
strict_1.default.deepEqual(frostmarch_equipment_v33_1.FROSTMARCH_EQUIPMENT_POLICY_V33.thresholds, [2, 4, 6, 8, 10]);
strict_1.default.equal(frostmarch_equipment_v33_1.FROSTMARCH_EQUIPMENT_POLICY_V33.skinCompletionPieces, 10);
console.log('v33 Frostmarch equipment policy passed');
