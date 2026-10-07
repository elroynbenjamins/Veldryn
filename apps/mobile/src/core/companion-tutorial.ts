import type {TutorialPreferenceStorage} from './tutorial-preferences';
import type {GameState} from './types';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {combatCompanionUiModel} from './combat-companions';

export type CompanionTourSection='Collection'|'Training'|'Sanctuary'|'Trials'|'Expeditions'|'Codex';
export const COMPANION_TOUR_STEPS:readonly {section:CompanionTourSection;title:string;body:string;hint:string;action:string}[]=[
 {section:'Collection',title:'Meet your companions',body:'Companions are permanent combat helpers. Each has a Damage, Tank or Support role.',hint:'Equip a compatible companion to assist your character. Build all three roles for team content.',action:'Open Roster'},
 {section:'Training',title:'Make your team stronger',body:'Training costs Gold and Essence. Bond earns rewards; Ascension and Housing raise level caps.',hint:'Open Bond, Skills or Materials here to inspect milestones, techniques and where upgrade materials come from.',action:'Open Training'},
 {section:'Sanctuary',title:'Build a home for your roster',body:'Build facilities for daily XP, weekly Essence and more Expedition slots. Housing improves individual companions.',hint:'Housing improves each companion’s level cap. Check costs and material sources before upgrading.',action:'Open Sanctuary'},
 {section:'Trials',title:'Bring a balanced team',body:'Trials need one Tank, one Damage and one Support. Climb floors for rewards each monthly season.',hint:'The Trial season rotates monthly. Check its rules, team readiness and checkpoints before starting.',action:'Open Trials'},
 {section:'Expeditions',title:'Send companions on assignments',body:'Send spare companions on timed missions. Food supplies Stamina; assigned companions stay busy until they return.',hint:'Check duration, rewards and availability. Claim completed assignments here; build Expedition Pens for capacity.',action:'Open Expeditions'},
 {section:'Codex',title:'Plan your next recruit',body:'Find recruitment requirements, collection milestones and rewards. Companions join automatically when their requirements are met.',hint:'You are ready. Start with an available recruit, equip a compatible helper, then build your three-role team.',action:'Open Codex'},
];
export function normalizeCompanionTourStep(value:unknown){return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=COMPANION_TOUR_STEPS.length?value:0;}
export function companionTutorialContext(state:GameState,section:CompanionTourSection):{text:string;name?:string}{
 const owned=COMBAT_COMPANIONS.filter(row=>state.account.unlockedCombatCompanionIds?.includes(row.id));
 if(section==='Collection'){
  const equipped=owned.find(row=>row.id===state.character?.equippedCombatCompanionId);
  if(equipped)return {text:'{name} is already equipped and helps in combat.',name:equipped.name};
  const compatible=owned.find(row=>combatCompanionUiModel(state,row.id)?.compatible);
  if(compatible)return {text:'{name} has joined you. After this guide, open its portrait and choose Equip companion.',name:compatible.name};
  return {text:owned.length?'Your companion shares your character’s role. Recruit a different role to equip a helper.':'Companions join automatically when you meet their requirements. Check the Codex for your next recruit.'};
 }
 if(section==='Training')return {text:(state.account.companionEssence??0)===0?'No Essence yet? Leave training for later. You do not need to spend anything during this guide.':'Check the Gold and Essence costs before training. Upgrades are optional during this guide.'};
 if(section==='Sanctuary')return {text:!state.account.companionSanctuary?.trainingGroundLevel&&!state.account.companionSanctuary?.essenceBasinLevel?'Your reward facilities are not built yet. Build them before expecting daily XP or weekly Essence.':'Only built facilities generate rewards. Wait for their timers, then claim here.'};
 if(section==='Trials')return {text:new Set(owned.map(row=>row.role)).size<3?'You do not own all three roles yet. Keep recruiting; Trials can wait.':'You own all three roles. Check companion availability and recommended power before starting.'};
 if(section==='Expeditions')return {text:!state.account.companionSanctuary?.expeditionPensLevel?'Build Expedition Pens first, then prepare spare companions and food.':'Your combat helper cannot go on an Expedition while equipped. Choose a spare companion or unequip it first.'};
 return {text:'Start small: equip a compatible helper, then use recruitment requirements to plan your next companion.'};
}
/** Local account-scoped presentation progress; never modifies gameplay saves. */
export function createCompanionTutorialStore(storage:TutorialPreferenceStorage){
 const memory=new Map<string,number>(),writes=new Map<string,Promise<void>>();
 const key=(scope:string)=>'veldryn.companion-tour.v1:'+scope;
 async function load(scope:string){
  if(memory.has(scope))return memory.get(scope)!;
  let step=0;
  try{const raw=await storage.getItem(key(scope));step=normalizeCompanionTourStep(raw?JSON.parse(raw):0);}catch{}
  step=Math.max(step,memory.get(scope)??0);memory.set(scope,step);return step;
 }
 async function save(scope:string,value:number){
  const step=Math.max(normalizeCompanionTourStep(value),memory.get(scope)??0);memory.set(scope,step);
  const task=(writes.get(scope)??Promise.resolve()).then(async()=>{try{await storage.setItem(key(scope),JSON.stringify(step));}catch{}});
  writes.set(scope,task);await task;
 }
 return {load,save};
}
