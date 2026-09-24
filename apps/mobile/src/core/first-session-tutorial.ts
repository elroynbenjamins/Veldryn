import type {GameState} from './types';

export type FirstSessionTutorialId='first_hunt'|'first_skill'|'ironwood_hunt'|'gear_check'|'level_ten'|'core_loop_complete';
export type FirstSessionTutorialDestination='World'|'Skills'|'Inventory'|'More';

export interface FirstSessionTutorialStep{
 id:FirstSessionTutorialId;
 questId:string;
 eyebrow:string;
 title:string;
 body:string;
 hint:string;
 actionLabel:string;
 destination:FirstSessionTutorialDestination;
 highlightPrimary:FirstSessionTutorialDestination;
}

const STEPS:readonly FirstSessionTutorialStep[]=[
 {id:'first_hunt',questId:'QST_001',eyebrow:'FIRST STEP',title:'Start with one hunt',body:'Your first story task is simple: defeat 5 Moss Rats. We will introduce the rest of VELDRYN as you need it.',hint:'Open World, then choose combat in Greenfields.',actionLabel:'Show World',destination:'World',highlightPrimary:'World'},
 {id:'first_skill',questId:'QST_002',eyebrow:'NEXT: SKILLING',title:'Learn one gathering skill',body:'Combat is only part of progression. Your next story task asks you to reach level 2 in any guided gathering skill.',hint:'Open Skills and choose Mining, Woodcutting or Fishing.',actionLabel:'Show Skills',destination:'Skills',highlightPrimary:'Skills'},
 {id:'ironwood_hunt',questId:'QST_003',eyebrow:'BACK TO COMBAT',title:'Follow the hound trail',body:'You have seen gathering. Now return to the road and defeat 6 Ironwood Wolves.',hint:'Open World and follow the available route toward Ironwood Verge.',actionLabel:'Show World',destination:'World',highlightPrimary:'World'},
 {id:'gear_check',questId:'QST_004',eyebrow:'GEAR BASICS',title:'Equip what you have earned',body:'Before the road gets harder, equip at least 2 pieces of gear. You do not need to learn upgrades, gems or sets yet.',hint:'Open Inventory and equip two useful pieces.',actionLabel:'Show Inventory',destination:'Inventory',highlightPrimary:'Inventory'},
 {id:'level_ten',questId:'QST_005',eyebrow:'BUILD YOUR FOUNDATION',title:'Reach Level 10',body:'You know the basic loop now: fight, gather, improve your gear and keep progressing. Reach character Level 10 to enter deeper Ironwood.',hint:'Use World for combat or Skills for training. There is no need to learn every system yet.',actionLabel:'Show World',destination:'World',highlightPrimary:'World'},
 {id:'core_loop_complete',questId:'QST_005',eyebrow:'CORE LOOP COMPLETE',title:'More systems are opening',body:'You have finished the guided first-session path. New systems will now explain themselves when they unlock instead of being introduced all at once.',hint:'Companions, social features and Contracts are now available from Account when relevant.',actionLabel:'Show Account',destination:'More',highlightPrimary:'More'},
];

function questClaimed(state:GameState,id:string){return state.quests.some(row=>row.questId===id&&row.status==='claimed');}

export function firstSessionTutorialStep(state:GameState,completed:readonly string[]=[]):FirstSessionTutorialStep|undefined{
 const done=new Set(completed);
 const q1=questClaimed(state,'QST_001'),q2=questClaimed(state,'QST_002'),q3=questClaimed(state,'QST_003'),q4=questClaimed(state,'QST_004'),q5=questClaimed(state,'QST_005');
 const id:FirstSessionTutorialId=!q1?'first_hunt':!q2?'first_skill':!q3?'ironwood_hunt':!q4?'gear_check':!q5?'level_ten':'core_loop_complete';
 const step=STEPS.find(row=>row.id===id);
 return step&&!done.has(step.id)?step:undefined;
}

export function firstSessionTutorialSteps(){return STEPS;}
