/** Shared read-only Dungeon Marks Shop DTOs. Kept in .ts for non-JSX engine tests. */
export type DungeonMarksShopItemStatus=
 'eligible'|'region_locked'|'already_owned'|'weekly_limit'|'insufficient_marks'|'unreleased';
export interface DungeonMarksShopCard{
 id:string;name:string;category:'supply'|'companion'|'icon'|'border'|'background'|'pet';
 marks:number;summary:string;status:DungeonMarksShopItemStatus;
 rarity?:'Rare'|'Epic';region?:'Asterfall'|'Sunscar'|'Frostmarch';
 owned?:boolean;remainingThisUtcWeek?:number|null;lockReason?:string;
}
export interface DungeonMarksShopSnapshot{
 currency:'expedition_mark';catalogueVersion:string;
 balance:number;shopEnabled:boolean;nextUtcWeekReset:string;
 offers:DungeonMarksShopCard[];
}
