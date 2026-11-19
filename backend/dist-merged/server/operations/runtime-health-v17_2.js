"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRuntimeHeartbeat = withRuntimeHeartbeat;
async function withRuntimeHeartbeat(repo, component, work) {
    const started = new Date().toISOString();
    await repo.markStarted(component, started);
    try {
        const result = await work();
        await repo.markSucceeded(component, new Date().toISOString(), result);
        return result;
    }
    catch (error) {
        await repo.markFailed(component, new Date().toISOString(), error instanceof Error ? error.message : String(error));
        throw error;
    }
}
