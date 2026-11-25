import {FROSTFALL_EVENT} from '../src/content/annual-events-v2';
import {EVENT_COMPANIONS} from '../src/content/event-companions-v2';
import {COMBAT_COMPANIONS} from '../src/content/combat-companions';
import {FROSTFALL_COMPANION_IDS,RELEASED_EVENT_COMPANIONS} from '../src/content/event-companions-active';
import {FROSTFALL_REWARDS_RELEASED} from '../src/core/release-flags';
import {createCharacter,newGame} from '../src/core/game';
import {claimEventReward} from '../src/core/live-events';
import {createSaveBackup,parseSaveBackup} from '../src/core/save-transfer';
import {companionServerDefinition,companionTechniques} from '../../../backend/src/server/companions/content';
import {buildOwnedCompanionCombatant} from '../../../backend/src/server/companions/combat-adapter';
import {applyCharacterCompanionAssist} from '../../../backend/src/server/companions/character-assist';
import type {OwnedCompanionSnapshot} from '../../../backend/src/server/companions/domain';
import type {GameState} from '../src/core/types';

const check=(value:unknown,message:string)=>{if(!value)throw new Error(message)};
const ids=['EVT_UNIT_012','EVT_UNIT_013','EVT_UNIT_009'];
const roles=['damage','tank','support'] as const;
check(!FROSTFALL_REWARDS_RELEASED,'The Frostfall release flag must remain false before art and owner approval');
check(FROSTFALL_COMPANION_IDS.size===3&&ids.every(id=>FROSTFALL_COMPANION_IDS.has(id)),'All three Frostfall units share one release gate');
check(ids.every(id=>!COMBAT_COMPANIONS.some(row=>row.id===id)&&!RELEASED_EVENT_COMPANIONS.some(row=>row.id===id)),'Unapproved event companions cannot enter player-visible rosters');
const milestones=FROSTFALL_EVENT.milestones('IRONWARDEN');
const rewards=milestones.filter(row=>row.reward.kind==='companion');
check(rewards.length===3&&JSON.stringify(rewards.map(row=>[row.points,row.reward.id]))===JSON.stringify([[6000,'EVT_UNIT_012'],[8500,'EVT_UNIT_013'],[10000,'EVT_UNIT_009']]),'Frostfall companion milestones are unique, ordered and preserve the 10k Herald');
check(FROSTFALL_EVENT.maxProgress===10000&&FROSTFALL_EVENT.shop.length===25&&FROSTFALL_EVENT.shop.filter(row=>row.reward.kind==='emote').length===5,'Frostfall preserves 10k maximum reputation and the 20 existing offers plus four new emote offers and Aurora Bellframe');
for(let i=0;i<ids.length;i++){
 const id=ids[i],mobile=EVENT_COMPANIONS.find(row=>row.id===id),server=companionServerDefinition(id);
 check(mobile&&server, `Event companion ${id} must exist on both mobile and server`);
 check(mobile!.role===roles[i]&&server!.role===roles[i]&&mobile!.rarity==='elite'&&server!.rarity==='elite',`Role and rarity agree for ${id}`);
 check(mobile!.name===server!.name&&server!.originId==='EVENT_FROSTFALL_FESTIVAL',`Name and origin agree for ${id}`);
 check(mobile!.activeAbility.effect.kind===server!.active.effectKind,`Actual server effect matches mobile text for ${id}`);
 check(mobile!.ascensionMaterialCosts?.length===3&&mobile!.availability?.recurringAvailability==='annual',`Ascension and recurrence authored for ${id}`);
 check(companionTechniques(id).length===2,`Two selectable techniques are available for ${id}`);
 const progress:OwnedCompanionSnapshot={companionId:id,level:20,xp:0,ascensionTier:1,bondLevel:1,bondXp:0,bondTraitUnlocked:false};
 const solo=buildOwnedCompanionCombatant(progress,{mode:'companion_trial'});
 const owner={id:'frostfall_test_owner',classId:'WAYFINDER',stats:{maxHp:1000,haste:.1,defense:100},abilities:[],tags:[],basicAttackMs:1800,basicAttackCoeff:1} as unknown as Parameters<typeof applyCharacterCompanionAssist>[0];
 const assisted=applyCharacterCompanionAssist(owner,progress);
 const soloEffects=solo.abilities[0].effects,assistEffects=assisted.abilities[0].effects;
 check(assisted.abilities.length===1,`Exactly one assist, not an extra party member: ${id}`);
 if(id==='EVT_UNIT_009'){
  check(soloEffects.some(e=>e.kind==='heal')&&soloEffects.some(e=>e.kind==='buff'&&e.tag==='damage_taken'), 'Herald heals and mitigates in Companion Trials');
  check(assistEffects.some(e=>e.kind==='heal')&&assistEffects.some(e=>e.kind==='buff'&&e.tag==='damage_taken'), 'Herald really heals and mitigates in character combat');
 }else if(id==='EVT_UNIT_012'){
  check(soloEffects.some(e=>e.kind==='damage')&&soloEffects.some(e=>e.kind==='debuff'&&e.tag==='damage_taken'), 'Lynx provides damage and short vulnerability in Trials');
  check(assistEffects.some(e=>e.kind==='damage')&&assistEffects.some(e=>e.kind==='debuff'&&e.tag==='damage_taken'), 'Lynx provides damage and short vulnerability in character combat');
 }else{
  check(soloEffects.some(e=>e.kind==='shield'&&(e.shieldReflectPct??0)>0), 'Ram reflects absorbed shield damage in Trials');
  check(assistEffects.some(e=>e.kind==='shield'&&(e.shieldReflectPct??0)>0), 'Ram reflects absorbed shield damage in character combat');
 }
}
// Simulate a server-authorized milestone snapshot without changing production flags.
const now=Date.UTC(2026,11,10,12),initial=createCharacter(newGame(now),'IRONWARDEN','Frostfall QA');
let state:GameState={...initial,account:{...initial.account,eventProgressById:{...initial.account.eventProgressById,[FROSTFALL_EVENT.id]:10000}}};
for(const id of ids){
 const reward=rewards.find(row=>row.reward.id===id)?.reward;
 check(!!reward,`Authoritative reward exists for ${id}`);
 state=claimEventReward(state,id,now);
 check(state.account.unlockedCombatCompanionIds?.includes(id),`Claim grants permanent account ownership: ${id}`);
 check(state.account.combatCompanionProgress?.[id]?.level===1&&state.account.combatCompanionProgress?.[id]?.bondLevel===1,`Fresh companion starts at level/Bond 1: ${id}`);
 let rejected=false;try{claimEventReward(state,id,now);}catch{rejected=true;}
 check(rejected,`Duplicate milestone claim rejected: ${id}`);
}
const restored=parseSaveBackup(createSaveBackup(state));
for(const id of ids)check(restored.account.unlockedCombatCompanionIds?.includes(id)&&restored.account.combatCompanionProgress?.[id]?.level===1,`Ownership and training survive backup restore: ${id}`);
const closed={...restored,account:{...restored.account,liveEvent:undefined}};
for(const id of ids)check(closed.account.unlockedCombatCompanionIds?.includes(id),`Event closure must not revoke account ownership: ${id}`);
console.log('PASS: Frostfall three-role companions, real support/counter effects, gated catalog and permanent milestone ownership');
