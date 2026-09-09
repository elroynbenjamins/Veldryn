import {GATHERING} from '../content/skills';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {ActiveActivity,ActivityEnvironmentSnapshot,ActivityKind,SeasonId,WeatherId} from './types';
import {hash32} from './rng';

export interface EnvironmentEffect{actionTimeMultiplier:number;xpMultiplier:number;goldMultiplier:number;itemMultiplier:number;dropChanceMultiplier:number;notes:string[];}
export interface WorldEnvironment{seasonId:SeasonId;seasonName:string;seasonSymbol:string;seasonColor:string;weatherId:WeatherId;weatherName:string;weatherSymbol:string;weatherColor:string;zoneId:string;zoneName:string;changesAtMs:number;}

const SEASONS:Record<SeasonId,{name:string;symbol:string;color:string;weather:WeatherId[]}>= {
  spring:{name:'Bloomtide',symbol:'❀',color:'#8bcf9b',weather:['rain','rain','mist','clear','bloomwind']},
  summer:{name:'Suncrest',symbol:'☀',color:'#e4b65b',weather:['clear','clear','heatwave','storm','mist']},
  autumn:{name:'Emberfall',symbol:'🍂',color:'#d88755',weather:['mist','rain','harvest_wind','clear','storm']},
  winter:{name:'Frostwane',symbol:'❄',color:'#9bc8e8',weather:['snow','snow','frost','clear','mist']},
};
const WEATHER:Record<WeatherId,{name:string;symbol:string;color:string}>= {
  clear:{name:'Clear Skies',symbol:'◇',color:'#d8c58c'},rain:{name:'Steady Rain',symbol:'☂',color:'#78acd1'},mist:{name:'Gloam Mist',symbol:'≋',color:'#a8b2c2'},storm:{name:'Thunderstorm',symbol:'ϟ',color:'#b195df'},bloomwind:{name:'Bloomwind',symbol:'❀',color:'#8fd39a'},heatwave:{name:'Heatwave',symbol:'☀',color:'#e59b54'},harvest_wind:{name:'Harvest Wind',symbol:'〰',color:'#d59c65'},snow:{name:'Snowfall',symbol:'❄',color:'#b9d8ee'},frost:{name:'Deep Frost',symbol:'✧',color:'#86c7e8'},
};

export function seasonAt(atMs:number):SeasonId{
  const month=new Date(atMs).getUTCMonth();
  return month>=2&&month<=4?'spring':month>=5&&month<=7?'summer':month>=8&&month<=10?'autumn':'winter';
}
function utcDayKey(atMs:number){return new Date(atMs).toISOString().slice(0,10)}
function nextUtcDay(atMs:number){const d=new Date(atMs);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1)}

