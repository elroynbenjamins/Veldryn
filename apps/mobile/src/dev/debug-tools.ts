import { itemDef } from '../content/items';
import { MONSTERS } from '../content/monsters';
import { GameState, ItemStack } from '../core/types';
import { characterLevelFromXp, characterTotalXpAtLevel } from '../core/progression';
import { stackItems } from '../core/game';

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

export function debugSerializeSave(state: GameState): string {
  return JSON.stringify(state, null, 2);
}
