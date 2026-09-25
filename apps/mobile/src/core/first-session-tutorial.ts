/** Minimal read-only projection: navigation guidance never grants progress or completes quests. */
export interface FirstSessionTutorialHost{
 character:{level:number}|null;
 quests:readonly {questId:string;status:'locked'|'active'|'complete'|'claimed';progress:number}[];
 activity?:{kind:string;targetId:string}|null;
 unlockedMonsterIds?:readonly string[];
 currentRegionId?:string;
}
export type FirstSessionTutorialId='first_hunt'|'first_hunt_collect'|'first_skill'|'first_skill_collect'|'ironwood_scout'|'ironwood_scout_collect'|'ironwood_prepare'|'ironwood_travel'|'ironwood_reveal'|'ironwood_reveal_collect'|'ironwood_hunt'|'gear_check'|'level_ten'|'core_loop_complete'|'claim_qst001'|'claim_qst002'|'claim_qst003'|'claim_qst004'|'claim_qst005';
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
 {id:'ironwood_scout',questId:'QST_003',eyebrow:'DISCOVER THE ROAD',title:'Scout beyond Greenfields',body:'Exploration reveals hidden encounters and the routes into later regions. Combat gives a little Exploration XP, but scouting is what opens the road.',hint:'Open Skills → Exploration and start Scout the Greenfields. The first completed route reveals the way toward Silverbrook and Ironwood.',actionLabel:'Show Exploration',destination:'Skills',highlightPrimary:'Skills'},
 {id:'ironwood_scout_collect',questId:'QST_003',eyebrow:'SCOUTING IN PROGRESS',title:'Finish the route report',body:'Your scout is mapping the road out of Greenfields.',hint:'Collect the Exploration activity when one route is ready. The discovery will reveal the next roads and a new encounter.',actionLabel:'Show activity',destination:'Home'},
 {id:'ironwood_prepare',questId:'QST_003',eyebrow:'BEFORE IRONWOOD',title:'Prepare for the wolves',body:'The road is mapped. Ironwood still requires character Level 7, while Exploration remains its own world-discovery skill.',hint:'Hunt enemies you can safely fight and collect combat rewards to raise your character level. Combat also adds a small amount of Exploration XP.',actionLabel:'Show World',destination:'World',highlightPrimary:'World'},
 {id:'ironwood_travel',questId:'QST_003',eyebrow:'ROAD DISCOVERED',title:'Travel into Ironwood',body:'You are strong enough and the road has been mapped. Travel to Ironwood Forest before scouting its deeper paths.',hint:'Open World and travel to Ironwood Forest.',actionLabel:'Show World',destination:'World',highlightPrimary:'World'},
 {id:'ironwood_reveal',questId:'QST_003',eyebrow:'LOCAL SCOUTING',title:'Find the wolf trail',body:'Some encounters stay hidden until you explore their region. Trace the Ironwood paths to reveal the wolves.',hint:'Open Skills → Exploration and start Trace Ironwood paths.',actionLabel:'Show Exploration',destination:'Skills',highlightPrimary:'Skills'},
 {id:'ironwood_reveal_collect',questId:'QST_003',eyebrow:'TRAIL FOUND',title:'Finish the Ironwood survey',body:'Your scout is tracing the wolf paths through Ironwood.',hint:'Collect the Exploration activity when the route is ready. Ironwood Wolves will then appear in Combat.',actionLabel:'Show activity',destination:'Home'},
 {id:'ironwood_hunt',questId:'QST_003',eyebrow:'THE NEXT HUNT',title:'Follow the hound trail',body:'The wolf trail is mapped. Defeat 6 Ironwood Wolves.',hint:'Open World → Combat in Ironwood Forest, choose Ironwood Wolf, and start the hunt.',actionLabel:'Show World',destination:'World',highlightPrimary:'World'},
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
 else if(questId==='QST_003'){const roadDiscovered=state.unlockedMonsterIds?.includes('FIELD_WISP')===true,wolvesDiscovered=state.unlockedMonsterIds?.includes('IRONWOOD_WOLF')===true;id=!roadDiscovered?(state.activity?.kind==='exploration'&&state.activity.targetId==='SCOUT_GREENFIELDS'?'ironwood_scout_collect':'ironwood_scout'):state.character.level<7?'ironwood_prepare':state.currentRegionId!=='IRONWOOD'?'ironwood_travel':!wolvesDiscovered?(state.activity?.kind==='exploration'&&state.activity.targetId==='SCOUT_IRONWOOD'?'ironwood_reveal_collect':'ironwood_reveal'):'ironwood_hunt';}
 else id=questId==='QST_004'?'gear_check':'level_ten';
 return completed.includes(id)?undefined:STEPS.find(row=>row.id===id);
}
export function firstSessionTutorialSteps(){return STEPS;}
