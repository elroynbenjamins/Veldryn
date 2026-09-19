"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchEquipmentApiEnvelopeV33 = dispatchEquipmentApiEnvelopeV33;
const contracts_1 = require("../api/contracts");
const equipment_api_contract_v33_1 = require("./equipment-api-contract-v33");
function dispatchEquipmentApiEnvelopeV33(requestId, contentVersion, request, serverTime) {
    return (0, contracts_1.envelope)(requestId, contentVersion, (0, equipment_api_contract_v33_1.dispatchEquipmentApiV33)(request), serverTime);
}
