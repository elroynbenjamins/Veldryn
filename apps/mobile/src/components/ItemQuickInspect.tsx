import {itemVendorSellGold} from '../core/equipment-vendor-value';
import {useGameplayText} from '../i18n/gameplay';
import {itemDetailText,itemDetailContent,type itemDetailRows} from '../i18n/item-details';
import {localizedItemName} from '../i18n/starter-item-names';
import {localizedRecipeName} from '../i18n/crafting-recipe-names';
import {equipmentPouchText} from '../i18n/equipment-pouch-ui';

import {useEffect,useMemo,useState} from 'react';
import type {ReactNode} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameModalSurface} from './GameModalSurface';
import {GameState} from '../core/types';
import {itemInspectModel} from '../core/item-inspect';
import {companionMaterialUseLabels} from '../core/resource-codex';
import {equipmentPouch} from '../core/equipment-pouch';
import {prioritizeItemSources,prioritizeItemUses} from '../core/item-source-display';
import {rarityMeta,rarityNameColor} from '../core/item-rarity';
import {validateGatheringToolRoll} from '../core/gathering-tool-rolls';
import {gatheringToolDef} from '../content/gathering-tools';
import {gatheringToolContribution,gatheringToolPercent} from '../core/gathering-tool-presentation';
import {formatGameNumber} from '../core/number-format';
import {displayStat,displayStatPrecise} from '../core/stat-display';
import {equipmentCraftingPath} from '../core/equipment-crafting-path';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EquipmentArtwork,hasEquipmentArtwork} from './EquipmentArtwork';
import {GatheringToolArtwork} from './GatheringToolArtwork';
import {ResourceArtwork} from './ResourceArtwork';
import {hasResourceArtwork} from '../theme/resource-assets';
import {GemArtwork} from './GemArtwork';
import {ItemArtwork} from './ItemArtwork';
import {InventoryItemHeaderControls} from './InventoryItemHeaderControls';
import {hasGemArtworkV1,hasRawGemArtworkV1} from '../theme/gem-assets';
import type {WorkingTowardDestination} from '../core/working-toward';

function signedPreviewStat(raw:number){const value=displayStat(raw);return value>0?'+'+value:String(value);}

function InspectArt({itemId,model}:{itemId:string;model:ReturnType<typeof itemInspectModel>}){
 const {gl,language}=useGameplayText();
  const C=useGameTheme(),item=model.item;
  if(item.type==='gear'&&hasEquipmentArtwork(item))return <EquipmentArtwork item={item} framed={false}/>;
  if(item.type==='tool')return <GatheringToolArtwork itemId={item.id} size={56} framed={false}/>;
  if(hasRawGemArtworkV1(item.id))return <GemArtwork itemId={item.id} size={56} framed={false}/>;
  if(hasGemArtworkV1(item.id))return <GemArtwork itemId={item.id} size={56} framed={false}/>;
  if(hasResourceArtwork(item.id))return <ResourceArtwork itemId={item.id} size={56} framed={false}/>;
  return <View style={[art.fallback,{borderColor:model.rarity.color,backgroundColor:model.rarity.surface}]}><Text style={[art.symbol,{color:model.rarity.color}]}>{model.rarity.symbol}</Text><Text style={[art.fallbackText,{color:C.muted}]}>{itemDetailContent(language,item.type,gl).toLocaleUpperCase(language)}</Text></View>;
}

