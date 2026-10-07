export type MainScreenTourDestination='Home'|'Character'|'Skills'|'World'|'Inventory'|'More';
export interface MainScreenTourStep{
 id:'home'|'character'|'skills'|'world'|'inventory'|'account';
 destination:MainScreenTourDestination;
 title:string;
 body:string;
 points:readonly string[];
 highlightPrimary?:Exclude<MainScreenTourDestination,'Home'>;
}
export const MAIN_SCREEN_TOUR:readonly MainScreenTourStep[]=[
 {id:'home',destination:'Home',title:'Home',body:'Home shows what you are doing now and what is ready to collect.',points:['Check your current activity and timer.','Tap Collect when rewards are ready.','Use the top shortcuts to reach important features quickly.']},
 {id:'character',destination:'Character',highlightPrimary:'Character',title:'Character',body:'Character is where you review your build, equipment and main stats.',points:['Tap an equipment slot to review your gear.','Compare stats before replacing an item.','Use Profile and Loadouts when you want to adjust your setup.']},
 {id:'skills',destination:'Skills',highlightPrimary:'Skills',title:'Skills',body:'Gather resources and turn them into useful items and equipment.',points:['Choose a skill or activity.','Tap Start to begin, or Queue to save it for later.','Missing materials and requirements are shown before crafting.']},
 {id:'world',destination:'World',highlightPrimary:'World',title:'World',body:'World lets you travel, find activities and enter combat or dungeons.',points:['Tap a region to see what is available there.','Check requirements before you Travel.','Open Combat or Dungeons when you are ready.']},
 {id:'inventory',destination:'Inventory',highlightPrimary:'Inventory',title:'Inventory',body:'Inventory keeps your items together and helps you manage your gear.',points:['Use Filter and Sort to find items quickly.','Tap an item to see its available actions.','Equip or compare gear before changing your build.']},
 {id:'account',destination:'More',highlightPrimary:'More',title:'Account & more',body:'Account holds the extra systems you do not need on every screen.',points:['Open Quests, Social, Guild, Events and Collections here.','Notification dots show when something needs attention.','Open Settings → Help & Guide to replay this tour anytime.']},
];
export function mainScreenTourStep(index:number):MainScreenTourStep|undefined{return MAIN_SCREEN_TOUR[index];}
