import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import {createCharacter,effectiveStats,newGame} from '../src/core/game';
import {itemRarity,rarityMeta,type ItemRarity} from '../src/core/item-rarity';
import {CRAFTED_HIGHER_TIER_RARITY_UPLIFT_RETENTION,craftedRarityStatMultiplier,craftedGearRarityOutcomes} from '../src/core/crafted-gear-rarity';
import {craftedGearQualityMultiplier,normalizeCraftedGearInstances} from '../src/core/crafted-gear-instances';
import {enhancedGearStatsAtRank} from '../src/core/equipment-enhancement';
import {itemInspectModel} from '../src/core/item-inspect';
import {previewEquipment} from '../src/core/equipment-preview';
import type {CraftedGearInstance,GameState} from '../src/core/types';

const ok=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const close=(actual:number,expected:number,label:string)=>{
  ok(Math.abs(actual-expected)<1e-8,`${label}: expected ${expected}, got ${actual}`);
};
const tiers=['T1','T2','T3','T4','T5','T6','T7','T8','T9'] as const;
const rarities:ItemRarity[]=['common','uncommon','rare','epic','legendary','mythic'];
const boots=tiers.map(tier=>{
  const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier===tier
    &&row.classId==='IRONWARDEN'&&itemDef(row.output.itemId).slot==='boots');
  ok(recipe,'Missing Ironwarden boots in '+tier);
  return recipe!.output.itemId;
});
const initial=createCharacter(newGame(1),'IRONWARDEN','Tier Balance','male');
const seed:GameState={...initial,character:{...initial.character!,level:999},
  inventory:{...initial.inventory,capacity:80,stacks:[]}};
const copy=(itemId:string,rarity:ItemRarity,quality:number|undefined,rank=0,id=`${itemId}:${rarity}:${quality}`):CraftedGearInstance=>({
  id,itemId,ownerCharacterId:seed.character!.id,rarity,quality,locked:false,
  acquireSource:'craft',sourceReceiptKey:id,createdAtMs:1,
  enhancement:{rank,failures:0,gemIds:[]},
});
const withCopies=(copies:CraftedGearInstance[],where:'inventory'|'bank'='inventory'):GameState=>({
  ...seed,account:{...seed.account,craftedGearInstances:copies},
  [where]:{...seed[where],stacks:copies.map(record=>({itemId:record.itemId,quantity:1,instanceId:record.id}))},
});

ok(CRAFTED_HIGHER_TIER_RARITY_UPLIFT_RETENTION===.75,'Higher-tier bonus should retain 75% of the new incremental uplift');
for(let i=0;i<tiers.length;i++){
  const id=boots[i],item=itemDef(id);
  for(const rarity of rarities){
    const rolled=rarityMeta(rarity).statMultiplier;
    const catalogBase=rarityMeta(itemRarity(item)).statMultiplier;
    const previous=Math.max(1,rolled/catalogBase);
    const expected=previous+(rolled-previous)*CRAFTED_HIGHER_TIER_RARITY_UPLIFT_RETENTION;
    close(craftedRarityStatMultiplier(id,rarity),expected,
      `${tiers[i]} ${rarity} retains only 75% of the new uplift`);
    ok(expected>=previous&&expected<=rolled,
      `${tiers[i]} ${rarity} does not drop below the former stat level or exceed the recent buff`);
    if(i===0)close(expected,rolled,'T1 rarities must be unchanged');
    const outcome=craftedGearRarityOutcomes(id).find(row=>row.rarity===rarity)!;
    close(outcome.statMultiplier,expected,
      `${tiers[i]} ${rarity} Forge preview must match equipped stats`);
    for(const quality of [0,20,50,55,62,90,100]){
      const instance=copy(id,rarity,quality);
      const state=withCopies([instance]);
      const stats=enhancedGearStatsAtRank(state,id,0,instance.id);
      const multiplier=craftedRarityStatMultiplier(id,rarity)*craftedGearQualityMultiplier(quality);
      close(stats.attack,(item.attack??0)*multiplier,`${tiers[i]} ATK Q${quality} ${rarity}`);
      close(stats.defense,(item.defense??0)*multiplier,`${tiers[i]} DEF Q${quality} ${rarity}`);
      close(stats.hp,(item.hp??0)*multiplier,`${tiers[i]} HP Q${quality} ${rarity}`);
    }
  }
  if(i>0){
    const previous=boots[i-1];
    for(const rarity of rarities){
      const old=copy(previous,rarity,62,0,`old-${i}-${rarity}`);
      const fresh=copy(id,rarity,55,0,`new-${i}-${rarity}`);
      const state=withCopies([old,fresh]);
      const before=enhancedGearStatsAtRank(state,previous,0,old.id);
      const after=enhancedGearStatsAtRank(state,id,0,fresh.id);
      for(const stat of ['attack','defense','hp'] as const){
        if(before[stat]>0)ok(after[stat]>before[stat],
          `${tiers[i]} ${rarity} Q55 should beat ${tiers[i-1]} Q62: ${stat}`);
      }
    }
  }
}

