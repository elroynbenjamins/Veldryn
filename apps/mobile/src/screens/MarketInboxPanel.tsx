import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {PLAYER_MARKET_RELEASED} from '../core/release-flags';
import {
  loadMarketInbox,claimMarketInboxDelivery,
  type MarketInboxEntry,type MarketInboxDestination,type MarketInboxSnapshot,
} from '../online/market-inbox';
import {ResourceIcon} from '../components/ResourceIcon';
import {SocialActionButton} from '../components/SocialActionButton';
import {LoadingState} from '../components/LoadingState';
import {useGameTheme} from '../theme/ThemeContext';
import {accountText} from '../i18n/account';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import type {GameState} from '../core/types';

/** Future third tab inside Rewards Inbox. Never mounted until full Market
 * release, including authenticated RPCs and item claim routes, is ready. */
export function MarketInboxPanel({state,online,onRefresh}:{
  state:GameState;online:boolean;onRefresh:()=>Promise<unknown>;
}){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  const a=(str:string)=>accountText(state.settings.language,str);
  const [history,setHistory]=useState(false);
  const [snapshot,setSnapshot]=useState<MarketInboxSnapshot>({entries:[],pendingCount:0,total:0});
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState('');
  const generation=useRef(0),running=useRef(false);
  const load=useCallback(async(append=false)=>{
    if(!PLAYER_MARKET_RELEASED||!online)return;
    const generationId=++generation.current;
    setLoading(true);
    try{
      const data=await loadMarketInbox(history,append?snapshot.entries.length:0);
      if(generation.current!==generationId)return;
      setSnapshot(previous=>({...data,entries:append?[...previous.entries,...data.entries]:data.entries}));
      setError('');
    }catch(e){if(generation.current===generationId)setError(e instanceof Error?e.message:a('Inbox unavailable.'));}
    finally{if(generation.current===generationId)setLoading(false);}
  },[online,history,snapshot.entries.length]);
  useEffect(()=>{void load();return()=>{generation.current++;};},[history,online]);

  const claim=async(row:MarketInboxEntry,destination:MarketInboxDestination)=>{
    if(running.current||!row.deliveryId||row.kind==='sold')return;
    running.current=true;setBusy(true);setError('');setNotice('');
    try{
      const result=await claimMarketInboxDelivery(row.kind,row.deliveryId,destination);
      if(result.blocked||!result.claimed){
        setError(result.message||a('Make room in your inventory.'));
      }else{
        setNotice(a('Item claimed.'));
        await onRefresh();
      }
      await load();
    }catch(e){setError(e instanceof Error?e.message:a('Could not claim. Your rewards remain safe.'));}
    finally{running.current=false;setBusy(false);}
  };
  if(!PLAYER_MARKET_RELEASED)return null;
  return <View style={s.root}>
    <Text style={s.subtitle}>{a('Purchases, sales and returned listings are kept here. Items stay safe until claimed.')}</Text>
    <View accessibilityRole="tablist" style={s.tabs}>
      {[false,true].map(value=><Pressable key={String(value)}
        accessibilityRole="tab" accessibilityState={{selected:history===value}}
        disabled={busy} onPress={()=>{setHistory(value);setSnapshot({entries:[],pendingCount:0,total:0});setError('');}}
        style={[s.tab,history===value&&s.tabActive]}>
        <Text style={[s.tabLabel,history===value&&s.tabLabelActive]}>
          {value?a('Completed'):a('To claim')+(snapshot.pendingCount&&!history?' · '+snapshot.pendingCount:'')}
        </Text>
      </Pressable>)}
    </View>
    {!!error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
    {!!notice?<Text accessibilityRole="alert" style={s.success}>{notice}</Text>:null}
    {snapshot.entries.map(row=><View style={s.entry} key={row.id}>
      <View style={s.entryTop}>
        <ResourceIcon resourceId={row.itemId} size={36}/>
        <View style={s.flex}>
          <Text style={s.kind}>{a(row.kind==='purchased'?'Purchased':row.kind==='sold'?'Sold':'Returned')}</Text>
          <Text numberOfLines={2} style={s.itemName}>{row.itemId.replace(/_/g,' ')} ×{row.quantity.toLocaleString()}</Text>
        </View>
        <Text style={s.status}>{a(row.status==='ready'?'READY':row.status==='claimed'?'CLAIMED':'PAID')}</Text>
      </View>
      {row.kind==='sold'?<Text style={s.gold}>+{row.goldChange.toLocaleString()} {a('Gold credited')}</Text>
        :row.kind==='purchased'?<Text style={s.muted}>{row.goldChange.toLocaleString()} {a('Gold · Item waiting in Inbox')}</Text>
        :<Text style={s.muted}>{a('Unsold items returned safely')}</Text>}
      {row.status==='ready'&&row.deliveryId?
        <View style={s.actions}>
          <SocialActionButton primary label={a('Claim to Inventory')} disabled={busy||!online}
            busy={busy} onPress={()=>void claim(row,'inventory')}/>
          <SocialActionButton label={a('Bank')} disabled={busy||!online}
            onPress={()=>void claim(row,'bank')}/>
          {row.assetKind==='gem'?<SocialActionButton label={a('Gem Pouch')}
            disabled={busy||!online} onPress={()=>void claim(row,'gem_pouch')}/>:null}
        </View>:null}
    </View>)}
    {loading?<LoadingState compact label={a('Loading market inbox…')}/>:null}
    {!loading&&!snapshot.entries.length&&!error?
      <Text style={s.empty}>{history?a('No completed market activity yet.'):a('No market deliveries waiting.')}</Text>:null}
    {snapshot.entries.length<snapshot.total?<SocialActionButton label={a('Load more')}
      disabled={loading||busy} onPress={()=>void load(true)}/>:null}
  </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
  root:{gap:spacing.md},
  subtitle:{...typography.caption,color:C.muted},
  tabs:{flexDirection:'row',gap:8},tab:{flex:1,minHeight:42,borderWidth:1,borderColor:C.line,
    borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:C.panel},
  tabActive:{borderColor:C.accent,backgroundColor:C.accentSurface},
  tabLabel:{...typography.bodyStrong,color:C.muted},tabLabelActive:{color:C.text},
  entry:{backgroundColor:C.panel,padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,gap:9},
  entryTop:{flexDirection:'row',alignItems:'center',gap:9},flex:{flex:1,minWidth:0},
  kind:{fontSize:10,fontWeight:'800',color:C.accent,textTransform:'uppercase'},
  itemName:{...typography.bodyStrong,color:C.text,marginTop:3},
  status:{fontSize:10,fontWeight:'900',color:C.accent},
  muted:{...typography.caption,color:C.muted},gold:{...typography.bodyStrong,color:C.good},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:8},
  error:{...typography.caption,color:C.warning},success:{...typography.caption,color:C.good},
  empty:{...typography.body,color:C.muted,textAlign:'center',paddingVertical:30},
});}