export function environmentForZone(zoneId:string,atMs=Date.now()):WorldEnvironment{
  const seasonId=seasonAt(atMs),season=SEASONS[seasonId],pool=season.weather;
  const weatherId=pool[hash32(`${utcDayKey(atMs)}:${zoneId}:VELDRYN_WEATHER`)%pool.length],weather=WEATHER[weatherId];
  const zone=WORLD_ZONES.find(entry=>entry.id===zoneId);
  return {seasonId,seasonName:season.name,seasonSymbol:season.symbol,seasonColor:season.color,weatherId,weatherName:weather.name,weatherSymbol:weather.symbol,weatherColor:weather.color,zoneId,zoneName:zone?.name??zoneId,changesAtMs:nextUtcDay(atMs)};
}
export function zoneIdForTarget(targetId:string){
  const gathering=GATHERING.find(entry=>entry.id===targetId);if(gathering)return gathering.zoneId;
  const monster=MONSTERS.find(entry=>entry.id===targetId);return WORLD_ZONES.find(zone=>zone.name===monster?.zone)?.id??'GREENFIELDS';
}
export function captureActivityEnvironment(targetId:string,atMs:number):ActivityEnvironmentSnapshot{
  const env=environmentForZone(zoneIdForTarget(targetId),atMs);
  return {seasonId:env.seasonId,weatherId:env.weatherId,zoneId:env.zoneId,capturedAtMs:atMs};
}
export function environmentForActivity(activity:ActiveActivity):WorldEnvironment{
  const snapshot=activity.environment;
  if(!snapshot)return environmentForZone(zoneIdForTarget(activity.targetId),activity.startedAtMs);
  const season=SEASONS[snapshot.seasonId],weather=WEATHER[snapshot.weatherId],zone=WORLD_ZONES.find(entry=>entry.id===snapshot.zoneId);
  return {seasonId:snapshot.seasonId,seasonName:season.name,seasonSymbol:season.symbol,seasonColor:season.color,weatherId:snapshot.weatherId,weatherName:weather.name,weatherSymbol:weather.symbol,weatherColor:weather.color,zoneId:snapshot.zoneId,zoneName:zone?.name??snapshot.zoneId,changesAtMs:nextUtcDay(snapshot.capturedAtMs)};
}
export function environmentEffect(kind:ActivityKind,env:Pick<WorldEnvironment,'seasonId'|'weatherId'>):EnvironmentEffect{
  let actionTimeMultiplier=1,xpMultiplier=1,goldMultiplier=1,itemMultiplier=1,dropChanceMultiplier=1;
  const notes:string[]=[];
  if(env.seasonId==='spring'&&kind!=='combat'){itemMultiplier*=1.08;notes.push('+8% gathered materials')}
  if(env.seasonId==='summer'&&kind!=='combat'){actionTimeMultiplier*=.95;notes.push('+5% gathering speed')}
  if(env.seasonId==='autumn'){if(kind==='combat'){goldMultiplier*=1.08;notes.push('+8% combat gold')}else{itemMultiplier*=1.05;notes.push('+5% gathered materials')}}
  if(env.seasonId==='winter'&&kind==='combat'){xpMultiplier*=1.08;actionTimeMultiplier*=1.05;notes.push('+8% combat XP','−5% combat speed')}
  if(env.weatherId==='clear'){actionTimeMultiplier*=.97;notes.push('+3% action speed')}
  if(env.weatherId==='rain'){if(kind==='fishing'){actionTimeMultiplier*=.88;itemMultiplier*=1.1;notes.push('+12% fishing speed','+10% fish')}else if(kind==='combat'){actionTimeMultiplier*=1.05;notes.push('−5% combat speed')}}
  if(env.weatherId==='mist'&&kind==='combat'){dropChanceMultiplier*=1.12;notes.push('+12% loot chance')}
  if(env.weatherId==='storm'){if(kind==='mining'){itemMultiplier*=1.12;notes.push('+12% ore')}else if(kind==='combat'){actionTimeMultiplier*=1.08;xpMultiplier*=1.1;notes.push('+10% combat XP','−8% combat speed')}}
  if(env.weatherId==='bloomwind'&&kind==='woodcutting'){itemMultiplier*=1.12;notes.push('+12% logs')}
  if(env.weatherId==='heatwave'){if(kind==='mining'){actionTimeMultiplier*=.9;notes.push('+10% mining speed')}else if(kind==='woodcutting'||kind==='fishing'){actionTimeMultiplier*=1.08;notes.push('−8% gathering speed')}}
  if(env.weatherId==='harvest_wind'&&kind==='woodcutting'){actionTimeMultiplier*=.9;notes.push('+10% woodcutting speed')}
  if(env.weatherId==='snow'&&kind==='combat'){actionTimeMultiplier*=1.1;xpMultiplier*=1.12;notes.push('+12% combat XP','−10% combat speed')}
  if(env.weatherId==='frost'){if(kind==='mining'){itemMultiplier*=1.1;notes.push('+10% ore')}else if(kind==='fishing'){actionTimeMultiplier*=1.12;notes.push('−12% fishing speed')}}
  return {actionTimeMultiplier,xpMultiplier,goldMultiplier,itemMultiplier,dropChanceMultiplier,notes:notes.length?notes:['No activity modifier']};
}
export function environmentEffectForActivity(activity:ActiveActivity){const env=environmentForActivity(activity);return {environment:env,effect:environmentEffect(activity.kind,env)}}
export function environmentSummary(kind:ActivityKind,env:WorldEnvironment){return environmentEffect(kind,env).notes.join(' · ')}