close(craftedRarityStatMultiplier(boots[1],'uncommon'),1.09,'T2 Uncommon retains +9%, down from +12%');
close(craftedRarityStatMultiplier(boots[2],'rare'),1.21,'T3 Rare retains +21%, down from +28%');
close(craftedRarityStatMultiplier(boots[4],'epic'),1.375,'T5 Epic retains +37.5%, down from +50%');
close(craftedRarityStatMultiplier(boots[8],'mythic'),1.75,'T9 Mythic retains +75%, down from +100%');
const old=copy(boots[0],'uncommon',62,0,'tier1-q62');
const fresh=copy(boots[1],'uncommon',55,0,'tier2-q55');
const original=withCopies([old,fresh]);
const t1=enhancedGearStatsAtRank(original,old.itemId,0,old.id);
const t2=enhancedGearStatsAtRank(original,fresh.itemId,0,fresh.id);
ok(t2.defense>t1.defense&&t2.hp>t1.hp,'Reported T1 Q62 vs T2 Q55 case must be a clear T2 win');
const inspection=itemInspectModel(original,fresh.itemId,fresh.id,'inventory');
ok(inspection.rarityId==='uncommon'&&inspection.selectedQuality===55,
  'Inspection header must use the selected physical rarity and quality');
close(inspection.stats!.defense,t2.defense,'Quick Inspect T2 Q55 defense');
ok(inspection.gearDecision?.previewAvailable===true,'Exact owned Inventory copy should be previewable');
const simulated=previewEquipment(original,fresh.itemId,fresh.id,'inventory');
close(inspection.gearDecision!.loadoutAfter.defense,effectiveStats(simulated).defense,
  'Quick Inspect and Compare & Swap must agree on the selected copy');

const differentQuality=copy(fresh.itemId,'rare',95,2,'t2-rare-q95');
const duplicates=withCopies([fresh,differentQuality]);
const weakerInspection=itemInspectModel(duplicates,fresh.itemId,fresh.id,'inventory');
const strongerInspection=itemInspectModel(duplicates,differentQuality.itemId,differentQuality.id,'inventory');
ok(weakerInspection.rarityId==='uncommon'&&strongerInspection.rarityId==='rare',
  'Two same-item copies must never borrow each other\'s rarity');
close(weakerInspection.stats!.defense,
  enhancedGearStatsAtRank(duplicates,fresh.itemId,0,fresh.id).defense,
  'A weaker selected copy must not borrow a stronger owned copy\'s multiplier');
ok(strongerInspection.upgrade?.rank===2&&strongerInspection.selectedQuality===95,
  'Inspection must show the exact chosen duplicate\'s enhancement and quality');
const banked=withCopies([fresh],'bank');
const bankInspection=itemInspectModel(banked,fresh.itemId,fresh.id,'bank');
ok(bankInspection.gearDecision?.previewAvailable===false,
  'A Bank copy must not claim it can equip directly');
close(bankInspection.stats!.defense,t2.defense,'Bank inspection keeps exact copy stats');

const legacy=copy(fresh.itemId,'uncommon',undefined,0,'legacy-quality');
const baseline=copy(fresh.itemId,'uncommon',50,0,'explicit-q50');
const legacyState=withCopies([legacy,baseline]);
close(enhancedGearStatsAtRank(legacyState,fresh.itemId,0,legacy.id).defense,
  enhancedGearStatsAtRank(legacyState,fresh.itemId,0,baseline.id).defense,
  'Legacy missing quality must remain neutral Q50');
ok(itemInspectModel(legacyState,fresh.itemId,legacy.id,'inventory').selectedQuality===50,
  'Legacy gear must display Q50 without rewriting the stored receipt');
ok(normalizeCraftedGearInstances([legacy])[0].quality===undefined,
  'Legacy equipment quality must not be re-rolled or backfilled');

const mythicT1=copy(boots[0],'mythic',100,0,'mythic-t1');
const commonT2=copy(boots[1],'common',20,0,'common-t2');
const overlap=withCopies([mythicT1,commonT2]);
ok(enhancedGearStatsAtRank(overlap,boots[0],0,mythicT1.id).defense>
   enhancedGearStatsAtRank(overlap,boots[1],0,commonT2.id).defense,
   'Exceptional old-tier rarity/quality may still beat a low-roll higher tier');

console.log('PASS: tier/quality/rarity and exact-copy inspection agree for all nine tiers');
