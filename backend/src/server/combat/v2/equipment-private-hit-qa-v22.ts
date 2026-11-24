/** Private QA-only V22 effect execution, never an owned-set or mint authority.
 * The exact same compiled original Forge actor is used in paired experiments.
 * Only two current-hit source proposals are supported. All other IDs fail.
 */
import type {CombatInput} from '../types';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
const policy='eq2-v22-private-current-hit-qa' as const;
const brand:unique symbol=Symbol(policy);
export type Eq2PrivateHitAuthorityV22=Readonly<{readonly [brand]:true}>;
const specs=Object.freeze({
 'EQ2_DUNGEON_ROOTBOUND_T2_WEAPON_RAVAGER':{pct:7,below:.35,cd:20000,physical:false,family:'winterbreaker'},
 'EQ2_DUNGEON_OBSERVATORY_T4_WEAPON_RAVAGER':{pct:7,below:.35,cd:20000,physical:false,family:'winterbreaker'},
 'EQ2_DUNGEON_SHIVERLAKE_T5_WEAPON_RAVAGER':{pct:7,below:.35,cd:20000,physical:false,family:'winterbreaker'},
 'eq2_t5_avalanche:6':{pct:8,below:.30,cd:20000,physical:true,family:'avalanche'},
} as const);
export type Eq2PrivateHitIdV22=keyof typeof specs;
type Scope={digest:string;actorId:string;ids:readonly Eq2PrivateHitIdV22[]};
const issued=new WeakMap<object,Scope>();
const fail=(x:string):never=>{throw Error('eq2_private_hit_v22_'+x);};
export function issueEq2PrivateHitQaV22(input:CombatInput,actorId:string,ids:readonly Eq2PrivateHitIdV22[],verifyFixture:(digest:string)=>boolean):Eq2PrivateHitAuthorityV22{
 const actor=input.players.find(x=>x.id===actorId);
 if(!actor||actor.combatV2?.version!==2||actor.team!=='players'||!actor.id.startsWith('QA_EQ2_RAVAGER_')||
 input.players.length!==1||input.enemyDamageProfile!==undefined||input.initialPlayerState!==undefined||
 !Array.isArray(ids)||ids.length<1||ids.length>2||ids.some(id=>!Object.hasOwn(specs,id))||
 new Set(ids.map(id=>specs[id].family)).size!==ids.length)fail('fixture_scope');
 const digest=enemyV2SnapshotDigest(input);
 if(typeof verifyFixture!=='function'||verifyFixture(digest)!==true)fail('fixture_unverified');
 const token=Object.freeze({[brand]:true}) as Eq2PrivateHitAuthorityV22;
 issued.set(token,{digest,actorId,ids:Object.freeze([...ids])});
 return token;
}
export interface Eq2PrivateHitEventV22{
 now:number;actorId:string;targetId:string;abilityId:string;originalClassAbility:boolean;
 direct:boolean;physical:boolean;nontrue:boolean;sourceAlive:boolean;targetAlive:boolean;
 targetHp:number;targetMaxHp:number;shield:number;raw:number;
}
export interface Eq2PrivateHitResultV22{raw:number;activated:readonly Eq2PrivateHitIdV22[];bonusPct:number}
export function authorizeEq2PrivateHitQaV22(input:CombatInput,authority?:Eq2PrivateHitAuthorityV22){
 if(authority===undefined)return undefined;
 const scope=typeof authority==='object'&&authority!==null?issued.get(authority):undefined;
 if(!scope||scope.digest!==enemyV2SnapshotDigest(input))return fail('invalid_authority');
 const cooldown=new Map<string,number>();
 return {
  beforeDirectHit(e:Eq2PrivateHitEventV22):Eq2PrivateHitResultV22{
   const unchanged={raw:e.raw,activated:[],bonusPct:0};
   if(e.actorId!==scope.actorId||e.actorId===e.targetId||!e.direct||!e.originalClassAbility||!e.nontrue||
     !e.sourceAlive||!e.targetAlive||e.abilityId==='BASIC'||/^(V2_|GEM_|COMPANION_)/.test(e.abilityId)||
     !Number.isSafeInteger(e.now)||e.now<0||[e.targetHp,e.targetMaxHp,e.shield,e.raw].some(n=>!Number.isFinite(n)||n<0)||
     e.targetMaxHp<=0||e.targetHp<=0||e.targetHp>e.targetMaxHp||e.raw<=e.shield)return unchanged;
   const active=scope.ids.filter(id=>{const s=specs[id];return e.targetHp/e.targetMaxHp<s.below&&(!s.physical||e.physical)&&e.now>=(cooldown.get(s.family)??0);});
   if(!active.length)return unchanged;
   const bonusPct=Math.min(20,active.reduce((n,id)=>n+specs[id].pct,0));
   for(const id of active)cooldown.set(specs[id].family,e.now+specs[id].cd);
   return {raw:e.raw*(1+bonusPct/100),activated:active,bonusPct};
  },
 };
}
