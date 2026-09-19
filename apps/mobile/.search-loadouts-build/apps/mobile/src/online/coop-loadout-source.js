"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realCoopLoadoutVerificationSource = void 0;
const coop_client_1 = require("./coop-client");
/** The current backend exposes verification only through its authenticated entry
 * projection. Re-read it so a selection never promotes an old local snapshot. */
exports.realCoopLoadoutVerificationSource = { kind: 'real', verify: async (request) => {
        const entry = await coop_client_1.coopClient.entry();
        const loadout = entry.loadouts.find(candidate => candidate.id === request.loadoutId && candidate.characterId === request.characterId);
        if (!loadout)
            throw new Error('loadout_not_available');
        if (loadout.revision !== request.expectedRevision || loadout.verifiedRevision !== request.expectedRevision)
            throw new Error('invalid_loadout_revision');
        return loadout;
    } };
