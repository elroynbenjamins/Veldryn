import {accountQuestClaimed,earlyFeatureUnlocked,type FeatureUnlockHost} from './feature-unlocks';
import {EVENTS_RELEASED} from './release-flags';
export type GameGuideId='getting_started'|'seasons_weather'|'chat_social'|'working_toward'|'gathering_crafting'|'faith_blessings'|'guilds'|'combat_companions'|'coop_dungeons'|'companion_trials'|'live_events'|'additional_characters';
export type GameGuideDestination='Home'|'World'|'Skills'|'Inventory'|'Character'|'Guild'|'Coop'|'Progression'|'Companions'|'Social'|'More'|'Events'|'Settings';
export interface OnboardingGuideState{seenGuideIds:GameGuideId[];acknowledgedGuideIds:GameGuideId[];}
export interface GameGuideDefinition{id:GameGuideId;title:string;summary:string;unlockHint:string;destination:GameGuideDestination;unlock:(state:OnboardingGuideHost)=>boolean;}
export interface OnboardingGuideHost extends FeatureUnlockHost{character?:{level?:number}|null;defeatedBossIds?:readonly string[];account:{guildMember?:boolean;unlockedCombatCompanionIds?:readonly string[];companionTrialProgress?:unknown;liveEvent?:{enabled?:boolean}|null;unlockedCharacterSlots?:number;guideState?:Partial<OnboardingGuideState>;}}
const level=(state:OnboardingGuideHost)=>Math.max(0,Math.floor(Number(state.character?.level)||0));
export const GAME_GUIDE:readonly GameGuideDefinition[]=[
 {id:'getting_started',title:'Your first steps',summary:'Choose activities, collect progress, improve gear and follow your current goal.',unlockHint:'Create your first character.',destination:'Home',unlock:s=>!!s.character},
 {id:'seasons_weather',title:'Seasons & Weather',summary:'Check the weather in World before choosing your next activity.',unlockHint:'Reach character level 2.',destination:'World',unlock:s=>!!s.character&&level(s)>=2},
 {id:'chat_social',title:'Chat & player profiles',summary:'Use English, Spanish, Global 1 and Global 2 conversations plus social tools.',unlockHint:'Complete Into Ironwood',destination:'Social',unlock:s=>earlyFeatureUnlocked(s,'social')},
 {id:'working_toward',title:'Working Toward',summary:'Pick a personal target and get concrete next steps.',unlockHint:'Complete First Blood, First Skill',destination:'Progression',unlock:s=>earlyFeatureUnlocked(s,'workingToward')},
 {id:'gathering_crafting',title:'Gathering & Crafting',summary:'Gather regional resources, process them and craft upgrades over time.',unlockHint:'Claim your first story reward.',destination:'Skills',unlock:s=>accountQuestClaimed(s,'QST_001')},
 {id:'faith_blessings',title:'Faith & Blessings',summary:'Recover Holy Water, train Faith and choose one active blessing.',unlockHint:'Reach character level 5.',destination:'Skills',unlock:s=>!!s.character&&level(s)>=5},
 {id:'guilds',title:'Guilds',summary:'Join a persistent social group for chat, projects and asynchronous PvE.',unlockHint:'Reach Level 10 and complete Into Ironwood',destination:'Guild',unlock:s=>earlyFeatureUnlocked(s,'guild')},
 {id:'combat_companions',title:'Combat Companions',summary:'Equip an account-owned Companion that complements your character role.',unlockHint:'Complete Into Ironwood',destination:'Companions',unlock:s=>earlyFeatureUnlocked(s,'companions')},
 {id:'coop_dungeons',title:'Co-op Dungeons',summary:'Build a 1 Tank / 2 Damage / 1 Support party and make route choices.',unlockHint:'Complete Into Ironwood',destination:'Coop',unlock:s=>earlyFeatureUnlocked(s,'social')},
 {id:'companion_trials',title:'Companion Trials',summary:'Build a Companion-only Tank / Damage / Support trio for the monthly Tower.',unlockHint:'Complete Into Ironwood',destination:'Companions',unlock:s=>earlyFeatureUnlocked(s,'companions')},
 {id:'live_events',title:'Live Events',summary:'Time-limited events add activities, rewards and cosmetics.',unlockHint:'Wait for an active Live Event.',destination:'Events',unlock:s=>EVENTS_RELEASED&&earlyFeatureUnlocked(s,'events')&&s.account.liveEvent?.enabled===true},
 {id:'additional_characters',title:'Additional Characters',summary:'Unlock up to five characters while sharing account-wide systems.',unlockHint:'Unlock your second character slot.',destination:'More',unlock:s=>Math.max(1,Math.floor(Number(s.account.unlockedCharacterSlots)||1))>=2},
];
export const GAME_GUIDE_STEPS:Record<GameGuideId,readonly string[]>={
 getting_started:['Start a hunt in Combat, then collect rewards on Home.','Claim completed story rewards in the Asterfall Journal to unlock your next objective.'],
 seasons_weather:['Open World and check the current weather.','Choose a region and review its available activities.'],
 chat_social:['Open Social to browse players and party recruitment.','Choose a player to view their profile before inviting them.'],
 working_toward:['Choose a goal in Working Toward.','Follow its next step to gather materials or improve your character.'],
 gathering_crafting:['Choose Mining, Woodcutting or Fishing in Skills.','Start gathering, then collect rewards on Home to gain skill XP.','Use the gathered materials in crafting recipes.'],
 faith_blessings:['Choose Faith in Skills and review the Holy Water cost.','Train Faith, then select one unlocked blessing.'],
 guilds:['Browse recruiting guilds and review their requirements.','After joining, open Projects to contribute and use guild chat to meet your guild.'],
 combat_companions:['Open your roster and select an owned companion to equip.','Review training, Bond and Housing before spending materials.'],
 coop_dungeons:['Choose a dungeon and review its requirements.','Form a party with 1 Tank, 2 Damage and 1 Support before starting.'],
 companion_trials:['Open Trials in the Companion Sanctuary.','Build a team with Tank, Damage and Support companions and review the monthly rules.'],
 live_events:['Overview shows your journey, daily gift and event progress.','Activities shows what to do; Rewards shows unlocks and collection progress.','Use Shop to spend event currency before the event ends.'],
 additional_characters:['Open Characters from Account.','Choose an available slot to create another character.'],
};
const ids=new Set<GameGuideId>(GAME_GUIDE.map(item=>item.id));
export const DEFAULT_ONBOARDING_GUIDE_STATE:OnboardingGuideState={seenGuideIds:[],acknowledgedGuideIds:[]};
export function normalizeOnboardingGuideState(value:unknown):OnboardingGuideState{const raw=value&&typeof value==='object'?value as Partial<OnboardingGuideState>:{};const clean=(input:unknown)=>Array.isArray(input)?[...new Set(input.filter((id):id is GameGuideId=>typeof id==='string'&&ids.has(id as GameGuideId)))]:[];return{seenGuideIds:clean(raw.seenGuideIds),acknowledgedGuideIds:clean(raw.acknowledgedGuideIds)};}
export function guideDefinition(id:GameGuideId){const definition=GAME_GUIDE.find(item=>item.id===id);if(!definition)throw new Error('Unknown Game Guide topic.');return definition;}
export function unlockedGameGuide(state:OnboardingGuideHost){return GAME_GUIDE.filter(item=>item.unlock(state));}
export function newlyUnlockedGameGuide(state:OnboardingGuideHost){const saved=normalizeOnboardingGuideState(state.account.guideState);return unlockedGameGuide(state).filter(item=>!saved.acknowledgedGuideIds.includes(item.id));}
export function acknowledgeGameGuide<T extends OnboardingGuideHost>(state:T,id:GameGuideId,markSeen=false):T{const definition=guideDefinition(id);if(!definition.unlock(state))throw new Error('This Game Guide topic is not unlocked yet.');const saved=normalizeOnboardingGuideState(state.account.guideState);return {...state,account:{...state.account,guideState:{seenGuideIds:markSeen?[...new Set([...saved.seenGuideIds,id])]:saved.seenGuideIds,acknowledgedGuideIds:[...new Set([...saved.acknowledgedGuideIds,id])]}}} as T;}
export function markGameGuideSeen<T extends OnboardingGuideHost>(state:T,id:GameGuideId):T{return acknowledgeGameGuide(state,id,true);}
export function acknowledgeAllUnlockedGameGuide<T extends OnboardingGuideHost>(state:T):T{const saved=normalizeOnboardingGuideState(state.account.guideState);return {...state,account:{...state.account,guideState:{seenGuideIds:saved.seenGuideIds,acknowledgedGuideIds:[...new Set([...saved.acknowledgedGuideIds,...unlockedGameGuide(state).map(item=>item.id)])]}}} as T;}
