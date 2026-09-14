import {companionLevelCap,sanitizePersistedCompanionLoadout,validateCompanionLoadout,validateProgressionSnapshot} from '../policy';
const ok=(v:unknown,m:string)=>{if(!v)throw new Error(m)};
for(const [classId,companionId] of [['WAYFINDER','UNIT_001'],['IRONWARDEN','UNIT_002'],['DAWNKEEPER','UNIT_003']] as const)ok(validateCompanionLoadout({classId,companionId,ownedCompanionIds:[companionId]}).ok===false,'Same-role server validation failed');
ok(validateCompanionLoadout({classId:'WAYFINDER',companionId:'UNIT_002',ownedCompanionIds:['UNIT_002']}).ok,'Cross-role server validation failed');
ok(validateCompanionLoadout({classId:'WAYFINDER',companionId:'UNIT_002',ownedCompanionIds:[]}).ok===false,'Locked companion server validation failed');
ok(sanitizePersistedCompanionLoadout({classId:'WAYFINDER',companionId:'UNIT_001',ownedCompanionIds:['UNIT_001']})===null,'Invalid persisted loadout was not cleared');
ok(companionLevelCap('UNIT_001',3)===20&&companionLevelCap('UNIT_004',3)===25&&companionLevelCap('UNIT_007',3)===30&&companionLevelCap('UNIT_012',3)===35,'Rarity caps mismatch');
const normalized=validateProgressionSnapshot('UNIT_004',{level:99,xp:-1,ascensionTier:1,bondLevel:99,bondXp:-4});ok(normalized.level===20&&normalized.bondLevel===10&&normalized.xp===0&&normalized.bondXp===0,'Progression sanitization failed');
console.log('companion-policy: PASS');
