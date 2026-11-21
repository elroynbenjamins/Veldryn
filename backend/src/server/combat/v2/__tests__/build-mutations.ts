import {strict as assert} from 'node:assert';
import {
 emptyCharacterBuildStateV2,planBuildMutationV2,
 type AuthorizedBuildContextV2,type BuildMutationV2,
} from '../build-mutations';
import {serverBuildCatalogV2,SKILLS_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import type {BuildSelectionV2} from '../build-contract';

const catalog=serverBuildCatalogV2({
 helm:{instanceId:'helm',slot:'helmet',eligibleClasses:['IRONWARDEN']},
 wrong:{instanceId:'wrong',slot:'weapon',eligibleClasses:['WAYFINDER']},
},{});
const ctx:AuthorizedBuildContextV2={
 authenticatedCharacterId:'character-01',
 verified:{classId:'IRONWARDEN',level:25,ownedInstanceIds:new Set(['helm','wrong'])},
 catalog,
};
const skill=SKILLS_V2.find(s=>s.classId==='IRONWARDEN')!;
const spec=SPECIALIZATIONS_V2.find(s=>s.classId==='IRONWARDEN')!;
const selected:BuildSelectionV2={
 specializationId:spec.id,equipment:{helmet:'helm'},
 activeSkills:[{skillId:skill.id,variantId:skill.defaultVariantId}],
 talentRanks:{},signaturePassiveIds:[],capstoneId:null,
};
const empty=emptyCharacterBuildStateV2('character-01');
const save:BuildMutationV2={
 action:'save',slot:0,expectedRevision:0,name:'  Dungeon  ',selected,
};
const result=planBuildMutationV2(empty,ctx,save);
assert.equal(result.ok,true,JSON.stringify(result.issues));
assert.equal(result.next.presets[0]?.name,'Dungeon');
assert.equal(result.next.revision,1);
assert.equal(result.next.selectedSlot,null);
assert.deepEqual(empty.presets,[null,null]);
assert.equal(empty.revision,0);
assert.notEqual(result.next.presets[0]?.selected,selected,'stored build must be detached');
assert.notEqual(result.next.presets[0]?.selected.equipment,selected.equipment);
assert.equal(result.next.presets[0]?.selected.equipment.helmet,'helm');
assert.equal(result.next.presets[0]?.savedAtRevision,1);
assert.ok(result.next.presets[0]?.selected.activeSkills.length);
const apply=planBuildMutationV2(result.next,ctx,{action:'activate',slot:0,expectedRevision:1});
assert.equal(apply.ok,true);
assert.equal(apply.next.selectedSlot,0);
assert.equal(apply.next.revision,2);
const stale=planBuildMutationV2(apply.next,ctx,{action:'activate',slot:0,expectedRevision:1});
assert.equal(stale.ok,false);
assert.equal(stale.issues[0].code,'stale_build_revision');
assert.equal(stale.next,apply.next);
for(const busyReason of ['combat','dungeon','world_boss','party_event','guild_pve','equipment_transfer'] as const){
 const denied=planBuildMutationV2(result.next,{...ctx,busyReason},{action:'activate',slot:0,expectedRevision:1});
 assert.equal(denied.ok,false);
 assert.equal(denied.issues[0].code,'build_switch_blocked_'+busyReason);
}
assert.equal(planBuildMutationV2(result.next,{...ctx,authenticatedCharacterId:'other'},{
 action:'activate',slot:0,expectedRevision:1,
}).issues[0].code,'character_mismatch');
const withNoGear:AuthorizedBuildContextV2={...ctx,verified:{...ctx.verified,ownedInstanceIds:new Set()}};
assert.equal(planBuildMutationV2(result.next,withNoGear,{
 action:'activate',slot:0,expectedRevision:1,
}).issues[0].code,'item_not_owned');
const wrongGear=planBuildMutationV2(empty,ctx,{
 action:'save',slot:0,expectedRevision:0,name:'Invalid',
 selected:{...selected,equipment:{weapon:'wrong'}},
});
assert.equal(wrongGear.ok,false);
assert.equal(wrongGear.issues[0].code,'item_class_ineligible');
const badName=planBuildMutationV2(empty,ctx,{...save,name:'\nInjected'});
assert.equal(badName.ok,false);
assert.equal(badName.issues[0].code,'invalid_build_name');
const negativeRevision=planBuildMutationV2(empty,ctx,{...save,expectedRevision:-1});
assert.equal(negativeRevision.ok,false);
assert.equal(negativeRevision.issues[0].code,'stale_build_revision');
const invalidSlot=planBuildMutationV2(empty,ctx,{...save,slot:5 as 0});
assert.equal(invalidSlot.ok,false);
assert.equal(invalidSlot.issues[0].code,'invalid_build_slot');
const emptyActivation=planBuildMutationV2(empty,ctx,{
 action:'activate',slot:0,expectedRevision:0,
});
assert.equal(emptyActivation.ok,false);
assert.equal(emptyActivation.issues[0].code,'empty_build_slot');
const savedSecond=planBuildMutationV2(result.next,ctx,{
 action:'save',slot:1,expectedRevision:1,name:'Farming',selected,
});
assert.equal(savedSecond.ok,true);
assert.equal(savedSecond.next.presets[0]?.name,'Dungeon');
assert.equal(savedSecond.next.presets[1]?.name,'Farming');
const deleted=planBuildMutationV2(apply.next,ctx,{
 action:'delete',slot:0,expectedRevision:2,
});
assert.equal(deleted.ok,true);
assert.equal(deleted.next.selectedSlot,null);
assert.equal(deleted.next.presets[0],null);
assert.equal(deleted.next.revision,3);
assert.equal(result.next.presets[0]?.name,'Dungeon','original state remains untouched');
console.log('PASS: versioned build save, activate, delete, class gear gates, stale snapshots and combat locks');
