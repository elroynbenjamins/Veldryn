import {useEffect,useRef,useState} from 'react';
import {useGuildTokenShopUiText} from '../i18n/guild-token-shop-ui';
import {GuildTokenShopView} from './GuildTokenShopView';
import {claimOnlineGuildEventBonus,claimOnlineGuildWeeklyTokens,purchaseOnlineGuildTokenReward,loadOnlineGuildTokenShop,type GuildTokenShopSnapshot} from '../online/guild-token-shop';

/** Claims, purchases and refreshes are serialized; only the server settles spending. */
export function OnlineGuildTokenShopPanel({onRewardsChanged,onOpenConstruction}:{onRewardsChanged?:()=>void|Promise<unknown>;onOpenConstruction?:()=>void}){
 const ui=useGuildTokenShopUiText();
 const [snapshot,setSnapshot]=useState<GuildTokenShopSnapshot|null>(null),[loading,setLoading]=useState(true);
 const [pending,setPending]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const inFlight=useRef(false),mounted=useRef(true),syncRequired=useRef(false);
 const refresh=async()=>{
  if(inFlight.current)return;
  inFlight.current=true;setLoading(true);setError('');
  try{const [next]=await Promise.all([loadOnlineGuildTokenShop(),syncRequired.current?onRewardsChanged?.():undefined]);syncRequired.current=false;if(mounted.current)setSnapshot(next)}
  catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:ui('Unable to load the Guild Token Shop.'))}
  finally{inFlight.current=false;if(mounted.current)setLoading(false)}
 };
 useEffect(()=>{mounted.current=true;void refresh();return()=>{mounted.current=false}},[]);
 const mutate=async(key:string,operation:()=>Promise<string>,rewardChanged=false)=>{
  if(inFlight.current||syncRequired.current)return;
  inFlight.current=true;setPending(key);setError('');setNotice('');
  try{
   const confirmation=await operation();
   if(!mounted.current)return;
   setNotice(confirmation);
   // A sync failure must never report a confirmed payment as a failed purchase.
   const results=await Promise.allSettled([loadOnlineGuildTokenShop(),Promise.resolve().then(()=>rewardChanged?onRewardsChanged?.():undefined)]);
   if(!mounted.current)return;
   if(results[0].status==='fulfilled')setSnapshot(results[0].value);
   if(results.some(result=>result.status==='rejected')){syncRequired.current=true;setError(ui('Reward confirmed. Refresh to sync your balance and collection before continuing.'))}
  }catch(reason){syncRequired.current=true;if(mounted.current)setError(reason instanceof Error?reason.message:ui('Unable to confirm Guild reward. Refresh before trying again.'))}
  finally{inFlight.current=false;if(mounted.current)setPending(null)}
 };
 return <GuildTokenShopView snapshot={snapshot} loading={loading} pending={pending} error={error} notice={notice} onRefresh={refresh} onRewardsChanged={onRewardsChanged}
  onOpenConstruction={onOpenConstruction} onBuy={id=>mutate(id,async()=>{const status=await purchaseOnlineGuildTokenReward(id);return status==='purchased'?ui('Reward unlocked for your account!'):ui('Already owned. No additional Guild Tokens were spent.')},true)}
  onWeekly={kind=>mutate(`weekly:${kind}`,async()=>{const credited=await claimOnlineGuildWeeklyTokens(kind);return credited?ui('+{amount} weekly Guild Tokens earned!',{amount:credited}):ui('Already claimed or weekly cap reached.')})}
  onEvent={(id,percent)=>mutate(`event:${id}:${percent}`,async()=>{const credited=await claimOnlineGuildEventBonus(id,percent);return credited?ui('+{amount} bonus Guild Tokens earned!',{amount:credited}):ui('This milestone was already claimed.')})}/>
}
