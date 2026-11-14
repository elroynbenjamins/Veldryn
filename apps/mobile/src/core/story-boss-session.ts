import type {GameState} from './types';
import {rebasedCombatLevelFromLegacyLevel} from './progression';
import {fallenKnightWeeklyStatus} from './weekly-boss';
import {storyBossPlaybackEvents} from './story-boss-playback';
import {FALLEN_KNIGHT_MANUAL_POTION_COOLDOWN_MS,FALLEN_KNIGHT_MAX_POTION_UNITS,simulateFallenKnightStoryBattle,type FallenKnightBattleResult,type FallenKnightPlayerSnapshot} from './story-boss';
import {challengeFallenKnight,fallenKnightPlayerSnapshot,settleOutOfCombatRecovery} from './game';

/** Persisted inside the server-versioned game state, not in client timers. */
export interface ActiveStoryBossSession {
 kind:'fallen_knight';
 characterId:string;
 startedAtMs:number;
 seed:string;
 mode:'story'|'rematch';
 snapshot:FallenKnightPlayerSnapshot;
 potionId?:string;
 manualPotionAtMs:number[];
}
export function projectStoryBossSession(session:ActiveStoryBossSession):FallenKnightBattleResult {
 return simulateFallenKnightStoryBattle(session.snapshot,session.seed,session.mode,session.manualPotionAtMs);
}
function requireSession(state:GameState):ActiveStoryBossSession {
 const session=state.storyBossSession;
 if(!session||session.kind!=='fallen_knight'||!state.character||session.characterId!==state.character.id)
  throw new Error('No active Fallen Knight battle for this character.');
 return session;
}
export function startStoryBossSession(state:GameState,nowMs:number){
 if(state.storyBossSession)throw new Error('Finish the active battle first.');
 state=settleOutOfCombatRecovery(state,nowMs);
 const character=state.character;
 if(!character)throw new Error('No character.');
 if(character.level<rebasedCombatLevelFromLegacyLevel(25))throw new Error('Reach the Fallen Knight minimum level first.');
 const mode=state.defeatedBossIds.includes('FALLEN_KNIGHT')?'rematch':'story';
 if(mode==='story'&&state.quests.some(q=>q.questId==='QST_014'&&q.status==='locked'))
  throw new Error('Advance the Asterfall questline before challenging the Fallen Knight.');
 if(mode==='rematch'&&fallenKnightWeeklyStatus(state,nowMs).remaining<=0)
  throw new Error('Fallen Knight weekly rematches are complete.');
 const snapshot=fallenKnightPlayerSnapshot(state);
 const session:ActiveStoryBossSession={
  kind:'fallen_knight',characterId:character.id,startedAtMs:nowMs,
  seed:character.id+':FALLEN_KNIGHT_'+mode.toUpperCase()+':'+nowMs,mode,snapshot,
  potionId:character.equippedHealingPotionId,manualPotionAtMs:[],
 };
 return {state:{...state,storyBossSession:session},battle:projectStoryBossSession(session)};
}
export function healStoryBossSession(state:GameState,nowMs:number){
 const session=requireSession(state),elapsed=nowMs-session.startedAtMs;
 const before=projectStoryBossSession(session);
 if(!Number.isSafeInteger(elapsed)||elapsed<0||elapsed>=before.durationMs)
  throw new Error('The battle has already ended.');
 if(!session.potionId||session.snapshot.potionHeal<=0)
  throw new Error('Equip a healing potion before the battle.');
 const available=state.inventory.stacks.filter(row=>row.itemId===session.potionId).reduce((total,row)=>total+row.quantity,0);
 if(before.potionConsumed>=FALLEN_KNIGHT_MAX_POTION_UNITS||before.potionConsumed>=available)
  throw new Error('No healing potions remaining for this battle.');
 const last=session.manualPotionAtMs[session.manualPotionAtMs.length-1];
 if(last!==undefined&&elapsed-last<FALLEN_KNIGHT_MANUAL_POTION_COOLDOWN_MS)
  throw new Error('Healing potion is on cooldown.');
 const visible=storyBossPlaybackEvents(before).filter(event=>event.atMs<=elapsed);
 const current=visible[visible.length-1];
 if(!current||current.playerHp<=0||current.bossHp<=0)
  throw new Error('You cannot heal after the battle has ended.');
 if(current.playerHp>=before.playerMaxHp)throw new Error('HP is already full.');
 const updated:ActiveStoryBossSession={...session,manualPotionAtMs:[...session.manualPotionAtMs,elapsed]};
 const battle=projectStoryBossSession(updated);
 if(battle.potionConsumed!==before.potionConsumed+1||
    !battle.events.some(event=>event.type==='heal'&&event.atMs===elapsed))
  throw new Error('The potion could not be applied at that combat moment.');
 return {state:{...state,storyBossSession:updated},battle};
}
export function finishStoryBossSession(state:GameState,nowMs:number){
 const session=requireSession(state),battle=projectStoryBossSession(session);
 if(nowMs-session.startedAtMs<battle.durationMs)
  throw new Error('The boss battle is still in progress.');
 // One versioned online commit settles potions, rewards, HP and weekly limits.
 const result=challengeFallenKnight({...state,storyBossSession:undefined},nowMs,battle);
 if(!result.battle)throw new Error('Boss resolution unavailable.');
 return {...result,battle:result.battle};
}
