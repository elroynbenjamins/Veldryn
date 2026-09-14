export type GuildDecreeBonusType = 'xp'|'drop_chance'|'gold'|'production_speed'|'gathering_speed'|'coop_guild_xp'|'war_logistics';

export interface GuildDecreeDefinition {
  id:string;
  name:string;
  minGuildLevel:number;
  bonusType:GuildDecreeBonusType;
  bonusValue:number;
  guildSourcedHardCap:number;
  durationDays:number;
  description:string;
  futureSystem?: 'guild_expeditions'|'guild_war';
}

export const GUILD_DECREE_DEFINITIONS: readonly GuildDecreeDefinition[] = [
  {id:'guild.decree.xp',name:"Scholar's Week",minGuildLevel:5,bonusType:'xp',bonusValue:0.02,guildSourcedHardCap:0.12,durationDays:7,description:'Members gain +2% XP, subject to the guild-sourced XP cap.'},
  {id:'guild.decree.drop',name:"Fortune's Ledger",minGuildLevel:10,bonusType:'drop_chance',bonusValue:0.01,guildSourcedHardCap:0.08,durationDays:7,description:'Members gain +1% relative item drop chance, subject to the guild-sourced drop cap.'},
  {id:'guild.decree.gold',name:'Golden Charter',minGuildLevel:10,bonusType:'gold',bonusValue:0.02,guildSourcedHardCap:0.10,durationDays:7,description:'Members gain +2% eligible activity Gold. There is no player Market dependency.'},
  {id:'guild.decree.production',name:"Maker's Rhythm",minGuildLevel:10,bonusType:'production_speed',bonusValue:0.02,guildSourcedHardCap:0.12,durationDays:7,description:'Members gain +2% crafting production speed, subject to the global production cap.'},
  {id:'guild.decree.gather',name:"Gatherer's Call",minGuildLevel:10,bonusType:'gathering_speed',bonusValue:0.02,guildSourcedHardCap:0.10,durationDays:7,description:'Members gain +2% gathering speed, subject to the global action-speed cap.'},
  {id:'guild.decree.expedition',name:'Expedition Orders',minGuildLevel:20,bonusType:'coop_guild_xp',bonusValue:0.05,guildSourcedHardCap:0.05,durationDays:7,description:'Eligible guild co-op completions grant +5% Guild XP.',futureSystem:'guild_expeditions'},
  {id:'guild.decree.war',name:'War Mobilization',minGuildLevel:30,bonusType:'war_logistics',bonusValue:0.05,guildSourcedHardCap:0.05,durationDays:7,description:'Guild War logistics score +5%.',futureSystem:'guild_war'},
] as const;

export function cappedGuildSourcedBonus(permanentBonus:number,decree:GuildDecreeDefinition|undefined):number {
  if (!decree) return Math.max(0,permanentBonus);
  return Math.min(decree.guildSourcedHardCap,Math.max(0,permanentBonus)+decree.bonusValue);
}

function stableHash(input:string):number{
  let hash=2166136261;
  for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619)}
  return hash>>>0;
}

export function decreeCandidates(guildId:string,cycleKey:string,guildLevel:number,enabledFutureSystems:readonly string[]=[]):GuildDecreeDefinition[]{
  const eligible=GUILD_DECREE_DEFINITIONS.filter((d)=>d.minGuildLevel<=guildLevel && (!d.futureSystem || enabledFutureSystems.includes(d.futureSystem)));
  if(eligible.length<=3)return [...eligible];
  const start=stableHash(`${guildId}:${cycleKey}:decrees`)%eligible.length;
  const chosen:GuildDecreeDefinition[]=[];
  for(let i=0;i<eligible.length && chosen.length<3;i++){
    const candidate=eligible[(start+i*2)%eligible.length];
    if(!chosen.some((x)=>x.id===candidate.id))chosen.push(candidate);
  }
  for(const candidate of eligible){if(chosen.length>=3)break;if(!chosen.some((x)=>x.id===candidate.id))chosen.push(candidate)}
  return chosen;
}
