"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NO_TOOL_TIME_MULTIPLIER = void 0;
exports.equippedGatheringTool = equippedGatheringTool;
exports.gatheringToolTimeMultiplier = gatheringToolTimeMultiplier;
exports.gatheringPacing = gatheringPacing;
const gathering_tools_1 = require("../content/gathering-tools");
exports.NO_TOOL_TIME_MULTIPLIER = 1.15;
function equippedGatheringTool(state, skillId) {
    const id = state.character?.equippedToolIds?.[skillId];
    const definition = (0, gathering_tools_1.gatheringToolDef)(id);
    return definition?.skillId === skillId ? definition : undefined;
}
function gatheringToolTimeMultiplier(state, skillId) {
    // Herbalism is hand-pickable. It has no tool progression and therefore no
    // missing-tool slowdown.
    if (skillId === 'herbalism')
        return 1;
    return equippedGatheringTool(state, skillId)?.actionTimeMultiplier ?? exports.NO_TOOL_TIME_MULTIPLIER;
}
function gatheringPacing(state, activity) {
    const tool = equippedGatheringTool(state, activity.skillId);
    const timeMultiplier = activity.difficultyMultiplier * gatheringToolTimeMultiplier(state, activity.skillId);
    const recommended = (0, gathering_tools_1.gatheringToolsFor)(activity.skillId).find(entry => entry.tier === activity.recommendedToolTier);
    return { tool, recommended, timeMultiplier, atRecommendedTier: (tool?.tier ?? 0) >= activity.recommendedToolTier };
}
