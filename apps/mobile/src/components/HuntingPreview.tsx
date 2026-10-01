import {Image,Platform,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {MonsterDef} from '../content/monsters';
import {combatBaselineProjection} from '../core/balance-projection';
import {combatSustainProjection} from '../core/game';
import {itemDef} from '../content/items';
import {formatGameNumber} from '../core/number-format';
import {useGameTheme} from '../theme/ThemeContext';
import {battleText} from '../i18n/battle';
import {progressionT} from '../i18n/progression';
import {CharacterPortrait} from './CharacterVisual';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {RegionArtwork} from './RegionArtwork';

/** An encounter preview; reward projections are deliberately labeled as baseline estimates. */
export function HuntingPreview({state,monster,regionId}:{state:GameState;monster:MonsterDef;regionId:string}){
 const C=useGameTheme(),pace=combatBaselineProjection(monster),sustain=monster.boss?undefined:combatSustainProjection(state,monster.id);
 const number=(value:number)=>formatGameNumber(Math.round(value),state.settings.numberMode,state.settings.language);
 const font=Platform.OS==='web'?'system-ui':Platform.OS==='android'?'sans-serif':'System';
 const tr=(text:string)=>battleText(state.settings.language,text);
 return <View style={{borderWidth:1,borderColor:C.line,borderRadius:16,overflow:'hidden',backgroundColor:C.panel}}>
  <View style={{height:196,justifyContent:'flex-end'}}>
   {regionId==='IRONWOOD'?<Image source={require('../../assets/combat-scenes/ironwood-clearing-v1.jpg')} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>:<RegionArtwork regionId={regionId}/>}
   <View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(3,7,10,.35)'}]}/>
   <View style={{position:'absolute',top:10,left:12,right:12,alignItems:'center',gap:2}}><Text style={{fontFamily:font,color:'#ADC8BC',fontSize:10,fontWeight:'700',letterSpacing:1}}>{state.activity?.kind==='combat'&&state.activity.targetId===monster.id?progressionT(state.settings.language,'HUNTING'):tr('Combat preview')}</Text><Text style={{fontFamily:font,color:'#F0F3F4',fontSize:21,fontWeight:'700'}}>{monster.name}</Text><Text style={{fontFamily:font,color:'#BAC3CA',fontSize:12}}>{tr('Combat preview')}</Text></View>
   <View style={{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around',padding:10,gap:8}}>
    <View style={{flex:1,alignItems:'center',gap:5}}><View style={{borderWidth:2,borderColor:'#A5B4AA',borderRadius:50,backgroundColor:'rgba(4,9,12,.8)',padding:3}}><CharacterPortrait state={state} style={{width:72,height:72}}/></View><Text style={{fontFamily:font,color:'#E8ECEF',fontSize:11,fontWeight:'700',marginTop:-12,paddingHorizontal:7,paddingVertical:2,borderRadius:5,borderWidth:1,borderColor:'#758D88',backgroundColor:'#111B20'}}>Lv {state.character?.level}</Text></View>
    <Text style={{color:'#C9CED2',fontWeight:'800',alignSelf:'center'}}>VS</Text>
    <View style={{flex:1,alignItems:'center',gap:5}}><MonsterPortraitFrame monster={monster} size={116} framed={false} reduceMotion={state.settings.reduceMotion}/></View>
   </View>
  </View>
  {!monster.boss?<View accessibilityLabel={progressionT(state.settings.language,'BASELINE REWARDS')} style={{margin:8,marginTop:0,padding:11,gap:8,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel}}>
   <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:6}}>{[[pace.killsPerHour,'kills/hr'],[pace.xpPerHour,'XP/hr'],[pace.goldPerHour,'Gold/hr']].map(([value,label],index)=><Text key={label} style={{fontFamily:font,color:C.text,fontWeight:'600',fontSize:13}}>{index?'·  ':''}~{number(value as number)} {label}</Text>)}</View>
   <Text style={{fontFamily:font,color:C.muted,fontSize:11,lineHeight:15,textAlign:'center'}}>{sustain?.foodId?`${itemDef(sustain.foodId).name} · ~${sustain.foodPerHour.toFixed(1)} food/hr`:progressionT(state.settings.language,'Equip cooked food for sustained hunts.')}</Text>
  </View>:null}
 </View>;
}
