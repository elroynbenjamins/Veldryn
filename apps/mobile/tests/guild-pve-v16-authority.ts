/** Hidden V16 private reader contract tests: synthetic accounts / GameState. */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {makeGuildPveV9Run,type GuildPveV9StoreState} from '../../../backend/src/server/combat/guild-pve-transaction-v9';
import {makeGuildPveReferenceV7} from '../../../backend/src/server/combat/guild-pve-broken-forge-v7';
import {GuildPveV16PrivateReadService,type GuildPveV16ConsistentRead,
 type GuildPveV16TrustedReadPort} from '../../../backend/online/guild-pve-authority-v16';

const ACCOUNT='GX_V16_ACCOUNT',CHAR='GX_V16_CHARACTER',GUILD='GX_V16_GUILD',CYCLE='GX_V16_CYCLE';
const START=Date.UTC(2026,10,16),DAY=86400000;
const BASE=REGIONAL_COMBAT_FIXTURES.find(f=>f.regionId==='IRONWOOD')!;
const state=regionalCombatFixture({...BASE,tier:'T2',level:15},'prepared',CLASSES[0].id);
state.character={...state.character!,id:CHAR};
const run=makeGuildPveV9Run({
 cycleId:CYCLE,guildId:GUILD,startMs:START,difficulty:'Scout',
 accountIds:[ACCOUNT],reference:makeGuildPveReferenceV7('T2',{
  attack:1000,defense:650,maxHp:4500,
 }),
});
// The first committed campaign snapshot may legitimately be revision zero.
const ledger:GuildPveV9StoreState={
 guildRuns:{[JSON.stringify([CYCLE,GUILD])]:run},receipts:{},cycleBindings:{},
};
const good:GuildPveV16ConsistentRead={
 authenticatedAccountId:ACCOUNT,
 membership:{accountId:ACCOUNT,guildId:GUILD,joinedAtUtcMs:START-DAY},
 character:{ownerAccountId:ACCOUNT,characterId:CHAR,revision:7,state},
 ledger,expeditionRevision:0,serverNowUtcMs:START+DAY,
};
async function rejects(fn:()=>Promise<unknown>,message:string){
 let error='';try{await fn()}catch(e){error=String(e)}
 assert.ok(error.includes(message),'Expected '+message+', got '+error);
}
function port(view:GuildPveV16ConsistentRead|null,principal:string|null=ACCOUNT):
 GuildPveV16TrustedReadPort {
 return {
  async verifiedPrincipalAccountId(){return principal},
  async withConsistentRead(selection,use){
   assert.equal(selection.principalAccountId,principal);
   assert.equal(selection.characterId,CHAR);
   assert.equal(selection.cycleId,CYCLE);
   assert.equal(selection.guildId,GUILD);
   // Fake atomic snapshot; production must provide a real DB read transaction.
   return use(structuredClone(view)!);
  },
 };
}
const view=(read:GuildPveV16ConsistentRead|null=good,principal:string|null=ACCOUNT)=>
 new GuildPveV16PrivateReadService(port(read,principal)).inspect({
  cycleId:CYCLE,guildId:GUILD,characterId:CHAR,
 });
async function main(){
 const result=await view();
 assert.equal(result.progress.frozenAccounts,1);
 assert.equal(result.progress.stage,'active');
 assert.equal(result.progress.requiredTotal,7);
 assert.equal(result.progress.canClaim,false);
 assert.equal(result.canCommit,false);
 assert.equal(result.canClaim,false);
 assert.equal(result.characterRevision,7);
 assert.equal(result.actorSourceHash.length,64);
 assert.ok(['tank','damage','support'].includes(result.actorRole));
 await rejects(()=>view(good,null),'unauthenticated');
 await rejects(()=>view({...good,authenticatedAccountId:'GX_OTHER'}),'principal_snapshot_mismatch');
 await rejects(()=>view({...good,membership:null}),'not_current_guild_member');
 await rejects(()=>view({...good,membership:{...good.membership!,guildId:'GX_OTHER'}}),'not_current_guild_member');
 await rejects(()=>view({...good,membership:{...good.membership!,joinedAtUtcMs:START+1}}),'late_join_not_authorized');
 await rejects(()=>view({...good,character:null}),'not_owned_character');
 await rejects(()=>view({...good,character:{...good.character!,ownerAccountId:'GX_OTHER'}}),'not_owned_character');
 await rejects(()=>view({...good,character:{...good.character!,revision:0}}),'not_owned_character');
 await rejects(()=>view({...good,expeditionRevision:2}),'stale_expedition_revision');
 await rejects(()=>view({...good,expeditionRevision:-1}),'stale_expedition_revision');
 await rejects(()=>view({...good,ledger:null}),'missing_private_expedition');
 await rejects(()=>view({...good,serverNowUtcMs:Infinity}),'invalid_clock');
 const badLedger=structuredClone(ledger);
 badLedger.cycleBindings[JSON.stringify([CYCLE,ACCOUNT])]='GX_OTHER';
 await rejects(()=>view({...good,ledger:badLedger}),'bound_to_other_guild');
 const noRoster=structuredClone(ledger);
 delete noRoster.guildRuns[JSON.stringify([CYCLE,GUILD])].members[ACCOUNT];
 await rejects(()=>view({...good,ledger:noRoster}),'not_in_frozen_roster');
 const illegal=structuredClone(state);
 illegal.character!.equipment.weapon='FORGED_INVENTED_WEAPON';
 await rejects(()=>view({...good,character:{...good.character!,state:illegal}}),'');
 const original=good.character!.state.character!.id;
 const copy=await view();
 copy.progress.nodes[0].remainingHp=0; // returned projection cannot mutate the source
 assert.equal(good.character!.state.character!.id,original);
 assert.ok(run.nodes['C1-04'].hp>0);
 console.log('V16: account, guild, roster, epoch, stat ownership, and read-only QA passed');
}
main().catch(e=>{console.error(e);process.exitCode=1});
