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
 {id:'home',destination:'Home',title:'Home & active progress',body:'Home is your quick status screen. Use it to collect finished activity rewards and see what your character is working on.',points:['The top bar shows season, weather, Gold and your configurable shortcuts.','Active activity cards show what is running and when rewards can be collected.','Chat stays available without leaving your current gameplay screen.']},
 {id:'character',destination:'Character',highlightPrimary:'Character',title:'Character',body:'Use Character to review your build and make equipment decisions.',points:['Equipment slots show what is currently worn and where an upgrade fits.','Stats summarize the effects of your class, gear and active bonuses.','Profile and loadout controls are for presentation and build management, not separate progression.']},
 {id:'skills',destination:'Skills',highlightPrimary:'Skills',title:'Skills',body:'Skills is the hub for gathering, processing, crafting and Faith.',points:['Choose a skill or category first, then select an available activity or recipe.','Start begins work now; Queue adds work for later when that option is available.','Recipe and requirement panels explain missing materials, tools and unlocks before you commit.']},
 {id:'world',destination:'World',highlightPrimary:'World',title:'World',body:'World is where you choose regions and move into combat, gathering and co-op content.',points:['Region cards show availability, requirements and useful activities before you travel.','Weather can change which activities are most attractive, so check it before choosing a route.','Combat and dungeon buttons open focused screens; Back returns you to the World overview.']},
 {id:'inventory',destination:'Inventory',highlightPrimary:'Inventory',title:'Inventory',body:'Inventory is for reviewing, filtering and using the items you own.',points:['Filter and sort controls help keep large collections manageable.','Tap an item for its actions; long-press can show the detailed item view where supported.','Equipment actions explain whether an item can be equipped, moved or compared before changing your build.']},
 {id:'account',destination:'More',highlightPrimary:'More',title:'Account & more',body:'Account collects the systems you do not need on every moment-to-moment gameplay screen.',points:['Quests, Social, Guild, Events, Collections and other unlocked features live here.','Notification dots point to something worth checking without forcing a popup.','Settings contains Help & Guide, so you can replay this tour or open a specific topic whenever you want.']},
];
export function mainScreenTourStep(index:number):MainScreenTourStep|undefined{return MAIN_SCREEN_TOUR[index];}
