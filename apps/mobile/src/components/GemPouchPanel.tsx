import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {gemPouch,gemPouchUpgradePreview} from '../core/gem-pouch';
import {itemDef} from '../content/items';
import {ItemArtwork} from './ItemArtwork';
import {GameButton} from './GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';

const PAGE_SIZE=30;
/** Compact, account-wide storage drawer. Empty slots are intentional and never consume normal inventory. */
export function GemPouchPanel({state,busy=false,onUpgrade}:{state:GameState;busy?:boolean;onUpgrade?:()=>void|Promise<unknown>}){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  const [expanded,setExpanded]=useState(false),[page,setPage]=useState(0),[selected,setSelected]=useState<string|null>(null);
  const pouch=gemPouch(state),used=pouch.stacks.length,upgrade=gemPouchUpgradePreview(state);
  const pages=Math.ceil(pouch.capacity/PAGE_SIZE),shownPage=Math.min(page,pages-1),start=shownPage*PAGE_SIZE;
  const entries=Array.from({length:Math.min(PAGE_SIZE,pouch.capacity-start)},(_,index)=>pouch.stacks[start+index]);
  const selectedStack=pouch.stacks.find(stack=>stack.itemId===selected);
  const canUpgrade=!!upgrade&&(state.character?.level??0)>=upgrade.level&&(state.character?.gold??0)>=upgrade.cost&&!busy;
  return <View style={s.container}>
    <Pressable accessibilityRole="button" accessibilityLabel="Open Gem Pouch" accessibilityState={{expanded}} onPress={()=>setExpanded(value=>!value)} style={s.heading}>
      <View style={s.flex}><Text style={s.title}>💎 Gem Pouch</Text><Text style={s.meta}>{used}/{pouch.capacity} slots · Shared across characters</Text></View>
      <Text style={s.chevron}>{expanded?'−':'+'}</Text>
    </Pressable>
    {expanded?<View style={s.body}>
      <Text style={s.hint}>Gems and unrefined gems stack by type and grade. Socketing and Enchanting use this pouch automatically.</Text>
      <View style={s.grid}>{entries.map((stack,index)=><Pressable key={stack?.itemId??'empty-'+(start+index)} accessibilityRole="button" accessibilityLabel={stack?itemDef(stack.itemId).name+', '+stack.quantity+' owned':'Empty Gem Pouch slot'} disabled={!stack} onPress={()=>setSelected(stack?.itemId??null)} style={[s.slot,stack&&s.filled,stack?.itemId===selected&&s.selected]}>
        {stack?<><ItemArtwork itemId={stack.itemId} size={42}/><Text numberOfLines={1} style={s.quantity}>×{stack.quantity}</Text></>:<Text style={s.emptyMark}>·</Text>}
      </Pressable>)}</View>
      {selectedStack?<View style={s.info}><Text style={s.itemName}>{itemDef(selectedStack.itemId).name}</Text><Text style={s.meta}>{selectedStack.quantity} owned · Available for socketing or Enchanting</Text></View>:null}
      {pages>1?<View style={s.paging}><GameButton compact tone="secondary" title="Previous" disabled={shownPage===0} onPress={()=>{setSelected(null);setPage(p=>Math.max(0,p-1))}}/><Text style={s.meta}>{shownPage+1}/{pages}</Text><GameButton compact tone="secondary" title="Next" disabled={shownPage===pages-1} onPress={()=>{setSelected(null);setPage(p=>Math.min(pages-1,p+1))}}/></View>:null}
      <View style={s.upgrade}><View style={s.flex}><Text style={s.itemName}>{upgrade?'Next: '+upgrade.capacity+' slots':'Maximum capacity reached'}</Text>{upgrade?<Text style={s.meta}>Level {upgrade.level} · {upgrade.cost.toLocaleString()} Gold</Text>:null}</View>
        <GameButton compact tone="secondary" title={upgrade?'Upgrade':'Maxed'} disabled={!canUpgrade||!onUpgrade} onPress={()=>void onUpgrade?.()}/></View>
    </View>:null}
  </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 container:{borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,overflow:'hidden'},
 heading:{minHeight:58,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,flexDirection:'row',alignItems:'center',gap:12},
 flex:{flex:1,minWidth:0},title:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted},chevron:{fontSize:22,color:C.accent,fontWeight:'800'},
 body:{gap:spacing.sm,padding:spacing.sm,borderTopWidth:1,borderTopColor:C.line},
 hint:{...typography.caption,color:C.muted,paddingHorizontal:4},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:5,justifyContent:'flex-start'},
 slot:{width:'18.9%',minHeight:66,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.bg,padding:2},
 filled:{borderColor:C.lineStrong,backgroundColor:C.panel2},selected:{borderColor:C.accent},
 quantity:{...typography.caption,color:C.text,fontWeight:'800'},emptyMark:{fontSize:16,color:C.muted,opacity:.45},
 info:{padding:spacing.sm,backgroundColor:C.panel2,borderRadius:8},itemName:{...typography.bodyStrong,color:C.text},
 paging:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 upgrade:{flexDirection:'row',alignItems:'center',gap:10,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line}
 });}
