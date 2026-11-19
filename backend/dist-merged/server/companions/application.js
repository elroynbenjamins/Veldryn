"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CombatCompanionApplication = void 0;
const policy_1 = require("./policy");
/**
 * Authenticated application boundary. The caller supplies only identity + desired ID.
 * Character class, companion role and ownership are resolved server-side.
 */
class CombatCompanionApplication {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async equip(authenticatedAccountId, command) {
        if (!authenticatedAccountId)
            throw new Error('unauthenticated');
        if (!command.requestId)
            throw new Error('request_id_required');
        const character = await this.repository.getCharacter(command.characterId);
        if (!character || character.accountId !== authenticatedAccountId)
            throw new Error('character_not_owned');
        const ownedCompanionIds = await this.repository.listOwnedCompanionIds(authenticatedAccountId);
        const busyCompanionIds = this.repository.listBusyCompanionIds ? await this.repository.listBusyCompanionIds(authenticatedAccountId) : [];
        const checked = (0, policy_1.validateCompanionLoadout)({ classId: character.classId, companionId: command.companionId, ownedCompanionIds, busyCompanionIds });
        if (!checked.ok)
            throw new Error(checked.reason);
        await this.repository.setEquippedCompanion({ accountId: authenticatedAccountId, characterId: character.characterId, companionId: checked.companionId, requestId: command.requestId });
        return { characterId: character.characterId, companionId: checked.companionId };
    }
}
exports.CombatCompanionApplication = CombatCompanionApplication;
