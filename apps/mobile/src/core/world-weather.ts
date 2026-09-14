import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {ActiveActivity,ActivityEnvironmentSnapshot,ActivityKind,SeasonId,WeatherId} from './types';
import {hash32} from './rng';

export interface EnvironmentEffect{actionTimeMultiplier:number;xpMultiplier:number;goldMultiplier:number;itemMultiplier:number;dropChanceMultiplier:number;notes:string[];}
export interface WorldEnvironment{seasonId:SeasonId;seasonName:string;seasonSymbol:string;seasonColor:string;weatherId:WeatherId;weatherName:string;weatherSymbol:string;weatherColor:string;zoneId:string;zoneName:string;changesAtMs:number;seasonChangesAtMs:number;}
export interface SeasonDefinition{name:string;symbol:string;color:string;months:string;description:string;weather:WeatherId[];}
export interface WeatherDefinition{name:string;symbol:string;color:string;description:string;}

export const SEASON_DEFINITIONS:Record<SeasonId,SeasonDefinition>= {
  spring:{name:'Bloomtide',symbol:'❀',color:'#8bcf9b',months:'March–May',description:'Renewal increases yields from every gathering discipline.',weather:['rain','rain','mist','clear','bloomwind']},
  summer:{name:'Suncrest',symbol:'☀',color:'#e4b65b',months:'June–August',description:'Long daylight shortens every gathering action.',weather:['clear','clear','heatwave','storm','mist']},
  autumn:{name:'Emberfall',symbol:'🍂',color:'#d88755',months:'September–November',description:'A season of plenty: gathering yields and combat spoils increase.',weather:['mist','rain','harvest_wind','clear','storm']},
  winter:{name:'Frostwane',symbol:'❄',color:'#9bc8e8',months:'December–February',description:'Harsh battles take longer but teach more.',weather:['snow','snow','frost','clear','mist']},
};
export const WEATHER_DEFINITIONS:Record<WeatherId,WeatherDefinition>= {
  clear:{name:'Clear Skies',symbol:'◇',color:'#d8c58c',description:'Favorable visibility speeds every activity.'},
  rain:{name:'Steady Rain',symbol:'☂',color:'#78acd1',description:'Fish rise quickly, while wet ground slows combat.'},
  mist:{name:'Gloam Mist',symbol:'≋',color:'#a8b2c2',description:'Hidden paths reveal more combat loot.'},
  storm:{name:'Thunderstorm',symbol:'ϟ',color:'#b195df',description:'Charged stone yields more ore; dangerous combat grants more XP.'},
  bloomwind:{name:'Bloomwind',symbol:'❀',color:'#8fd39a',description:'Living winds carry additional timber from every cut.'},
  heatwave:{name:'Heatwave',symbol:'☀',color:'#e59b54',description:'Dry seams mine quickly, but woodland and river work slow down.'},
  harvest_wind:{name:'Harvest Wind',symbol:'〰',color:'#d59c65',description:'Steady autumn gusts speed woodcutting.'},
  snow:{name:'Snowfall',symbol:'❄',color:'#b9d8ee',description:'Slow, difficult hunts grant increased combat experience.'},
  frost:{name:'Deep Frost',symbol:'✧',color:'#86c7e8',description:'Frozen seams yield more ore while iced waters slow fishing.'},
};

export function seasonAt(atMs:number):SeasonId{
  const month=new Date(atMs).getUTCMonth();
  return month>=2&&month<=4?'spring':month>=5&&month<=7?'summer':month>=8&&month<=10?'autumn':'winter';
}
function utcDayKey(atMs:number){return new Date(atMs).toISOString().slice(0,10)}
function nextUtcDay(atMs:number){const d=new Date(atMs);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1)}
export function nextSeasonAt(atMs:number){
  const d=new Date(atMs),year=d.getUTCFullYear(),month=d.getUTCMonth();
  if(month<2)return Date.UTC(year,2,1);
  if(month<5)return Date.UTC(year,5,1);
  if(month<8)return Date.UTC(year,8,1);
  if(month<11)return Date.UTC(year,11,1);
  return Date.UTC(year+1,2,1);
}
export function weatherChancesForSeason(seasonId:SeasonId){
  const pool=SEASON_DEFINITIONS[seasonId].weather,counts=new Map<WeatherId,number>();
  for(const weatherId of pool)counts.set(weatherId,(counts.get(weatherId)??0)+1);
  return [...counts].map(([weatherId,count])=>({weatherId,chance:count/pool.length}));
}

