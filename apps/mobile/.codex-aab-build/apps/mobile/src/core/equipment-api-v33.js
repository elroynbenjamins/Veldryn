"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.equipmentSetPayloadV33 = equipmentSetPayloadV33;
exports.unwrapEquipmentSetPayloadV33 = unwrapEquipmentSetPayloadV33;
function equipmentSetPayloadV33(value) {
    const payload = value;
    if (!payload || typeof payload !== 'object' || !payload.set || !Array.isArray(payload.pieces) || !Array.isArray(payload.slotOrder) || !Array.isArray(payload.setThresholds))
        throw new Error('Invalid v33 equipment set payload');
    if (payload.pieces.length !== 10 || payload.slotOrder.length !== 10 || payload.setThresholds.join(',') !== '2,4,6,8,10')
        throw new Error('Invalid v33 equipment set shape');
    return payload;
}
function unwrapEquipmentSetPayloadV33(value) {
    const envelope = value;
    return equipmentSetPayloadV33(envelope?.data);
}
