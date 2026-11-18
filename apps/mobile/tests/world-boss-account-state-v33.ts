/**
 * World Boss V33 private account-save reconstruction regression.
 * Staging has ONE online_game_states row per account. Every extra fighter is
 * projected from state.otherCharacters and cross-checked against relational
 * public.characters ownership. No Supabase project is contacted.
 */
import {assert} from './test-assert';
import {newGame,createCharacter} from '../src/core/game';
import {createAccountCharacter} from '../src/core/account-actions';
import type {GameState} from '../src/core/types';
import {expandOwnedWorldBossAccountSaveV33,
 WORLD_BOSS_V33_ACCOUNT_STATE_LIVE,type WorldBossAccountSaveRowV33}
 from '../../../backend/online/world-boss-account-state-v33';
import {createWorldBossAccountPgV26}
 from '../../../backend/online/world-boss-account-pg-v26';

const ACCOUNT='10000000-0000-4000-8000-000000000033';
const OTHER='10000000-0000-4000-8000-000000000034';
const ids=Array.from({length:6},(_,i)=>
 '20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
const at=Date.UTC(2026,10,21,8,30);
const fails=(action:()=>unknown,part:string)=>{
 let error='';try{action();}catch(e){error=String(e);}
 assert.ok(error.includes(part),'Expected '+part+'; got '+error);
};
async function failsAsync(action:()=>Promise<unknown>,part:string){
 let error='';try{await action();}catch(e){error=String(e);}
 assert.ok(error.includes(part),'Expected '+part+'; got '+error);
}
function saveOfThree():GameState{
 const first=createCharacter(newGame(1000),'IRONWARDEN','Guardian');
 first.character!.id=ids[0];
 first.account.unlockedCharacterSlots=3;
 const second=createAccountCharacter(first,'DAWNKEEPER','Healer','female',1000);
 second.character!.id=ids[1];
 const third=createAccountCharacter(second,'WAYFINDER','Hunter','male',1000);
 third.character!.id=ids[2];
 assert.equal(third.otherCharacters?.length,2);
 return third;
}
const ownerRows=(state:GameState)=>[
 state.character!,...(state.otherCharacters??[]).map(x=>x.character),
].map(x=>({characterId:x.id,classId:x.classId}));
const row=(state:GameState):WorldBossAccountSaveRowV33=>({
 ownerAccountId:ACCOUNT,activeCharacterId:state.character!.id,
 revisionText:'7',updatedText:String(at),serverState:state,
 ownedCharacters:ownerRows(state),
});

async function main(){
 assert.equal(WORLD_BOSS_V33_ACCOUNT_STATE_LIVE,false);
 const three=saveOfThree();
 const source=JSON.stringify(three);
 const expanded=expandOwnedWorldBossAccountSaveV33(ACCOUNT,row(three));
 assert.equal(expanded.length,3,'must reconstruct all three stored roles');
 assert.deepEqual(expanded.map(x=>x.characterId),ids.slice(0,3));
 assert.deepEqual(expanded.map(x=>x.serverState.character!.classId),
  ['IRONWARDEN','DAWNKEEPER','WAYFINDER']);
 assert.ok(expanded.every(x=>x.ownerAccountId===ACCOUNT&&x.gameVersion===7&&
  x.updatedAtUtcMs===at));
 assert.equal(JSON.stringify(three),source,'projection cannot alter saved state');
 assert.ok(expanded.every(x=>x.serverState.character?.id===x.characterId));

 // Existing pre-1.0.10 four/five-character accounts remain playable even
 // though no new account may create a fourth/fifth slot.
 const legacy=structuredClone(three);
 const exemplar=legacy.otherCharacters![0];
 for(const id of ids.slice(3,5)){
  legacy.otherCharacters!.push({...structuredClone(exemplar),
   character:{...structuredClone(exemplar.character),id}});
 }
 legacy.account.unlockedCharacterSlots=5;
 const five=expandOwnedWorldBossAccountSaveV33(ACCOUNT,row(legacy));
 assert.equal(five.length,5,'grandfathered fourth/fifth are verified');
 assert.deepEqual(five.map(x=>x.characterId),ids.slice(0,5));
 assert.equal(five[4].serverState.character!.id,ids[4]);

 // Client-forged identity, missing relational ownership or duplicate owner
 // records can never be frozen as a roster.
 fails(()=>expandOwnedWorldBossAccountSaveV33(OTHER,row(three)),
  'untrusted_account_save');
 fails(()=>expandOwnedWorldBossAccountSaveV33(ACCOUNT,{
  ...row(three),activeCharacterId:ids[1],
 }), 'untrusted_account_save');
 fails(()=>expandOwnedWorldBossAccountSaveV33(ACCOUNT,{
  ...row(three),ownedCharacters:ownerRows(three).slice(0,2),
 }), 'roster_ownership_mismatch');
 fails(()=>expandOwnedWorldBossAccountSaveV33(ACCOUNT,{
  ...row(three),ownedCharacters:[
   ...ownerRows(three).slice(0,2),{characterId:ids[3],classId:'WAYFINDER'},
  ],
 }), 'unproved_owned_character');
 fails(()=>expandOwnedWorldBossAccountSaveV33(ACCOUNT,{
  ...row(three),ownedCharacters:ownerRows(three).map((x,i)=>
   i===1?{...x,classId:'RAVAGER'}:x),
 }), 'unproved_owned_character');
 fails(()=>expandOwnedWorldBossAccountSaveV33(ACCOUNT,{
  ...row(three),ownedCharacters:[ownerRows(three)[0],ownerRows(three)[0],
   ownerRows(three)[2]],
 }), 'invalid_owned_identity');
 fails(()=>expandOwnedWorldBossAccountSaveV33(ACCOUNT,{
  ...row(five[0].serverState),ownedCharacters:[...ownerRows(legacy),
   {characterId:ids[5],classId:'WAYFINDER'}],
 }), 'untrusted_account_save');
 fails(()=>expandOwnedWorldBossAccountSaveV33(ACCOUNT,{
  ...row(three),revisionText:'not-a-number',
 }), 'untrusted_account_save');

 // The V26 Pg adapter must read ONE account save, plus all relational owners
 // in the same SQL snapshot; never silently return only the active fighter.
 let calls=0;
 const queryLog:Array<{sql:string;params:readonly unknown[]}>=[],pg=
  createWorldBossAccountPgV26({
   async query<T extends object>(sql:string,params:readonly unknown[]){
    calls++;queryLog.push({sql,params});
    return {rows:[row(legacy) as unknown as T]};
   },
  });
 const fromPg=await pg.listOwnedStates(ACCOUNT);
 assert.equal(fromPg.length,5,'single-row account save expands five fighters');
 assert.equal(calls,1,'snapshot and owner catalog must share one SQL query');
 assert.ok(queryLog[0].sql.includes('FROM public.online_game_states'));
 assert.ok(queryLog[0].sql.includes('FROM public.characters'));
 assert.ok(queryLog[0].sql.includes('LIMIT 6'));
 assert.ok(!queryLog[0].sql.includes(ACCOUNT),'account ID must be bound');
 assert.deepEqual(queryLog[0].params,[ACCOUNT]);
 await failsAsync(()=>pg.listOwnedStates('invalid'),'pg_owner_invalid');
 assert.equal(calls,1,'reject invalid account before querying');

 console.log('WORLD_BOSS_V33_ACCOUNT_SAVE_PROJECTION='+JSON.stringify({
 accountSavedRows:1,oneQuerySnapshot:true,newRosterSize:3,
 verifiedLegacyRosterSize:5,ownedCrosscheck:true,
 rejectsForeignOrMissingOwners:true,live:false,walletCredits:0,
 }));
}
void main().catch(error=>{console.error(error);throw error;});
