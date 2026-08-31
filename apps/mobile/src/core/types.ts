export type ClassId = 'IRONWARDEN' | 'DAWNKEEPER' | 'WAYFINDER' | 'RAVAGER' | 'HEXWEAVER' | 'KNIFE_DANCER' | 'STONECALLER';
export type GearSlot = 'weapon' | 'offhand' | 'helmet' | 'chest' | 'legs' | 'boots' | 'gloves' | 'cape' | 'amulet' | 'ring';
export type ActivityKind = 'combat' | 'mining' | 'woodcutting' | 'fishing';
export type SkillId='mining'|'woodcutting'|'fishing'|'smithing'|'cooking';
export interface SkillState{skillId:SkillId;xp:number;level:number;}
export interface CharacterState { id:string; name:string; classId:ClassId; level:number; xp:number; gold:number; hp:number; attack:number; defense:number; equipment:Partial<Record<GearSlot,string>>; }
export interface ItemStack { itemId:string; quantity:number; }
export interface InventoryState { stacks:ItemStack[]; capacity:number; }
export interface ActiveActivity { kind:ActivityKind; targetId:string; startedAtMs:number; lastClaimAtMs:number; }
export interface QuestState { questId:string; status:'locked'|'active'|'complete'|'claimed'; progress:number; }
export interface GameState { version:4; createdAtMs:number; character:CharacterState|null; inventory:InventoryState; activity:ActiveActivity|null; quests:QuestState[]; unlockedMonsterIds:string[]; defeatedBossIds:string[]; skills:SkillState[]; settings:{numberMode:'abbreviated'|'exact';reduceMotion:boolean;textScale:1|1.15|1.3|1.5;}; }
export interface RewardBundle { xp:number; gold:number; items:ItemStack[]; kills:number; elapsedSeconds:number; }