export function ItemQuickInspect({state,itemId,instanceId,source='inventory',onClose,onNavigate,actions,quickActions,disposalActions,favorite=false,locked=false,onToggleFavorite,onToggleLock}:{state:GameState;itemId:string|null;instanceId?:string|null;source?:'inventory'|'bank'|'equipment_pouch';onClose:()=>void;onNavigate?:(destination:WorkingTowardDestination)=>void;actions?:ReactNode;quickActions?:ReactNode;disposalActions?:ReactNode;favorite?:boolean;locked?:boolean;onToggleFavorite?:()=>void|Promise<unknown>;onToggleLock?:()=>void|Promise<unknown>}){
 const {gt,gl,language}=useGameplayText();
 const it=(key:keyof typeof itemDetailRows,params?:Record<string,string|number>)=>itemDetailText(language,key,params);
 const ui=(label:string)=>equipmentPouchText(language,label);
 const contentText=(value:string)=>itemDetailContent(language,value,gl);
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),compactHeader=width<390||fontScale>=1.25;
  const [sourceDisclosure,setSourceDisclosure]=useState<Record<string,boolean>>({}),[craftingDisclosure,setCraftingDisclosure]=useState<Record<string,boolean>>({}),[useLimits,setUseLimits]=useState<Record<string,number>>({}),[detailsOpen,setDetailsOpen]=useState(false);
  useEffect(()=>{setDetailsOpen(false)},[itemId,instanceId,source]);
  const model=useMemo(()=>itemId?itemInspectModel(state,itemId,instanceId,source):undefined,[state,itemId,instanceId,source]);
  const craftPath=useMemo(()=>itemId&&model?.item.type==='gear'?equipmentCraftingPath(state,itemId):undefined,[state,itemId,model?.item.type]);
  if(!itemId||!model)return null;
  const item=model.item,rarity=model.rarity,upgrade=model.upgrade,sockets=model.sockets,gearDecision=model.gearDecision,nameColor=rarityNameColor(model.rarityId,C.dark,C.text);
  // Never show a speculative loadout delta for a nonspecific forged copy.
  // itemInspectModel verifies an exact receipt and runs the same equip projection
  // used by Compare & Swap; bank copies cannot be equipped directly.
  const canPreviewGear=item.type==='gear'&&!!gearDecision?.compatible&&!!gearDecision.previewAvailable
    &&(!!instanceId||model.craftedCopies===0);
  const isExactEquippedGear=item.type==='gear'&&source!=='bank'&&!!gearDecision?.alreadyEquipped
    &&(!!instanceId||model.craftedCopies===0);
  const visibleStatDeltas=gearDecision?([
    ['ATK',gearDecision.loadoutDelta.attack],['DEF',gearDecision.loadoutDelta.defense],['HP',gearDecision.loadoutDelta.hp],
  ] as const).filter(([,delta])=>displayStat(delta)!==0):[];
  const toolDef=item.type==='tool'?gatheringToolDef(item.id):undefined;
  const storedToolCopies=item.type==='tool'?state[source==='bank'?'bank':'inventory'].stacks
    .filter(stack=>stack.itemId===item.id&&!!stack.instanceId)
    .flatMap(stack=>{const copy=validateGatheringToolRoll(state.account.craftedGatheringToolInstances?.find(record=>record.id===stack.instanceId),stack.itemId);return copy?[copy]:[]}):[];
  const detailToolCopies=instanceId?storedToolCopies.filter(copy=>copy.id===instanceId):storedToolCopies;
  
  const storedGearCount=source==='equipment_pouch'?equipmentPouch(state).stacks.reduce((count,stack)=>count+(stack.itemId===itemId?stack.quantity:0),0):0;
  // Both 1.0.11 non-weapon rolls and legacy weapon rolls are already resolved
  // against the exact selected receipt by itemInspectModel. Keep the player
  // facing view focused on the real bonus value, not its hidden roll percentile.
  const isBonusRoll=(line:string)=>line.startsWith('Equipment roll · ')||line.startsWith('Weapon roll · ');
  const bonusRows=model.effectLines.filter(isBonusRoll).map((line,index)=>{
    const valueAndStat=line.split(' · ')[1]??'';
    const match=/^([+-]\d+(?:\.\d+)?%)\s+(.+)$/.exec(valueAndStat);
    return {id:index,label:match?.[2]??valueAndStat,value:match?.[1]??''};
  });
  const traitLine=item.type==='gear'?item.passive?.trim():undefined;
  const otherEffectLines=model.effectLines.filter(line=>!isBonusRoll(line)&&(!traitLine||line!==traitLine)&&!(item.type==='tool'&&(line.includes(' · Q')||line.startsWith('Tool roll record unavailable'))));
  const sources=prioritizeItemSources(model.sources),uses=prioritizeItemUses(model.usedIn);
  const companionUses=item.type==='material'?companionMaterialUseLabels(item.id):[];
  const primarySource=sources[0],otherSources=sources.slice(1),otherSourcesOpen=!!sourceDisclosure[itemId];
  const craftingOpen=!!craftingDisclosure[itemId],useLimit=useLimits[itemId]??4,useRows=uses.slice(0,useLimit);
  const readyUses=uses.filter(row=>row.availability.status==='ready').length;
  const upgradeChance=upgrade?Math.round(upgrade.successChance*100):0;
  const upgradeColor=upgrade?.maxed?C.good:upgradeChance>=70?C.good:upgradeChance>=30?C.warning:C.bad;
  return <GameModalSurface visible={true} reduceMotion={state.settings.reduceMotion} onClose={onClose}
    backdropLabel={gt("Close item quick inspect")} surfaceStyle={s.sheet}>
        <View style={[s.hero,compactHeader&&s.heroCompact]}>
          <View style={[s.artBox,{borderColor:rarity.color,backgroundColor:rarity.surface}]}><InspectArt itemId={itemId} model={model}/></View>
          <View style={[s.heroCopy,compactHeader&&s.heroCopyCompact]}>
            <Text style={[s.rarity,{color:rarity.color}]}>{rarity.symbol+' '+contentText(rarity.label).toLocaleUpperCase(language)+(model.selectedQuality!==undefined?' · Q'+model.selectedQuality:'')+' · '+contentText(item.type).toLocaleUpperCase(language)}</Text>
            <Text numberOfLines={2} style={[s.name,{color:nameColor}]}>{localizedItemName(language,item.id)+(upgrade?.rank?' +'+upgrade.rank:'')}</Text>
            <Text numberOfLines={2} style={s.owned}>{item.type==='gear'?(source==='bank'?gt('Bank'):gl('Gear'))+' '+formatGameNumber(source==='bank'?model.bankQuantity:source==='equipment_pouch'?storedGearCount:model.inventoryQuantity,state.settings.numberMode,language)+' · '+(state.character?.name??gl('Character')):gl('Carried')+' '+formatGameNumber(model.inventoryQuantity,state.settings.numberMode,language)+' · '+gt('Bank')+' '+formatGameNumber(model.bankQuantity,state.settings.numberMode,language)}</Text>
            {isExactEquippedGear?<View style={s.equippedPill}><Text style={s.equippedPillText}>{gt('Equipped').toLocaleUpperCase(language)}</Text></View>:null}
          </View>
          <View style={[s.heroControls,compactHeader&&s.heroControlsCompact]}><InventoryItemHeaderControls favorite={favorite} locked={locked} onFavorite={onToggleFavorite} onLock={onToggleLock} onClose={onClose}/></View>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
          {item.type==='gear'&&model.stats&&(model.stats.attack!==0||model.stats.defense!==0||model.stats.hp!==0)?<View style={s.statGroup}>
            <Text style={s.statHeading}>{gt("BASE STATS")}</Text>
            <View style={s.basePanel} accessibilityLabel={gt("Equipment base stats")}>
              {model.stats.attack!==0?<Stat label="ATK" value={model.stats.attack}/>:null}
              {model.stats.defense!==0?<Stat label="DEF" value={model.stats.defense}/>:null}
              {model.stats.hp!==0?<Stat label="HP" value={model.stats.hp}/>:null}
            </View>
          </View>:null}
          {traitLine?<View style={s.statGroup}>
            <Text style={s.statHeading}>{item.type==='gear'?ui('INNATE TRAIT'):gt("TRAIT")}</Text>
            <View style={s.traitPanel}><Text style={s.traitText}>{contentText(traitLine)}</Text></View>
          </View>:null}
          {item.type==='gear'&&bonusRows.length>0?<View style={s.statGroup}>
            <Text style={s.statHeading}>{ui('RANDOM BONUS ROLLS')}</Text>
            <View style={[s.bonusPanel,{borderColor:rarity.color,backgroundColor:rarity.surface}]}>
              {bonusRows.map(roll=><View key={roll.id} style={s.bonusRow}>
                <Text style={s.bonusLabel}>{contentText(roll.label)}</Text>
                <Text style={[s.bonusValue,{color:rarityNameColor(model.rarityId,C.dark,C.good)}]}>{roll.value}</Text>
              </View>)}
            </View>
          </View>:null}
          {canPreviewGear&&gearDecision?<View style={s.gearSummary} accessibilityLabel={ui("EQUIPMENT IMPACT")}>
            <View style={s.gearSummaryHead}>
              <Text style={s.statHeading}>{ui("EQUIPMENT IMPACT")}</Text>
              <Text numberOfLines={1} style={s.gearSummaryTarget}>{gearDecision.alreadyEquipped?gt('Equipped'):gearDecision.replaces?ui('Replacing equipped item'):gl('Empty slot')}</Text>
            </View>
            <View style={s.gearSummaryMetrics}>
              <View style={s.gearMetric}>
                <Text style={s.gearMetricLabel}>{ui("POWER CHANGE")}</Text>
                <Text style={[s.gearMetricValue,{color:displayStat(gearDecision.loadoutDelta.power)>0?C.good:displayStat(gearDecision.loadoutDelta.power)<0?C.bad:C.muted}]}>{signedPreviewStat(gearDecision.loadoutDelta.power)}</Text>
              </View>
              {gearDecision.set?<View style={s.gearMetric}>
                <Text style={s.gearMetricLabel}>{ui("SET PIECES")}</Text>
                <Text style={s.gearMetricValue}>{gearDecision.set.currentPieces+' → '+gearDecision.set.previewPieces+' / '+gearDecision.set.required}</Text>
              </View>:null}
            </View>
            {gearDecision.set?<Text numberOfLines={2} style={s.gearSummaryNote}>{gearDecision.set.name}</Text>:null}
            {visibleStatDeltas.length>0?<Text style={s.gearSummaryNote}>{visibleStatDeltas.map(([label,delta])=>label+' '+signedPreviewStat(delta)).join(' · ')}</Text>:null}
            <Text style={s.gearSummaryNote}>{gearDecision.alreadyEquipped?gt('Currently equipped · loadout change is zero.'):gl('Includes upgrades, socketed gems and set bonuses. Equip to apply.')}</Text>
          </View>:null}
          {item.type==='gear'&&source==='bank'?<Text style={s.gearSummaryNote}>{ui('Withdraw to compare & equip.')}</Text>:item.type==='gear'&&model.craftedCopies>0&&!instanceId?<Text style={s.gearSummaryHint}>{gt('Choose a specific equipment copy to compare')}</Text>:null}
          <View style={s.footerRow}><Text style={s.sell}>{it('Sell value · {gold} gold each',{gold:formatGameNumber(itemVendorSellGold(item),state.settings.numberMode,language)})}</Text>{item.classRestriction&&<Text style={s.classText}>{item.classRestriction.replaceAll('_',' ')}</Text>}</View>
          {item.type==='tool'&&actions?<View style={s.foodActions}>{actions}</View>:null}
          <Pressable accessibilityRole="button" accessibilityLabel={ui('Details & sources')} accessibilityState={{expanded:detailsOpen}} onPress={()=>setDetailsOpen(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
            <Text style={s.disclosureText}>{ui('Details & sources')}</Text><Text style={s.disclosureMark}>{detailsOpen?'−':'+'}</Text>
          </Pressable>
          {detailsOpen&&<>
          {(otherEffectLines.length>0||companionUses.length>0||(model.craftedCopies>1&&item.type==='gear'&&!gearDecision?.alreadyEquipped))&&<Section title={gt("WHAT IT DOES")}>{model.craftedCopies>1&&item.type==='gear'&&!gearDecision?.alreadyEquipped?<Text style={s.note}>{gt("Choose a specific equipment copy to compare")}</Text>:null}{otherEffectLines.map((line,index)=><Text key={index} style={s.body}>{'• '+contentText(line)}</Text>)}{companionUses.map(use=><Text key={use} style={s.body}>{'• '+contentText(use)}</Text>)}</Section>}
          {toolDef?<Section title={gt('GATHERING TOOL DETAILS')}>
            {(detailToolCopies.length?detailToolCopies:instanceId?[]:[undefined]).map((copy,index)=>{
              const breakdown=gatheringToolContribution(toolDef,copy);
              const rarityChange=(breakdown.rarityAdjustmentPercent>=0?'+':'')+gatheringToolPercent(breakdown.rarityAdjustmentPercent);
              const qualityChange=(breakdown.qualityAdjustmentPercent>=0?'+':'')+gatheringToolPercent(breakdown.qualityAdjustmentPercent);
              return <View key={copy?.id??'legacy'} style={{gap:3}}>
                {detailToolCopies.length>1?<Text style={s.bodyStrong}>{gt('Tool {number}',{number:index+1})} · {copy?rarityMeta(copy.rarity).label+' · Q'+copy.quality:gt('Legacy tool')}</Text>:null}
                <Text style={s.bodyStrong}>{gt('Tier gathering speed')} · +{gatheringToolPercent(breakdown.adjustedBasePercent)}%</Text>
                <Text style={s.note}>{gt('Tier base {base}% · Rarity {rarity}% · Quality {quality}%',{base:gatheringToolPercent(breakdown.basePercent),rarity:rarityChange,quality:qualityChange})}</Text>
                {copy?<Text style={s.note}>{gt('Bonus stat roll')} · +{gatheringToolPercent(copy.bonus.basisPoints/100)}% {copy.bonus.stat==='xp'?gl(toolDef.skillId)+' XP':gt(copy.bonus.stat==='speed'?'Gathering Speed':'Gathering Rarity Chance')}</Text>:<Text style={s.note}>{gt('Legacy tool · No bonus stat roll')}</Text>}
              </View>;
            })}
            {instanceId&&detailToolCopies.length===0?<Text style={s.note}>{gt('Tool roll record unavailable · no bonus is assumed.')}</Text>:null}
            <Text style={s.note}>{gt('Each tier contributes gathering speed. Rolled speed bonuses apply separately to remaining action time, subject to the gathering speed cap.')}</Text>
          </Section>:null}
          {gearDecision&&<Section title={gt("GEAR CHECK")}>{model.craftedCopies>0&&!instanceId?<Text style={s.warningText}>{gt('Choose a specific equipment copy to compare')}</Text>:!gearDecision.compatible?<Text style={s.warningText}>{gt("This item belongs to another class, so loadout impact cannot be previewed on this character.")}</Text>:!gearDecision.previewAvailable?<Text style={s.warningText}>{source==='bank'?ui('Withdraw to compare & equip.'):gt("Choose a specific equipment copy to compare")}</Text>:<><View style={s.compareLine}><Text style={s.note}>{gt("REPLACES")}</Text><Text style={s.bodyStrong}>{gearDecision.replaces?gearDecision.replaces.name+(gearDecision.replaces.rank?' +'+gearDecision.replaces.rank:''):it('Empty {slot} slot',{slot:gl(item.slot??'equipment')})}</Text></View><Text style={s.note}>{gearDecision.alreadyEquipped?gt("Currently equipped · loadout change is zero."):gt("Whole-loadout change if equipped now.")}</Text><View style={s.deltaRow}><DeltaStat label="ATK" value={gearDecision.loadoutDelta.attack}/><DeltaStat label="DEF" value={gearDecision.loadoutDelta.defense}/><DeltaStat label="HP" value={gearDecision.loadoutDelta.hp}/><DeltaStat label="PWR" value={gearDecision.loadoutDelta.power}/></View><Text style={s.totalLine}>{it('After equip · ATK {attack} · DEF {defense} · HP {hp} · PWR {power}',{attack:displayStat(gearDecision.loadoutAfter.attack),defense:displayStat(gearDecision.loadoutAfter.defense),hp:displayStat(gearDecision.loadoutAfter.hp),power:displayStat(gearDecision.loadoutAfter.power)})}</Text>{upgrade&&!upgrade.maxed&&<><View style={s.compareLine}><Text style={s.note}>{it('TO +{rank} FROM CURRENT RANK',{rank:gearDecision.maxRank})}</Text><Text style={s.potentialLabel}>{gt("POTENTIAL")}</Text></View><View style={s.deltaRow}><DeltaStat label="ATK" value={gearDecision.maxLoadoutGain.attack} potential/><DeltaStat label="DEF" value={gearDecision.maxLoadoutGain.defense} potential/><DeltaStat label="HP" value={gearDecision.maxLoadoutGain.hp} potential/><DeltaStat label="PWR" value={gearDecision.maxLoadoutGain.power} potential/></View><Text style={s.note}>{gt("Potential keeps this copy's current socketed gems and only raises its upgrade rank.")}</Text></>}{gearDecision.set&&<View style={s.setDecision}><View style={s.compareLine}><Text style={s.setName}>{gearDecision.set.name}</Text><Text style={s.setCount}>{gearDecision.set.currentPieces+' → '+gearDecision.set.previewPieces+' / '+gearDecision.set.required}</Text></View>{gearDecision.set.active.map(row=><View key={row.pieces} style={s.setRuntimeRow}><Text style={[s.setRuntimePill,row.runtime==='live'?s.setRuntimeLive:s.setRuntimePending]}>{row.runtime==='live'?gt("LIVE"):it('HOOK')}</Text><Text style={s.note}>{it('{pieces} pieces · {bonus}',{pieces:row.pieces,bonus:gl(row.bonus)})}</Text></View>)}{gearDecision.set.next&&<Text style={s.setNext}>{it('Next · {pieces} pieces · {bonus}',{pieces:gearDecision.set.next.pieces,bonus:gl(gearDecision.set.next.bonus)})}</Text>}{/^T[5-9]$/.test(gearDecision.set.tier)?<Text style={s.catalogNote}>{it('2/4/8/10 always-on V33 bonuses are live in stats/combat. 6pc conditional text is preserved as a trigger hook until its exact skill/ally/barrier event exists.')}</Text>:null}</View>}</>}</Section>}

          {craftPath&&<Section title={gt("CRAFTING PATH")}><View style={s.compareLine}><View style={s.flex}><Text style={s.bodyStrong}>{craftPath.tier?craftPath.tier+' · ':''}{localizedRecipeName(language,craftPath.recipe)}</Text><Text style={s.note}>{it('{skill} · Character Lv {level} · {gold} gold',{skill:gl(craftPath.skillLabel),level:craftPath.characterLevel,gold:formatGameNumber(craftPath.gold,state.settings.numberMode,language)})}</Text>{craftPath.region&&<Text style={s.note}>{craftPath.region+(craftPath.path?' · '+craftPath.path:'')}</Text>}</View><Text style={[s.craftState,craftPath.canCraftNow?s.craftReady:s.craftBlocked]}>{craftPath.canCraftNow?gt("Ready").toLocaleUpperCase(language):it('BLOCKERS: {count}',{count:craftPath.blockers.length})}</Text></View>{craftPath.blockers.filter(blocker=>blocker.kind!=='material').map((blocker,index)=>blocker.destination&&onNavigate&&blocker.availability?.canNavigate?<Pressable key={blocker.kind+index} accessibilityRole="button" accessibilityLabel={contentText(blocker.label)} onPress={()=>onNavigate(blocker.destination!)} style={({pressed})=>[s.actionRow,pressed&&s.pressed]}><View style={s.flex}><Text style={s.bodyStrong}>{contentText(blocker.label)}</Text><Text style={s.note}>{contentText(blocker.detail)}</Text></View><View style={s.actionMeta}>{blocker.availability&&<AvailabilityPill status={blocker.availability.status} label={blocker.availability.label}/>}<Text style={s.openMark}>{gt("Open ›").toLocaleUpperCase(language)}</Text></View></Pressable>:<View key={blocker.kind+index} style={s.blockerRow}><Text style={s.bodyStrong}>{contentText(blocker.label)}</Text><Text style={s.note}>{contentText(blocker.detail)}</Text></View>)}<Text style={s.sectionMini}>{gt("Materials").toLocaleUpperCase(language)}</Text>{craftPath.ingredients.map(ingredient=>{const missing=ingredient.missing>0;return missing&&onNavigate&&ingredient.availability.canNavigate?<Pressable key={ingredient.itemId} accessibilityRole="button" accessibilityLabel={it('Find {item}',{item:localizedItemName(language,ingredient.itemId)})} onPress={()=>onNavigate(ingredient.source)} style={({pressed})=>[s.actionRow,pressed&&s.pressed]}><View style={s.flex}><Text style={s.bodyStrong}>{localizedItemName(language,ingredient.itemId)+' · '+ingredient.owned+'/'+ingredient.required}</Text><Text style={s.note}>{it('{count} missing · {source}',{count:ingredient.missing,source:contentText(ingredient.source.detail)})}</Text></View><View style={s.actionMeta}><AvailabilityPill status={ingredient.availability.status} label={ingredient.availability.label}/><Text style={s.openMark}>{gt("Open ›").toLocaleUpperCase(language)}</Text></View></Pressable>:<View key={ingredient.itemId} style={s.materialReadyRow}><View style={s.flex}><Text style={s.bodyStrong}>{localizedItemName(language,ingredient.itemId)}</Text><Text style={s.note}>{it('{owned}/{required} owned',{owned:ingredient.owned,required:ingredient.required})}</Text></View><Text style={missing?s.materialMissing:s.materialReady}>{missing?gt("Missing").toLocaleUpperCase(language):gt("Ready").toLocaleUpperCase(language)}</Text></View>})}</Section>}

          {upgrade&&<Section title={gt("UPGRADE")}><View style={s.upgradeTop}><Text style={s.bodyStrong}>{it('Current +{rank}',{rank:upgrade.rank})}</Text><Text style={[s.chance,{color:upgradeColor}]}>{upgrade.maxed?gt("MAXED"):upgradeChance+'% → +'+upgrade.nextRank}</Text></View>{upgrade.maxed?<Text style={s.body}>{gt("This item has reached the maximum upgrade rank.")}</Text>:<><Text style={s.body}>{it('Next attempt · {gold} gold · {dust} × Tempering Dust',{gold:formatGameNumber(upgrade.gold,state.settings.numberMode,language),dust:upgrade.dust})+(upgrade.cores?' · '+upgrade.cores+' × Tempering Core':'')}</Text>{upgrade.materials.length>0&&<><Text style={s.sectionMini}>{gt("REGIONAL MATERIALS")}</Text><Text style={s.note}>{upgrade.materials.map(material=>material.quantity+' × '+material.name).join(' · ')}</Text></>}{upgrade.failures>0&&<Text style={s.note}>{it('Pity bonus active · failed attempts: {count}.',{count:upgrade.failures})}</Text>}{!upgrade.equipped&&<Text style={s.note}>{gt("Equip this item before attempting an upgrade.")}</Text>}</>}</Section>}

          {sockets&&<Section title={gt("SOCKETS")}><Text style={s.body}>{it('{filled}/{capacity} filled · 1 Stat + 1 Effect',{filled:sockets.filled,capacity:sockets.capacity})}</Text>{gearDecision?.gems.length?gearDecision.gems.map(gem=><Text key={gem.id} style={s.body}>{(gem.kind==='stat'?'S ◆ ':'FX ✦ ')+gem.name+' · '+contentText(gem.detail)}</Text>):<><Text style={s.note}>{it('Stat · {gem}',{gem:sockets.statGemName??gt("Empty")})}</Text><Text style={s.note}>{it('Effect · {gem}',{gem:sockets.effectGemName??gt("Empty")})}</Text></>}</Section>}

          {sources.length>0?<Section title={gt("HOW TO GET")+(sources.length?' · '+sources.length:'')}>{primarySource?<><SourceRow source={primarySource} primary onNavigate={onNavigate}/>{otherSources.length?<><Pressable accessibilityRole="button" accessibilityState={{expanded:otherSourcesOpen}} accessibilityLabel={it(otherSourcesOpen?'Hide other sources for {item}':'Show other sources for {item}',{item:localizedItemName(language,item.id)})} onPress={()=>setSourceDisclosure(value=>({...value,[itemId]:!value[itemId]}))} style={({pressed})=>[s.sourceDisclosure,pressed&&s.pressed]}><Text style={s.sourceDisclosureText}>{it('Other sources · {count}',{count:otherSources.length})}</Text><Text style={s.sourceDisclosureMark}>{otherSourcesOpen?'−':'+'}</Text></Pressable>{otherSourcesOpen?<View style={s.otherSourceList}>{otherSources.map((source,index)=><SourceRow key={source.kind+':'+source.title+':'+index} source={source} onNavigate={onNavigate}/>)}</View>:null}</>:null}</>:<Text style={s.note}>{gt("No repeatable source is catalogued for this item yet. It may come from a quest, event, one-time reward, or future content.")}</Text>}</Section>:null}

          {uses.length>0?<Section title={gt("USED IN CRAFTING")+(model.usedIn.length?' · '+model.usedIn.length:'')}>
            <Pressable accessibilityRole="button" accessibilityState={{expanded:craftingOpen}} accessibilityLabel={craftingOpen?gt('Hide crafting uses'):gt('Show crafting uses')} onPress={()=>setCraftingDisclosure(value=>({...value,[itemId]:!value[itemId]}))} style={({pressed})=>[s.sourceDisclosure,pressed&&s.pressed]}><Text style={s.sourceDisclosureText}>{model.usedIn.length?(craftingOpen?gt('Hide recipes'):readyUses>0?gt('{count} available recipes',{count:readyUses}):gt('Show recipes · {count}',{count:model.usedIn.length})):gt('Not currently used as a crafting ingredient.')}</Text><Text style={s.sourceDisclosureMark}>{craftingOpen?'−':'+'}</Text></Pressable>
            {craftingOpen&&<>{useRows.length?useRows.map((recipe,index)=>recipe.isRecipeUnlock
              ?<View key={recipe.recipeId} style={[s.recipeRow,s.craftingUseRow]}>
                <ItemArtwork itemId={recipe.outputItemId} size={42}/>
                <View style={s.flex}>
                  <Text style={s.bodyStrong}>{recipe.outputName}</Text>
                  <Text style={s.note}>{gl(recipe.skill)+' · '+gt('Level {value}',{value:recipe.level})}</Text>
                  {recipe.availability.status!=='ready'&&<Text style={s.availabilityDetail}>{contentText(recipe.availability.detail)}</Text>}
                </View>
                <View style={s.actionMeta}>
                  <AvailabilityPill status={recipe.availability.status} label={recipe.availability.label}/>
                  {onNavigate&&recipe.availability.canNavigate
                    ?<Pressable accessibilityRole="button" accessibilityLabel={it('Open {name}',{name:recipe.outputName})} accessibilityHint={contentText(recipe.navigation.detail)} onPress={()=>onNavigate(recipe.navigation)} style={({pressed})=>[s.craftingUseButton,pressed&&s.pressed]}><Text style={s.craftingUseButtonText}>{gt("View recipe ›")}</Text></Pressable>
                    :null}
                </View>
              </View>
              :onNavigate?<Pressable key={recipe.recipeId+':'+index} accessibilityRole="button" accessibilityLabel={it('Open {name}',{name:recipe.name})} accessibilityHint={contentText(recipe.navigation.detail)} onPress={()=>onNavigate(recipe.navigation)} style={({pressed})=>[s.recipeRow,s.actionRow,pressed&&s.pressed]}><View style={s.flex}><Text style={s.bodyStrong}>{recipe.name}</Text><Text style={s.note}>{it('{skill} Lv {level} · needs {quantity}',{skill:gl(recipe.skill),level:recipe.level,quantity:recipe.quantity})}</Text>{recipe.availability.status!=='ready'&&<Text style={s.availabilityDetail}>{contentText(recipe.availability.detail)}</Text>}</View><View style={s.actionMeta}><AvailabilityPill status={recipe.availability.status} label={recipe.availability.label}/><Text style={s.openMark}>{gt("Open ›").toLocaleUpperCase(language)}</Text></View></Pressable>
              :<View key={recipe.recipeId+':'+index} style={s.recipeRow}><View style={s.flex}><Text style={s.bodyStrong}>{recipe.name}</Text><Text style={s.note}>{it('{skill} Lv {level} · needs {quantity}',{skill:gl(recipe.skill),level:recipe.level,quantity:recipe.quantity})}</Text></View></View>)
              :<Text style={s.note}>{gt("Not currently used as a crafting ingredient.")}</Text>}
            {uses.length>0?<Text style={s.note}>{readyUses>0?gt('{count} available recipes',{count:readyUses}):gt('Check recipe requirements below.')}</Text>:null}
          {uses.length>4?<Pressable accessibilityRole="button"
           accessibilityLabel={useLimit>=uses.length?gt('Show fewer crafting uses'):gt('Show more crafting uses')}
           accessibilityState={{expanded:useLimit>4}}
           onPress={()=>setUseLimits(previous=>({...previous,[itemId]:useLimit>=uses.length?4:Math.min(uses.length,useLimit+4)}))}
           style={({pressed})=>[s.sourceDisclosure,pressed&&s.pressed]}>
            <Text style={s.sourceDisclosureText}>{useLimit>=uses.length?gt('Show fewer recipes'):gt('Show more recipes · {count}',{count:uses.length-useRows.length})}</Text>
            <Text style={s.sourceDisclosureMark}>{useLimit>=uses.length?'−':'+'}</Text>
           </Pressable>:null}</>}</Section>:null}
          </>}
          {item.type!=='tool'&&actions?<View style={s.foodActions}>{actions}</View>:null}
        </ScrollView>
        {(quickActions||disposalActions)?<View style={s.quickFooter}>
          {quickActions}
          {disposalActions?<View style={s.footerDisposal}>{disposalActions}</View>:null}
        </View>:null}
  </GameModalSurface>;
}
function Section({title,children}:{title:string;children:ReactNode}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>}
function Stat({label,value}:{label:string;value:number}){const {language}=useGameplayText();const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View style={s.bonusRow}><Text style={s.bonusLabel}>{itemDetailText(language,label)}</Text><Text style={s.baseValue}>{displayStatPrecise(value)}</Text></View>}
function DeltaStat({label,value,potential=false}:{label:string;value:number;potential?:boolean}){const {language}=useGameplayText();const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),scaled=displayStat(value),tone=scaled>0?C.good:scaled<0?C.bad:C.muted;return <View style={[s.deltaStat,potential&&s.deltaPotential]}><Text style={s.statLabel}>{itemDetailText(language,label)}</Text><Text style={[s.deltaValue,{color:tone}]}>{scaled===0?'—':(scaled>0?'+':'')+scaled}</Text></View>}
function SourceRow({source,primary=false,onNavigate}:{source:ReturnType<typeof itemInspectModel>['sources'][number];primary?:boolean;onNavigate?:(destination:WorkingTowardDestination)=>void}){
 const {gt,gl,language}=useGameplayText();
 const it=(key:keyof typeof itemDetailRows,params?:Record<string,string|number>)=>itemDetailText(language,key,params);
 const contentText=(value:string)=>itemDetailContent(language,value,gl);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),typeLabel=source.typeLabel??(source.kind==='combat'?gt("Monster Drop"):source.kind==='crafting'?gt("Crafting"):source.kind==='gathering'?gt("Gathering"):source.kind==='dungeon'?gt("Dungeon"):gt("Starting"));
 const content=<><View style={[s.sourceDot,{backgroundColor:source.kind==='combat'?C.bad:source.kind==='crafting'?C.accent:source.kind==='gathering'?C.good:C.info}]}/><View style={s.flex}><Text style={s.sourceType}>{gl(typeLabel).toLocaleUpperCase(language)}{primary?' · '+it('PRIMARY'):''}</Text><Text style={s.bodyStrong}>{source.kind==='starting'?contentText(source.title):source.title}</Text><Text style={s.note}>{contentText(source.detail)}</Text>{source.chainLabel&&!primary?<Text style={s.chainDetail}>{contentText(source.chainLabel)}</Text>:null}{source.estimateLabel?<Text style={s.sourceEstimate}>{contentText(source.estimateLabel)}</Text>:source.chainBlockedReason?<Text style={s.chainWarning}>{contentText(source.chainBlockedReason)}</Text>:null}{source.availability&&source.availability.status!=='ready'&&<Text style={s.availabilityDetail}>{contentText(source.availability.detail)}</Text>}</View>{source.navigation&&onNavigate?<View style={s.actionMeta}>{source.availability&&<AvailabilityPill status={source.availability.status} label={source.availability.label}/>}<Text style={s.openMark}>{gt("Open ›").toLocaleUpperCase(language)}</Text></View>:null}</>;
 return source.navigation&&onNavigate?<Pressable accessibilityRole="button" accessibilityLabel={it('{type} source: {name}',{type:gl(typeLabel),name:source.kind==='starting'?contentText(source.title):source.title})} accessibilityHint={contentText(source.navigation.detail)} disabled={source.availability?.canNavigate===false} onPress={()=>onNavigate(source.navigation!)} style={({pressed})=>[s.sourceRow,s.actionRow,source.availability?.canNavigate===false&&s.sourceDisabled,pressed&&source.availability?.canNavigate!==false&&s.pressed]}>{content}</Pressable>:<View style={[s.sourceRow,primary&&s.primarySource]}>{content}</View>;
}
function AvailabilityPill({status,label}:{status:'ready'|'travel'|'locked'|'info';label:string}){const {gl}=useGameplayText();const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),tone=status==='ready'?C.good:status==='travel'?C.info:status==='locked'?C.warning:C.muted,surface=status==='ready'?C.goodSurface:status==='travel'?C.infoSurface:status==='locked'?C.warningSurface:C.panel2;return <View style={[s.availabilityPill,{borderColor:tone,backgroundColor:surface}]}><Text style={[s.availabilityLabel,{color:tone}]}>{gl(label)}</Text></View>}
const art=StyleSheet.create({fallback:{width:56,height:56,borderWidth:1,borderRadius:radii.sm,alignItems:'center',justifyContent:'center'},symbol:{fontSize:30,fontWeight:'900'},fallbackText:{fontSize:8,fontWeight:'800'}});
function makeStyles(C:ThemeColors){return StyleSheet.create({
  sheet:{maxHeight:'88%',maxWidth:560,overflow:'hidden',paddingHorizontal:0,paddingTop:8,backgroundColor:C.panelRaised},
  hero:{minHeight:84,flexDirection:'row',alignItems:'center',gap:6,padding:8,borderBottomWidth:1,borderBottomColor:C.line},
  heroCompact:{flexWrap:'wrap'},
  heroControls:{alignItems:'flex-end',justifyContent:'center'},
  heroControlsCompact:{marginLeft:'auto'},
  artBox:{width:60,height:60,borderWidth:1,borderRadius:radii.md,alignItems:'center',justifyContent:'center'},
  equippedPill:{alignSelf:'flex-start',paddingHorizontal:7,paddingVertical:2,borderRadius:radii.sm,borderWidth:1,borderColor:C.good,backgroundColor:C.goodSurface},
  equippedPillText:{fontSize:9,lineHeight:13,fontWeight:'900',color:C.good},
  heroCopy:{flex:1,minWidth:0,gap:3},heroCopyCompact:{minWidth:160},rarity:{...typography.caption,fontWeight:'900',letterSpacing:.7},name:{...typography.title,fontWeight:'800'},owned:{...typography.caption,color:C.muted},
  close:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},closeText:{fontSize:24,lineHeight:27,color:C.text,fontWeight:'700'},
  scroll:{maxHeight:520,flexShrink:1,minHeight:0},content:{padding:spacing.sm,gap:spacing.sm,paddingBottom:spacing.md},
   foodActions:{gap:spacing.xs},
   footerDisposal:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.lineStrong,marginTop:spacing.sm,paddingTop:spacing.sm,gap:spacing.xs},
   disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
   disclosureText:{...typography.bodyStrong,color:C.text,flex:1},disclosureMark:{fontSize:18,fontWeight:'900',color:C.accent},
   quickFooter:{padding:spacing.sm,borderTopWidth:1,borderTopColor:C.line,backgroundColor:C.panelRaised,flexShrink:0},
  statGroup:{gap:4},
  statHeading:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.7},
  basePanel:{gap:3,paddingHorizontal:spacing.sm,paddingVertical:6,minHeight:44,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
  bonusPanel:{gap:3,paddingHorizontal:spacing.sm,paddingVertical:6,minHeight:44,justifyContent:'center',borderWidth:1,borderColor:C.good,borderRadius:radii.md,backgroundColor:C.panel2},
  bonusRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,minHeight:24},
  bonusLabel:{...typography.bodyStrong,color:C.text,flex:1},
  bonusValue:{...typography.bodyStrong,color:C.good,fontWeight:'900'},
  gearSummary:{gap:7,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
  gearSummaryHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:6},
  gearSummaryTarget:{...typography.caption,color:C.muted,flexShrink:1},
  gearSummaryMetrics:{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'},
  gearMetric:{flex:1,minWidth:100,gap:3},
  gearMetricLabel:{fontSize:10,lineHeight:14,fontWeight:'900',letterSpacing:.5,color:C.muted},
  gearMetricValue:{...typography.title,color:C.text,fontWeight:'900',fontVariant:['tabular-nums']},
  gearSummaryNote:{...typography.caption,color:C.muted,flexShrink:1},
  gearSummaryHint:{...typography.caption,color:C.warning,fontWeight:'700'},
  baseValue:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
  traitPanel:{paddingHorizontal:spacing.sm,paddingVertical:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
  traitText:{...typography.bodyStrong,color:C.text},
  section:{gap:6,paddingBottom:spacing.sm,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},sectionTitle:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
  statLabel:{...typography.caption,color:C.muted},
  compareLine:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},deltaRow:{flexDirection:'row',gap:6},deltaStat:{flex:1,minWidth:0,paddingVertical:6,paddingHorizontal:7,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},deltaPotential:{borderColor:C.info},deltaValue:{...typography.bodyStrong,fontWeight:'900'},totalLine:{...typography.caption,color:C.text,fontWeight:'700'},potentialLabel:{...typography.caption,color:C.info,fontWeight:'900'},warningText:{...typography.body,color:C.warning,fontWeight:'700'},setDecision:{gap:5,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},setName:{...typography.bodyStrong,color:C.text},setCount:{...typography.caption,color:C.accent,fontWeight:'900'},setRuntimeRow:{flexDirection:'row',alignItems:'flex-start',gap:6},setRuntimePill:{minWidth:34,textAlign:'center',fontSize:7,lineHeight:10,fontWeight:'900',borderWidth:1,borderRadius:99,paddingHorizontal:4,paddingVertical:2},setRuntimeLive:{color:C.good,borderColor:C.good,backgroundColor:C.goodSurface},setRuntimePending:{color:C.warning,borderColor:C.warning,backgroundColor:C.warningSurface},setNext:{...typography.caption,color:C.info,fontWeight:'700'},catalogNote:{fontSize:9,lineHeight:12,color:C.muted},
  body:{...typography.body,color:C.text},bodyStrong:{...typography.bodyStrong,color:C.text},note:{...typography.caption,color:C.muted},
  upgradeTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},chance:{...typography.bodyStrong,fontWeight:'900'},craftState:{fontSize:8,lineHeight:11,fontWeight:'900',letterSpacing:.5,paddingHorizontal:6,paddingVertical:4,borderWidth:1,borderRadius:99},craftReady:{color:C.good,borderColor:C.good,backgroundColor:C.goodSurface},craftBlocked:{color:C.warning,borderColor:C.warning,backgroundColor:C.warningSurface},sectionMini:{fontSize:8,lineHeight:11,color:C.muted,fontWeight:'900',letterSpacing:.7,marginTop:4},blockerRow:{gap:2,paddingVertical:4},materialReadyRow:{minHeight:38,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:4},materialReady:{...typography.caption,color:C.good,fontWeight:'900'},materialMissing:{...typography.caption,color:C.warning,fontWeight:'900'},
  sourceRow:{flexDirection:'row',alignItems:'flex-start',gap:8},primarySource:{borderColor:C.info},sourceDisabled:{opacity:.55},sourceType:{fontSize:8,lineHeight:11,color:C.info,fontWeight:'900',letterSpacing:.55},chainDetail:{fontSize:9,lineHeight:12,color:C.text,fontWeight:'700'},chainWarning:{fontSize:9,lineHeight:12,color:C.warning,fontWeight:'800'},sourceEstimate:{fontSize:9,lineHeight:12,color:C.info,fontWeight:'900'},sourceDot:{width:8,height:8,borderRadius:99,marginTop:6},sourceDisclosure:{minHeight:38,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},sourceDisclosureText:{...typography.caption,color:C.info,fontWeight:'900'},sourceDisclosureMark:{fontSize:16,lineHeight:18,color:C.info,fontWeight:'900'},otherSourceList:{gap:6,paddingLeft:8,borderLeftWidth:2,borderLeftColor:C.info},recipeRow:{paddingVertical:2},craftingUseRow:{flexDirection:'row',alignItems:'center',gap:8,minHeight:62,borderWidth:1,borderRadius:radii.sm,borderColor:C.line,backgroundColor:C.panel2,padding:8},craftingUseButton:{minHeight:38,justifyContent:'center',paddingHorizontal:9,borderWidth:1,borderColor:C.selectionLine,borderRadius:radii.sm,backgroundColor:C.selection},craftingUseButtonText:{fontSize:11,color:C.text,fontWeight:'900'},actionRow:{minHeight:44,alignItems:'center',paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},actionMeta:{alignItems:'flex-end',justifyContent:'center',gap:4},openMark:{...typography.caption,color:C.info,fontWeight:'900'},availabilityPill:{minHeight:20,justifyContent:'center',paddingHorizontal:6,borderWidth:1,borderRadius:99},availabilityLabel:{fontSize:9,lineHeight:12,fontWeight:'900',letterSpacing:.5},availabilityDetail:{...typography.caption,color:C.warning,fontWeight:'700'},
  footerRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8,paddingHorizontal:2},sell:{...typography.caption,color:C.muted},classText:{...typography.caption,color:C.info,fontWeight:'800'},
  flex:{flex:1,minWidth:0},pressed:{opacity:.72},
});}
