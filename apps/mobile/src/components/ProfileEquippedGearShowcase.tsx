import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {profileT,profileText} from '../i18n/profile';
import {localizedItemName} from '../i18n/starter-item-names';
import {ITEMS,type ItemDef} from '../content/items';
import {displayStat} from '../core/stat-display';
import type {GearSlot} from '../core/types';
import {PROFILE_GEAR_SLOTS,profileGearColumnCount,type ProfileEquippedGear} from '../core/profile-equipped-gear';
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

function GearIcon({item,rarity,unknown=false}:{item?:ItemDef;rarity?:ProfileEquippedGear['rarity'];unknown?:boolean}){
 const C=useGameTheme();
 return item?<EquipmentArtwork item={item} rarity={rarity??itemRarity(item)} size={38} framed={false}/>:
 <View style={[icon.empty,{borderColor:C.line,backgroundColor:unknown?C.warningSurface:'transparent'}]}>
  <Text style={[icon.emptyMark,{color:unknown?C.warning:C.disabled}]}>{unknown?'?':'◇'}</Text>
 </View>;
}
const icon=StyleSheet.create({
 empty:{width:38,height:38,alignItems:'center',justifyContent:'center',borderWidth:1,borderStyle:'dashed',borderRadius:5},
 emptyMark:{fontSize:20,lineHeight:25,fontWeight:'700'},
});

function DetailStat({label,value}:{label:string;value:number}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={s.stat}><Text style={s.statLabel}>{label}</Text><Text style={s.statValue}>{displayStat(value).toLocaleString()}</Text></View>;
}

