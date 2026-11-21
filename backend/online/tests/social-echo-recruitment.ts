import assert from 'node:assert/strict';
import {recruitQModeAllies,type PublishedEcho} from '../../src/server/coop/echo-recruitment';
import {scaleSocialEchoToHost} from '../../src/server/coop/social-echo-balance';
import {validateSocialEchoCandidates,validateSelectedSocialEchoCharacterIds,type SocialEchoCandidate} from '../../../apps/mobile/src/core/coop-social-echoes';
import type {FrozenLoadoutSnapshot} from '../../src/server/coop/loadout-snapshots';
import type {CombatantDefinition} from '../../src/server/combat/types';

const source=(id:string,role:'tank'|'damage'|'support',classId:string,accountId:string):PublishedEcho=>({
 profileId:'00000000-0000-4000-8000-'+id.padStart(12,'0'),
 sourceAccountId:accountId,optedIn:true,publishedAtMs:100,contentVersion:'v1',blockedAccountIds:[],
 snapshot:{
  accountId,characterId:'00000000-0000-4000-9000-'+id.padStart(12,'0'),classId,loadoutId:'current',revision:1,
  readiness:{ready:true,role,normalizedScore:1,failures:[]},normalized:{snapshot:{},effectiveLevel:25,before:{}},
  characterLevel:25,combatPower:5000,snapshotHash:'hash-'+id,
 } as unknown as FrozenLoadoutSnapshot,
});
const profiles=[
 source('1','tank','IRONWARDEN','tank-1'),
 source('2','damage','WAYFINDER','dps-1'),
 source('3','damage','RAVAGER','dps-2'),
 source('4','support','STONECALLER','support-1'),
 source('5','damage','HEXWEAVER','dps-3'),
];
const input={serverSecret:'secret',requestId:'test-request',controllerAccountId:'host',controllerRole:'support' as const,controllerClassId:'DAWNKEEPER',contentVersion:'v1',nowMs:500,profiles,npcSnapshots:[]};
const chosen=profiles[2];
const preferred=recruitQModeAllies({...input,preferredProfileIds:[chosen.profileId]});
assert.equal(preferred.length,3);
assert.equal(preferred.some(row=>row.echo?.profileId===chosen.profileId),true,'Chosen shared ally takes a matching seat');
assert.deepEqual(preferred.map(row=>row.snapshot.readiness.role),['tank','damage','damage']);
assert.equal(new Set(preferred.filter(row=>row.snapshot.readiness.role==='damage').map(row=>row.snapshot.classId)).size,2);
const legacy=recruitQModeAllies(input);
assert.equal(legacy.length,3,'Random default recruitment stays supported');
assert.throws(()=>recruitQModeAllies({...input,preferredProfileIds:[chosen.profileId,chosen.profileId]}),/invalid_echo_selection/);
assert.throws(()=>recruitQModeAllies({...input,preferredProfileIds:['not-authorized']}),/social_echo_unavailable/);
assert.throws(()=>recruitQModeAllies({...input,preferredProfileIds:[profiles[2].profileId,profiles[4].profileId,profiles[1].profileId]}),/invalid_echo_role_composition/,'Three selected DPS cannot bypass the two damage slots');
const blocked=source('6','tank','BASTION','blocked-tank');blocked.blockedAccountIds=['host'];
assert.throws(()=>recruitQModeAllies({...input,profiles:[...profiles,blocked],preferredProfileIds:[blocked.profileId]}),/social_echo_unavailable/);
const revoked=source('7','tank','BASTION','revoked-tank');revoked.optedIn=false;
assert.throws(()=>recruitQModeAllies({...input,profiles:[...profiles,revoked],preferredProfileIds:[revoked.profileId]}),/social_echo_unavailable/);

const candidates:SocialEchoCandidate[]=profiles.map((echo,index)=>({
 characterId:echo.snapshot.characterId,accountId:echo.sourceAccountId,
 name:'Hero '+index,role:echo.snapshot.readiness.role,classId:echo.snapshot.classId,
 level:25,combatPower:5000,relationship:index===0?'friend':'guild',
}));
assert.equal(validateSocialEchoCandidates(candidates).length,5);
assert.doesNotThrow(()=>validateSelectedSocialEchoCharacterIds([chosen.snapshot.characterId],candidates,'DAWNKEEPER','support'));
assert.throws(()=>validateSelectedSocialEchoCharacterIds([chosen.snapshot.characterId,chosen.snapshot.characterId],candidates,'DAWNKEEPER','support'),/invalid_echo_selection/);
assert.throws(()=>validateSelectedSocialEchoCharacterIds([profiles[1].snapshot.characterId,profiles[2].snapshot.characterId,profiles[4].snapshot.characterId],candidates,'DAWNKEEPER','support'),/invalid_echo_role_composition/);

const actor={id:'char-3',role:'damage',classId:'RAVAGER',stats:{maxHp:1000,attackPower:150,healingPower:25,defense:100,critChance:.24,haste:.17},abilities:[{id:'original-class-ability'}],tags:['gear:legendary']} as unknown as CombatantDefinition;
const powerful=scaleSocialEchoToHost(actor,3000,12000);
assert.ok(powerful.stats.maxHp<actor.stats.maxHp*.35&&powerful.stats.maxHp>actor.stats.maxHp*.2,'Overpowered donor must scale close to host, not dominate');
assert.ok(powerful.stats.attackPower<actor.stats.attackPower&&powerful.stats.defense<actor.stats.defense);
assert.equal(powerful.stats.critChance,actor.stats.critChance,'Equipment crit shape survives normalization');
assert.deepEqual(powerful.abilities,actor.abilities,'Borrowed class abilities remain untouched');
const boosted=scaleSocialEchoToHost(actor,3000,12000,1,1.36);
assert.ok(boosted.stats.attackPower<powerful.stats.attackPower,'Regional high-CP amplification must be removed for chosen Echoes');
assert.ok(boosted.stats.maxHp<powerful.stats.maxHp,'Regional survival amplification must also be corrected');
assert.equal(actor.stats.attackPower,150,'Frozen donor data is not mutated');
const equal=scaleSocialEchoToHost(actor,5000,5000);
assert.ok(equal.stats.attackPower<=135.00001,'An equally powerful borrowed ally receives a 10% soft cap');
console.log('PASS chosen Echo authorization, role composition, block/consent checks, and normalized gear/ability preservation');
