export type CompanionAffinity='wild'|'arcane'|'radiant'|'umbral'|'primal'|'construct';

export const COMPANION_AFFINITY_BY_ID:Readonly<Record<string,CompanionAffinity>>={
 UNIT_001:'wild',UNIT_002:'construct',UNIT_003:'arcane',UNIT_004:'primal',UNIT_005:'arcane',UNIT_006:'radiant',
 UNIT_007:'umbral',UNIT_008:'radiant',UNIT_009:'arcane',UNIT_010:'construct',UNIT_011:'umbral',UNIT_012:'construct',
 UNIT_013:'wild',UNIT_014:'primal',UNIT_015:'radiant',UNIT_016:'radiant',
 UNIT_017:'wild',UNIT_018:'arcane',UNIT_019:'construct',UNIT_020:'arcane',
 UNIT_021:'primal',UNIT_022:'construct',UNIT_023:'primal',UNIT_024:'umbral',
 EVT_UNIT_001:'radiant',EVT_UNIT_002:'radiant',EVT_UNIT_003:'primal',EVT_UNIT_004:'radiant',EVT_UNIT_005:'arcane',
 EVT_UNIT_006:'primal',EVT_UNIT_007:'umbral',EVT_UNIT_008:'umbral',EVT_UNIT_009:'arcane',EVT_UNIT_010:'construct',
};

export const COMPANION_AFFINITY_IDS=['wild','arcane','radiant','umbral','primal','construct'] as const;
export function companionAffinityById(id:string):CompanionAffinity{return COMPANION_AFFINITY_BY_ID[id]??'wild';}
