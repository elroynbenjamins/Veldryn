"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBoonOffer = generateBoonOffer;
const launch_content_1 = require("./content/launch-content");
const rng_1 = require("./rng");
function generateBoonOffer(input) {
    const pool = (input.eligibleBoonIds ?? launch_content_1.LAUNCH_BOON_IDS).filter((id) => !input.ownedBoonIds.includes(id));
    const shuffled = (0, rng_1.deterministicShuffle)(input.secret, pool, input.runId, input.characterId, input.nodeIndex, input.contentVersion, 'boon-offer');
    return shuffled.slice(0, input.choiceCount ?? 3);
}
