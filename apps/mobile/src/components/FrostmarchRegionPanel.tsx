import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {RegionDungeonCardV21,RegionProgressV21,RegionZoneCardV21} from '../core/region-content-v21';
import {completionPercentV21,nextRegionalGoalV21} from '../core/region-content-v21';
import {regionalAreaActivityCounts} from '../core/region-area-activities';

/** Compact four-area overview. Co-op content and the REG_003 journal remain unchanged. */
export function FrostmarchRegionPanel({zones,progress,contentVersion,dungeons,onZone,onGather,onDungeon}:{zones:readonly RegionZoneCardV21[];progress:RegionProgressV21;contentVersion?:string;dungeons:readonly RegionDungeonCardV21[];onZone?:(id:string)=>void;onGather?:(id:string)=>void;onDungeon?:(id:string)=>void}){
 const language=useGameLanguage();
 const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
 const p=(text:string)=>progressionText(language,text);
 const pct=completionPercentV21(progress);
 return <View style={s.wrap}>
   <View style={s.hero}>
     <Text style={s.eyebrow}>{t("REGION III · LEVEL 45–70")}</Text>
     <View style={s.headRow}><Text style={s.title}>Frostmarch</Text><Text style={s.percent}>{pct}{t("% REGION")}</Text></View>
     <Text numberOfLines={2} style={s.copy}>{p(nextRegionalGoalV21(progress))}</Text>
     {contentVersion?<Text style={s.version}>{t("Active content ·")} {contentVersion}</Text>:null}
   </View>
   {zones.map(z=>{
     const counts=regionalAreaActivityCounts('FROSTMARCH',z.id);
     return <View key={z.id} style={[s.card,z.locked&&s.locked]}>
       <Pressable accessibilityRole="button" accessibilityLabel={p(z.name)+' · '+t('Combat')} accessibilityState={{disabled:z.locked}} disabled={z.locked||!onZone} onPress={()=>onZone?.(z.id)} style={s.mainAction}>
         <View style={s.headRow}><Text style={s.cardTitle}>{p(z.name)}</Text><Text style={s.level}>{z.levelRange}</Text></View>
         <Text numberOfLines={2} style={s.identity}>{p(z.identity)}</Text>
         <Text style={s.tags}>{counts.enemies} {p('enemies')} · {counts.gathering} {p('gathering')}</Text>
       </Pressable>
       {z.locked?<Text style={s.status}>{t("LOCKED")}</Text>:<View style={s.actions}>
         <Pressable accessibilityRole="button" accessibilityLabel={t('Combat')+' · '+p(z.name)} onPress={()=>onZone?.(z.id)} style={s.action}><Text style={s.actionText}>{t('Combat')}</Text></Pressable>
         <Pressable accessibilityRole="button" accessibilityLabel={p('Gathering')+' · '+p(z.name)} onPress={()=>onGather?.(z.id)} style={[s.action,s.gatherAction]}><Text style={s.actionText}>{p('Gather')}</Text></Pressable>
       </View>}
     </View>;
   })}
   <Text style={s.section}>{t("CO-OP")}</Text>
   {dungeons.map(d=><Pressable key={d.id} accessibilityRole="button" disabled={d.locked||!onDungeon} onPress={()=>onDungeon?.(d.id)} style={[s.dungeon,d.locked&&s.locked]}>
     <View><Text style={s.cardTitle}>{p(d.name)}</Text><Text style={s.level}>{t("Lv")} {d.minLevel}{t("+ · Live + Q-Mode")}</Text></View>
     <Text style={s.arrow}>{d.locked?t("LOCKED"):'›'}</Text>
   </Pressable>)}
 </View>;
}
const s=StyleSheet.create({
 wrap:{padding:12,gap:8},hero:{padding:12,borderRadius:11,borderWidth:1,borderColor:'#5d7890',backgroundColor:'#151d26'},
 eyebrow:{fontSize:9,fontWeight:'900',color:'#8fc4dd',letterSpacing:.8},title:{fontSize:20,fontWeight:'900',color:'#e6f5ff'},
 headRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'},
 percent:{fontSize:11,fontWeight:'900',color:'#9ad5eb'},copy:{fontSize:11,lineHeight:16,color:'#b9c9d5',marginTop:5},
 version:{fontSize:9,color:'#88b9ce',marginTop:5},card:{padding:10,gap:8,borderRadius:9,borderWidth:1,borderColor:'#425566',backgroundColor:'#171d23'},
 locked:{opacity:.5},mainAction:{minHeight:51,justifyContent:'center'},cardTitle:{fontSize:14,fontWeight:'900',color:'#e4f3fb'},
 level:{fontSize:10,fontWeight:'800',color:'#8fc4dd'},identity:{fontSize:11,lineHeight:15,color:'#a8bbc7',marginTop:3},
 tags:{fontSize:10,color:'#9ab8c6',marginTop:4},status:{fontSize:10,fontWeight:'900',color:'#93aebe',alignSelf:'flex-end'},
 actions:{flexDirection:'row',gap:8},action:{flex:1,minHeight:36,alignItems:'center',justifyContent:'center',backgroundColor:'#263743',borderWidth:1,borderColor:'#52697c',borderRadius:8},
 gatherAction:{borderColor:'#80bbcc'},actionText:{fontSize:11,fontWeight:'800',color:'#d4e8f3'},
 dungeon:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:10,borderRadius:9,borderWidth:1,borderColor:'#52697c',backgroundColor:'#18222b'},arrow:{fontSize:18,fontWeight:'900',color:'#9bd1e7'},
 section:{fontSize:9,fontWeight:'900',color:'#91b9cd',letterSpacing:1,marginTop:7}
});
