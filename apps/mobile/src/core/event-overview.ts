import type {EventActivitySource} from '../content/live-events';
import {seasonalEventExpeditionInfo} from './coop-event-expeditions';
import {eventCurrencyBonusBps,eventDailyFestivalBlessing,eventEffectiveDropRate,eventLifecycle,eventProjectChoice,eventProgress} from './live-events';
import type {GameState} from './types';

export const EVENT_GUILD_BOSS_REQUIRED_LEVEL=3;
const SOURCE_ORDER:EventActivitySource[]=['combat','gathering','crafting','boss'];

export interface EventOverviewSource{
 source:EventActivitySource;
 baseRate:number;
 effectiveRate:number;
 boosted:boolean;
}

export function eventOverview(state:GameState,nowMs=Date.now()){
 const event=eventLifecycle(state,nowMs);
 if(!event||event.phase==='upcoming'||!state.character)return null;
 const {definition}=event;
 const sources=SOURCE_ORDER.filter(source=>definition.dropRates[source]>0).map(source=>{
  const baseRate=definition.dropRates[source],effectiveRate=event.phase==='active'?eventEffectiveDropRate(state,definition.id,source,nowMs):baseRate;
  return {source,baseRate,effectiveRate,boosted:effectiveRate>baseRate+Number.EPSILON} satisfies EventOverviewSource;
 });
 const expedition=seasonalEventExpeditionInfo(definition.id);
 return {
  event,
  progress:eventProgress(state,definition.id),
  sources,
  discoveries:definition.discoveries.filter(discovery=>discovery.chance>0),
  blessing:event.phase==='active'?eventDailyFestivalBlessing(state,nowMs):undefined,
  focus:eventProjectChoice(state,definition.id),
  expedition:expedition?{...expedition,rewardMarks:Math.floor(expedition.rewardMarks*(1+eventCurrencyBonusBps(state,definition.id,nowMs)/10000)),levelReady:state.character.level>=expedition.minLevel}:undefined,
  hasGuildBoss:definition.objectives.some(objective=>objective.source==='boss'),
  guildMember:!!state.account.guildMember,
 };
}
