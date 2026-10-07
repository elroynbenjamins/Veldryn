import type {CombatCompanionRole,VeldrynClassId} from './combat-companion-types';

/** Shared by reward selection and equipment checks without loading game runtime. */
export const CLASS_COMPANION_ROLE:Record<VeldrynClassId,CombatCompanionRole>={
 IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',
 DAWNKEEPER:'support',STONECALLER:'support',
 WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage',
};
export const classCompanionRole=(classId:VeldrynClassId):CombatCompanionRole=>CLASS_COMPANION_ROLE[classId];
