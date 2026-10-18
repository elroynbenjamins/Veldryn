import type {ActivityKind,RewardBundle} from './types';

export interface IdleRateInput{
 actionsPerHour:number;
 xpPerHour:number;
 goldPerHour:number;
}
export interface IdleResourceRate{
 name:string;
 itemsPerHour:number;
}
export interface IdleInsightMetric{
 id:'xp'|'actions'|'gold'|'resources';
 label:string;
 perHour:number;
}
export interface IdleActivityInsights{
 metrics:readonly IdleInsightMetric[];
 resourceName?:string;
 /** Only derived from a sufficiently long, buffered combat window. */
 combat?:{
  bufferedSeconds:number;
  bufferedKills:number;
  killsPerHour?:number;
  foodUsed:number;
  foodPerHour?:number;
  projectedHp?:number;
  lowProjectedHp:boolean;
 };
}

function safeRate(value:number):number{
 return Number.isFinite(value)?Math.max(0,value):0;
}

/** A compact projection for the idle UI. Figures are estimates, not guaranteed
 * drops or claims; inventory/gameplay state must never be modified from here.
 *
 * Combat previews can stop earlier than the AFK cap (injury). Use the
 * verified combat effort window rather than dividing by idle time after a
 * stoppage. Avoid a misleading food/hour estimate from a handful of seconds.
 */
export function idleActivityInsights(input:{
 kind:ActivityKind;
 rates:IdleRateInput;
 preview:Pick<RewardBundle,'elapsedSeconds'|'kills'|'foodConsumed'|'combatEffort'|'endHp'>;
 resource?:IdleResourceRate;
 maxHp?:number;
}):IdleActivityInsights{
 const actions=safeRate(input.rates.actionsPerHour);
 const xp=safeRate(input.rates.xpPerHour);
 const gold=safeRate(input.rates.goldPerHour);
 const resource=input.resource?.itemsPerHour!==undefined&&Number.isFinite(input.resource.itemsPerHour)&&input.resource.itemsPerHour>=0?input.resource:undefined;
 const metrics:IdleInsightMetric[]=[
  {id:'xp',label:'XP / hr',perHour:xp},
  resource?{id:'resources',label:'Items / hr',perHour:safeRate(resource.itemsPerHour)}
   :{id:'actions',label:input.kind==='combat'?'Kills / hr':'Actions / hr',perHour:actions},
  ...(input.kind==='combat'?[{id:'gold' as const,label:'Gold / hr',perHour:gold}]:
    resource?[{id:'actions' as const,label:'Actions / hr',perHour:actions}]:
    gold>0?[{id:'gold' as const,label:'Gold / hr',perHour:gold}]:[]),
 ];
 if(input.kind!=='combat')return {metrics,resourceName:resource?.name};
 const combatEffort=input.preview.combatEffort;
 const bufferedSeconds=combatEffort
  ?Math.max(0,(combatEffort.endsAtMs-combatEffort.startsAtMs)/1000)
  :Math.max(0,input.preview.elapsedSeconds);
 const validWindow=Number.isFinite(bufferedSeconds)&&bufferedSeconds>=600;
 const foodUsed=Math.max(0,Math.floor(input.preview.foodConsumed??0));
 const bufferedKills=Math.max(0,Math.floor(input.preview.kills));
 const projectedHp=input.preview.endHp!==undefined&&Number.isFinite(input.preview.endHp)
  ?Math.max(0,input.preview.endHp):undefined;
 const maxHp=input.maxHp??0;
 return {
  metrics,
  combat:{
   bufferedSeconds:Number.isFinite(bufferedSeconds)?bufferedSeconds:0,
   bufferedKills,
   killsPerHour:validWindow&&bufferedKills>0?bufferedKills*3600/bufferedSeconds:undefined,
   foodUsed,
   foodPerHour:validWindow&&foodUsed>0?foodUsed*3600/bufferedSeconds:undefined,
   projectedHp,
   lowProjectedHp:projectedHp!==undefined&&Number.isFinite(maxHp)&&maxHp>0
    &&projectedHp/maxHp<.25,
  },
 };
}
