"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COOP_ROUTE_CONTENT = void 0;
exports.coopContentPool = coopContentPool;
const ROOTBOUND = {
    battle: ['ROOT_SCOUTS', 'ROOT_GUARDIANS', 'ROOT_VINES', 'ROOT_STALKERS', 'ROOT_SENTINELS'], elite: ['ROOT_ELITE_BRAMBLE', 'ROOT_ELITE_WARDEN', 'ROOT_ELITE_MYCELIUM'],
    event: ['ROOT_EVENT_WHISPER', 'ROOT_EVENT_SPORES', 'ROOT_EVENT_MEMORY'], forge: ['ROOT_FORGE_THORNS', 'ROOT_FORGE_BARK', 'ROOT_FORGE_SAP'], shrine: ['ROOT_SHRINE_WARD', 'ROOT_SHRINE_GROWTH', 'ROOT_SHRINE_ECHO'], camp: ['ROOT_CAMP_SPRING', 'ROOT_CAMP_CLEARING', 'ROOT_CAMP_HEARTH'], treasure: ['ROOT_CACHE_BURIED', 'ROOT_CACHE_GROVE', 'ROOT_CACHE_WARDEN'], echo: ['ROOT_ECHO_OATH', 'ROOT_ECHO_LOST', 'ROOT_ECHO_TRIAL'], risk: ['ROOT_RISK_OVERGROWTH', 'ROOT_RISK_BLIGHT', 'ROOT_RISK_HUNGER'], merchant: ['ROOT_MERCHANT_MOSS', 'ROOT_MERCHANT_RELICS', 'ROOT_MERCHANT_SALVES'], secret: ['ROOT_SECRET_ROOTWAY', 'ROOT_SECRET_HOLLOW', 'ROOT_SECRET_ALTAR'],
};
function themed(prefix) {
    const ids = (kind) => [1, 2, 3].map(index => `${prefix}_${kind}_${String(index).padStart(2, '0')}`);
    return { battle: ids('BATTLE'), elite: ids('ELITE'), event: ids('EVENT'), forge: ids('FORGE'), shrine: ids('SHRINE'), camp: ids('CAMP'), treasure: ids('TREASURE'), echo: ids('ECHO'), risk: ids('RISK'), merchant: ids('MERCHANT'), secret: ids('SECRET') };
}
exports.COOP_ROUTE_CONTENT = Object.freeze({
    EXP_001: ROOTBOUND, EXP_002: themed('LANTERN'), EXP_003: themed('SUN_OBS'), EXP_004: themed('SUN_MIRAGE'), EXP_005: themed('FROST_LAKE'), EXP_006: themed('FROST_CHOIR'), EXP_007: themed('ASH_FEN'), EXP_008: themed('ASH_CRUCIBLE'),
});
function coopContentPool(expeditionId, kind) {
    const pool = exports.COOP_ROUTE_CONTENT[expeditionId]?.[kind];
    if (!pool || pool.length < 3 || new Set(pool).size !== pool.length)
        throw new Error('invalid_expedition_content_pool');
    return pool;
}
