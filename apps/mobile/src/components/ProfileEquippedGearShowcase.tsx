import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {profileT,profileText} from '../i18n/profile';
import {localizedItemName} from '../i18n/starter-item-names';
import {ITEMS,type ItemDef} from '../content/items';
import type {GearSlot} from '../core/types';
import {PROFILE_GEAR_SLOTS,type ProfileEquippedGear} from '../core/profile-equipped-gear';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {radii,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EquipmentArtwork} from './EquipmentArtwork';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

const byItemId=new Map(ITEMS.map(item=>[item.id,item]));
const slotLabels:Record<GearSlot,string>={
 helmet:'Helmet',chest:'Chest',gloves:'Gloves',legs:'Legs',boots:'Boots',
 weapon:'Weapon',offhand:'Offhand',cape:'Cape',amulet:'Amulet',ring:'Ring',
};

function GearIcon({item,rarity}:{item?:ItemDef;rarity?:ProfileEquippedGear['rarity']}){
 const C=useGameTheme();
 return item?<EquipmentArtwork item={item} rarity={rarity??itemRarity(item)} size={39} framed={false}/>:
 <View style={[icon.empty,{borderColor:C.line}]}><Text style={[icon.emptyMark,{color:C.disabled}]}>◇</Text></View>;
}
const icon=StyleSheet.create({
 empty:{width:39,height:39,alignItems:'center',justifyContent:'center',borderWidth:1,borderStyle:'dashed',borderRadius:5},
 emptyMark:{fontSize:21,fontWeight:'700'},
});

/** Read-only loadout. Unlike Inventory inspection, this never exposes private possessions or actions. */
export function ProfileEquippedGearShowcase({gear}:{gear:ProfileEquippedGear[]}){
 const language=useGameLanguage(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [selectedSlot,setSelectedSlot]=useState<GearSlot|null>(null);
 const equipped=new Map(gear.map(row=>[row.slot,row]));
 const selected=selectedSlot?equipped.get(selectedSlot):undefined;
 const item=selected?byItemId.get(selected.itemId):undefined;
 const rarity=item?rarityMeta(selected?.rarity??itemRarity(item)):undefined;
 const statGem=selected?.statGemId?byItemId.get(selected.statGemId):undefined;
 const effectGem=selected?.effectGemId?byItemId.get(selected.effectGemId):undefined;
 return <View style={s.block}>
  <View style={s.heading}>
   <View style={s.flex}><Text style={s.title}>{profileT(language,'EQUIPPED GEAR')}</Text><Text style={s.caption}>{profileT(language,'Tap an equipped item to inspect')}</Text></View>
   <View style={s.pill}><Text style={s.count}>{profileT(language,'{count}/10 equipped',{count:gear.length})}</Text></View>
  </View>
  <View style={s.grid}>{PROFILE_GEAR_SLOTS.map(slot=>{
   const entry=equipped.get(slot),def=entry?byItemId.get(entry.itemId):undefined;
   const meta=def?rarityMeta(entry?.rarity??itemRarity(def)):undefined;
   return <Pressable key={slot} accessibilityRole={entry?'button':'text'} accessibilityLabel={entry?(profileText(language,slotLabels[slot])+': '+(def?localizedItemName(language,def.id):entry.itemId)):profileText(language,slotLabels[slot])+': '+profileT(language,'Empty')} disabled={!entry} onPress={()=>setSelectedSlot(slot)} style={({pressed})=>[s.slot,meta&&{borderColor:meta.color,backgroundColor:meta.surface},pressed&&s.pressed]}>
    <Text numberOfLines={1} style={s.slotName}>{profileText(language,slotLabels[slot])}</Text>
    <GearIcon item={def} rarity={entry?.rarity}/>
    {entry?.rank? <View style={s.rank}><Text style={s.rankText}>+{entry.rank}</Text></View>:null}
    {entry&&(entry.statGemId||entry.effectGemId)?<View style={s.gems}><Text style={s.gemText}>{entry.statGemId?'S':''}{entry.effectGemId?'E':''}</Text></View>:null}
   </Pressable>;
  })}</View>
  {!gear.length?<Text style={s.emptyText}>{profileT(language,'No equipment equipped yet')}</Text>:null}
  <GameModalSurface visible={!!selected} onClose={()=>setSelectedSlot(null)} presentation="dialog" surfaceStyle={s.detail}>
   <GameModalHeader eyebrow={profileT(language,'EQUIPPED GEAR')} title={item?localizedItemName(language,item.id):profileT(language,'Equipment')} onClose={()=>setSelectedSlot(null)}/>
   {selected?<View style={s.inspect}>
    <GearIcon item={item} rarity={selected.rarity}/>
    <View style={s.inspectCopy}>
     <Text style={s.detailSlot}>{profileText(language,slotLabels[selected.slot])}</Text>
     {rarity?<Text style={[s.rarity,{color:rarity.color}]}>{profileText(language,rarity.label)}</Text>:null}
     {selected.quality!==undefined?<Text style={s.detailLine}>{profileT(language,'Quality {quality}',{quality:selected.quality})}</Text>:null}
     {selected.rank?<Text style={s.detailLine}>{profileT(language,'Enhancement +{rank}',{rank:selected.rank})}</Text>:null}
     {statGem?<Text style={s.detailLine}>{profileT(language,'Stat gem')}: {localizedItemName(language,statGem.id)}</Text>:null}
     {effectGem?<Text style={s.detailLine}>{profileT(language,'Effect gem')}: {localizedItemName(language,effectGem.id)}</Text>:null}
    </View>
   </View>:null}
  </GameModalSurface>
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 block:{gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 heading:{flexDirection:'row',alignItems:'center',gap:6},
 flex:{flex:1,minWidth:0},
 title:{fontSize:11,fontWeight:'900',letterSpacing:.7,color:C.accent},
 caption:{fontSize:9,color:C.muted,marginTop:1},
 pill:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},
 count:{fontSize:9,color:C.text,fontWeight:'800'},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:4},
 slot:{width:'18.4%',minHeight:70,alignItems:'center',justifyContent:'center',gap:5,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel,paddingHorizontal:2,paddingVertical:5,position:'relative'},
 slotName:{fontSize:8,fontWeight:'800',color:C.muted,textAlign:'center'},
 rank:{position:'absolute',top:23,right:0,paddingHorizontal:3,backgroundColor:C.bg,borderRadius:4,borderWidth:1,borderColor:C.lineStrong},
 rankText:{fontSize:8,fontWeight:'900',color:C.accent},
 gems:{position:'absolute',bottom:3,right:2,paddingHorizontal:2,backgroundColor:C.bg,borderRadius:3},
 gemText:{fontSize:7,fontWeight:'900',color:C.info},
 pressed:{opacity:.72},
 emptyText:{fontSize:9,color:C.muted,textAlign:'center'},
 detail:{gap:8},
 inspect:{flexDirection:'row',gap:12,alignItems:'flex-start',padding:4},
 inspectCopy:{flex:1,minWidth:0,gap:5},
 detailSlot:{fontSize:10,color:C.muted,fontWeight:'900'},
 rarity:{fontSize:12,fontWeight:'900'},
 detailLine:{fontSize:11,color:C.text},
 });}
