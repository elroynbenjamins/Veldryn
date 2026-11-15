import {CHARACTER_COMPANION_COMBAT_MODES,CLASS_ROLE,companionLevelCap,sanitizePersistedCompanionLoadout,validateCompanionLoadout,validateProgressionSnapshot,type CharacterClassId} from '../policy';
const ok=(v:unknown,m:string)=>{if(!v)throw new Error(m)};
const loadoutRejection=(input:Parameters<typeof validateCompanionLoadout>[0])=>{const result=validateCompanionLoadout(input);return result.ok?null:result.reason;};
for(const classId of Object.keys(CLASS_ROLE) as CharacterClassId[]){
 for(const companionId of ['UNIT_001','UNIT_002','UNIT_003']){
  for(const combatMode of CHARACTER_COMPANION_COMBAT_MODES){
   ok(validateCompanionLoadout({classId,companionId,ownedCompanionIds:[companionId],combatMode}).ok,`Owned ${companionId} rejected for ${classId} in ${combatMode}`);
  }
 }
}
ok(loadoutRejection({classId:'WAYFINDER',companionId:'UNIT_002',ownedCompanionIds:[]})==='companion_not_owned','Locked companion server validation failed');
ok(loadoutRejection({classId:'WAYFINDER',companionId:'UNIT_002',ownedCompanionIds:['UNIT_002'],busyCompanionIds:['UNIT_002']})==='companion_busy','Busy companion server validation failed');
ok(loadoutRejection({classId:'WAYFINDER',companionId:'UNKNOWN_COMPANION',ownedCompanionIds:['UNKNOWN_COMPANION']})==='unknown_companion','Unknown companion server validation failed');
ok(loadoutRejection({classId:'UNKNOWN_CLASS' as CharacterClassId,companionId:'UNIT_001',ownedCompanionIds:['UNIT_001']})==='unknown_character_class','Unknown class server validation failed');
ok(sanitizePersistedCompanionLoadout({classId:'WAYFINDER',companionId:'UNIT_001',ownedCompanionIds:['UNIT_001']})==='UNIT_001','Same-role persisted loadout was cleared');
ok(sanitizePersistedCompanionLoadout({classId:'WAYFINDER',companionId:'UNIT_001',ownedCompanionIds:[]})===null,'Unowned persisted loadout was not cleared');
ok(companionLevelCap('UNIT_001',3)===20&&companionLevelCap('UNIT_004',3)===25&&companionLevelCap('UNIT_007',3)===30&&companionLevelCap('UNIT_012',3)===35,'Rarity caps mismatch');
const normalized=validateProgressionSnapshot('UNIT_004',{level:99,xp:-1,ascensionTier:1,bondLevel:99,bondXp:-4});ok(normalized.level===20&&normalized.bondLevel===10&&normalized.xp===0&&normalized.bondXp===0,'Progression sanitization failed');
console.log('companion-policy: PASS');
