import {useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {combatCompanionDef} from '../content/combat-companions';
import {eventBondCandyMaterialUses,EVENT_BOND_CANDY_MATERIAL_CAP} from '../core/live-events';
import type {GameState} from '../core/types';
import {companionArtSource} from '../theme/companion-art';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,radii} from '../theme/theme';
import {companionRarityBorder} from './CompanionPresentation';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {ResourceIcon} from './ResourceIcon';

/** Compact account-owned companion picker. Bonus materials are capped per companion/event;
 * the same candy can still grant Companion XP after that companion fills all five slots. */
export function EventBondCandySelector({
 state,eventId,ownedCharges,active,busy,onUse,
}:{
 state:GameState;eventId:string;ownedCharges:number;active:boolean;busy:boolean;
 onUse:(companionId:string)=>unknown;
}){
 const C=useGameTheme(),[open,setOpen]=useState(false),[selectedId,setSelectedId]=useState<string|undefined>();
 const {height}=useWindowDimensions();
 const ownedIds=(state.account.unlockedCombatCompanionIds??[]).filter(id=>!!combatCompanionDef(id));
 const equipped=state.character?.equippedCombatCompanionId;
 const targetId=selectedId&&ownedIds.includes(selectedId)?selectedId:equipped&&ownedIds.includes(equipped)?equipped:ownedIds[0];
 const target=targetId?combatCompanionDef(targetId):undefined;
 const used=targetId?eventBondCandyMaterialUses(state,eventId,targetId):0;
 const bonusAvailable=used<EVENT_BOND_CANDY_MATERIAL_CAP;
 const canUse=!!targetId&&active&&ownedCharges>0&&!busy;
 const choose=()=>{if(ownedIds.length)setOpen(true);};
 const confirm=()=>{if(!canUse||!targetId)return;setOpen(false);onUse(targetId);};
 return <>
  <View style={s.inline}>
   <Text style={[s.helper,{color:C.muted}]}>75 Companion XP per candy. First 5 uses on each companion also grant 1 Bondbloom.</Text>
   {target?<Text style={[s.helper,{color:C.text}]}>{target.name} · Bondbloom {used}/{EVENT_BOND_CANDY_MATERIAL_CAP}{bonusAvailable?'':' · XP only'}</Text>:<Text style={[s.helper,{color:C.muted}]}>Own a companion to use Bond Candy.</Text>}
   <GameButton compact title={ownedIds.length?'Choose companion':'No companion owned'} tone="secondary" disabled={!ownedIds.length||busy||!active||ownedCharges<1} onPress={choose}/>
  </View>
  <GameModalSurface visible={open} onClose={()=>setOpen(false)} surfaceStyle={{maxHeight:Math.min(height*.86,670)}}>
   <GameModalHeader eyebrow="EVENT BOND CANDY" title="Choose companion" onClose={()=>setOpen(false)} closeDisabled={busy}/>
   <Text style={[s.helper,{color:C.muted}]}>Every use gives +75 Companion XP. Each companion can earn 5 bonus Bondbloom per event.</Text>
   <ScrollView style={s.scroll} contentContainerStyle={s.list} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    {ownedIds.map(id=>{
     const def=combatCompanionDef(id);if(!def)return null;
     const count=eventBondCandyMaterialUses(state,eventId,id),isSelected=id===targetId,art=companionArtSource(id),filled=count>=EVENT_BOND_CANDY_MATERIAL_CAP;
     return <Pressable key={id} accessibilityRole="radio" accessibilityState={{selected:isSelected}} accessibilityLabel={def.name+', Bondbloom '+count+' of '+EVENT_BOND_CANDY_MATERIAL_CAP} onPress={()=>setSelectedId(id)} style={[s.choice,{borderColor:isSelected?C.accent:companionRarityBorder(def.rarity,C.dark),backgroundColor:isSelected?C.accentSurface:C.panel2}]}>
      {art?<Image source={art} resizeMode="contain" style={s.portrait}/>:<View style={[s.portrait,s.portraitFallback,{backgroundColor:C.panelRaised}]}><Text style={{color:C.accent,fontSize:24}}>✦</Text></View>}
      <View style={s.choiceInfo}>
       <Text numberOfLines={1} style={[s.name,{color:C.text}]}>{def.name}</Text>
       <Text style={[s.meta,{color:C.muted}]}>{def.role.toUpperCase()} · {filled?'XP only':'Bondbloom '+count+'/5'}</Text>
       <View style={s.progress}>{Array.from({length:EVENT_BOND_CANDY_MATERIAL_CAP},(_,index)=><View key={index} style={[s.progressSlot,{backgroundColor:index<count?C.good:C.lineStrong}]}/>)}</View>
      </View>
      <View style={[s.radio,{borderColor:isSelected?C.accent:C.lineStrong,backgroundColor:isSelected?C.accent:C.panel}]}>{isSelected?<Text style={{color:C.bg,fontSize:12,fontWeight:'900'}}>✓</Text>:null}</View>
     </Pressable>;
    })}
   </ScrollView>
   <View style={[s.footer,{borderTopColor:C.line}]}>
    <View style={s.reward}>
     <Text style={[s.name,{color:C.text}]}>{target?.name??'No companion'}</Text>
     <Text style={[s.meta,{color:C.muted}]}>+75 XP{bonusAvailable?' + 1 Bondbloom':' · Bondbloom bonus complete'}</Text>
    </View>
    {bonusAvailable?<ResourceIcon resourceId="EVENT_BONDBLOOM"/>:null}
    <GameButton title={busy?'Using…':'Use 1 candy'} loading={busy} disabled={!canUse} onPress={confirm}/>
   </View>
  </GameModalSurface>
 </>;
}

const s=StyleSheet.create({
 inline:{gap:7},
 helper:{...typography.caption,lineHeight:18},
 scroll:{flexGrow:0,maxHeight:370,marginTop:10},
 list:{gap:7,paddingBottom:6},
 choice:{flexDirection:'row',minHeight:74,alignItems:'center',gap:10,padding:9,borderWidth:1,borderRadius:radii.md},
 portrait:{width:52,height:52},
 portraitFallback:{alignItems:'center',justifyContent:'center',borderRadius:radii.sm},
 choiceInfo:{flex:1,minWidth:0,gap:3},
 name:{...typography.bodyStrong},
 meta:{fontSize:11,lineHeight:15,fontWeight:'600'},
 progress:{flexDirection:'row',gap:4,marginTop:3},
 progressSlot:{height:5,flex:1,borderRadius:4},
 radio:{width:22,height:22,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},
 footer:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10,paddingTop:spacing.sm,paddingBottom:spacing.md,borderTopWidth:1},
 reward:{flex:1,minWidth:150,gap:3},
});
