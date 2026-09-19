/** VELDRYN v17.2 server-authoritative remote config/feature gates.
 * Adapt RemoteConfigRepository to the current data layer. Do not trust client-provided resolved values.
 */
export type RemoteValue = boolean | number | string | Record<string, unknown> | unknown[] | null;
export type RemoteConfigRow = {
  config_key: string; default_value: RemoteValue; current_value: RemoteValue; enabled: boolean;
  exposure: 'server_only'|'client_safe'; risk_tier: 'low'|'medium'|'critical'; live_change_safe: boolean;
  rollout_percent: number; rollout_seed: string; active_from?: string|null; active_until?: string|null;
};
export interface RemoteConfigRepository { listRemoteConfig(): Promise<RemoteConfigRow[]>; }

function stableBucket(accountId: string, key: string, seed: string): number {
  const text=`${accountId || 'anonymous'}:${key}:${seed}`; let hash=2166136261;
  for(let i=0;i<text.length;i++){ hash^=text.charCodeAt(i); hash=Math.imul(hash,16777619)>>>0; }
  return hash%10000;
}

export class VeldrynRemoteConfig {
  private rows=new Map<string,RemoteConfigRow>(); private loadedAt=0;
  constructor(private repo:RemoteConfigRepository, private ttlMs=15_000) {}
  async refresh(force=false){
    if(!force && Date.now()-this.loadedAt<this.ttlMs && this.rows.size) return;
    try { const rows=await this.repo.listRemoteConfig(); this.rows=new Map(rows.map(r=>[r.config_key,r])); this.loadedAt=Date.now(); }
    catch (error) { if (this.rows.size) { this.loadedAt=Date.now()-Math.max(0,this.ttlMs-2_000); return; } throw error; }
  }
  async resolve<T extends RemoteValue>(key:string, accountId:string, fallback:T):Promise<T>{
    await this.refresh(); const row=this.rows.get(key); if(!row) return fallback;
    const now=Date.now(); if(!row.enabled) return (row.default_value as T) ?? fallback;
    if(row.active_from && now<Date.parse(row.active_from)) return (row.default_value as T) ?? fallback;
    if(row.active_until && now>=Date.parse(row.active_until)) return (row.default_value as T) ?? fallback;
    const bucket=stableBucket(accountId,key,row.rollout_seed);
    if(bucket>=Math.round(Number(row.rollout_percent)*100)) return (row.default_value as T) ?? fallback;
    return (row.current_value as T) ?? fallback;
  }
  async boolean(key:string,accountId:string,fallback:boolean){ return Boolean(await this.resolve(key,accountId,fallback)); }
  async number(key:string,accountId:string,fallback:number){ const n=Number(await this.resolve(key,accountId,fallback)); return Number.isFinite(n)?n:fallback; }
  async requireGameplayWrite(accountId:string){
    if(await this.boolean('maintenance.write_actions_disabled',accountId,false)) throw new Error('gameplay_writes_temporarily_disabled');
  }
  async requireFeature(key:string,accountId:string){
    await this.requireGameplayWrite(accountId);
    if(!(await this.boolean(key,accountId,true))) throw new Error(`feature_temporarily_disabled:${key}`);
  }
  async clientSafe(accountId:string){
    await this.refresh(); const out:Record<string,RemoteValue>={};
    for(const [key,row] of this.rows) if(row.exposure==='client_safe') out[key]=await this.resolve(key,accountId,row.default_value);
    return out;
  }
}

/** Integration rules:
 * - Every authoritative endpoint enforces its feature gate; UI hiding is convenience only.
 * - For immutable Party Event caps: effectiveCap = min(definitionCap, remote safety hard cap). Never raise a live definition cap remotely.
 * - Existing Live Dungeon runs/crafting jobs/market escrow should settle safely when new-entry switches are disabled.
 * - Cache is intentionally short (15s default) for emergency response; preserve last good cache if your repository transiently fails.
 */
