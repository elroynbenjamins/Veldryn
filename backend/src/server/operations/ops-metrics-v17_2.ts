/** Bounded operational/economy telemetry. Prefer 1-hour buckets; do not emit player PII into metric dimensions. */
export type MetricType='counter'|'gauge'|'duration';
export interface OpsMetricRepository {
  recordMetric(input:{metricKey:string;bucketStart:string;bucketMinutes:5|15|60|1440;dimensionKey:string;dimensions:Record<string,string|number|boolean>;metricType:MetricType;value:number;incrementCount:number}):Promise<void>;
}
export function hourBucket(at=new Date()){ const d=new Date(at); d.setUTCMinutes(0,0,0); return d.toISOString(); }
export class OpsMetrics {
  constructor(private repo:OpsMetricRepository){}
  record(metricKey:string,value:number,{dimensionKey='all',dimensions={},type='counter' as MetricType,at=new Date(),count=1}={}){
    if(!Number.isFinite(value)) return Promise.resolve();
    return this.repo.recordMetric({metricKey,bucketStart:hourBucket(at),bucketMinutes:60,dimensionKey,dimensions,metricType:type,value,incrementCount:count});
  }
  goldCreated(amount:number,source:string){ return this.record('economy.gold.created',amount,{dimensionKey:`source:${source}`,dimensions:{source}}); }
  goldDestroyed(amount:number,sink:string){ return this.record('economy.gold.destroyed',amount,{dimensionKey:`sink:${sink}`,dimensions:{sink}}); }
  itemCreated(quantity:number,itemId:string,source:string){ return this.record('economy.items.created',quantity,{dimensionKey:`source:${source}`,dimensions:{source,itemId}}); }
  activitySeconds(skillId:string,seconds:number){ return this.record('activity.seconds',seconds,{dimensionKey:`skill:${skillId}`,dimensions:{skillId}}); }
  dungeonCompleted(mode:string){ return this.record('dungeon.completions',1,{dimensionKey:`mode:${mode}`,dimensions:{mode}}); }
  socialPoints(system:'party_contract'|'party_event'|'guild_project',points:number){ return this.record('social.contribution_points',points,{dimensionKey:`system:${system}`,dimensions:{system}}); }
}
