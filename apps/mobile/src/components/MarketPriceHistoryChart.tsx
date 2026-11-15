import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {recentScreenText} from '../i18n/recent-screens';
import {formatLocalizedNumber} from '../i18n/translator';
import {marketPriceGraphBarsV13,marketPriceGraphHasVisibleSalesV13,
  type MarketPriceGraphSnapshotV13,type MarketPriceGraphPeriodV13,
} from '../core/market-price-history-v13';
import {spacing,typography,type ThemeColors} from '../theme/theme';

/** Read-only and deliberately unmounted until the authenticated Market
 * listing/item-detail service is audited and explicitly released.
 * Bars represent UTC days with >=3 sales from distinct buyers and sellers.
 * Missing days have NO bar, and no zero-price or synthetic interpolation.
 */
export function MarketPriceHistoryChart({snapshot,periodDays,onPeriodChange,loading=false}:{
 snapshot:MarketPriceGraphSnapshotV13|undefined;
 periodDays:MarketPriceGraphPeriodV13;
 onPeriodChange:(period:MarketPriceGraphPeriodV13)=>void;
 loading?:boolean;
}){
 const C=useGameTheme(),language=useGameLanguage();
 const a=(label:string,params?:Record<string,string|number>)=>recentScreenText(language,label,params);
 const styles=useMemo(()=>makeStyles(C),[C]);
 const [selectedDate,setSelectedDate]=useState<string|null>(null);
 const periodMatches=snapshot?.periodDays===periodDays;
 const bars=useMemo(()=>periodMatches&&snapshot?marketPriceGraphBarsV13(snapshot):[],
   [snapshot,periodMatches]);
 const hasSales=periodMatches&&snapshot?marketPriceGraphHasVisibleSalesV13(snapshot):false;
 const withSales=bars.filter(row=>row.point!==null);
 const max=Math.max(1,...withSales.map(row=>row.point?.highGold??0));
 const min=Math.min(...withSales.map(row=>row.point?.lowGold??max));
 const chosen=withSales.find(row=>row.date===selectedDate)
   ??withSales[withSales.length-1]??{date:'',label:'',point:null};
 const price=(n:number)=>formatLocalizedNumber(language,n);
 return <View style={styles.root}>
  <View style={styles.headingRow}>
   <View style={styles.titleGroup}>
    <Text style={styles.title}>{a('Price history')}</Text>
    <Text style={styles.caption}>{a('Completed sales · Gold per unit')}</Text>
   </View>
   <View style={styles.tabs} accessibilityRole="tablist">
    {([7,30,90] as const).map(period=><Pressable key={period}
      accessibilityRole="tab" accessibilityState={{selected:periodDays===period}}
      onPress={()=>{setSelectedDate(null);onPeriodChange(period);}}
      style={[styles.tab,periodDays===period&&styles.tabActive]}>
      <Text style={[styles.tabText,periodDays===period&&styles.tabTextActive]}>
       {period}{a('d')}
      </Text>
    </Pressable>)}
   </View>
  </View>
  {loading||!periodMatches?<Text style={styles.placeholder}>
    {a('Loading sale history…')}
   </Text>:!snapshot||!hasSales?<View style={styles.empty}>
    <Text style={styles.emptyHeading}>{a('Not enough completed sales yet')}</Text>
    <Text style={styles.caption}>
     {a('Prices appear after at least three completed sales from different buyers and sellers on a day.')}
    </Text>
   </View>:<>
    <View style={styles.stats}>
     <View><Text style={styles.caption}>{a('Selected day · Median')}</Text>
      <Text style={styles.value}>{price(chosen.point!.medianGold)} {a('Gold')}</Text>
     </View>
     <View style={styles.statRight}><Text style={styles.caption}>
       {a('Sales / Units')}
      </Text><Text style={styles.valueSmall}>
       {price(chosen.point!.sales)} / {price(chosen.point!.units)}
      </Text></View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.chartContent}>
     {bars.map(bar=>{
      const val=bar.point?.medianGold;
      const height=val===undefined?0:Math.max(10,Math.round(
        18+(val-min)/Math.max(1,max-min)*92));
      return <Pressable key={bar.date}
        disabled={!bar.point}
        onPress={()=>setSelectedDate(bar.date)}
        accessibilityRole="button"
        accessibilityState={{disabled:!bar.point,selected:chosen.date===bar.date}}
        accessibilityLabel={bar.point
          ?a('{date}: {price} Gold median, {sales} completed sales',{
             date:bar.date,price:price(bar.point.medianGold),sales:price(bar.point.sales),
           })
          :bar.date+': '+a('No verified daily price')}
        style={styles.day}>
        <View style={styles.barArea}>
         {bar.point?<View style={[styles.bar,{
           height,backgroundColor:chosen.date===bar.date?C.accent:C.info,
         }]}/>:null}
        </View>
        <Text style={[styles.dateLabel,chosen.date===bar.date&&styles.dateSelected]}>
         {bar.date.slice(8)}
        </Text>
       </Pressable>;
     })}
    </ScrollView>
    <View style={styles.rangeRow}>
     <Text style={styles.caption}>{a('Daily price range')}: {price(chosen.point!.lowGold)}–{price(chosen.point!.highGold)} {a('Gold')}</Text>
     <Text style={styles.caption}>{chosen.date}</Text>
    </View>
    <Text style={styles.note}>{a('Only actual completed sales are shown; missing days have no price.')}</Text>
   </>}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{borderWidth:1,borderColor:C.line,backgroundColor:C.panel,borderRadius:12,
  padding:spacing.md,gap:spacing.md},
 headingRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 titleGroup:{flex:1,gap:3},title:{...typography.bodyStrong,color:C.text},
 caption:{fontSize:11,lineHeight:16,color:C.muted},
 tabs:{flexDirection:'row',gap:4},tab:{minWidth:37,minHeight:32,alignItems:'center',
  justifyContent:'center',borderRadius:7,borderWidth:1,borderColor:C.line},
 tabActive:{borderColor:C.accent,backgroundColor:C.accentSurface},
 tabText:{fontSize:11,fontWeight:'700',color:C.muted},
 tabTextActive:{color:C.text},
 placeholder:{fontSize:12,color:C.muted,paddingVertical:24,textAlign:'center'},
 empty:{minHeight:125,justifyContent:'center',alignItems:'center',gap:8,padding:10},
 emptyHeading:{...typography.bodyStrong,color:C.text,textAlign:'center'},
 stats:{flexDirection:'row',justifyContent:'space-between',gap:8},
 value:{fontSize:18,fontWeight:'800',color:C.text,fontVariant:['tabular-nums']},
 statRight:{alignItems:'flex-end'},
 valueSmall:{fontSize:13,fontWeight:'800',color:C.text,fontVariant:['tabular-nums']},
 chartContent:{gap:4,alignItems:'flex-end',paddingVertical:3},
 day:{width:26,alignItems:'center',gap:3},
 barArea:{height:110,width:20,alignItems:'center',justifyContent:'flex-end'},
 bar:{width:15,borderRadius:3,minHeight:10},
 dateLabel:{fontSize:9,color:C.muted},
 dateSelected:{fontWeight:'900',color:C.text},
 rangeRow:{flexDirection:'row',justifyContent:'space-between',gap:4,flexWrap:'wrap'},
 note:{fontSize:10,lineHeight:15,color:C.muted},
});}
