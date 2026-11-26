/** Wave 2 standard cosmetics. Normal account ownership, not a tester entitlement.
 * Reserved IDs are not live catalog entries. Explicitly certify each set after
 * exact binary art, native rendering, server and public projection validation. */
export const WAVE2_SETS=[
 {id:'tideborne',name:'Tideborne',borderId:'cosmetic:tideborne:pearlframe',borderName:'Tideborne Pearlframe',effectId:'effect_tideborne_tidal_reverie',effectName:'Tidal Reverie',iconIds:['cosmetic:tideborne:portrait-siren','cosmetic:tideborne:portrait-corsair'],iconNames:['Tideborne Siren','Tideborne Corsair']},
 {id:'clockwork',name:'Clockwork Covenant',borderId:'cosmetic:clockwork:mechanism',borderName:'Clockwork Mechanism',effectId:'effect_clockwork_aetherwork_pulse',effectName:'Aetherwork Pulse',iconIds:['cosmetic:clockwork:portrait-artificer','cosmetic:clockwork:portrait-engineer'],iconNames:['Covenant Artificer','Covenant Engineer']},
 {id:'stormforged',name:'Stormforged',borderId:'cosmetic:stormforged:thunderframe',borderName:'Stormforged Thunderframe',effectId:'effect_stormforged_static_surge',effectName:'Static Surge',iconIds:['cosmetic:stormforged:portrait-tempest','cosmetic:stormforged:portrait-sentinel'],iconNames:['Stormforged Tempest','Stormforged Sentinel']},
 {id:'crimson-oath',name:'Crimson Oath',borderId:'cosmetic:crimson-oath:oathguard',borderName:'Crimson Oathguard',effectId:'effect_crimson_oath_scarlet_reverence',effectName:'Scarlet Reverence',iconIds:['cosmetic:crimson-oath:portrait-justicar','cosmetic:crimson-oath:portrait-knight'],iconNames:['Crimson Justicar','Crimson Knight']},
] as const;
export type Wave2Set=(typeof WAVE2_SETS)[number];
export type Wave2Id=Wave2Set['id'];
export type Wave2Kind='border'|'effect'|'icon';
type Ownership={unlockedProfileBorderIds?:readonly string[];unlockedProfileEffectIds?:readonly string[];unlockedProfileIconIds?:readonly string[]};
/** No set is ready as of this commit. Deliberately separate from store release
 * and legacy tester flag. Never set true based solely on a review archive. */
export const WAVE2_READY_SET_IDS:readonly Wave2Id[]=[];
export function wave2SetFor(kind:Wave2Kind,id:string){
 return WAVE2_SETS.find(row=>kind==='border'?row.borderId===id:kind==='effect'?row.effectId===id:row.iconIds.some(icon=>icon===id));
}
export function wave2Ready(kind:Wave2Kind,id:string,ready:readonly Wave2Id[]=WAVE2_READY_SET_IDS){
 const row=wave2SetFor(kind,id);return !!row&&ready.includes(row.id);
}
export function wave2Owned(account:Ownership,kind:Wave2Kind,id:string,ready:readonly Wave2Id[]=WAVE2_READY_SET_IDS){
 if(!wave2Ready(kind,id,ready))return false;
 const ids=kind==='border'?account.unlockedProfileBorderIds:kind==='effect'?account.unlockedProfileEffectIds:account.unlockedProfileIconIds;
 return ids?.includes(id)??false;
}
export function wave2Complete(account:Ownership,row:Wave2Set,ready:readonly Wave2Id[]=WAVE2_READY_SET_IDS){
 return wave2Owned(account,'border',row.borderId,ready)&&wave2Owned(account,'effect',row.effectId,ready)&&row.iconIds.every(id=>wave2Owned(account,'icon',id,ready));
}
export function wave2HasEffect(account:Ownership,ready:readonly Wave2Id[]=WAVE2_READY_SET_IDS){
 return WAVE2_SETS.some(row=>wave2Owned(account,'effect',row.effectId,ready));
}
/** Use only with trusted server-projected equipped IDs, never user input to a
 * write command. Spectators do not need ownership or a tester entitlement. */
export function wave2PublicRenderable(kind:Wave2Kind,id:string){
 return wave2Ready(kind,id);
}
