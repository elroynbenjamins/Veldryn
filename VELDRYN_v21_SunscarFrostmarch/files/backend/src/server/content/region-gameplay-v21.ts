export type RegionalActivityKindV21='combat'|'gathering'|'processing'|'crafting'|'fishing'|'exploration'|'mixed';
export type RegionalDifficultyV21='routine'|'challenging'|'hard';

export interface RegionalSideQuestV21 {
  id:string; regionId:string; zoneId:string; level:number; name:string; summary:string;
  objectiveTags:readonly string[]; rewardHooks:readonly string[]; repeatable:false;
}

export interface RegionalActivityV21 {
  id:string; regionId:string; zoneId:string; kind:RegionalActivityKindV21; level:number; name:string;
  expectedMinutes:number; difficulty:RegionalDifficultyV21; inputs:readonly string[]; outputs:readonly string[];
  contributionEligible:boolean; notes:string;
}

export interface RegionalAchievementV21 {
  id:string; regionId:string; name:string; category:'exploration'|'combat'|'skilling'|'dungeon'|'echo'|'collection'|'meta';
  requirement:string; rewardHooks:readonly string[]; accountWide:boolean;
}

export interface RegionalCollectionBookV21 {
  id:string; regionId:string; name:string; entryIds:readonly string[]; completionRewardHooks:readonly string[];
}

export interface RegionalWeatherRuleV21 {
  id:string; regionId:string; weatherKey:string; zones:readonly string[]; effects:Readonly<Record<string,number|boolean|string>>;
  playerFacingSummary:string; safetyRule:string;
}

export interface RegionalContractTemplateV21 {
  id:string; regionId:string; category:'combat'|'skilling'|'mixed'; name:string; minLevel:number;
  objectiveTags:readonly string[]; targetStandardizedMinutes:number; rewardHooks:readonly string[];
  exactQuestDependency:false;
}

export interface RegionalBossMasteryV21 {
  id:string; regionId:string; bossId:string; tier:1|2|3|4; requirement:string; rewardHooks:readonly string[];
  powerReward:false;
}

export function validateRegionalGameplayV21(input:{
  sideQuests:readonly RegionalSideQuestV21[]; activities:readonly RegionalActivityV21[];
  achievements:readonly RegionalAchievementV21[]; collectionBooks:readonly RegionalCollectionBookV21[];
  weatherRules:readonly RegionalWeatherRuleV21[]; contracts:readonly RegionalContractTemplateV21[];
  bossMasteries:readonly RegionalBossMasteryV21[];
}):string[]{
  const errors:string[]=[];
  const allIds=[...input.sideQuests,...input.activities,...input.achievements,...input.collectionBooks,...input.weatherRules,...input.contracts,...input.bossMasteries].map(v=>v.id);
  if(new Set(allIds).size!==allIds.length) errors.push('duplicate_gameplay_id');
  for(const a of input.activities){
    if(a.expectedMinutes<2||a.expectedMinutes>45) errors.push(`${a.id}:expected_minutes_out_of_range`);
    if(a.level<1) errors.push(`${a.id}:level_invalid`);
  }
  for(const c of input.contracts){
    if(c.targetStandardizedMinutes<30||c.targetStandardizedMinutes>180) errors.push(`${c.id}:contract_effort_out_of_range`);
    if(c.exactQuestDependency!==false) errors.push(`${c.id}:contract_must_not_depend_on_exact_quest`);
  }
  for(const w of input.weatherRules){
    if(!w.safetyRule.includes('No mandatory')) errors.push(`${w.id}:weather_safety_rule_missing`);
  }
  for(const b of input.bossMasteries){if(b.powerReward!==false) errors.push(`${b.id}:boss_mastery_must_be_prestige_or_sidegrade`);}
  return errors;
}
