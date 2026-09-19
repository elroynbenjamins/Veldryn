"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyChatGate = PartyChatGate;
const react_1 = __importDefault(require("react"));
const party_social_1 = require("../core/party-social");
/** Party Chat is intentionally absent from the UI when the account is not a current Party member. */
function PartyChatGate({ party, accountId, children }) {
    return (0, party_social_1.shouldShowPartyChat)(party, accountId) ? <>{children}</> : null;
}
