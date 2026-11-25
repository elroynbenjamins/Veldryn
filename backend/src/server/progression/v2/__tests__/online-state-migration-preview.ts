import {previewOnlineSnapshotMigrationV2} from '../online-state-migration-preview';
import {
  legacySkillTotalXpAtLevelV1,legacyCombatLevelFromXpV1,
} from '../legacy-migration-preview';
import {overallLevelFromXpV2,professionLevelFromXpV2} from '../character-progression';

const account='11111111-1111-4111-8111-111111111111';
const activeId='22222222-2222-4222-8222-222222222222';
const parkedId='33333333-3333-4333-8333-333333333333';
const live={
  account_id:account,character_id:activeId,revision:19,
  state:{
    character:{id:activeId,level:5,xp:0},
    skills:[
      {skillId:'smithing',xp:legacySkillTotalXpAtLevelV1(96),level:96},
      {skillId:'mining',xp:legacySkillTotalXpAtLevelV1(1),level:1},
    ],
    otherCharacters:[{
      character:{id:parkedId,level:45,xp:0},
      skills:[{skillId:'fishing',xp:legacySkillTotalXpAtLevelV1(30),level:30}],
      inventory:{stacks:[]},
    }],
  },
};
const eq=(a:unknown,b:unknown,label:string)=>{
  if(a!==b)throw Error(label+': expected '+String(b)+' got '+String(a));
};
const fails=(action:()=>unknown,label:string)=>{
  let threw=false;try{action()}catch{threw=true}
  if(!threw)throw Error(label);
};
const before=JSON.stringify(live);
const result=previewOnlineSnapshotMigrationV2(live);
eq(result.accountId,account,'owner retained');
eq(result.expectedSnapshotRevision,19,'snapshot revision must be checked during eventual commit');
eq(result.characters.length,2,'active + parked preserved');
eq(result.characters[0].characterId,activeId,'active character exact');
eq(result.characters[0].savedCombatLevel,5,'combat level unchanged');
eq(result.characters[0].savedCombatXp,0,'combat xp unchanged');
eq(overallLevelFromXpV2(result.characters[0].overallCharacterXp),96,'pure smith overall level');
eq(professionLevelFromXpV2(result.characters[0].mappedProfessionXp.smithing!),96,'smithing skill remains 96');
eq(result.characters[1].characterId,parkedId,'parked character exact');
eq(overallLevelFromXpV2(result.characters[1].overallCharacterXp),45,'parked combat level preserved');
eq(professionLevelFromXpV2(result.characters[1].mappedProfessionXp.fishing!),30,'parked fishing remains');
eq(JSON.stringify(live),before,'migration is read only');
eq(result.preservesSourceSnapshot,true,'original JSON state never rewritten');

const nullActive={
  ...live,character_id:null,state:{...live.state,character:null,skills:[],otherCharacters:[]},
};
eq(previewOnlineSnapshotMigrationV2(nullActive).characters.length,0,'new account without character');
const drift={
  ...live,state:{...live.state,character:{id:activeId,level:30,xp:0},
    skills:[{skillId:'smithing',xp:legacySkillTotalXpAtLevelV1(20),level:26}],
    otherCharacters:[]},
};
const driftProj=previewOnlineSnapshotMigrationV2(drift).characters[0];
eq(overallLevelFromXpV2(driftProj.overallCharacterXp),30,'cached Combat 30 vs XP1 must preserve cached level');
eq(professionLevelFromXpV2(driftProj.mappedProfessionXp.smithing!),26,'cached Smithing 26 vs XP20 preserved');
eq(legacyCombatLevelFromXpV1(driftProj.savedCombatXp),1,'stored combat XP unchanged even if drift');
fails(()=>previewOnlineSnapshotMigrationV2({...live,character_id:parkedId}),'active character mismatch');
fails(()=>previewOnlineSnapshotMigrationV2({...live,revision:-1}),'negative revision');
fails(()=>previewOnlineSnapshotMigrationV2({...live,state:{...live.state,otherCharacters:[{character:live.state.character,skills:live.state.skills}]}}),'duplicate character');
fails(()=>previewOnlineSnapshotMigrationV2({...live,state:{...live.state,skills:[...live.state.skills,live.state.skills[0]]}}),'duplicate skill');
fails(()=>previewOnlineSnapshotMigrationV2({...live,state:{...live.state,skills:[{skillId:'injected',level:100,xp:9999999}]}}),'unknown skill');
fails(()=>previewOnlineSnapshotMigrationV2({...live,state:{...live.state,character:{id:activeId,level:0,xp:0}}}),'invalid combat level');
console.log('PASS: current online_game_states JSON active/parked migration projection, drift recovery, authorization identifiers and immutable legacy saves');
