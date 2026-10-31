import {useEffect,useState} from 'react';
import {ActivityIndicator,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {OnlineGuildConstructionPanel} from './OnlineGuildConstructionPanel';
import {loadOnlineGuildTokenShop,type GuildTokenShopSnapshot} from '../online/guild-token-shop';

/** Guild Bank is a view over authoritative, per-project donation requirements.
 * It is not a free-form resource warehouse; no inventory is changed on view.
 */
export function OnlineGuildBankPanel({
 state,onRewardsChanged,
}:{state:GameState;onRewardsChanged?:()=>void|Promise<unknown>}) {
 const C=useGameTheme();
 const [snapshot,setSnapshot]=useState<GuildTokenShopSnapshot|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=async()=>{
  setLoading(true);setError('');
  try{setSnapshot(await loadOnlineGuildTokenShop());}
  catch(reason){setError(reason instanceof Error?reason.message:'Could not load Guild Bank.');}
  finally{setLoading(false);}
 };
 useEffect(()=>{void refresh();},[]);
 return <View style={{gap:10}}>
  <Panel>
   <Text style={{fontSize:18,fontWeight:'800',color:C.text}}>Guild Bank</Text>
   <Text style={{fontSize:12,lineHeight:18,color:C.muted,marginTop:4}}>
    Donate only what unlocked Guild Construction currently needs. Other resources remain in your inventory.
   </Text>
   <GameButton compact tone="secondary" title={loading?'Refreshing…':'Refresh requirements'} disabled={loading} onPress={()=>void refresh()}/>
   {!!error&&<Text accessibilityRole="alert" style={{fontSize:12,color:C.bad}}>{error}</Text>}
   {loading&&!snapshot?<ActivityIndicator color={C.accent}/>:null}
  </Panel>
  {snapshot?<OnlineGuildConstructionPanel
   snapshot={snapshot}
   inventory={state.inventory.stacks}
   gold={state.character?.gold}
   onRewardsChanged={onRewardsChanged}
   onReload={refresh}
  />:null}
 </View>;
}
