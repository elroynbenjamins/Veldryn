"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPEDITION_ENCOUNTERS = void 0;
const asterfall_encounters_1 = require("./asterfall-encounters");
const sunscar_encounters_1 = require("./sunscar-encounters");
const regional_encounters_1 = require("./regional-encounters");
const event_encounters_1 = require("./event-encounters");
exports.EXPEDITION_ENCOUNTERS = Object.freeze({ ...asterfall_encounters_1.ASTERFALL_ENCOUNTERS, ...sunscar_encounters_1.SUNSCAR_ENCOUNTERS, ...regional_encounters_1.FROSTMARCH_ENCOUNTERS, ...regional_encounters_1.ASHLANDS_ENCOUNTERS, ...event_encounters_1.EVENT_ENCOUNTERS });
