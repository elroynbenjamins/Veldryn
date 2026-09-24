/** Minimal read-only projection: navigation guidance never grants progress or completes quests. */
export interface FirstSessionTutorialHost{
 character:{level:number}|null;
 quests:readonly {questId:string;status:'locked'|'active'|'complete'|'claimed';progress:number}[];
 activity?:{kind:string;targetId:string}|null;
}
export type FirstSessionTutorialId='first_hunt'|'first_hunt_collect'|'first_skill'|'first_skill_collect'|'ironwood_prepare'|'ironwood_hunt'|'gear_check'|'level_ten'|'core_loop_complete'|'claim_qst001'|'claim_qst002'|'claim_qst003'|'claim_qst004'|'claim_qst005';
export type FirstSessionTutorialDestination='World'|'Skills'|'Inventory'|'More'|'Home'|'Quests';
export interface FirstSessionTutorialStep{
 id:FirstSessionTutorialId;questId:string;eyebrow:string;title:string;body:string;hint:string;actionLabel:string;
 destination:FirstSessionTutorialDestination;
 // Do not highlight Account when the real target is Home or the Quests shortcut.
 highlightPrimary?:'World'|'Skills'|'Inventory'|'More';
}
const STEPS:readonly FirstSessionTutorialStep[]=[
 {id:'first_hunt',questId:'QST_001',eyebrow:'FIRST HUNT',title:'Make the road safer',body:'Start with 5 Moss Rats. Your character handles the fight once you start the hunt.',hint:'In World, open Combat in Greenfields. Choose Moss Rat, then start the hunt.',actionLabel:'Show World',destination:'World',highlightPrimary:'World'},
 {id:'first_hunt_collect',questId:'QST_001',eyebrow:'YOUR HUNT IS RUNNING',title:'Collect your progress',body:'Hunt rewards update your XP, items and quest progress when collected.',hint:'Use Collect on the activity screen when rewards are available. Keep hunting until all 5 rats are counted.',actionLabel:'Show activity',destination:'Home'},
 {id:'first_skill',questId:'QST_002',eyebrow:'ONE GATHERING SKILL',title:'Learn from the land',body:'Reach level 2 in an available guided gathering skill.',hint:'Open Skills, choose an available gathering activity and start it. Collect its rewards to gain skill XP.',actionLabel:'Show Skills',destination:'Skills',highlightPrimary:'Skills'},
 {id:'first_skill_collect',questId:'QST_002',eyebrow:'GATHERING IS RUNNING',title:'Turn rewards into skill XP',body:'The activity can continue while you explore other screens.',hint:'Collect gathering rewards on the activity screen to update your skill level.',actionLabel:'Show activity',destination:'Home'},
 {id:'ironwood_prepare',questId:'QST_003',eyebrow:'BEFORE IRONWOOD',title:'Prepare for the wolves',body:'Ironwood Wolves require character Level 7. Your gathering skill level is separate.',hint:'Hunt enemies you can safely fight and collect combat rewards to raise your character level.',actionLabel:'Show World',destination:'World',highlightPrimary:'World'},
 {id:'ironwood_hunt',questId:'QST_003',eyebrow:'THE NEXT HUNT',title:'Follow the hound trail',body:'Your next task is to defeat 6 Ironwood Wolves.',hint:'Travel to Ironwood Forest in World, then open Combat. Collect the hunt rewards to count your kills.',actionLabel:'Show World',destination:'World',highlightPrimary:'World'},
 {id:'gear_check',questId:'QST_004',eyebrow:'EQUIPMENT',title:'Add to your starting kit',body:'Equip at least 2 gear pieces in total. Your starting weapon already counts as one.',hint:'Equip an owned piece from Inventory; withdraw it first if it is in Bank. Craft missing armor through Skills when needed.',actionLabel:'Show Inventory',destination:'Inventory',highlightPrimary:'Inventory'},
 {id:'level_ten',questId:'QST_005',eyebrow:'YOUR NEXT MILESTONE',title:'Reach character Level 10',body:'This objective uses your character level, not the total of your skill levels.',hint:'Continue safe hunts and collect combat rewards. Better equipment and food help you keep going.',actionLabel:'Show World',destination:'World',highlightPrimary:'World'},
 ...(['QST_001','QST_002','QST_003','QST_004','QST_005'] as const).map((questId,index):FirstSessionTutorialStep=>({id:`claim_qst00${index+1}` as FirstSessionTutorialId,questId,eyebrow:'OBJECTIVE COMPLETE',title:'Claim your story reward',body:'You have finished this objective. Claim its reward to continue the story.',hint:'Open Quests and claim the completed story quest.',actionLabel:'Show Quests',destination:'Quests'})),
];
const IDS=new Set<string>([...STEPS.map(row=>row.id),'core_loop_complete']);
export function normalizeFirstSessionTutorialCompleted(value:unknown):FirstSessionTutorialId[]{
 return Array.isArray(value)?[...new Set(value.filter((id):id is FirstSessionTutorialId=>typeof id==='string'&&IDS.has(id)))]:[];
}
export function firstSessionTutorialStep(state:FirstSessionTutorialHost,completed:readonly string[]=[]):FirstSessionTutorialStep|undefined{
 if(!state.character)return undefined;
 const sequence=['QST_001','QST_002','QST_003','QST_004','QST_005'];
 const questId=sequence.find(id=>state.quests.find(row=>row.questId===id)?.status!=='claimed');
 if(!questId)return undefined; // No extra Account tour on top of the QST_005 feature unlocks.
 const quest=state.quests.find(row=>row.questId===questId);
 if(!quest||quest.status==='locked')return undefined;
 let id:FirstSessionTutorialId;
 if(quest.status==='complete')id=`claim_qst00${sequence.indexOf(questId)+1}` as FirstSessionTutorialId;
 else if(questId==='QST_001')id=state.activity?.kind==='combat'&&state.activity.targetId==='MOSS_RAT'?'first_hunt_collect':'first_hunt';
 else if(questId==='QST_002')id=state.activity&&['mining','woodcutting','fishing','herbalism'].includes(state.activity.kind)?'first_skill_collect':'first_skill';
 else if(questId==='QST_003')id=state.character.level<7?'ironwood_prepare':'ironwood_hunt';
 else id=questId==='QST_004'?'gear_check':'level_ten';
 return completed.includes(id)?undefined:STEPS.find(row=>row.id===id);
}
export function firstSessionTutorialSteps(){return STEPS;}
