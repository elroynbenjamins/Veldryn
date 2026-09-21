import { ITEMS,itemDef } from '../content/items';
import { MONSTERS } from '../content/monsters';
import { GameState, ItemStack } from '../core/types';
import { characterLevelFromXp, characterTotalXpAtLevel,totalXpAtLevel } from '../core/progression';
import { stackItems, previewActivityReward } from '../core/game';
import { captureActivityEnvironment } from '../core/world-weather';
import { noviceItemId,noviceSetFor } from '../content/novice-sets';

export interface BalanceSimulationSample {
  monsterId: string;
  monster: string;
  level: number;
  unlockLevel: number;
  kills: number;
  xp: number;
  gold: number;
  elapsedSeconds: number;
  stopped: boolean;
  stopReason: string;
  endHp: number;
}

function requireCharacter(state: GameState) {
  if (!state.character) throw new Error('Debug action requires a character');
  return state.character;
}

export function debugSetLevel(state: GameState, level: number): GameState {
  const c = requireCharacter(state);
  const clamped = Math.max(1, Math.min(100, Math.floor(level)));
  const xp = characterTotalXpAtLevel(clamped);
  const unlocked = MONSTERS.filter(m => m.unlockLevel <= clamped).map(m => m.id);
  return { ...state, character: { ...c, level: clamped, xp }, unlockedMonsterIds: [...new Set([...state.unlockedMonsterIds, ...unlocked])] };
}

export function debugAddXp(state: GameState, amount: number): GameState {
  const c = requireCharacter(state);
  const xp = Math.max(0, c.xp + Math.floor(amount));
  return { ...state, character: { ...c, xp, level: characterLevelFromXp(xp) } };
}

export function debugAddGold(state: GameState, amount: number): GameState {
  const c = requireCharacter(state);
  return { ...state, character: { ...c, gold: Math.max(0, c.gold + Math.floor(amount)) } };
}

export function debugAddItem(state: GameState, itemId: string, quantity = 1): GameState {
  itemDef(itemId); // validate ID
  const incoming: ItemStack = { itemId, quantity: Math.max(1, Math.floor(quantity)) };
  return { ...state, inventory: { ...state.inventory, stacks: stackItems(state.inventory.stacks, [incoming]) } };
}

export function debugUnlockMonster(state: GameState, monsterId: string): GameState {
  if (!MONSTERS.some(m => m.id === monsterId)) throw new Error('Unknown monster');
  return { ...state, unlockedMonsterIds: [...new Set([...state.unlockedMonsterIds, monsterId])] };
}

export function debugAdvanceActivity(state: GameState, seconds: number): GameState {
  if (!state.activity) return state;
  const deltaMs = Math.max(0, seconds) * 1000;
  return { ...state, activity: { ...state.activity, lastClaimAtMs: state.activity.lastClaimAtMs - deltaMs, startedAtMs: state.activity.startedAtMs - deltaMs } };
}

export function debugCompleteQuest(state: GameState, questId: string): GameState {
  return { ...state, quests: state.quests.map(q => q.questId === questId ? { ...q, status: 'complete' as const, progress: Number.MAX_SAFE_INTEGER } : q) };
}

export function debugDefeatFallenKnight(state: GameState): GameState {
  return state.defeatedBossIds.includes('FALLEN_KNIGHT') ? state : { ...state, defeatedBossIds: [...state.defeatedBossIds, 'FALLEN_KNIGHT'] };
}

function debugAddQaSupplies(state:GameState,quantity=9999):GameState{
  let next=state;
  for(const item of ITEMS){
    if(item.type==='gear')continue;
    next=debugAddItem(next,item.id,quantity);
  }
  return next;
}

/** Development-only equipment lab. It deliberately grants inputs rather than
 * finished gear so crafting, timers, rarity rolls, duplicate instances,
 * upgrading and gems are still exercised through the real local game rules. */
export function debugPrepareEquipmentLab(state:GameState):GameState{
  const c=requireCharacter(state),skillXp=totalXpAtLevel(100);
  let next:GameState={
    ...state,
    character:{...c,gold:50_000_000},
    inventory:{...state.inventory,capacity:Math.max(state.inventory.capacity,5000)},
    bank:{...state.bank,capacity:Math.max(state.bank.capacity,5000)},
    skills:state.skills.map(skill=>({...skill,xp:skillXp,level:100})),
    account:{
      ...state.account,
      createdCharacterCount:Math.max(state.account.createdCharacterCount,4),
      unlockedCharacterSlots:5,
      entitlements:{...(state.account.entitlements??{}),supporter:true,vip_plus:true},
    },
  };
  next=debugAddQaSupplies(next);
  return next;
}

/** Gives the current class a valid baseline co-op kit and maximum test level.
 * It does not fake a dungeon result or a reward. */
export function debugPrepareDungeonLab(state:GameState):GameState{
  let next=debugSetLevel(state,100);
  const c=requireCharacter(next),set=noviceSetFor(c.classId),equipment={...c.equipment};
  for(const slot of set.slots)equipment[slot]=noviceItemId(c.classId,slot);
  const crafted=[...new Set([...(c.craftedNoviceItemIds??[]),...set.slots.map(slot=>noviceItemId(c.classId,slot))])];
  next={
    ...next,
    character:{...c,equipment,craftedNoviceItemIds:crafted,currentHp:Math.max(c.currentHp,c.hp)},
    unlockedMonsterIds:MONSTERS.map(monster=>monster.id),
  };
  return next;
}

/** One-tap local QA state for navigating the whole prototype. Kept behind
 * __DEV__ by SettingsScreen so none of these privileges ship as online trust. */
export function debugPrepareFullQaSandbox(state:GameState):GameState{
  let next=debugPrepareEquipmentLab(debugPrepareDungeonLab(state));
  next={
    ...next,
    quests:next.quests.map(quest=>({...quest,status:'claimed' as const,progress:Number.MAX_SAFE_INTEGER})),
    unlockedMonsterIds:MONSTERS.map(monster=>monster.id),
    defeatedBossIds:[...new Set([...next.defeatedBossIds,...MONSTERS.filter(monster=>monster.boss).map(monster=>monster.id)])],
    account:{
      ...next.account,
      guildMember:true,
      guildContribution:Math.max(next.account.guildContribution??0,25_000),
      premiumCurrencyBalance:Math.max(next.account.premiumCurrencyBalance??0,99_999),
    },
  };
  return next;
}

export function debugCombatBalanceProbe(state: GameState, elapsedSeconds = 3600): BalanceSimulationSample[] {
  const c = requireCharacter(state);
  const nowMs = Math.max(1, Math.floor(elapsedSeconds)) * 1000;
  const samples: BalanceSimulationSample[] = [];

  for (const monster of MONSTERS) {
    if (monster.boss) continue;
    const testState = {
      ...state,
      activity: {
        kind: 'combat',
        targetId: monster.id,
        startedAtMs: 0,
        lastClaimAtMs: 0,
        environment: captureActivityEnvironment(monster.id, 0),
      },
    } as GameState;

    const reward = previewActivityReward(testState, nowMs);
    samples.push({
      monsterId: monster.id,
      monster: monster.name,
      level: monster.level,
      unlockLevel: monster.unlockLevel,
      kills: reward.kills,
      xp: reward.xp,
      gold: reward.gold,
      elapsedSeconds: reward.elapsedSeconds,
      stopped: !!reward.stoppedReason,
      stopReason: reward.stoppedReason ?? '',
      endHp: reward.endHp ?? c.hp,
    });
  }

  return samples;
}

export function debugSerializeSave(state: GameState): string {
  return JSON.stringify(state, null, 2);
}
