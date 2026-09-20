import type {MonsterDef} from '../content/monsters';

export type EncounterPressure='burst'|'attrition'|'defense'|'control'|'tempo';
export interface EncounterIdentity{
  id:string;
  archetype:string;
  pressure:EncounterPressure;
  summary:string;
  mechanics:string[];
  tactic:string;
}

const PROFILES:Record<string,EncounterIdentity>={
  SWARM:{id:'SWARM',archetype:'Swarm',pressure:'attrition',summary:'Many small attacks create steady pressure instead of one heavy blow.',mechanics:['Rapid pressure','Low individual durability'],tactic:'Favor faster clears and reliable sustain; long fights give the swarm more chances to wear you down.'},
  ARCANE_FLICKER:{id:'ARCANE_FLICKER',archetype:'Arcane Flicker',pressure:'tempo',summary:'Unstable magic alternates between quiet openings and sudden bursts.',mechanics:['Burst windows','Fragile caster'],tactic:'High damage and fast cycles punish the creature before its next magical surge.'},
  CHARGER:{id:'CHARGER',archetype:'Charger',pressure:'burst',summary:'The opening exchange is the dangerous part; surviving it usually stabilizes the hunt.',mechanics:['Heavy opener','Momentum fighter'],tactic:'Defense and food readiness matter more here than against an equal-level skirmisher.'},
  VENOM_AMBUSH:{id:'VENOM_AMBUSH',archetype:'Venom Ambush',pressure:'attrition',summary:'Poisonous strikes turn an otherwise manageable fight into sustained health pressure.',mechanics:['Venom pressure','Punishes slow kills'],tactic:'Increase kill speed or healing efficiency so repeated hunts do not slowly drain your reserves.'},
  BRAMBLE_GUARD:{id:'BRAMBLE_GUARD',archetype:'Bramble Guard',pressure:'defense',summary:'Thick natural armour makes this enemy slower to bring down than its attack suggests.',mechanics:['High durability','Long exchanges'],tactic:'Attack and armour-piercing effects gain extra practical value against this defensive profile.'},
  BRUTE:{id:'BRUTE',archetype:'Siege Brute',pressure:'burst',summary:'Slow, punishing hits reward preparation and make undergeared hunts unsafe.',mechanics:['Heavy strikes','High health'],tactic:'Bring enough defense to survive repeated hits; pure speed builds can become food-hungry here.'},
  STALKER:{id:'STALKER',archetype:'Stalker',pressure:'tempo',summary:'A mobile predator pressures weak defenses and rewards decisive kills.',mechanics:['Fast pressure','Predatory tempo'],tactic:'Avoid barely meeting the power recommendation; a comfortable margin keeps the hunt efficient.'},
  BULWARK:{id:'BULWARK',archetype:'Bulwark',pressure:'defense',summary:'Armour and disciplined defense turn the encounter into a damage-efficiency check.',mechanics:['Heavy armour','Reduced kill tempo'],tactic:'Upgrade weapons, offensive class skills, or damage bonuses before trying to brute-force long sessions.'},
  RUNECASTER:{id:'RUNECASTER',archetype:'Runecaster',pressure:'control',summary:'Telegraphed magical pressure favors balanced builds over one-dimensional defenses.',mechanics:['Spell pressure','Timing windows'],tactic:'Keep both offense and survivability healthy; slow kills leave more room for dangerous cast cycles.'},
  OATHBOUND:{id:'OATHBOUND',archetype:'Oathbound Soldier',pressure:'defense',summary:'Disciplined martial enemies mix solid defense with consistent counter-pressure.',mechanics:['Balanced guard','Counter pressure'],tactic:'Treat these as gear checks: weak offense makes them slow, while weak defense makes them expensive to farm.'},
  REVENANT:{id:'REVENANT',archetype:'Revenant',pressure:'control',summary:'Echo-touched undead combine stubborn durability with dangerous supernatural pressure.',mechanics:['Echo resilience','Escalating pressure'],tactic:'Enter with a clear power advantage and enough food for variance during longer sessions.'},
  FALLEN_KNIGHT:{id:'FALLEN_KNIGHT',archetype:'Oathglass Boss',pressure:'control',summary:'A multi-phase story boss designed to test your complete combat preparation.',mechanics:['Boss phases','Oathglass pressure','Preparation check'],tactic:'Use upgraded gear, food, class progression and a comfortable readiness margin before committing.'},
};

const PROFILE_BY_MONSTER:Record<string,keyof typeof PROFILES>={
  MOSS_RAT:'SWARM',FIELD_WISP:'ARCANE_FLICKER',ROADSIDE_BOAR:'CHARGER',SILVERFIN_SWARM:'SWARM',
  IRONWOOD_WOLF:'CHARGER',VENOM_WEAVER:'VENOM_AMBUSH',THORNLING:'BRAMBLE_GUARD',BRIAR_HUSK:'BRAMBLE_GUARD',
  MIRE_HERON:'STALKER',FOREST_TROLL:'BRUTE',ANCIENT_TREANT:'BRAMBLE_GUARD',CAVE_SKITTER:'SWARM',
  IRONBACK_MOLE:'BULWARK',ECHO_BAT:'ARCANE_FLICKER',RUNEBOUND_MINER:'RUNECASTER',GLOAM_MITE:'SWARM',
  LANTERN_WRETCH:'ARCANE_FLICKER',DROWNED_PILGRIM:'REVENANT',OATHBOUND_SQUIRE:'OATHBOUND',BANNER_SHADE:'RUNECASTER',
  FALLEN_SENTINEL:'BULWARK',OATHGLASS_REVENANT:'REVENANT',
  SUNSCAR_SCORPION:'VENOM_AMBUSH',DUNE_ORACLE:'RUNECASTER',GLASSBOUND_SENTINEL:'BULWARK',
  FROSTWOLF:'CHARGER',BELLWRAITH:'RUNECASTER',CHOIR_HUNTER:'STALKER',
  BLACKGLASS_MIRELING:'VENOM_AMBUSH',CINDER_TITAN:'BRUTE',ASHEN_REVENANT:'REVENANT',
  FALLEN_KNIGHT:'FALLEN_KNIGHT',
};

function fallback(monster:MonsterDef):EncounterIdentity{
  if(monster.boss)return PROFILES.FALLEN_KNIGHT;
  if(monster.defense>=monster.attack*.72)return PROFILES.BULWARK;
  if(monster.attack>=monster.defense*1.9)return PROFILES.CHARGER;
  return PROFILES.OATHBOUND;
}
export function encounterIdentity(monster:MonsterDef):EncounterIdentity{
  return PROFILES[PROFILE_BY_MONSTER[monster.id]]??fallback(monster);
}
export function encounterProfileCoverage(monsters:readonly MonsterDef[]){
  return {authored:monsters.filter(monster=>!!PROFILE_BY_MONSTER[monster.id]).length,total:monsters.length,missing:monsters.filter(monster=>!PROFILE_BY_MONSTER[monster.id]).map(monster=>monster.id)};
}
