import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {gemPouch,gemPouchUpgradePreview} from '../core/gem-pouch';
import {availableGemRefinementsV1,canonicalGemMetaV1} from '../core/gem-progression-v1';
import {GEM_GRADE_LABEL_V1,GEM_GRADE_RARITY_V1,mobileGemFamilyV1,parseMobileRawGemItemIdV1} from '../content/gems-v1';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import type {GameCommand} from '../core/game-commands';
import {itemDef} from '../content/items';
import {localizedItemName} from '../i18n/starter-item-names';
import {gemPouchText} from '../i18n/gem-pouch-ui';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {ItemArtwork} from './ItemArtwork';
import {GameButton} from './GameButton';
import {ConfirmModal} from './ConfirmModal';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';

const PAGE_SIZE=30;
/** Compact, account-wide storage drawer. Empty slots are intentional and never consume normal inventory. */
export function GemPouchPanel({state,busy=false,standalone=false,onUpgrade,onAction,onFavorite,onLock}:{state:GameState;busy?:boolean;standalone?:boolean;onUpgrade?:()=>void|Promise<unknown>;onAction?:(command:GameCommand)=>void|Promise<unknown>;onFavorite?:(itemId:string)=>void|Promise<unknown>;onLock?:(itemId:string)=>void|Promise<unknown>}){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  const language=useGameLanguage();
  const p=(source:string,params?:Record<string,string|number>)=>gemPouchText(language,source,params);
  const [drawerOpen,setDrawerOpen]=useState(false),[page,setPage]=useState(0),[selected,setSelected]=useState<string|null>(null);
  const [gridWidth,setGridWidth]=useState(300);
  const expanded=standalone||drawerOpen;
  const columns=gridWidth>=600?8:gridWidth>=440?6:gridWidth>=345?5:4;
  const slotWidth=Math.max(54,Math.floor((gridWidth-(columns-1)*5)/columns));
  const [pendingSell,setPendingSell]=useState<{itemId:string;quantity:number}|null>(null),[pendingDismantle,setPendingDismantle]=useState<string|null>(null);
  const pouch=gemPouch(state),used=pouch.stacks.length,upgrade=gemPouchUpgradePreview(state);
  const pages=Math.ceil(pouch.capacity/PAGE_SIZE),shownPage=Math.min(page,pages-1),start=shownPage*PAGE_SIZE;
  const entries=Array.from({length:Math.min(PAGE_SIZE,pouch.capacity-start)},(_,index)=>pouch.stacks[start+index]);
  const selectedStack=pouch.stacks.find(stack=>stack.itemId===selected);
  const selectedItem=selectedStack?itemDef(selectedStack.itemId):undefined;
  const selectedMeta=selectedStack?canonicalGemMetaV1(selectedStack.itemId):undefined;
  const selectedRaw=selectedStack?parseMobileRawGemItemIdV1(selectedStack.itemId):undefined;
  const grade=selectedMeta?.grade??selectedRaw?.grade;
  const family=mobileGemFamilyV1(selectedMeta?.familyId??selectedRaw?.familyId??'');
  const refinement=selectedRaw?availableGemRefinementsV1(state).find(row=>row.recipe.familyId===selectedRaw.familyId&&row.recipe.grade===selectedRaw.grade):undefined;
  const selectedRarity=selectedItem?rarityMeta(grade?GEM_GRADE_RARITY_V1[grade]:itemRarity(selectedItem)):undefined;
  const favorite=!!selectedStack&&!!state.settings.favoriteItemIds?.includes(selectedStack.itemId),locked=!!selectedStack&&!!state.settings.lockedItemIds?.includes(selectedStack.itemId);
  const protectedGem=favorite||locked;
  const canUpgrade=!!upgrade&&(state.character?.level??0)>=upgrade.level&&(state.character?.gold??0)>=upgrade.cost&&!busy;
  return <View style={s.container}>
    <Pressable accessible={!standalone} accessibilityRole={standalone?undefined:'button'} accessibilityLabel={standalone?undefined:p(expanded?'Collapse Gem Pouch':'Expand Gem Pouch')} accessibilityState={standalone?undefined:{expanded}} disabled={standalone} onPress={()=>setDrawerOpen(value=>!value)} style={s.heading}>
      <View style={s.flex}><Text accessibilityRole={standalone?'header':undefined} style={s.title}>{p('Gem Pouch')}</Text><Text style={s.meta}>{p('{used}/{capacity} slots · Shared across characters',{used,capacity:pouch.capacity})}</Text></View>
      {!standalone?<Text style={s.chevron}>{expanded?'−':'+'}</Text>:null}
    </Pressable>
    {expanded?<View style={s.body}>
      <Text style={s.hint}>{p('Tap a gem to inspect or manage it. Shared across characters; socketing and Enchanting use stored gems automatically.')}</Text>
      <View style={s.grid} onLayout={event=>{const width=Math.floor(event.nativeEvent.layout.width);setGridWidth(previous=>previous===width?previous:width)}}>{entries.map((stack,index)=><Pressable key={stack?.itemId??'empty-'+(start+index)} accessibilityRole="button" accessibilityLabel={stack?p('{name}, {count} owned. Tap for details and actions',{name:localizedItemName(language,stack.itemId),count:stack.quantity}):p('Empty Gem Pouch slot')} accessibilityHint={stack?p('Opens gem details and actions'):undefined} accessibilityState={stack?{selected:stack.itemId===selected}:undefined} disabled={!stack} onPress={()=>setSelected(stack?.itemId??null)} style={[s.slot,{width:slotWidth,minHeight:Math.max(slotWidth,62)},stack&&s.filled,stack?.itemId===selected&&s.selected,stack&&{borderColor:rarityMeta(canonicalGemMetaV1(stack.itemId)?.grade?GEM_GRADE_RARITY_V1[canonicalGemMetaV1(stack.itemId)!.grade]:itemRarity(itemDef(stack.itemId))).color}]}>
        {stack?<><ItemArtwork itemId={stack.itemId} size={Math.min(42,slotWidth-12)}/><Text numberOfLines={1} style={s.quantity}>×{stack.quantity}</Text></>:<Text style={s.emptyMark}>·</Text>}
      </Pressable>)}</View>
      {pages>1?<View style={s.paging}><GameButton compact tone="secondary" title={p('Previous')} disabled={shownPage===0} onPress={()=>{setSelected(null);setPage(p=>Math.max(0,p-1))}}/><Text style={s.meta}>{shownPage+1}/{pages}</Text><GameButton compact tone="secondary" title={p('Next')} disabled={shownPage===pages-1} onPress={()=>{setSelected(null);setPage(p=>Math.min(pages-1,p+1))}}/></View>:null}
      <View style={s.upgrade}><View style={s.flex}><Text style={s.itemName}>{upgrade?p('Next: {count} slots',{count:upgrade.capacity}):p('Maximum capacity reached')}</Text>{upgrade?<Text style={s.meta}>{p('Level {level} · {gold} Gold',{level:upgrade.level,gold:upgrade.cost.toLocaleString(language)})}{!canUpgrade?p(' · Requires level and Gold'):''}</Text>:null}</View>
        <GameButton compact tone="secondary" title={p(upgrade?'Upgrade':'Maxed')} disabled={!canUpgrade||!onUpgrade} onPress={()=>onUpgrade?.()}/></View>
    </View>:null}
    <GameModalSurface visible={!!selectedStack} reduceMotion={state.settings.reduceMotion} onClose={()=>setSelected(null)}
      backdropLabel={p('Close Gem Pouch item details')} surfaceStyle={s.sheet}>
      <GameModalHeader eyebrow={p('GEM POUCH · ACCOUNT STORAGE')} title={selectedItem?localizedItemName(language,selectedItem.id):p('Gem details')} onClose={()=>setSelected(null)}/>
      {selectedStack&&selectedItem?<ScrollView style={s.sheetScroll} contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
        <View style={s.gemHero}>
          <View style={[s.largeArt,{borderColor:selectedRarity?.color??C.lineStrong}]}><ItemArtwork itemId={selectedStack.itemId} size={76}/></View>
          <View style={s.flex}>
            <Text style={[s.gemGrade,{color:selectedRarity?.color??C.accent}]}>{p(selectedRaw?'UNREFINED':selectedMeta?.kind==='stat'?'STAT GEM':selectedMeta?.kind==='effect'?'EFFECT GEM':'GEM')}{grade?' · G'+grade:''}</Text>
            <Text style={s.itemName}>{family?.name??localizedItemName(language,selectedItem.id)}{grade?' · '+(selectedRaw?p('Raw'):GEM_GRADE_LABEL_V1[grade]):''}</Text>
            <Text style={s.meta}>{p('{count} in Gem Pouch · Account-wide',{count:selectedStack.quantity})}</Text>
          </View>
        </View>
        <View style={s.detail}>
          <Text style={s.itemName}>{p('What it does')}</Text>
          <Text style={s.meta}>{family?.description??selectedItem.passive??p('Gem material.')}</Text>
          {selectedRaw?<Text style={s.meta}>{p('Unrefined gems are materials, not socketable. Refine them using Enchanting first.')}</Text>:null}
          {protectedGem?<Text style={[s.meta,{color:C.warning}]}>{p('★ Protected: remove Favorite and Lock before selling or dismantling.')}</Text>:null}
        </View>
        <Text style={s.actionTitle}>{p('ACTIONS')}</Text>
        <View style={s.actions}>
          <GameButton compact tone="secondary" title={p(favorite?'★ Favorited':'☆ Favorite')} disabled={!onFavorite||busy} onPress={()=>onFavorite?.(selectedStack.itemId)}/>
          <GameButton compact tone="secondary" title={p(locked?'Unlock':'Lock')} disabled={!onLock||busy} onPress={()=>onLock?.(selectedStack.itemId)}/>
        </View>
        {selectedRaw&&refinement?<View style={s.refinement}>
          <Text style={s.itemName}>{p('Enchanting · Grade {grade}',{grade:selectedRaw.grade})}</Text>
          <Text style={s.meta}>{p('Requires Lv {level} · {gold} Gold · {materials}',{level:refinement.recipe.level,gold:refinement.recipe.gold.toLocaleString(language),materials:refinement.recipe.inputs.map(input=>input.quantity+'× '+localizedItemName(language,input.itemId)).join(', ')})}</Text>
          <GameButton compact title={p(refinement.ready?'Refine 1 gem':'Refinement unavailable')} disabled={!onAction||busy||!refinement.ready} onPress={()=>{setSelected(null);return onAction?.({type:'gem_refine',args:{familyId:selectedRaw.familyId,grade:selectedRaw.grade}})}}/>
        </View>:null}
        <View style={s.actions}>
          <GameButton compact tone="secondary" title={p('Sell 1')} disabled={!onAction||busy||protectedGem||selectedItem.value<=0} onPress={()=>{setSelected(null);setPendingSell({itemId:selectedStack.itemId,quantity:1})}}/>
          <GameButton compact tone="secondary" title={p('Sell all')} disabled={!onAction||busy||protectedGem||selectedItem.value<=0} onPress={()=>{setSelected(null);setPendingSell({itemId:selectedStack.itemId,quantity:selectedStack.quantity})}}/>
          {selectedMeta?<GameButton compact tone="secondary" title={p('Dismantle 1')} disabled={!onAction||busy||protectedGem} onPress={()=>{setSelected(null);setPendingDismantle(selectedStack.itemId)}}/>:null}
        </View>
        <Text style={s.meta}>{p('Gems remain available for equipment socketing and crafting directly from shared storage.')}</Text>
      </ScrollView>:null}
    </GameModalSurface>
    <ConfirmModal visible={!!pendingSell} title={p('Sell gems from Gem Pouch?')} message={pendingSell?p('{count}× {name} · {gold} Gold. This cannot be undone.',{count:pendingSell.quantity,name:localizedItemName(language,pendingSell.itemId),gold:(pendingSell.quantity*itemDef(pendingSell.itemId).value).toLocaleString(language)}):''} confirmLabel={p('Sell gems')} danger reduceMotion={state.settings.reduceMotion} onConfirm={()=>{const pending=pendingSell;setPendingSell(null);if(pending)void onAction?.({type:'gem_pouch_sell',args:pending})}} onCancel={()=>setPendingSell(null)}/>
    <ConfirmModal visible={!!pendingDismantle} title={p('Dismantle this gem?')} message={pendingDismantle?p('Convert 1× {name} into Gem Dust? This cannot be undone.',{name:localizedItemName(language,pendingDismantle)}):''} confirmLabel={p('Dismantle')} danger reduceMotion={state.settings.reduceMotion} onConfirm={()=>{const id=pendingDismantle;setPendingDismantle(null);if(id)void onAction?.({type:'gem_dismantle',args:{gemId:id,quantity:1}})}} onCancel={()=>setPendingDismantle(null)}/>
  </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 container:{borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,overflow:'hidden'},
 heading:{minHeight:58,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,flexDirection:'row',alignItems:'center',gap:12},
 flex:{flex:1,minWidth:0},title:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted},chevron:{fontSize:22,color:C.accent,fontWeight:'800'},
 body:{gap:spacing.sm,padding:spacing.sm,borderTopWidth:1,borderTopColor:C.line},
 hint:{...typography.caption,color:C.muted,paddingHorizontal:4},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:5,justifyContent:'flex-start'},
 slot:{minHeight:66,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.bg,padding:2},
 filled:{borderColor:C.lineStrong,backgroundColor:C.panel2},selected:{borderColor:C.accent},
 quantity:{...typography.caption,color:C.text,fontWeight:'800'},emptyMark:{fontSize:16,color:C.muted,opacity:.45},
 sheet:{maxWidth:640,maxHeight:'88%'},sheetScroll:{flexShrink:1},sheetBody:{gap:spacing.md,paddingBottom:spacing.md},
 gemHero:{flexDirection:'row',alignItems:'center',gap:spacing.md},
 largeArt:{width:84,height:84,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:12,backgroundColor:C.panel2},
 gemGrade:{...typography.caption,fontWeight:'900'},detail:{padding:spacing.md,gap:spacing.xs,borderRadius:10,backgroundColor:C.panel2},
 actionTitle:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.6},
 refinement:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:10},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:6},itemName:{...typography.bodyStrong,color:C.text},
 paging:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 upgrade:{flexDirection:'row',alignItems:'center',gap:10,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line}
 });}
