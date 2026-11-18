import {strict as assert} from 'node:assert';
import {
  CLASS_ROLES_V2,GEAR_SLOTS_V2,BUILD_RULES_V2,talentPointsAtLevelV2,validateBuildV2,
  buildMayAffectCombatV2,type BuildCatalogV2,type BuildSelectionV2,type VerifiedCharacterV2,
} from '../build-contract';

assert.equal(Object.keys(CLASS_ROLES_V2).length,9);
assert.equal(GEAR_SLOTS_V2.length,10);
assert.equal(BUILD_RULES_V2.talentPointLevels.length,9);
assert.equal(talentPointsAtLevelV2(5),0);
assert.equal(talentPointsAtLevelV2(50),9);

const catalog:BuildCatalogV2={
  itemsByInstanceId:{
    chest:{instanceId:'chest',slot:'chest',eligibleRoles:['tank'],setFamilyId:'oath'},
    helm:{instanceId:'helm',slot:'helmet',eligibleRoles:['tank'],setFamilyId:'oath'},
    legs:{instanceId:'legs',slot:'legs',eligibleRoles:['tank'],setFamilyId:'oath'},
    cape:{instanceId:'cape',slot:'cape',eligibleRoles:['tank'],setFamilyId:'oath'},
    ring:{instanceId:'ring',slot:'ring',eligibleRoles:['tank'],setFamilyId:'vigil'},
    boots:{instanceId:'boots',slot:'boots',eligibleRoles:['tank'],setFamilyId:'vigil'},
    gloves:{instanceId:'gloves',slot:'gloves',eligibleRoles:['tank'],setFamilyId:'vigil'},
    sword:{instanceId:'sword',slot:'weapon',eligibleClasses:['IRONWARDEN']},
    oldSword:{instanceId:'oldSword',slot:'weapon',eligibleClasses:['DREADGUARD']},
    unsafe:{instanceId:'unsafe',slot:'amulet'},
    conflicting:{instanceId:'conflicting',slot:'amulet',eligibleRoles:['tank'],eligibleClasses:['DREADGUARD']},
  },
  setsById:{
    oath:{id:'oath',role:'tank',slots:['helmet','chest','legs','cape'],thresholds:[2,4]},
    vigil:{id:'vigil',role:'tank',slots:['ring','boots','gloves'],thresholds:[2,3]},
  },
  specializationsById:{
    sentinel:{id:'sentinel',classId:'IRONWARDEN',capstoneId:'sentinelCap'},
    bloodbound:{id:'bloodbound',classId:'DREADGUARD',capstoneId:'bloodCap'},
  },
  skillsById:{
    bash:{id:'bash',classId:'IRONWARDEN',unlockLevel:1,defaultVariantId:'base',variantIds:['base','ward','break']},
    taunt:{id:'taunt',classId:'IRONWARDEN',unlockLevel:1,defaultVariantId:'base',variantIds:['base','wide']},
    wall:{id:'wall',classId:'IRONWARDEN',unlockLevel:10,defaultVariantId:'base',variantIds:['base','reinforce']},
    foreign:{id:'foreign',classId:'DREADGUARD',unlockLevel:1,defaultVariantId:'base',variantIds:['base']},
  },
  passivesById:{
    guard:{id:'guard',classId:'IRONWARDEN',unlockLevel:10,maxRank:3},
    riposte:{id:'riposte',classId:'IRONWARDEN',unlockLevel:20,maxRank:3,prerequisite:{id:'guard',rank:2}},
    shield:{id:'shield',classId:'IRONWARDEN',unlockLevel:40,maxRank:3},
  },
};
const player:VerifiedCharacterV2={
  classId:'IRONWARDEN',level:50,ownedInstanceIds:new Set(Object.keys(catalog.itemsByInstanceId)),
};
const selection:BuildSelectionV2={
  specializationId:'sentinel',
  equipment:{chest:'chest',helmet:'helm',legs:'legs',cape:'cape',ring:'ring',boots:'boots',gloves:'gloves',weapon:'sword'},
  activeSkills:[{skillId:'bash',variantId:'ward'},{skillId:'taunt',variantId:'wide'},{skillId:'wall',variantId:'reinforce'}],
  talentRanks:{guard:3,riposte:3,shield:3},
  signaturePassiveIds:['guard','riposte'],
  capstoneId:'sentinelCap',
};
const build=(override:Partial<BuildSelectionV2>={},character=player)=>
  validateBuildV2(character,{...selection,...override},catalog);
