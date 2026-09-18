export type PersonalRecordCategory='combat'|'dungeon'|'raid'|'profession'|'activity'|'companion'|'party'|'guild';
export type PersonalRecordUnit='number'|'milliseconds'|'seconds'|'xp'|'gold';
export interface PersonalRecordDefinition{id:string;category:PersonalRecordCategory;label:string;unit:PersonalRecordUnit;rule:'max'|'min_positive';description:string}
export interface PersonalRecordEntry{recordId:string;value:number;achievedAtMs:number;characterId?:string;contextLabel?:string}
export interface PersonalRecordEvent{eventId:string;recordId:string;value:number;achievedAtMs:number;characterId?:string;contextLabel?:string}

export const PERSONAL_RECORDS_V43:PersonalRecordDefinition[]=[
 {id:'highest_single_hit',category:'combat',label:'Highest single hit',unit:'number',rule:'max',description:'Largest damage value from one trusted combat hit.'},
 {id:'highest_critical_hit',category:'combat',label:'Highest critical hit',unit:'number',rule:'max',description:'Largest critical-hit damage value.'},
 {id:'highest_single_heal',category:'combat',label:'Highest single heal',unit:'number',rule:'max',description:'Largest healing value from one heal.'},
 {id:'most_damage_single_fight',category:'combat',label:'Most damage in one fight',unit:'number',rule:'max',description:'Highest total personal damage in a single combat encounter.'},
 {id:'most_healing_single_fight',category:'combat',label:'Most healing in one fight',unit:'number',rule:'max',description:'Highest total personal healing in a single combat encounter.'},
 {id:'fastest_boss_kill_ms',category:'combat',label:'Fastest boss defeat',unit:'milliseconds',rule:'min_positive',description:'Fastest trusted boss clear for an eligible boss encounter.'},
 {id:'highest_enemy_level_defeated',category:'combat',label:'Highest-level enemy defeated',unit:'number',rule:'max',description:'Highest enemy level defeated in an eligible encounter.'},
 {id:'fastest_dungeon_clear_ms',category:'dungeon',label:'Fastest dungeon clear',unit:'milliseconds',rule:'min_positive',description:'Fastest full dungeon clear.'},
 {id:'highest_dungeon_floor',category:'dungeon',label:'Highest dungeon floor',unit:'number',rule:'max',description:'Highest eligible dungeon or tower floor reached.'},
 {id:'most_dungeon_damage',category:'dungeon',label:'Most dungeon damage',unit:'number',rule:'max',description:'Most personal damage dealt in one completed dungeon.'},
 {id:'most_dungeon_healing',category:'dungeon',label:'Most dungeon healing',unit:'number',rule:'max',description:'Most personal healing done in one completed dungeon.'},
 {id:'highest_raid_damage',category:'raid',label:'Most raid damage',unit:'number',rule:'max',description:'Most personal damage dealt in one raid result.'},
 {id:'highest_raid_healing',category:'raid',label:'Most raid healing',unit:'number',rule:'max',description:'Most personal healing done in one raid result.'},
 {id:'fastest_raid_clear_ms',category:'raid',label:'Fastest raid clear',unit:'milliseconds',rule:'min_positive',description:'Fastest eligible completed raid.'},
 {id:'most_fish_in_day',category:'profession',label:'Most fish caught in one day',unit:'number',rule:'max',description:'Highest server-day total of fish caught.'},
 {id:'most_ore_mined_in_day',category:'profession',label:'Most ore mined in one day',unit:'number',rule:'max',description:'Highest server-day total of ore gathered.'},
 {id:'most_logs_cut_in_day',category:'profession',label:'Most logs cut in one day',unit:'number',rule:'max',description:'Highest server-day total of logs gathered.'},
 {id:'most_items_crafted_in_day',category:'profession',label:'Most items crafted in one day',unit:'number',rule:'max',description:'Highest server-day total of crafted items.'},
 {id:'most_food_cooked_in_day',category:'profession',label:'Most food cooked in one day',unit:'number',rule:'max',description:'Highest server-day total of cooking outputs.'},
 {id:'most_bars_smelted_in_day',category:'profession',label:'Most bars smelted in one day',unit:'number',rule:'max',description:'Highest server-day total of smelting outputs.'},
 {id:'largest_crafting_batch',category:'profession',label:'Largest crafting batch',unit:'number',rule:'max',description:'Largest completed quantity in a single trusted crafting batch.'},
 {id:'most_profession_xp_settlement',category:'profession',label:'Most profession XP in one settlement',unit:'xp',rule:'max',description:'Largest profession XP payout from one trusted settlement.'},
 {id:'longest_activity_seconds',category:'activity',label:'Longest uninterrupted activity',unit:'seconds',rule:'max',description:'Longest continuous eligible activity before stopping.'},
 {id:'most_actions_single_settlement',category:'activity',label:'Most actions in one settlement',unit:'number',rule:'max',description:'Largest number of completed actions in one trusted settlement.'},
 {id:'most_xp_single_settlement',category:'activity',label:'Most XP in one settlement',unit:'xp',rule:'max',description:'Largest total XP payout from one trusted activity settlement.'},
 {id:'most_items_single_settlement',category:'activity',label:'Most items in one settlement',unit:'number',rule:'max',description:'Largest total item quantity produced by one trusted settlement.'},
 {id:'most_gold_single_settlement',category:'activity',label:'Most Gold in one settlement',unit:'gold',rule:'max',description:'Largest Gold payout from one trusted settlement.'},
 {id:'highest_companion_hit',category:'companion',label:'Highest companion hit',unit:'number',rule:'max',description:'Largest damage hit dealt by a companion.'},
 {id:'highest_companion_heal',category:'companion',label:'Highest companion heal',unit:'number',rule:'max',description:'Largest healing value from a companion.'},
 {id:'fastest_companion_trial_clear_ms',category:'companion',label:'Fastest Companion Trial clear',unit:'milliseconds',rule:'min_positive',description:'Fastest eligible Companion Trial floor clear.'},
 {id:'highest_companion_trial_floor',category:'companion',label:'Highest Companion Trial floor',unit:'number',rule:'max',description:'Highest Companion Trial floor reached in a monthly season.'},
 {id:'highest_contract_contribution',category:'party',label:'Highest Contract contribution',unit:'number',rule:'max',description:'Highest personal contribution score in one completed Party Contract.'},
 {id:'highest_guild_project_contribution',category:'guild',label:'Highest Guild Project contribution',unit:'number',rule:'max',description:'Highest personal contribution score in one Guild Project.'},
];

export function personalRecordDefinition(id:string){return PERSONAL_RECORDS_V43.find(row=>row.id===id)}
export function applyPersonalRecord(previous:PersonalRecordEntry|undefined,event:PersonalRecordEvent){
 const definition=personalRecordDefinition(event.recordId);if(!definition)throw new Error('unknown_record');
 if(!event.eventId||!Number.isFinite(event.achievedAtMs)||event.achievedAtMs<0)throw new Error('invalid_record_event');
 if(!Number.isFinite(event.value)||event.value<0||(definition.rule==='min_positive'&&event.value<=0))throw new Error('invalid_record_value');
 const better=!previous||(definition.rule==='max'?event.value>previous.value:event.value<previous.value);
 if(!better)return {changed:false,entry:previous};
 const entry:PersonalRecordEntry={recordId:event.recordId,value:event.value,achievedAtMs:event.achievedAtMs,...(event.characterId?{characterId:event.characterId}:{}),...(event.contextLabel?{contextLabel:event.contextLabel}: {})};
 return {changed:true,entry};
}
export function recordCategories(){return [...new Set(PERSONAL_RECORDS_V43.map(row=>row.category))]}
