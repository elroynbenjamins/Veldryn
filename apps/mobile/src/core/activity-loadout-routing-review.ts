/** 2.0 isolated routing policy. No runtime application or slot grants.
 * Activity kind must be resolved from the server's canonical target,
 * not a client-provided category. Actual equip/settlement is a later pass. */
export type ActivityLoadoutCategory='combat'|'mining'|'woodcutting'|'fishing';
export type ActivityLoadoutBinding={readonly slotIndex:number;readonly presetId:string;readonly category:ActivityLoadoutCategory};
const categories:readonly ActivityLoadoutCategory[]=['combat','mining','woodcutting','fishing'];
export function reviewActivityLoadoutRoute(input:{
 readonly slotCount:number;readonly autoSwitch:boolean;readonly activity:string;
 readonly bindings:readonly ActivityLoadoutBinding[];
 readonly availablePresets:readonly {id:string;slotIndex:number}[];
}){
 if(!input||!Number.isInteger(input.slotCount)||input.slotCount<1||input.slotCount>5||
 typeof input.autoSwitch!=='boolean'||typeof input.activity!=='string'||
 !Array.isArray(input.bindings)||input.bindings.length>5||
 !Array.isArray(input.availablePresets)||input.availablePresets.length>5)
  throw Error('activity_loadout_invalid_context');
 const seenCategories=new Set<string>(),seenSlots=new Set<number>(),seenIds=new Set<string>();
 const validPresets=new Map<number,string>();
 for(const preset of input.availablePresets){
  if(!preset||!Number.isInteger(preset.slotIndex)||preset.slotIndex<0||preset.slotIndex>=5||
   typeof preset.id!=='string'||!preset.id||preset.id.length>180||
   validPresets.has(preset.slotIndex)||seenIds.has(preset.id))
   throw Error('activity_loadout_invalid_presets');
  validPresets.set(preset.slotIndex,preset.id);seenIds.add(preset.id);
 }
 for(const binding of input.bindings){
  if(!binding||!categories.includes(binding.category)||!Number.isInteger(binding.slotIndex)||
   binding.slotIndex<0||binding.slotIndex>=5||typeof binding.presetId!=='string'||!binding.presetId||binding.presetId.length>180||
   seenCategories.has(binding.category)||seenSlots.has(binding.slotIndex))
   throw Error('activity_loadout_invalid_binding');
  seenCategories.add(binding.category);seenSlots.add(binding.slotIndex);
 }
 const result=(decision:'manual'|'unassigned'|'locked'|'missing'|'candidate',presetId:string|null=null)=>({
  decision,presetId,mayEquip:false as const,releaseReady:false as const});
 if(!input.autoSwitch||!categories.includes(input.activity as ActivityLoadoutCategory))return result('manual');
 const binding=input.bindings.find(b=>b.category===input.activity);
 if(!binding)return result('unassigned');
 if(binding.slotIndex>=input.slotCount)return result('locked');
 if(validPresets.get(binding.slotIndex)!==binding.presetId)return result('missing');
 return result('candidate',binding.presetId);
}
