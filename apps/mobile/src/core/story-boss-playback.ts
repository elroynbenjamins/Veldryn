import type {FallenKnightBattleResult,StoryBossEvent} from './story-boss';

/**
 * Replay HP from settled damage/heal events instead of trusting snapshots on
 * telegraphs. Boss telegraphs can be backdated after an attack is resolved,
 * so their recorded HP (and phase) would otherwise reveal a future outcome.
 * This is presentation-only: never feed these projections into settlement.
 */
export function storyBossPlaybackEvents(battle:Pick<FallenKnightBattleResult,'events'|'playerMaxHp'|'bossMaxHp'>):StoryBossEvent[]{
 const events=[...battle.events].sort((a,b)=>a.atMs-b.atMs||a.type.localeCompare(b.type));
 const initial=events.find(event=>event.type==='battle_start');
 const clampHp=(value:number,max:number)=>Math.max(0,Math.min(max,value));
 let playerHp=clampHp(initial?.playerHp??battle.playerMaxHp,battle.playerMaxHp);
 let bossHp=clampHp(initial?.bossHp??battle.bossMaxHp,battle.bossMaxHp);
 let phase:1|2|3=1;
 return events.map(event=>{
  const amount=Number.isFinite(event.amount)?Math.max(0,event.amount!):0;
  if(event.type==='player_hit')bossHp=clampHp(bossHp-amount,battle.bossMaxHp);
  else if(event.type==='boss_hit')playerHp=clampHp(playerHp-amount,battle.playerMaxHp);
  else if(event.type==='heal'||(event.type==='class_skill'&&event.skillKind==='heal'))
   playerHp=clampHp(playerHp+amount,battle.playerMaxHp);
  if(event.type==='phase')phase=event.phase;
  return {...event,playerHp,bossHp,phase};
 });
}
