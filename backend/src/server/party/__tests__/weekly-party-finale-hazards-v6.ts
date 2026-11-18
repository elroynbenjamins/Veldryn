import {launchPlayer} from '../../combat/content/launch-combat';
import type {CombatantDefinition} from '../../combat/types';
import {WEEKLY_PARTY_EVENT_FAMILIES,type WeeklyPartyFamily} from '../weekly-party-events-v2';
import {
 PARTY_EVENT_FINALE_HAZARDS_V6_RELEASED,buildHiddenPartyFinaleHazard,
 previewHiddenPartyFinaleHazardFight,
} from '../weekly-party-finale-hazards-v6';
function assert(value:unknown,message:string):asserts value{
 if(!value)throw Error('party-finale-hazards-v6: '+message);
}
function rejects(fn:()=>unknown,needle:string){
 let error='';try{fn();}catch(e){error=String(e);}
 assert(error.includes(needle),'expected '+needle+', got '+error);
}
assert(PARTY_EVENT_FINALE_HAZARDS_V6_RELEASED===false,'hidden prototype must remain off');
const baseline:CombatantDefinition={
 id:'PARTY_EVENT_BOSS',name:'Preview Test Boss',team:'enemies',role:'enemy',
 level:25,boss:true,basicAttackMs:2700,basicAttackCoeff:.8,
 stats:{maxHp:14000,attackPower:340,healingPower:0,defense:450,
  accuracy:750,evasion:100,critChance:.04,critMultiplier:1.4,haste:.03},
 abilities:[],
};
const roles=['Ironwarden','Wayfinder','Dawnkeeper','Ravager'];
const balanced=roles.map((name,index)=>({...launchPlayer(name,25),id:'balanced-'+index}));
const allDamage=roles.map((_,index)=>({...launchPlayer('Wayfinder',25),id:'all-damage-'+index}));
assert(allDamage.every(a=>a.role==='damage'),'four damage players are a legal test roster');
const choices:Record<WeeklyPartyFamily,{stage2:readonly [string,string];stage3:readonly [string,string]}> = {
 broken_caravan:{stage2:['safe_pass','fast_pass'],stage3:['brace_wagons','disrupt_raiders']},
 nightfall_hunt:{stage2:['clear_trail','shadow_trail'],stage3:['hold_ground','hunt_alpha']},
 broken_wards:{stage2:['ground_spires','charge_sigils'],stage3:['protect_wards','overload_wards']},
 lost_reliquary:{stage2:['quiet_passage','deep_passage'],stage3:['preserve_seals','break_seals']},
};
let fights=0;
const metrics=new Set<string>();
for(const family of Object.keys(WEEKLY_PARTY_EVENT_FAMILIES) as WeeklyPartyFamily[]){
 const config=choices[family];
 for(const variation of WEEKLY_PARTY_EVENT_FAMILIES[family].variations){
  const scenarios=[];
  for(const stage2Choice of config.stage2)for(const stage3Choice of config.stage3){
   const input={family,variation,stage2Choice,stage3Choice,tier:3,baseline};
   const hazard=buildHiddenPartyFinaleHazard(input);
   scenarios.push({input,hazard});
   metrics.add(hazard.metric);
   assert(hazard.kind==='non_rewarding_hazard_preview','never label as a reward');
   assert(!('rewards' in hazard)&&!('eventPoints' in hazard),'no payout or points');
   assert(hazard.telegraphs.length===2
    && hazard.telegraphs.every(c=>c.castTimeMs>=3000),'each hazard has counterable warnings');
   assert(hazard.boss.abilities.length===2
    && hazard.boss.abilities.every(a=>a.interruptible),'generic interrupt is not class locked');
   assert(hazard.boss.abilities.every(a=>(a.effects[0]?.coeff??0)>.2
    && (a.effects[0]?.coeff??0)<.7),'pressure remains bounded');
   // Verify alternate party compositions are accepted without hidden role penalties.
   for(const players of [balanced,allDamage]){
    const run=previewHiddenPartyFinaleHazardFight({hazard,players,seed:'v6:'+family+':'+variation+':'+stage2Choice+':'+stage3Choice+':'+players[0]!.id,maxDurationMs:16000});
    assert(run.combat.durationMs<=16000,'bounded server replay');
    assert(run.hazardCasts>=0&&run.hazardInterrupts>=0,'structured hazard telemetry');
    assert(!('rewardBand' in run),'preview cannot award a boss reward band');
    fights++;
   }
  }
  const cautious=scenarios[0]!.hazard;
  const aggressive=scenarios[3]!.hazard;
  assert(cautious.boss.stats.maxHp>aggressive.boss.stats.maxHp,
   'defensive choices trade a longer fight for weaker hazards');
  assert((cautious.boss.abilities[0]!.effects[0]!.coeff??0)
   <(aggressive.boss.abilities[0]!.effects[0]!.coeff??0),
   'aggressive choice trades safety for a shorter fight');
  assert(JSON.stringify(buildHiddenPartyFinaleHazard(scenarios[0]!.input))===JSON.stringify(cautious),
   'hazards deterministic for same verified options');
 }
}
assert(metrics.size===4,'four unique family objectives');
assert(fights===4*3*4*2,'96 deterministic variation / vote / composition fights');
const example={family:'nightfall_hunt' as const,variation:'moonfang_pack',
 stage2Choice:'clear_trail',stage3Choice:'hold_ground',tier:3,baseline};
rejects(()=>buildHiddenPartyFinaleHazard({...example,stage2Choice:'forged'}),'party_finale_unresolved_vote');
rejects(()=>buildHiddenPartyFinaleHazard({...example,variation:'unknown'}),'party_finale_invalid_family_variation');
rejects(()=>buildHiddenPartyFinaleHazard({...example,tier:13}),'party_finale_invalid_tier');
rejects(()=>buildHiddenPartyFinaleHazard({...example,baseline:{...baseline,boss:false}}),'party_finale_invalid_server_boss');
const hazard=buildHiddenPartyFinaleHazard(example);
rejects(()=>previewHiddenPartyFinaleHazardFight({hazard,players:balanced.slice(0,1),seed:'one'}),
 'party_finale_invalid_roster');
console.log('PASS hidden Party Event v6 finale hazards: '+fights+
 ' role-flexible combat previews across four families, 12 variations and both vote ballots');