/** Read-only equipment inspection. Never exposes inventory, ownership identifiers or gear actions. */
export function ProfileEquippedGearShowcase({gear,reduceMotion=false}:{gear:ProfileEquippedGear[];reduceMotion?:boolean}){
 const language=useGameLanguage(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {width,fontScale}=useWindowDimensions();
 const [panelWidth,setPanelWidth]=useState(0);
 const [selectedSlot,setSelectedSlot]=useState<GearSlot|null>(null);
 // Use the measured panel rather than device width: this also works in narrow chat sheets.
 const availableWidth=panelWidth||width-54;
 const columns=profileGearColumnCount(availableWidth,fontScale);
 const tileWidth=columns===5?'18.5%':columns===4?'23.8%':'31.5%';
 const equipped=useMemo(()=>new Map(gear.map(row=>[row.slot,row])),[gear]);
 // Close stale inspection if the viewed player's gear or equipped copy changes.
 const signature=gear.map(row=>[row.slot,row.itemId,row.rarity,row.quality,row.rank,row.statGemId,row.effectGemId].join(':')).join('|');
 useEffect(()=>{setSelectedSlot(null)},[signature]);
 const selected=selectedSlot?equipped.get(selectedSlot):undefined;
 const item=selected?byItemId.get(selected.itemId):undefined;
 const rarity=item?rarityMeta(selected?.rarity??itemRarity(item)):undefined;
 const statGem=selected?.statGemId?byItemId.get(selected.statGemId):undefined;
 const effectGem=selected?.effectGemId?byItemId.get(selected.effectGemId):undefined;
 const extraGemIds=(selected?.gemIds??[]).filter(id=>id!==selected?.statGemId&&id!==selected?.effectGemId);
 const hasGemDetails=!!(selected?.statGemId||selected?.effectGemId||extraGemIds.length);
 const baseStats=item?[{label:'ATK',value:item.attack??0},{label:'DEF',value:item.defense??0},{label:'HP',value:item.hp??0}].filter(row=>row.value!==0):[];
 return <View style={s.block}>
  <View style={s.heading}>
   <View style={s.flex}><Text style={s.title}>{profileT(language,'EQUIPPED GEAR')}</Text><Text style={s.caption}>{profileT(language,'Tap an equipped item to inspect')}</Text></View>
   <View style={s.pill}><Text style={s.count}>{profileT(language,'{count}/10 equipped',{count:gear.length})}</Text></View>
  </View>
  <View onLayout={event=>setPanelWidth(Math.round(event.nativeEvent.layout.width))} style={s.grid}>
   {PROFILE_GEAR_SLOTS.map(slot=>{
    const entry=equipped.get(slot),def=entry?byItemId.get(entry.itemId):undefined;
    const meta=def?rarityMeta(entry?.rarity??itemRarity(def)):undefined;
    const name=profileText(language,slotLabels[slot]);
    const description=entry?(def?localizedItemName(language,def.id):entry.itemId):profileT(language,'Empty');
    return <Pressable key={slot} accessibilityRole={entry?'button':'text'} accessibilityLabel={name+': '+description}
     disabled={!entry} onPress={()=>setSelectedSlot(slot)}
     style={({pressed})=>[s.slot,{width:tileWidth},meta&&{borderColor:meta.color,backgroundColor:meta.surface},pressed&&s.pressed]}>
     <Text numberOfLines={1} style={s.slotName}>{name}</Text>
     <GearIcon item={def} rarity={entry?.rarity} unknown={!!entry&&!def}/>
     <View style={s.slotFoot}>
      {entry?.rank?<Text style={s.rankText}>+{entry.rank}</Text>:null}
      {entry?.statGemId?<Text style={s.statGemMark}>S</Text>:null}
      {entry?.effectGemId?<Text style={s.effectGemMark}>E</Text>:null}
      {entry?.gemIds?.some(id=>id!==entry.statGemId&&id!==entry.effectGemId)?<Text style={s.legacyGemMark}>G</Text>:null}
     </View>
    </Pressable>;
   })}
  </View>
  {!gear.length?<Text style={s.emptyText}>{profileT(language,'No equipment equipped yet')}</Text>:null}
  <GameModalSurface visible={!!selected} reduceMotion={reduceMotion} onClose={()=>setSelectedSlot(null)} presentation="dialog" surfaceStyle={s.detail}>
   <GameModalHeader eyebrow={profileT(language,'EQUIPPED GEAR')} title={item?localizedItemName(language,item.id):selected?.itemId??profileT(language,'Equipment')} onClose={()=>setSelectedSlot(null)}/>
   {selected?<View style={s.inspect}>
    <View style={s.inspectHead}>
     <GearIcon item={item} rarity={selected.rarity} unknown={!item}/>
     <View style={s.inspectCopy}>
      <Text style={s.detailSlot}>{profileText(language,slotLabels[selected.slot])}</Text>
      {rarity?<Text style={[s.rarity,{color:rarity.color}]}>{profileText(language,rarity.label)}</Text>:null}
      <View style={s.tags}>
       {selected.quality!==undefined?<Text style={s.tag}>{profileT(language,'Quality {quality}',{quality:selected.quality})}</Text>:null}
       {selected.rank?<Text style={s.tag}>{profileT(language,'Enhancement +{rank}',{rank:selected.rank})}</Text>:null}
      </View>
     </View>
    </View>
    {baseStats.length>0?<View style={s.statBlock}>
     <Text style={s.detailCaption}>{profileT(language,'BASE ITEM STATS')}</Text>
     <View style={s.statRow}>{baseStats.map(row=><DetailStat key={row.label} label={row.label} value={row.value}/>)}</View>
     <Text style={s.help}>{profileT(language,'Rarity, quality, enhancements and gems can improve these stats.')}</Text>
    </View>:null}
    {hasGemDetails?<View style={s.gemBlock}>
     <Text style={s.detailCaption}>{profileT(language,'SOCKETED GEMS')}</Text>
     {selected.statGemId?<Text style={s.gemLine}>{profileT(language,'Stat gem')}: {statGem?localizedItemName(language,statGem.id):selected.statGemId.replace(/_/g,' ')}</Text>:null}
     {selected.effectGemId?<Text style={s.gemLine}>{profileT(language,'Effect gem')}: {effectGem?localizedItemName(language,effectGem.id):selected.effectGemId.replace(/_/g,' ')}</Text>:null}
     {extraGemIds.map(id=><Text key={id} style={s.gemLine}>{profileT(language,'Gems')}: {byItemId.has(id)?localizedItemName(language,id):id.replace(/_/g,' ')}</Text>)}
    </View>:null}
    <Text style={s.readOnly}>{profileT(language,'View only · Equipment belongs to this player')}</Text>
   </View>:null}
  </GameModalSurface>
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 block:{gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 heading:{flexDirection:'row',alignItems:'center',gap:7},
 flex:{flex:1,minWidth:0},
 title:{fontSize:11,fontWeight:'900',letterSpacing:.7,color:C.accent},
 caption:{fontSize:9,lineHeight:13,color:C.muted,marginTop:2},
 pill:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},
 count:{fontSize:9,color:C.text,fontWeight:'800'},
 grid:{flexDirection:'row',flexWrap:'wrap',columnGap:4,rowGap:5,alignItems:'stretch'},
 slot:{minHeight:79,alignItems:'center',justifyContent:'space-between',gap:3,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel,paddingHorizontal:2,paddingVertical:5},
 slotName:{fontSize:8,lineHeight:11,fontWeight:'800',color:C.muted,textAlign:'center'},
 slotFoot:{minHeight:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:3},
 rankText:{fontSize:8,fontWeight:'900',color:C.accent},
 statGemMark:{fontSize:8,fontWeight:'900',color:C.info},
 effectGemMark:{fontSize:8,fontWeight:'900',color:C.special},
 legacyGemMark:{fontSize:8,fontWeight:'900',color:C.good},
 pressed:{opacity:.72},
 emptyText:{fontSize:9,color:C.muted,textAlign:'center'},
 detail:{gap:8},
 inspect:{gap:11,paddingTop:3,paddingBottom:4},
 inspectHead:{flexDirection:'row',alignItems:'center',gap:11},
 inspectCopy:{flex:1,minWidth:0,gap:3},
 detailSlot:{fontSize:10,color:C.muted,fontWeight:'900'},
 rarity:{fontSize:12,fontWeight:'900'},
 tags:{flexDirection:'row',gap:5,flexWrap:'wrap',marginTop:3},
 tag:{fontSize:9,color:C.accent,fontWeight:'900',paddingHorizontal:6,paddingVertical:3,borderRadius:5,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 statBlock:{gap:5,borderTopWidth:1,borderTopColor:C.line,paddingTop:9},
 detailCaption:{fontSize:9,fontWeight:'900',letterSpacing:.6,color:C.muted},
 statRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
 stat:{minWidth:72,flex:1,padding:7,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,gap:3,alignItems:'center'},
 statLabel:{fontSize:9,color:C.muted,fontWeight:'900'},
 statValue:{fontSize:13,color:C.text,fontWeight:'900'},
 help:{fontSize:10,lineHeight:15,color:C.muted},
 gemBlock:{gap:5,borderTopWidth:1,borderTopColor:C.line,paddingTop:9},
 gemLine:{fontSize:11,lineHeight:17,color:C.text},
 readOnly:{fontSize:9,lineHeight:14,color:C.disabled,textAlign:'center',marginTop:5},
 });}