const codes=(b:ReturnType<typeof build>)=>b.issues.map(issue=>issue.code);
const valid=build();
assert.equal(valid.valid,true,JSON.stringify(valid.issues));
assert.deepEqual(valid.resolvedSets,[
  {familyId:'oath',pieces:4,activeThresholds:[2,4]},
  {familyId:'vigil',pieces:3,activeThresholds:[2,3]},
]);
assert.equal(buildMayAffectCombatV2(false,valid),false,'feature must default off');
assert.equal(buildMayAffectCombatV2(true,valid),true);
assert.equal(buildMayAffectCombatV2(true,build({capstoneId:'fake'})),false);
assert.ok(codes(build({specializationId:'bloodbound'})).includes('specialization_invalid'));
assert.ok(codes(build({equipment:{...selection.equipment,weapon:'oldSword'}})).includes('item_class_ineligible'));
assert.ok(codes(build({equipment:{...selection.equipment,amulet:'unsafe'}})).includes('item_role_ineligible'));
assert.ok(codes(build({equipment:{...selection.equipment,amulet:'conflicting'}})).includes('item_class_ineligible'));
assert.ok(codes(build({equipment:{...selection.equipment,ring:'stolen'}})).includes('item_not_owned'));
assert.ok(codes(build({equipment:{...selection.equipment,ring:'chest'}})).includes('duplicate_item'));
assert.ok(codes(build({equipment:{...selection.equipment,ring:'chest',chest:undefined}})).includes('item_slot_mismatch'));
assert.ok(codes(build({activeSkills:[{skillId:'foreign',variantId:'base'}]})).includes('unknown_skill'));
assert.ok(codes(build({activeSkills:[{skillId:'bash',variantId:'base'},{skillId:'bash',variantId:'ward'}]})).includes('duplicate_skill'));
assert.ok(codes(build({activeSkills:[{skillId:'bash',variantId:'missing'}]})).includes('invalid_variant'));
assert.ok(codes(build({talentRanks:{guard:1,riposte:3}})).includes('missing_prerequisite'));
assert.ok(codes(build({talentRanks:{guard:3,riposte:3,shield:4}})).includes('invalid_talent_rank'));
assert.ok(codes(build({signaturePassiveIds:['riposte','riposte']})).includes('duplicate_signature_passive'));
assert.deepEqual(build(),build(),'pure validation must be deterministic');

const novice:VerifiedCharacterV2={...player,level:5};
const noviceSelection:BuildSelectionV2={
  specializationId:null,equipment:{weapon:'sword'},
  activeSkills:[{skillId:'bash',variantId:'base'},{skillId:'taunt',variantId:'base'}],
  talentRanks:{},signaturePassiveIds:[],capstoneId:null,
};
assert.equal(validateBuildV2(novice,noviceSelection,catalog).valid,true);
const variant=validateBuildV2(novice,{...noviceSelection,activeSkills:[{skillId:'bash',variantId:'ward'}]},catalog);
assert.ok(variant.issues.some(issue=>issue.code==='variant_locked'));
assert.ok(codes(build({talentRanks:{guard:3,riposte:3,shield:3}},{...player,level:20})).includes('too_many_talent_points'));
console.log('PASS: Combat 2.0 loadout, set, ownership, legacy, talent and release-gate contracts');
