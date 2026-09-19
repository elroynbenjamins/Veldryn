"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bossUnlockForReachedStages = bossUnlockForReachedStages;
function bossUnlockForReachedStages(crisisInstanceId, definition, reachedStageIds) {
    const reached = new Set(reachedStageIds);
    for (const stage of definition.stages) {
        if (stage.unlockWorldBossTemplateId && reached.has(stage.id))
            return { crisisInstanceId, worldBossTemplateId: stage.unlockWorldBossTemplateId, unlockStageId: stage.id };
    }
    return undefined;
}
