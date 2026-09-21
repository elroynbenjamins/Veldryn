export type AdminQaEchoRole='tank'|'damage'|'support';

export interface AdminQaEchoProfile{
  profileId:string;
  accountId:string;
  characterId:string;
  displayName:string;
  classId:string;
  role:AdminQaEchoRole;
  level:number;
  powerBand:number;
  profileVersion:number;
  loadoutRevision:number;
  loadoutHash:string;
}

/**
 * Deterministic QA companions for Q-mode / offline dungeon testing.
 * These are fixtures only; production settlement must still resolve through
 * the same authoritative co-op runtime used for normal player Echoes.
 */
export const ADMIN_QA_ECHO_PROFILES:ReadonlyArray<AdminQaEchoProfile>=Object.freeze([
  {profileId:'qa-echo-tank-bastion',accountId:'QA_ECHO_TANK',characterId:'QA_ECHO_TANK_CHAR',displayName:'[QA] Bulwark',classId:'BASTION',role:'tank',level:100,powerBand:100,profileVersion:1,loadoutRevision:1,loadoutHash:'qa:bastion:v1'},
  {profileId:'qa-echo-damage-wayfinder',accountId:'QA_ECHO_DPS_1',characterId:'QA_ECHO_DPS_1_CHAR',displayName:'[QA] Arrow',classId:'WAYFINDER',role:'damage',level:100,powerBand:100,profileVersion:1,loadoutRevision:1,loadoutHash:'qa:wayfinder:v1'},
  {profileId:'qa-echo-damage-hexweaver',accountId:'QA_ECHO_DPS_2',characterId:'QA_ECHO_DPS_2_CHAR',displayName:'[QA] Hex',classId:'HEXWEAVER',role:'damage',level:100,powerBand:100,profileVersion:1,loadoutRevision:1,loadoutHash:'qa:hexweaver:v1'},
  {profileId:'qa-echo-support-dawnkeeper',accountId:'QA_ECHO_SUPPORT',characterId:'QA_ECHO_SUPPORT_CHAR',displayName:'[QA] Dawn',classId:'DAWNKEEPER',role:'support',level:100,powerBand:100,profileVersion:1,loadoutRevision:1,loadoutHash:'qa:dawnkeeper:v1'},
]);
