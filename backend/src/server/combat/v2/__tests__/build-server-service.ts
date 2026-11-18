import {strict as assert} from 'node:assert';
import {CharacterBuildServiceV2,type TrustedBuildSnapshotV2} from '../build-server-service';
import {SupabaseV2BuildStorage,type V2ServiceRpcClient} from '../supabase-build-repository';
import {SKILLS_V2,SPECIALIZATIONS_V2,passiveIdV2} from '../skill-catalog';

const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const otherCharacter='33333333-3333-4333-8333-333333333333';
const gameRevision=19;
const fingerprint='abcdabcdabcdabcdabcdabcdabcdabcd';
const skill=SKILLS_V2.find(x=>x.classId==='IRONWARDEN')!;
const spec=SPECIALIZATIONS_V2.find(x=>x.classId==='IRONWARDEN')!;
const selected={
  specializationId:spec.id,equipment:{helmet:'owned_helm'},
  activeSkills:[{skillId:skill.id,variantId:skill.defaultVariantId}],
  talentRanks:{[passiveIdV2('IRONWARDEN','Iron Skin')]:1},
  signaturePassiveIds:[],capstoneId:null,
};
const payload={
  accountId:account,characterId:character,characterClass:'IRONWARDEN',
  characterLevel:25,gameRevision,characterFingerprint:fingerprint,
  craftedGearInstances:[
    {id:'owned_helm',itemId:'helmet_t2',ownerCharacterId:character},
    {id:'banked',itemId:'helmet_t2',ownerCharacterId:null},
    {id:'other',itemId:'helmet_t2',ownerCharacterId:otherCharacter},
  ],
  builds:null,
};
let saved:unknown=null;
const calls:{name:string;args:Record<string,unknown>}[]=[];
let race:null|'game'|'build'=null;
const client:V2ServiceRpcClient={
  async rpc<T>(name:string,args:Record<string,unknown>){
    calls.push({name,args});
    if(name==='combat_v2_build_read_server_v1'){
      return {data:{...payload,builds:saved} as T,error:null};
    }
    if(name==='combat_v2_build_cas_server_v1'){
      if(race){
        const error={message:race==='game'?'combat_v2_stale_game_revision':'combat_v2_stale_build_revision'};
        return {data:null,error};
      }
      saved=args.p_next_state;
      return {data:saved as T,error:null};
    }
    throw Error('unexpected call:'+name);
  },
};
const repository=new SupabaseV2BuildStorage(client);
const service=new CharacterBuildServiceV2({
  storage:repository,
  equipment:{
    helmet_t2:{itemId:'helmet_t2',slot:'helmet',requiredLevel:18,eligibleClasses:['IRONWARDEN'],tier:'T2'},
    wrong_class:{itemId:'wrong_class',slot:'weapon',requiredLevel:1,eligibleClasses:['WAYFINDER']},
  },
  sets:{},
});
async function main(){
  assert.deepEqual((await service.read(account,character)).issues,[{code:'feature_disabled',at:'feature'}]);
  assert.equal(calls.length,0,'disabled feature must not call Supabase');
  const initial=await service.read(account,character,true);
  assert.equal(initial.ok,true);
  assert.equal(initial.state?.revision,0);
  assert.equal(calls[0].name,'combat_v2_build_read_server_v1');
  assert.deepEqual(calls[0].args,{p_account_id:account,p_character_id:character});
  const save=await service.mutate(account,character,{
    action:'save',slot:0,name:'Hunting',expectedRevision:0,selected,
  },true);
  assert.equal(save.ok,true,JSON.stringify(save.issues));
  assert.equal(save.revision,1);
  assert.equal(calls.at(-1)?.name,'combat_v2_build_cas_server_v1');
  assert.equal(calls.at(-1)?.args.p_expected_game_revision,gameRevision);
  assert.equal(calls.at(-1)?.args.p_expected_character_fingerprint,fingerprint);
  const activated=await service.mutate(account,character,{
    action:'activate',slot:0,expectedRevision:1,
  },true);
  assert.equal(activated.ok,true,JSON.stringify(activated.issues));
  assert.equal(activated.state?.selectedSlot,0);
  assert.equal(activated.revision,2);
  const unauthorized=await service.mutate(account,otherCharacter,{
    action:'activate',slot:0,expectedRevision:2,
  },true);
  assert.equal(unauthorized.ok,false);
  assert.equal(unauthorized.issues[0].code,'character_mismatch');
  assert.equal(calls.at(-1)?.name,'combat_v2_build_read_server_v1');
  const wrongOwnership=await service.mutate(account,character,{
    action:'save',slot:1,name:'Banked',expectedRevision:2,
    selected:{...selected,equipment:{helmet:'banked'}},
  },true);
  assert.equal(wrongOwnership.ok,false);
  assert.equal(wrongOwnership.issues[0].code,'item_not_owned');
  const wrongClass=await service.mutate(account,character,{
    action:'save',slot:1,name:'Alt Item',expectedRevision:2,
    selected:{...selected,equipment:{helmet:'other'}},
  },true);
  assert.equal(wrongClass.ok,false);
  assert.equal(wrongClass.issues[0].code,'item_not_owned');
  const lowLevelService=new CharacterBuildServiceV2({
    storage:{
      async load(){return {...payload,characterLevel:10,builds:null} as TrustedBuildSnapshotV2},
      async compareAndSwap(){throw Error('should_not_commit')},
    },
    equipment:{helmet_t2:{itemId:'helmet_t2',slot:'helmet',requiredLevel:18,eligibleClasses:['IRONWARDEN']}},
    sets:{},
  });
  const levelBlock=await lowLevelService.mutate(account,character,{
    action:'save',slot:0,expectedRevision:0,name:'Low level',selected,
  },true);
  assert.equal(levelBlock.ok,false);
  assert.equal(levelBlock.issues[0].code,'item_level_ineligible');
  race='game';
  const staleGame=await service.mutate(account,character,{
    action:'save',slot:1,name:'Retry',expectedRevision:2,selected,
  },true);
  assert.equal(staleGame.ok,false);
  assert.equal(staleGame.issues[0].code,'stale_game_revision');
  race='build';
  const staleBuild=await service.mutate(account,character,{
    action:'save',slot:1,name:'Retry',expectedRevision:2,selected,
  },true);
  assert.equal(staleBuild.ok,false);
  assert.equal(staleBuild.issues[0].code,'stale_build_revision');
  race=null;
  const disabled=await service.mutate(account,character,{
    action:'delete',slot:0,expectedRevision:2,
  },false);
  assert.equal(disabled.issues[0].code,'feature_disabled');
  assert.ok(!calls.some(x=>String(x.args).includes('service_role_key')));
  console.log('PASS: trusted Supabase builds, owner isolation, class/level gear, revision and game CAS guards');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
