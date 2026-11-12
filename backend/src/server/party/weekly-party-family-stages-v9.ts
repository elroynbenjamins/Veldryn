/**
 * Party Events v9 — hidden, non-rewarding 7-day story stages.
 *
 * The server must eventually load saved actors, canonical Stage 2/3 ballots
 * and consumed resource receipts from its own frozen ledger. This adapter does
 * not accept client results, does not grant special-action EP or resources,
 * and is not used by the authoritative Day 8 worker.
 */
import {simulateCombat} from '../combat/engine';
import type {CombatantDefinition,CombatEvent,CombatResult} from '../combat/types';
import {applyVerifiedPartyPreparation,deriveVerifiedPartyPhaseSupport,
 type VerifiedOrderProgress} from './weekly-party-boss-v2';
import {WEEKLY_PARTY_EVENT_FAMILIES,type WeeklyPartyFamily,
 type WeeklyPartyDifficulty,type WeeklyPartyPreparation} from './weekly-party-events-v2';
import {buildHiddenPartyFamilyEncounterV8,deriveHiddenPartyFamilyObjectiveV8,
 partyEventFamilyDesignV8,type PartyEventFinaleV8,type FamilyObjectiveTraceV8} from './weekly-party-distinct-finales-v8';

export const PARTY_EVENT_STORY_STAGES_V9_RELEASED=false;
export type StoryStageV9=1|2|3;
type SceneTokenV9='dusty_crossing'|'moonlit_forest'|'fractured_runestones'|'mirrored_vault';
type AnimationTokenV9='wagon_sway'|'tracks_reveal'|'rune_flicker'|'mirror_shimmer';
type SkillV9='woodcutting'|'mining'|'herbalism'|'fishing'|'combat'|'crafting';
export interface StoryActionV9{
 id:'scout_route'|'secure_approach'|'support_expedition'|'prepare_finale';
 label:string;
 goal:string;
 skillExamples:readonly SkillV9[];
 /** Presentation-only; eventual server receipt must prove completion. */
 noncombatAlternative:string;
}
export interface StoryPresentationV9{
 scene:string;
 backdropToken:SceneTokenV9;
 motionToken:AnimationTokenV9;
 foreground:string;
 cues:readonly {atMs:number;line:string}[];
}
interface StoryFamilyV9{
 stage:readonly [string,string,string];
 scenes:readonly [string,string,string];
 colorKey:string;
 backdrop:SceneTokenV9;
 motion:AnimationTokenV9;
 foreground:string;
 actions:readonly [string,string,string,string];
 goals:readonly [string,string,string,string];
 skillExamples:readonly [readonly SkillV9[],readonly SkillV9[],readonly SkillV9[],readonly SkillV9[]];
 alternatives:readonly [string,string,string,string];
 familyBonus:Readonly<Record<WeeklyPartyPreparation,{label:string;stat:string;multiplier:number}>>;
}
const STORIES:Readonly<Record<WeeklyPartyFamily,StoryFamilyV9>>={
 broken_caravan:{
  stage:['Survey the Crossing','Defend the Approach','Form the Convoy'],
  scenes:['Scouts inspect the broken road and search for raider footprints.',
   'Wagons cross hostile territory as the party counters an ambush.',
   'Secure the cargo, repair axles and prepare the final charge.'],
  colorKey:'dust_amber',backdrop:'dusty_crossing',motion:'wagon_sway',
  foreground:'wagon_wheels_rope_wooden_barricade',
  actions:['Map the Wagon Route','Break the Ambush','Repair the Supply Train','Secure the Final Convoy'],
  goals:['Locate a viable crossing before the raiders move.',
   'Protect the wagon lane while raiders attack.',
   'Reinforce the train so cargo survives the finale.',
   'Commit a legal final loadout and cargo plan.'],
  skillExamples:[['woodcutting','mining'],['combat','crafting'],['woodcutting','crafting'],['crafting']],
  alternatives:['Survey damaged bridge supports and mark the safe path.',
   'Construct a temporary wagon barricade.',
   'Repair a wagon axle with verified materials.',
   'Inspect supplies and confirm the convoy roster.'],
  familyBonus:{
   reinforced:{label:'Reinforced Wagon Frames',stat:'defense',multiplier:1.03},
   provisions:{label:'Repair Supplies',stat:'maxHp',multiplier:1.03},
   specialist:{label:'Ambush Intelligence',stat:'attackPower',multiplier:1.025},
  },
 },
 nightfall_hunt:{
  stage:['Read the Tracks','Close the Circle','Set the Moonlit Trap'],
  scenes:['Search the moonlit brush for signs of the prowling alpha.',
   'Flush the pack from cover while resisting frightening howls.',
   'Set decoys and prepare to expose the alpha at the clearing.'],
  colorKey:'moon_indigo',backdrop:'moonlit_forest',motion:'tracks_reveal',
  foreground:'branch_silhouette_tracks_moonlight',
  actions:['Follow the Trail','Flush the Pack','Lay a Scent Decoy','Ready the Alpha Hunt'],
  goals:['Identify recent tracks and the safest approach.',
   'Keep the predator visible long enough to corner it.',
   'Prepare scent blockers and lure the pack.',
   'Commit a legal loadout and final pursuit route.'],
  skillExamples:[['herbalism','fishing'],['combat','herbalism'],['herbalism','crafting'],['crafting']],
  alternatives:['Study spoor and record the direction of travel.',
   'Locate a concealed exit route for the hunters.',
   'Blend a scent decoy from verified herbs.',
   'Prepare a quiet camp and check the party’s trail.'],
  familyBonus:{
   reinforced:{label:'Howl Shelters',stat:'defense',multiplier:1.025},
   provisions:{label:'Scent Poultices',stat:'haste',multiplier:1.015},
   specialist:{label:'Tracking Insight',stat:'accuracy',multiplier:1.04},
  },
 },
 broken_wards:{
  stage:['Inspect the Fractures','Stabilize the Spires','Align the Ward Circle'],
  scenes:['Trace cracked runes to discover why the wards are failing.',
   'Contain loose arcane discharges and rescue the damaged spires.',
   'Link the surviving stones before the guardian overloads them.'],
  colorKey:'arcane_cyan',backdrop:'fractured_runestones',motion:'rune_flicker',
  foreground:'shattered_sigil_pillars_sparks',
  actions:['Read the Rune Fractures','Silence a Runestone','Ground a Failing Sigil','Ready the Ward Circle'],
  goals:['Map the unstable rune network.',
   'Interrupt magic before it cascades.',
   'Ground the spires and reinforce their links.',
   'Commit a legal loadout and final ward pattern.'],
  skillExamples:[['mining','crafting'],['combat','mining'],['mining','crafting'],['crafting']],
  alternatives:['Record the cracked rune pattern without fighting.',
   'Reconnect a loose conduit using verified ore.',
   'Reinforce an unstable rune circuit.',
   'Check each sigil against the party’s protection plan.'],
  familyBonus:{
   reinforced:{label:'Grounded Runestone Plates',stat:'defense',multiplier:1.04},
   provisions:{label:'Arcane Recovery Salves',stat:'healingPower',multiplier:1.03},
   specialist:{label:'Rune Timing Charts',stat:'haste',multiplier:1.018},
  },
 },
 lost_reliquary:{
  stage:['Translate the Glyphs','Cross the Mirror Hall','Secure the Last Seal'],
  scenes:['Read mirrored glyphs without opening the ancient vault.',
   'Choose a passage while the guardian awakens and seals decay.',
   'Decide whether to preserve or fracture the innermost seal.'],
  colorKey:'relic_violet',backdrop:'mirrored_vault',motion:'mirror_shimmer',
  foreground:'reflection_shards_sealed_relic',
  actions:['Decipher the Vault Glyphs','Navigate the Mirror Hall','Stabilize the Inner Seal','Ready the Reliquary Entry'],
  goals:['Identify the guardian’s protective inscriptions.',
   'Move through the mirrored passage without releasing corruption.',
   'Hold the seals and plan the danger budget.',
   'Commit a legal loadout and seal-opening route.'],
  skillExamples:[['crafting','mining'],['combat','crafting'],['crafting','mining'],['crafting']],
  alternatives:['Copy the inscriptions for a safe translation.',
   'Align the mirrors to form a safe corridor.',
   'Restore one seal using verified materials.',
   'Verify the final relic map and loadout.'],
  familyBonus:{
   reinforced:{label:'Seal Insulation',stat:'defense',multiplier:1.025},
   provisions:{label:'Anti-Corruption Remedies',stat:'healingPower',multiplier:1.06},
   specialist:{label:'Translated Guardian Glyphs',stat:'attackPower',multiplier:1.03},
  },
 },
};
const difficultyMult:Readonly<Record<WeeklyPartyDifficulty,number>>={
 standard:1,veteran:1.20,heroic:1.40,
};
const ACTION_IDS=['scout_route','secure_approach','support_expedition','prepare_finale'] as const;
const round=(n:number)=>Math.round(n*100)/100;
function validateRoster(players:readonly CombatantDefinition[]):void{
 const counts={tank:0,damage:0,support:0};
 if(players.length<2||players.length>4
  ||new Set(players.map(p=>p.id)).size!==players.length
  ||players.some(p=>p.team!=='players'||p.level<1||!(p.role in counts)))
  throw Error('party_story_invalid_verified_roster');
 for(const actor of players)counts[actor.role as keyof typeof counts]++;
 if(counts.tank>1||counts.damage>2||counts.support>1
  ||players.length===4&&(counts.tank!==1||counts.damage!==2||counts.support!==1))
  throw Error('party_story_invalid_role_composition');
}
export interface PartyEventStoryStageV9Input{
 family:WeeklyPartyFamily;variation:string;stage:StoryStageV9;
 difficulty:WeeklyPartyDifficulty;seed:number;
 verifiedActors:readonly CombatantDefinition[];
 verifiedOrders:readonly VerifiedOrderProgress[];
 /** Only on Stage 2+; later the caller must read this from the locked vote ledger. */
 stage2Choice?:string;
 /** Required on Stage 3; must be read from the locked Stage 3 vote ledger. */
 stage3Choice?:string;
}
export interface PartyEventStoryStageV9Preview{
 kind:'hidden_non_rewarding_story_stage';
 stage:StoryStageV9;family:WeeklyPartyFamily;variation:string;
 presentation:StoryPresentationV9;
 actions:readonly StoryActionV9[];
 verifiedRequiredStages:number;
 verifiedOptionalPreparations:readonly WeeklyPartyPreparation[];
 verifiedFamilyBenefits:readonly {preparation:WeeklyPartyPreparation;label:string;stat:string;multiplier:number}[];
 /** No progress credit or consumables are created. */
 combat:null|{reason:CombatResult['reason'];victory:boolean;durationMs:number;
  familyObjective:FamilyObjectiveTraceV8;
  combatEvents:readonly CombatEvent[]};
}
/** Preview presentation/encounters only. Scouting is explicitly noncombat. */
export function simulatePartyEventStoryStageV9(input:PartyEventStoryStageV9Input):PartyEventStoryStageV9Preview{
 const family=WEEKLY_PARTY_EVENT_FAMILIES[input.family],story=STORIES[input.family];
 if(!story||!family||!family.variations.includes(input.variation))
  throw Error('party_story_invalid_family_variation');
 if(![1,2,3].includes(input.stage)||!difficultyMult[input.difficulty]
  ||!Number.isSafeInteger(input.seed)||input.seed<0)
  throw Error('party_story_invalid_stage_input');
 validateRoster(input.verifiedActors);
 const finaleDesign=partyEventFamilyDesignV8(input.family);
 if(input.stage===1&&(input.stage2Choice!==undefined||input.stage3Choice!==undefined))
  throw Error('party_story_early_vote');
 if(input.stage>=2&&!finaleDesign.stage2.some(c=>c.id===input.stage2Choice)
  ||input.stage<3&&input.stage3Choice!==undefined
  ||input.stage===3&&!finaleDesign.stage3.some(c=>c.id===input.stage3Choice))
  throw Error('party_story_unresolved_vote');
 const support=deriveVerifiedPartyPhaseSupport(input.verifiedOrders,input.stage);
 const benefits=support.combat.completedOptionalPreparations.map(preparation=>({
  preparation,label:story.familyBonus[preparation].label,
  stat:story.familyBonus[preparation].stat,multiplier:story.familyBonus[preparation].multiplier,
 }));
 const actions=ACTION_IDS.filter((_,i)=>i===0&&input.stage===1
  ||(i===1||i===2)&&input.stage===2
  ||i===3&&input.stage===3).map((id):StoryActionV9=>{
  const index=ACTION_IDS.indexOf(id);
  return {id,label:story.actions[index]!,goal:story.goals[index]!,
   skillExamples:[...story.skillExamples[index]!],
   noncombatAlternative:story.alternatives[index]!};
 });
 const stageIndex=input.stage-1;
 const variationIndex=family.variations.indexOf(input.variation);
 const variationFlavor={
  broken_caravan:['Raiders watch the pass','Heavy fog covers the path','Stones tumble from the crossing'],
  nightfall_hunt:['Eyes shine in the brush','A phantom stag leaves false tracks','Ashclaw marks appear on the trees'],
  broken_wards:['Roots wind around cracked stone','Storm sparks race along the spires','Blight spreads between the glyphs'],
  lost_reliquary:['Water laps at the archive shelves','Whispers echo across the mirror hall','Astral light floods the crypt'],
 }[input.family][variationIndex]!;
 const presentation:StoryPresentationV9={
  scene:story.stage[stageIndex]+' — '+story.scenes[stageIndex],
  backdropToken:story.backdrop,motionToken:story.motion,foreground:story.foreground,
  cues:[
   {atMs:2000+variationIndex*300,line:variationFlavor},
   {atMs:5800+stageIndex*700,line:story.scenes[stageIndex]!},
   {atMs:10000+stageIndex*1200,
    line:input.stage===1?'Map the route before choosing the approach.':
      'Tactic: '+(input.stage===2
       ?finaleDesign.stage2.find(c=>c.id===input.stage2Choice)!.tradeoff
       :finaleDesign.stage3.find(c=>c.id===input.stage3Choice)!.tradeoff)},
  ],
 };
 const base={kind:'hidden_non_rewarding_story_stage' as const,
  stage:input.stage,family:input.family,variation:input.variation,
  presentation,actions,
  verifiedRequiredStages:support.combat.completedRequiredStages,
  verifiedOptionalPreparations:[...support.combat.completedOptionalPreparations],
  verifiedFamilyBenefits:benefits};
 if(input.stage===1)return {...base,combat:null};
 const levels=input.verifiedActors.map(p=>p.level).sort((a,b)=>a-b);
 const mid=(levels[Math.floor((levels.length-1)/2)]!
  +levels[Math.floor(levels.length/2)]!)/2;
 const scale=Math.max(.08,mid/25);
 const difficulty=difficultyMult[input.difficulty];
 const baseline:CombatantDefinition={
  id:'PARTY_EVENT_STORY_THREAT',name:input.family==='broken_caravan'?'Raider Vanguard'
   :input.family==='nightfall_hunt'?'Veil Stalker'
    :input.family==='broken_wards'?'Rune Sentinel':'Mirror Warden',
  team:'enemies',role:'enemy',boss:true,level:Math.max(1,Math.round(mid)),
  stats:{maxHp:Math.max(1,Math.round(input.verifiedActors.length
    *(input.stage===2?2300:3600)*scale*difficulty)),
   attackPower:Math.max(1,Math.round((input.stage===2?240:300)*scale*difficulty)),
   healingPower:0,defense:Math.max(1,Math.round(450*scale*difficulty)),
   accuracy:745,evasion:100,critChance:.04,critMultiplier:1.4,haste:.02},
  basicAttackMs:3100,basicAttackCoeff:.65,abilities:[],
 };
 const encounter:PartyEventFinaleV8=buildHiddenPartyFamilyEncounterV8({
  family:input.family,variation:input.variation,tier:input.stage===2?1:2,
  baseline,stage2Choice:input.stage2Choice!,
  // Stage 2 does NOT get to learn a future vote. Use only the default safe
  // Stage 3 configuration during its non-authoritative skirmish preview.
  stage3Choice:input.stage===3?input.stage3Choice!:finaleDesign.stage3[0].id,
 });
 const prepared=input.verifiedActors.map(a=>{
  const actor=applyVerifiedPartyPreparation(structuredClone(a),support.combat);
  for(const b of benefits){
   // Existing universal supplies always apply first; a modest authored family
   // identity bonus is added only for server-verified fully completed orders.
   const stat=b.stat as 'defense'|'maxHp'|'attackPower'|'healingPower'|'haste'|'accuracy';
   actor.stats[stat]=round(actor.stats[stat]*b.multiplier);
  }
  return actor;
 });
 const combat=simulateCombat({seed:'party-story-v9:'+input.seed+':'+input.family
  +':'+input.variation+':'+input.stage+':'+input.stage2Choice+':'+input.stage3Choice,
  players:prepared,enemies:[structuredClone(encounter.boss)],maxDurationMs:72000});
 return {...base,combat:{
  reason:combat.reason,victory:combat.victory,durationMs:combat.durationMs,
  familyObjective:deriveHiddenPartyFamilyObjectiveV8({encounter,players:prepared,combat}),
  combatEvents:combat.events.filter(e=>['cast_start','cast_complete','phase','interrupt',
   'damage','heal','shield','status_apply','status_remove','combat_end'].includes(e.type)).slice(0,125),
 }};
}
