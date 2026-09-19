import pveData from '../../../data/equipment_pve_sources_v30.json';

export interface CombatSourceV30 {
  sourceId:string;
  tier:string;
  region:string;
  enemy:string;
  material:string;
  itemId:string|null;
  dropChance:number;
  qtyText:string;
  softPityKills:number;
  sourceType:string;
  note:string;
}
export interface TokenSourceV30 {
  tokenId:string;
  tier:string;
  region:string;
  content:string;
  boss:string;
  qtyMin:number;
  qtyMax:number;
  firstClearBonus:number;
  weeklyBonus:number;
  displayName:string;
  randomDrop:string;
  notes:string;
  usage:string;
}

// JSON is emitted as row arrays to remain easy to diff against the workbook.
const combatRows = pveData.combatSources as (string|number|null)[][];
const tokenRows = pveData.tokenSources as (string|number|null)[][];

export const COMBAT_SOURCES_V30:Readonly<Record<string,CombatSourceV30>>=Object.fromEntries(
  combatRows.map(r=>{
    const v:CombatSourceV30={
      sourceId:String(r[0]),tier:String(r[1]),region:String(r[2]),enemy:String(r[3]),material:String(r[4]),
      itemId:r[5]==null?null:String(r[5]),dropChance:Number(r[6]),qtyText:String(r[7]),softPityKills:Number(r[8]||0),
      sourceType:String(r[9]),note:String(r[10]||'')
    };
    return [v.sourceId,v];
  })
);

export const TOKEN_SOURCES_V30:Readonly<Record<string,TokenSourceV30>>=Object.fromEntries(
  tokenRows.map(r=>{
    const v:TokenSourceV30={
      tokenId:String(r[0]),tier:String(r[1]),region:String(r[2]),content:String(r[3]),boss:String(r[4]),
      qtyMin:Number(r[5]),qtyMax:Number(r[6]),firstClearBonus:Number(r[7]),weeklyBonus:Number(r[8]),
      displayName:String(r[9]),randomDrop:String(r[10]),notes:String(r[11]||''),usage:String(r[12]||'')
    };
    return [v.tokenId,v];
  })
);

export function rollGuaranteedTokenRewardV30(tokenId:string, random01:number, firstClear:boolean){
  const src=TOKEN_SOURCES_V30[tokenId];
  if(!src)throw new Error(`unknown_equipment_token:${tokenId}`);
  const x=Math.min(.999999999,Math.max(0,random01));
  const base=src.qtyMin+Math.floor(x*(src.qtyMax-src.qtyMin+1));
  return base+(firstClear?src.firstClearBonus:0);
}

export function validateCombatDropV30(sourceId:string, random01:number, failuresSinceDrop:number){
  const src=COMBAT_SOURCES_V30[sourceId];
  if(!src)throw new Error(`unknown_equipment_combat_source:${sourceId}`);
  // Mandatory sources with pity never need the client to decide the outcome.
  const pity=src.softPityKills>0 && failuresSinceDrop+1>=src.softPityKills;
  return pity || random01 < src.dropChance;
}

export function validatePveSourceCatalogV30(){
  for(const s of Object.values(COMBAT_SOURCES_V30)){
    if(!(s.dropChance>0&&s.dropChance<=1))throw new Error(`invalid_combat_drop_chance:${s.sourceId}`);
    if(s.dropChance<.10)throw new Error(`mandatory_combat_drop_too_rare:${s.sourceId}`);
  }
  for(const t of Object.values(TOKEN_SOURCES_V30)){
    if(t.randomDrop!=='No')throw new Error(`equipment_token_must_be_guaranteed:${t.tokenId}`);
    if(t.qtyMin<1||t.qtyMax<t.qtyMin)throw new Error(`invalid_token_yield:${t.tokenId}`);
  }
  return true;
}