export function environmentForZone(zoneId:string,atMs=Date.now()):WorldEnvironment{
  const seasonId=seasonAt(atMs),season=SEASON_DEFINITIONS[seasonId],pool=season.weather;
  const weatherId=pool[hash32(`${utcDayKey(atMs)}:${zoneId}:VELDRYN_WEATHER`)%pool.length],weather=WEATHER_DEFINITIONS[weatherId];
  const zone=WORLD_ZONES.find(entry=>entry.id===zoneId);
  return {seasonId,seasonName:season.name,seasonSymbol:season.symbol,seasonColor:season.color,weatherId,weatherName:weather.name,weatherSymbol:weather.symbol,weatherColor:weather.color,zoneId,zoneName:zone?.name??zoneId,changesAtMs:nextUtcDay(atMs),seasonChangesAtMs:nextSeasonAt(atMs)};
}
export function zoneIdForTarget(targetId:string){
  const gathering=[...GATHERING,...HERB_NODES].find(entry=>entry.id===targetId);if(gathering)return gathering.zoneId;
  const monster=MONSTERS.find(entry=>entry.id===targetId);return WORLD_ZONES.find(zone=>zone.name===monster?.zone)?.id??'GREENFIELDS';
}
export function captureActivityEnvironment(targetId:string,atMs:number):ActivityEnvironmentSnapshot{
  const env=environmentForZone(zoneIdForTarget(targetId),atMs);
  return {seasonId:env.seasonId,weatherId:env.weatherId,zoneId:env.zoneId,capturedAtMs:atMs};
}
export function environmentForActivity(activity:ActiveActivity):WorldEnvironment{
  const snapshot=activity.environment;
  if(!snapshot)return environmentForZone(zoneIdForTarget(activity.targetId),activity.startedAtMs);
  const season=SEASON_DEFINITIONS[snapshot.seasonId],weather=WEATHER_DEFINITIONS[snapshot.weatherId],zone=WORLD_ZONES.find(entry=>entry.id===snapshot.zoneId);
  return {seasonId:snapshot.seasonId,seasonName:season.name,seasonSymbol:season.symbol,seasonColor:season.color,weatherId:snapshot.weatherId,weatherName:weather.name,weatherSymbol:weather.symbol,weatherColor:weather.color,zoneId:snapshot.zoneId,zoneName:zone?.name??snapshot.zoneId,changesAtMs:nextUtcDay(snapshot.capturedAtMs),seasonChangesAtMs:nextSeasonAt(snapshot.capturedAtMs)};
}
function neutralEffect():EnvironmentEffect{return {actionTimeMultiplier:1,xpMultiplier:1,goldMultiplier:1,itemMultiplier:1,dropChanceMultiplier:1,notes:[]}}
export function seasonEffect(kind:ActivityKind,seasonId:SeasonId):EnvironmentEffect{
  let actionTimeMultiplier=1,xpMultiplier=1,goldMultiplier=1,itemMultiplier=1,dropChanceMultiplier=1;
  const notes:string[]=[];
  if(seasonId==='spring'&&kind!=='combat'){itemMultiplier*=1.08;notes.push('+8% gathered materials')}
  if(seasonId==='summer'&&kind!=='combat'){actionTimeMultiplier*=.95;notes.push('+5% gathering speed')}
  if(seasonId==='autumn'){if(kind==='combat'){goldMultiplier*=1.08;notes.push('+8% combat gold')}else{itemMultiplier*=1.05;notes.push('+5% gathered materials')}}
  if(seasonId==='winter'&&kind==='combat'){xpMultiplier*=1.08;actionTimeMultiplier*=1.05;notes.push('+8% combat XP','−5% combat speed')}
  return {actionTimeMultiplier,xpMultiplier,goldMultiplier,itemMultiplier,dropChanceMultiplier,notes};
}
export function weatherEffect(kind:ActivityKind,weatherId:WeatherId):EnvironmentEffect{
  let effect=neutralEffect();const notes:string[]=[];
  if(weatherId==='clear'){effect.actionTimeMultiplier*=.97;notes.push('+3% action speed')}
  if(weatherId==='rain'){if(kind==='fishing'){effect.actionTimeMultiplier*=.88;effect.itemMultiplier*=1.1;notes.push('+12% fishing speed','+10% fish')}else if(kind==='combat'){effect.actionTimeMultiplier*=1.05;notes.push('−5% combat speed')}}
  if(weatherId==='mist'&&kind==='combat'){effect.dropChanceMultiplier*=1.12;notes.push('+12% loot chance')}
  if(weatherId==='storm'){if(kind==='mining'){effect.itemMultiplier*=1.12;notes.push('+12% ore')}else if(kind==='combat'){effect.actionTimeMultiplier*=1.08;effect.xpMultiplier*=1.1;notes.push('+10% combat XP','−8% combat speed')}}
  if(weatherId==='bloomwind'&&kind==='woodcutting'){effect.itemMultiplier*=1.12;notes.push('+12% logs')}
  if(weatherId==='heatwave'){if(kind==='mining'){effect.actionTimeMultiplier*=.9;notes.push('+10% mining speed')}else if(kind==='woodcutting'||kind==='fishing'){effect.actionTimeMultiplier*=1.08;notes.push('−8% gathering speed')}}
  if(weatherId==='harvest_wind'&&kind==='woodcutting'){effect.actionTimeMultiplier*=.9;notes.push('+10% woodcutting speed')}
  if(weatherId==='snow'&&kind==='combat'){effect.actionTimeMultiplier*=1.1;effect.xpMultiplier*=1.12;notes.push('+12% combat XP','−10% combat speed')}
  if(weatherId==='frost'){if(kind==='mining'){effect.itemMultiplier*=1.1;notes.push('+10% ore')}else if(kind==='fishing'){effect.actionTimeMultiplier*=1.12;notes.push('−12% fishing speed')}}
  return {...effect,notes};
}
export function environmentEffect(kind:ActivityKind,env:Pick<WorldEnvironment,'seasonId'|'weatherId'>):EnvironmentEffect{
  if(kind==='alchemy'||kind==='faith')return neutralEffect();
  const season=seasonEffect(kind,env.seasonId),weather=weatherEffect(kind,env.weatherId);
  const notes=[...season.notes,...weather.notes];
  return {actionTimeMultiplier:season.actionTimeMultiplier*weather.actionTimeMultiplier,xpMultiplier:season.xpMultiplier*weather.xpMultiplier,goldMultiplier:season.goldMultiplier*weather.goldMultiplier,itemMultiplier:season.itemMultiplier*weather.itemMultiplier,dropChanceMultiplier:season.dropChanceMultiplier*weather.dropChanceMultiplier,notes:notes.length?notes:['No activity modifier']};
}
export function environmentEffectForActivity(activity:ActiveActivity){const env=environmentForActivity(activity);return {environment:env,effect:environmentEffect(activity.kind,env)}}
export function environmentSummary(kind:ActivityKind,env:WorldEnvironment){return environmentEffect(kind,env).notes.join(' · ')}
