import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {profileT,profileText} from '../i18n/profile';
import {localizedItemName} from '../i18n/starter-item-names';
import {ITEMS,type ItemDef} from '../content/items';
import {displayStatPrecise} from '../core/stat-display';
import {useGameplayText} from '../i18n/gameplay';
import {itemDetailContent,itemDetailText} from '../i18n/item-details';
import {hasGemArtworkV1} from '../theme/gem-assets';
import {weaponBonusStatText} from '../i18n/weapon-bonus-ux';
import {GemArtwork} from './GemArtwork';
import type {GearSlot} from '../core/types';
import {PROFILE_GEAR_SLOTS,profileGearColumnCount,profileItemStats,profileItemSockets,profileBonusPercent,type ProfileEquippedGear} from '../core/profile-equipped-gear';
import {itemRarity,rarityMeta,rarityNameColor} from '../core/item-rarity';
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
 const language=useGameLanguage(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={s.stat} accessible accessibilityLabel={itemDetailText(language,label)+': '+displayStatPrecise(value)}><Text style={s.statLabel}>{itemDetailText(language,label)}</Text><Text style={s.statValue}>{displayStatPrecise(value)}</Text></View>;
}

/** Read-only equipment inspection. Never exposes inventory, ownership identifiers or gear actions. */
export function ProfileEquippedGearShowcase({gear,reduceMotion=false}:{gear:ProfileEquippedGear[];reduceMotion?:boolean}){
 const language=useGameLanguage(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {gt,gl}=useGameplayText();
 const contentText=(value:string)=>itemDetailContent(language,value,gl);
 const {width,fontScale}=useWindowDimensions();
 const [panelWidth,setPanelWidth]=useState(0);
 const [selectedSlot,setSelectedSlot]=useState<GearSlot|null>(null);
 // Use the measured panel rather than device width: this also works in narrow chat sheets.
 const availableWidth=panelWidth||width-54;
 const columns=profileGearColumnCount(availableWidth,fontScale);
 const tileWidth=columns===5?'18.5%':columns===4?'23.8%':'31.5%';
 const equipped=useMemo(()=>new Map(gear.map(row=>[row.slot,row])),[gear]);
 // Close stale inspection if the viewed player's gear or equipped copy changes.
 const signature=JSON.stringify(gear);
 useEffect(()=>{setSelectedSlot(null)},[signature]);
 const selected=selectedSlot?equipped.get(selectedSlot):undefined;
 const item=selected?byItemId.get(selected.itemId):undefined;
 const rarityId=selected?.rarity??(item?itemRarity(item):undefined);
 const rarity=rarityId?rarityMeta(rarityId):undefined;
 const randomBonuses=selected?.bonuses?.map(roll=>({stat:roll.stat,percent:roll.basisPoints/100}))??[];
 const trait=item?.passive;
 const stats=selected?profileItemStats(selected):undefined;
 const baseStats=stats?[{label:'ATK',value:stats.attack},{label:'DEF',value:stats.defense},{label:'HP',value:stats.hp}].filter(row=>row.value!==0):[];
 const sockets=selected?profileItemSockets(selected):[];
 const unknownGemIds=selected?[...new Set([selected.statGemId,selected.effectGemId,...(selected.gemIds??[])].filter((id):id is string=>!!id))].filter(id=>!sockets.some(socket=>socket.id===id)):[];
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
     <Text style={s.slotName}>{name}</Text>
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
   <GameModalHeader eyebrow={profileT(language,'EQUIPPED GEAR')} title={(item?localizedItemName(language,item.id):profileT(language,'Equipment'))+(selected?.rank?' +'+selected.rank:'')} titleColor={rarityId?rarityNameColor(rarityId,C.dark,C.text):C.text} onClose={()=>setSelectedSlot(null)}/>
   {selected?<ScrollView style={s.scroll} contentContainerStyle={s.inspect} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.inspectHead}>
     {item?<EquipmentArtwork item={item} rarity={selected.rarity??itemRarity(item)} size={62} framed/>:<GearIcon unknown/>}
     <View style={s.inspectCopy}>
      <Text style={s.detailSlot}>{profileText(language,slotLabels[selected.slot])}</Text>
      {rarity?<Text style={[s.rarity,{color:rarity.color}]}>{profileText(language,rarity.label)}</Text>:null}
      {selected.quality!==undefined?<><Text style={s.tag}>{profileT(language,'Quality {quality}',{quality:selected.quality})} / 100</Text><View style={s.qualityTrack} accessible={false}><View style={[s.qualityFill,{width:`${selected.quality}%`}]}/></View></>:null}
     </View>
    </View>
    {baseStats.length>0?<View style={s.statBlock}>
     <Text style={s.detailCaption}>{gt('BASE STATS')}</Text>
     <View style={s.statRow}>{baseStats.map(row=><DetailStat key={row.label} label={row.label} value={row.value}/>)}</View>
    </View>:null}
    {!stats?<Text style={s.help}>{profileT(language,'Equipment details unavailable')}</Text>:null}
    {randomBonuses.length>0?<View style={s.statBlock}>
     <Text style={s.detailCaption}>{gt('BONUS STATS')}</Text>
     <View style={s.bonusPanel}>{randomBonuses.map(roll=><View key={roll.stat} style={s.bonusRow}>
      <Text style={s.bonusLabel}>{weaponBonusStatText(language,roll.stat)}</Text><Text style={s.bonusValue}>{profileBonusPercent(roll.percent)}</Text>
     </View>)}</View>
    </View>:null}
    {trait?<View style={s.statBlock}><Text style={s.detailCaption}>{gt('TRAIT')}</Text><Text style={s.gemLine}>{contentText(trait)}</Text></View>:null}
    {item?.type==='gear'||sockets.some(socket=>socket.id)||unknownGemIds.length>0?<View style={s.gemBlock}>
     <View style={s.socketHeading}><Text style={s.detailCaption}>{gt('SOCKETS')}</Text>{selected.inspectionKnown&&!unknownGemIds.length?<Text style={s.detailSlot}>{sockets.filter(socket=>socket.id).length}/2</Text>:null}</View>
     {sockets.map(socket=><View key={socket.kind} style={s.socketRow}>
      {socket.id&&hasGemArtworkV1(socket.id)?<GemArtwork itemId={socket.id} size={34} framed={false}/>:<View style={s.emptySocket}><Text style={s.detailSlot}>◇</Text></View>}
      <View style={s.flex}><Text style={s.detailSlot}>{profileT(language,socket.kind==='stat'?'Stat gem':'Effect gem')}</Text>
       <Text style={s.gemLine}>{socket.id?localizedItemName(language,socket.id):profileT(language,selected.inspectionKnown&&!unknownGemIds.length?'Empty':'Unavailable')}</Text>
       {socket.detail?<Text style={s.bonusValue}>{contentText(socket.detail)}</Text>:null}</View>
     </View>)}
     {unknownGemIds.map(id=><Text key={id} style={s.gemLine}>{byItemId.has(id)?localizedItemName(language,id):id.replace(/_/g,' ')}</Text>)}
    </View>:null}
    <Text style={s.readOnly}>{profileT(language,'View only · Equipment belongs to this player')}</Text>
   </ScrollView>:null}
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
 detail:{gap:8},scroll:{flexShrink:1},
 inspect:{gap:11,paddingTop:3,paddingBottom:4},
 inspectHead:{flexDirection:'row',alignItems:'center',gap:11},
 inspectCopy:{flex:1,minWidth:0,gap:3},
 detailSlot:{fontSize:10,color:C.muted,fontWeight:'900'},
 rarity:{fontSize:12,fontWeight:'900'},
 tags:{flexDirection:'row',gap:5,flexWrap:'wrap',marginTop:3},
 tag:{fontSize:9,color:C.accent,fontWeight:'900',paddingHorizontal:6,paddingVertical:3,borderRadius:5,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 statBlock:{gap:5,borderTopWidth:1,borderTopColor:C.line,paddingTop:9},
 detailCaption:{fontSize:10,fontWeight:'900',letterSpacing:.6,color:C.accent},
 qualityTrack:{height:4,borderRadius:3,backgroundColor:C.line,overflow:'hidden'},
 qualityFill:{height:4,backgroundColor:C.accent,borderRadius:3},
 bonusPanel:{padding:8,gap:5,borderWidth:1,borderColor:C.good,borderRadius:radii.sm,backgroundColor:C.panel2},
 bonusRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,minHeight:24},
 bonusLabel:{flex:1,minWidth:0,fontSize:12,color:C.text,fontWeight:'700'},
 bonusValue:{fontSize:12,color:C.good,fontWeight:'900',fontVariant:['tabular-nums']},
 socketHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 socketRow:{flexDirection:'row',alignItems:'center',gap:9,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 emptySocket:{width:34,height:34,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm},
 statRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
 stat:{minWidth:72,flex:1,padding:7,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,gap:3,alignItems:'center'},
 statLabel:{fontSize:10,color:C.muted,fontWeight:'900'},
 statValue:{fontSize:17,color:C.text,fontWeight:'900',fontVariant:['tabular-nums'],textAlign:'center'},
 help:{fontSize:10,lineHeight:15,color:C.muted},
 gemBlock:{gap:5,borderTopWidth:1,borderTopColor:C.line,paddingTop:9},
 gemLine:{fontSize:11,lineHeight:17,color:C.text},
 readOnly:{fontSize:10,lineHeight:15,color:C.muted,textAlign:'center',marginTop:5},
 });}
