import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {LIVE_EVENT_CATALOG} from '../src/content/live-events';
import {COLLECTIBLES} from '../src/content/collectibles';
import {EVENT_COMPANIONS} from '../src/content/event-companions-v2';
import {createCharacter,newGame} from '../src/core/game';
import {activeLiveEvent,setLocalEventEnabled} from '../src/core/live-events';
import {profileIconCollection,canUseProfileIcon} from '../src/core/profile-icons';
import {canUseProfileCosmetic} from '../src/core/profile-cosmetics';
import {executeGameCommand} from '../src/core/game-commands';

const now=Date.UTC(2026,9,13);
const enabled=setLocalEventEnabled(createCharacter(newGame(now),'IRONWARDEN','Event Review'),true,now);
assert.equal(activeLiveEvent(enabled,now)?.definition.id,LIVE_EVENT_CATALOG[0].id,'local review must enable the released event');
assert.ok(!COLLECTIBLES.some(row=>row.event==='harvestwake'||row.id==='EVT_PET_011'||row.id==='EVT_PET_012'||row.id==='bg_harvestwake'),'unreleased Harvestwake rewards must not enter the shipped collection catalog');
const ended=setLocalEventEnabled(enabled,false,now);
const iconId='event:veilbreak-2026-lantern-warden',petId='EVT_PET_013';
assert.ok(profileIconCollection(ended).some(row=>row.id===iconId&&!row.unlocked),'released but unowned icon stays visible after event deactivation');
assert.ok(!canUseProfileIcon(ended,iconId)&&!canUseProfileCosmetic(ended,'pet',petId),'visibility must not grant ownership');
const owned={...ended,account:{...ended.account,unlockedProfileIconIds:[iconId],unlockedCosmeticPetIds:[petId]}};
const equipped=executeGameCommand(owned,{type:'profile',args:{profileIconId:iconId,selectedCosmeticPetId:petId}},now).state;
assert.equal(equipped.character?.profileIconId,iconId,'earned event icon stays usable after event deactivation');
assert.equal(equipped.character?.selectedCosmeticPetId,petId,'earned event pet stays usable after event deactivation');
for(const args of [{profileIconId:iconId},{selectedCosmeticPetId:petId}]){
 let rejected=false;try{executeGameCommand(ended,{type:'profile',args},now);}catch{rejected=true;}
 assert.ok(rejected,'authoritative profile command rejects unowned event cosmetics');
}
for(const event of LIVE_EVENT_CATALOG){
 for(const cls of CLASSES){
  const milestones=event.milestones(cls.id).map(row=>row.reward);
  const rewards=[...milestones,...event.shop.map(row=>row.reward)];
  if(event.id==='EVT_ANNUAL_010_2026'){
   const shopCompanionIds=new Set(event.shop.filter(row=>row.reward.kind==='companion').map(row=>row.reward.id));
   const milestoneCompanionIds=milestones.filter(reward=>reward.kind==='companion').map(reward=>reward.id);
   assert.ok(milestoneCompanionIds.every(id=>!shopCompanionIds.has(id)),`${cls.id} must not receive the fixed Veilbreak shop companion again from milestones`);
   assert.deepEqual(milestoneCompanionIds,['EVT_UNIT_008','EVT_UNIT_007'],`${cls.id} receives Tank and Damage companions for Trials and Expeditions`);
   assert.deepEqual([...shopCompanionIds],['EVT_UNIT_011'],`${cls.id} sees the Support companion only as the fixed shop goal`);
  }
  for(const reward of rewards){
   if(reward.kind==='pet'){
    const pet=COLLECTIBLES.find(row=>row.kind==='pet'&&row.id===reward.id);
    assert.ok(pet,`${reward.id} must be selectable after claiming`);
    assert.equal(pet?.name,reward.name,`${reward.id} uses one identity across event and collection`);
   }
   if(reward.kind==='companion'){
    const companion=EVENT_COMPANIONS.find(row=>row.id===reward.id);
    assert.ok(companion,`${reward.id} must have combat data`);
    assert.equal(companion?.name,reward.name,`${reward.id} uses its canonical portrait identity`);
   }
  }
 }
}
assert.equal(EVENT_COMPANIONS.find(row=>row.id==='EVT_UNIT_008')?.name,'Hollow Knightling','tank identity matches its supplied armor portrait');
assert.equal(EVENT_COMPANIONS.find(row=>row.id==='EVT_UNIT_011')?.name,'Lantern Keeper','support identity matches its supplied lantern portrait');
console.log('PASS released event defaults, usable reward definitions, class roles and canonical collectible identities');
