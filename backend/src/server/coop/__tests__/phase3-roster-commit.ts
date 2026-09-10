import { strict as assert } from 'node:assert';
import { launchPlayer } from '../../combat/content/launch-combat';
import type { CombatantDefinition } from '../../combat/types';
import { freezeCoopRosterAtCommit, resolveAndFreezeLoadout, type AuthoritativeLoadoutRecord, type CoopLoadoutSelection, type LoadoutRepository } from '../loadout-snapshots';
import type { CapabilityTag } from '../role-readiness';
import { freezeCommittedReadyRoster, type ReadyCheckRecord } from '../ready-checks';

const records=new Map<string,AuthoritativeLoadoutRecord>();
const repository:LoadoutRepository={getOwnedLoadout:(accountId,characterId,loadoutId)=>{
  const row=records.get(loadoutId);return row?.accountId===accountId&&row.characterId===characterId?row:undefined;
}};
function record(accountId:string,characterId:string,classId:string,capabilities:CapabilityTag[]):AuthoritativeLoadoutRecord{
  const player:CombatantDefinition=launchPlayer(classId,25),loadoutId=`load-${characterId}`;
  const {critMultiplier:_,...stats}=player.stats;
  return {accountId,characterId,classId,loadoutId,revision:1,characterLevel:25,dungeonUnlocked:true,legalEquipment:true,abilities:player.abilities,capabilities,stats:{...stats,characterId,classId,level:25}};
}
[
  record('tank-account','tank-char','Ironwarden',['threat','defense']),
  record('damage-a-account','damage-a-char','Wayfinder',['damage']),
  record('damage-b-account','damage-b-char','Ravager',['damage']),
  record('support-account','support-char','Dawnkeeper',['restore']),
].forEach(row=>records.set(row.loadoutId,row));
const selections:CoopLoadoutSelection[]=[...records.values()].map(row=>({accountId:row.accountId,characterId:row.characterId,loadoutId:row.loadoutId,expectedRevision:row.revision}));
for(const selection of selections){selection.queuedSnapshotHash=resolveAndFreezeLoadout({...selection,minLevel:15,syncLevel:25,repository}).snapshotHash;}

const changed=records.get('load-damage-a-char')!;records.set(changed.loadoutId,{...changed,revision:2});
let changedError='';try{freezeCoopRosterAtCommit({selections,minLevel:15,syncLevel:25,repository});}catch(error){changedError=error instanceof Error?error.message:String(error);}
assert.equal(changedError,'invalid_loadout_revision','edited loadout must invalidate final commitment');
records.set(changed.loadoutId,changed);

const readyCheck:ReadyCheckRecord={id:'ready-1',partyId:'party-1',rosterRevision:1,status:'committed',openedAtMs:0,closesAtMs:20_000,accepts:Object.fromEntries(selections.map(row=>[row.accountId,true])),roster:selections.map((row,index)=>({...row,ticketId:`ticket-${index}`,role:(['tank','damage','damage','support'] as const)[index],originalEnqueuedAtMs:index,loadoutRevision:row.expectedRevision,loadoutSnapshotHash:row.queuedSnapshotHash!}))};
const committed=freezeCommittedReadyRoster(readyCheck,15,25,repository);
assert.deepEqual(committed.map(row=>row.readiness.role),['tank','damage','damage','support']);
const committedAttack=committed[1].normalized.snapshot.attackPower;
records.set(changed.loadoutId,{...changed,stats:{...changed.stats,attackPower:99_999}});
assert.equal(committed[1].normalized.snapshot.attackPower,committedAttack,'post-commit edits must not rewrite the frozen snapshot');

records.set(changed.loadoutId,{...changed,abilities:[...changed.abilities,{...changed.abilities[0],id:'changed-without-revision'}]});
let hashError='';try{freezeCoopRosterAtCommit({selections,minLevel:15,syncLevel:25,repository});}catch(error){hashError=error instanceof Error?error.message:String(error);}
assert.equal(hashError,'loadout_changed_since_queue','hash revalidation catches content changes even if a revision was not bumped');
records.set(changed.loadoutId,changed);

const invalidSupport=record('support-account','support-char','Stonecaller',['damage']);records.set(invalidSupport.loadoutId,invalidSupport);
let roleError='';try{freezeCoopRosterAtCommit({selections,minLevel:15,syncLevel:25,repository});}catch(error){roleError=error instanceof Error?error.message:String(error);}
assert.ok(roleError.startsWith('role_not_ready:'),'invalid utility Support cannot commit');
records.set(invalidSupport.loadoutId,record('support-account','support-char','Stonecaller',['mitigate','utility']));

console.log('coop phase3 roster commit OK',JSON.stringify({roles:committed.map(row=>row.readiness.role),hashes:committed.map(row=>row.snapshotHash.slice(0,8))}));
