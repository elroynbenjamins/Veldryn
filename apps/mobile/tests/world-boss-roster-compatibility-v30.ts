/**
 * Hidden World Boss V30 compatibility gate.
 *
 * Live Veldryn creation: three NEW characters (one of each role).
 * Existing fourth/fifth characters are deliberately grandfathered.
 * A World Boss uses one account-wide three-attempt entitlement, not one
 * entitlement per fighter. No event, route, currency or wallet is enabled.
 */
import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {createAccountCharacter,switchAccountCharacter} from '../src/core/account-actions';
import {
 accountCharacters,occupiedCharacterRoles,MAX_NEW_ACCOUNT_CHARACTERS,
} from '../src/core/account-roster';
import {migrateSave} from '../src/core/save-migrations';
import {
 WORLD_BOSS_V22_ACCOUNT_RAID_LIVE,WORLD_BOSS_V22_MAX_CHARACTERS,
 worldBossAccountDamageV22,
} from '../../../backend/src/server/combat/world-boss-account-raid-v22';
import {
 WORLD_BOSS_V22_SCHEDULE_LIVE,WORLD_BOSS_V22_MAX_ATTEMPTS,
} from '../../../backend/src/server/combat/world-boss-weekend-v22';

const attempt=(fn:()=>unknown,part:string)=>{
 let caught='';try{fn();}catch(error){caught=String(error);}
 assert.ok(caught.includes(part),'Expected '+part+' but received '+caught);
};
assert.equal(MAX_NEW_ACCOUNT_CHARACTERS,3,'new roster must be at most three');
assert.equal(WORLD_BOSS_V22_MAX_CHARACTERS,5,'retain pre-existing fourth/fifth characters');
assert.equal(WORLD_BOSS_V22_MAX_ATTEMPTS,3,'attempts must be account-wide');
assert.equal(WORLD_BOSS_V22_ACCOUNT_RAID_LIVE,false,'bosses stay hidden');
assert.equal(WORLD_BOSS_V22_SCHEDULE_LIVE,false,'boss calendar stays disabled');

const first=createCharacter(newGame(1000),'IRONWARDEN','Starter');
const slots={...first,account:{...first.account,unlockedCharacterSlots:3}};
const second=createAccountCharacter(slots,'DAWNKEEPER','Healer','female',1000);
const third=createAccountCharacter(second,'HEXWEAVER','Striker','male',1000);
assert.equal(accountCharacters(third).length,3,'three roles available on new rosters');
assert.deepEqual(occupiedCharacterRoles(third),['Tank','Damage','Support']);
attempt(()=>createAccountCharacter(third,'RAVAGER','Forbidden','male',1000),'Maximum 3');
attempt(()=>createAccountCharacter(slots,'BASTION','Repeat Tank','male',1000),'already has a Tank');

const inherited=third.otherCharacters![0];
const legacy={
 ...third,account:{...third.account,unlockedCharacterSlots:5},
 otherCharacters:[...third.otherCharacters!,
  {...structuredClone(inherited),character:{
   ...structuredClone(inherited.character),id:'LEGACY_WORLD_BOSS_FOUR',
  }},
  {...structuredClone(inherited),character:{
   ...structuredClone(inherited.character),id:'LEGACY_WORLD_BOSS_FIVE',
  }},
 ],
};
const restored=migrateSave(JSON.parse(JSON.stringify(legacy)));
assert.equal(accountCharacters(restored).length,5,'legacy fourth/fifth survive migration');
assert.equal(accountCharacters(switchAccountCharacter(
 restored,'LEGACY_WORLD_BOSS_FIVE',1000)).length,5,
 'legacy fifth stays playable');
attempt(()=>createAccountCharacter(restored,'WAYFINDER','Sixth','male',1000),'Maximum 3');

// This is preview damage, never an economy credit. Extra legacy fighters must
// not multiply attempts, claims, or the account's highest fighter reward.
const ledger=(count:number)=>Array.from({length:count},(_,i)=>({
 characterId:'OWNED_'+i,rawDamage:1000,
}));
assert.equal(worldBossAccountDamageV22(ledger(3)),1190);
assert.equal(worldBossAccountDamageV22(ledger(5)),1280);
attempt(()=>worldBossAccountDamageV22(ledger(6)),'invalid_damage_ledger');
console.log('WORLD_BOSS_V30_ACCOUNT_ROSTER_COMPATIBILITY='+JSON.stringify({
 newCharacterCap:3,requiredNewRoles:['Tank','Damage','Support'],
 preservedLegacyCharacters:5,accountAttempts:3,
 legacyDamagePreviewCap:1.28,live:false,walletCredits:0,
}));
