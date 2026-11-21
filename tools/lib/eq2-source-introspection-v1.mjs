/**
 * Review-only text introspection for Veldryn's authored mobile catalogs.
 * This is intentionally conservative: a source is "seen in inspected mobile
 * data", NOT confirmed as installed in production or as server-authoritative.
 * Never imports live game code, evaluates source TS or grants new loot.
 */
export function between(text, start, end) {
  const a=text.indexOf(start);
  if(a<0)throw Error('Missing source boundary: '+start);
  const b=text.indexOf(end,a+start.length);
  if(b<0)throw Error('Missing end boundary: '+end);
  return text.slice(a+start.length,b);
}
const stringField=(text,key)=>{
  const match=text.match(new RegExp('\\b'+key+"\\s*:\\s*['\"]([^'\"]+)['\"]"));
  return match?.[1]||null;
};
const numberField=(text,key)=>{
  const match=text.match(new RegExp('\\b'+key+'\\s*:\\s*(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))'));
  return match?Number(match[1]):null;
};
export function gatherNodes(source, kind) {
  const fragment=kind==='herbalism'
    ?between(source,'export const HERB_NODES:GatherDef[]=[','].map(node=>')
    :between(source,'export const GATHERING:GatherDef[]=([','] as Omit<GatherDef');
  const nodes=[];
  for(const line of fragment.split('\n')){
    if(!/^\s*\{id:/.test(line))continue;
    const id=stringField(line,'id'),itemId=stringField(line,'itemId'),zoneId=stringField(line,'zoneId');
    if(!id||!itemId||!zoneId)throw Error('Unexpected gathering shape: '+line.slice(0,100));
    nodes.push({
      id,itemId,zoneId,
      areaId:stringField(line,'areaId'),
      skillId:kind==='herbalism'?'herbalism':stringField(line,'skillId'),
      unlockLevel:numberField(line,'unlockLevel'),
      seconds:numberField(line,'seconds'),
      min:numberField(line,'min'),
      max:numberField(line,'max')
    });
  }
  if(!nodes.length)throw Error('No gathering nodes parsed: '+kind);
  return nodes;
}
export function monsterSources(source) {
  const fragment=between(source,'const MONSTERS_RAW:MonsterDef[]=[','];');
  const results=[];
  for(const line of fragment.split('\n')){
    if(!/^\s*\{id:/.test(line))continue;
    const id=stringField(line,'id'),zone=stringField(line,'zone');
    if(!id||!zone)throw Error('Unexpected monster shape: '+line.slice(0,100));
    const drops=[...line.matchAll(/\{itemId:\s*['"]([^'"]+)['"],\s*chance:\s*(\d+(?:\.\d+)?|\.\d+),\s*min:\s*(\d+),\s*max:\s*(\d+)\}/g)];
    for(const match of drops){
      results.push({monsterId:id,zone,areaId:stringField(line,'areaId'),
        itemId:match[1],authoredChance:Number(match[2]),
        min:Number(match[3]),max:Number(match[4]),
        boss:/\bboss\s*:\s*true/.test(line)});
    }
  }
  if(!results.length)throw Error('No monster drops parsed');
  return results;
}
export function catalogIds(sources){
  const registered=new Map();
  for(const [name,src] of Object.entries(sources)){
    for(const match of src.matchAll(/\{\s*id:\s*['"]([^'"]+)['"]/g)){
      const found=registered.get(match[1])||[];
      found.push(name);
      registered.set(match[1],found);
    }
  }
  if(!registered.size)throw Error('No catalog IDs parsed');
  return registered;
}
export function existingSmelting(source){
  const fragment=between(source,"{id:'SMELT_COPPER_INGOT'","{id:'ENCHANT_REGIONAL_CATALYST'");
  const lines=["{id:'SMELT_COPPER_INGOT'"+fragment].split('\n');
  const recipes=[];
  for(const line of lines){
    if(!/^\s*\{id:'SMELT_/.test(line))continue;
    const output=line.match(/output:\{itemId:'([^']+)',quantity:(\d+)\}/);
    if(!output)throw Error('Unexpected existing smelting recipe: '+line.slice(0,100));
    recipes.push({id:stringField(line,'id'),outputId:output[1],outputQuantity:Number(output[2]),
      skillLevel:numberField(line,'level'),xp:numberField(line,'xp'),seconds:numberField(line,'seconds'),
      inputs:[...line.matchAll(/\{itemId:'([^']+)',quantity:(\d+)\}/g)]
        .filter(m=>m[1]!==output[1]).map(m=>({itemId:m[1],quantity:Number(m[2])}))});
  }
  if(recipes.length<5)throw Error('Smelting recipes not present');
  return recipes;
}
export const effectiveNormalMaterialChance=(authored)=>{
  if(!Number.isFinite(authored)||authored<0||authored>1)throw Error('Invalid authored chance');
  return authored===1?0.5:authored*0.5*0.95;
};
export const authoredChanceForFinal=(final)=>{
  if(!Number.isFinite(final)||final<=0||final>1)throw Error('Invalid requested final chance');
  const authored=final/(0.5*0.95);
  if(authored>=1)throw Error('Cannot express this chance in ordinary sub-100% branch');
  return authored;
};
