export type MainScreenTourDestination='Home'|'Character'|'Skills'|'World'|'Inventory'|'More';
export interface MainScreenTourStep{
 id:'home'|'character'|'skills'|'world'|'inventory'|'account';
 destination:MainScreenTourDestination;
 title:string;
 body:string;
 points:readonly string[];
 highlightPrimary?:MainScreenTourDestination;
 /** When set, the matching TutorialBeacon inside the destination screen pulses. */
 highlightBeacon?:string;
}
export const MAIN_SCREEN_TOUR:readonly MainScreenTourStep[]=[
 {id:'home',destination:'Home',highlightPrimary:'Home',highlightBeacon:'home-primary',title:'Home',body:'Home shows what you are doing now and what is ready to collect.',points:['Check your current activity and timer.','Tap Collect when rewards are ready.','Use the top shortcuts to reach important features quickly.']},
 {id:'character',destination:'Character',highlightPrimary:'Character',highlightBeacon:'character-equipment',title:'Character',body:'Character is where you review your build, equipment and main stats.',points:['Tap an equipment slot to review your gear.','Use Enhance, Gems, Sets or Compare to inspect your selected equipment.','The suggested next action follows your actual upgrade and socket readiness.']},
 {id:'skills',destination:'Skills',highlightPrimary:'Skills',title:'Skills',body:'Gather resources and turn them into useful items and equipment.',points:['Choose a skill or activity.','Tap Start to begin, or Queue to save it for later.','Missing materials and requirements are shown before crafting.']},
 {id:'world',destination:'World',highlightPrimary:'World',highlightBeacon:'world-travel',title:'World',body:'World lets you travel, find activities and enter combat or dungeons.',points:['Tap a region to see what is available there.','Check requirements before you Travel.','Open Combat or the simplified Dungeon flow when you are ready.']},
 {id:'inventory',destination:'Inventory',highlightPrimary:'Inventory',title:'Inventory',body:'Inventory keeps your items together and helps you manage your gear.',points:['Use the filters and search to find items quickly.','Use the star and lock in each item square to protect important items.','Equip or compare gear before changing your build.']},
 {id:'account',destination:'More',highlightPrimary:'More',highlightBeacon:'more-shortcuts',title:'Account & more',body:'Account holds the extra systems you do not need on every screen.',points:['Open Quests, Social, Guild, Events and Collections here.','Notification dots show when something needs attention.','Open Settings → Help & Guide to replay this tour anytime.']},
];
export function mainScreenTourStep(index:number):MainScreenTourStep|undefined{return MAIN_SCREEN_TOUR[index];}
