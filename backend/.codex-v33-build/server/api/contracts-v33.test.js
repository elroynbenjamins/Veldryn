"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const contracts_1 = require("./contracts");
strict_1.default.deepEqual(contracts_1.API_NAMES.slice(-contracts_1.EQUIPMENT_API_NAMES_V33.length), contracts_1.EQUIPMENT_API_NAMES_V33);
strict_1.default.equal(new Set(contracts_1.API_NAMES).size, contracts_1.API_NAMES.length, 'API registry contains no duplicate names');
console.log('canonical API registry includes v33 equipment actions');
