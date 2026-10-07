import {Text,View} from 'react-native';
import type {PartyContractView} from '../core/party-social';
import {weeklyLadderSummary,weeklyTierLabel} from '../core/party-weekly-tiers';
import {useGameTheme} from '../theme/ThemeContext';
import {ContractProgress} from './ContractProgress';
import {SocialActionButton} from './SocialActionButton';
import {ResourceIcon} from './ResourceIcon';

export function PartyWeeklyLadder({contract,nowMs,compact=false,onClaimReward}:{contract:PartyContractView;nowMs:number;compact?:boolean;onClaimReward?:(id:string)=>void}) {
  const C=useGameTheme(),st=(key:string,params?:Record<string,string|number>)=>key.replace(/\{(\w+)\}/g,(_,name)=>String(params?.[name]??`{${name}}`));
  const tiers=contract.tiers??[],summary=weeklyLadderSummary(tiers);
  const expired=(contract.endsAtMs??Infinity)<=nowMs;
  const target=summary.next??summary.earned;
  const hoursLeft=Math.max(0,Math.ceil(((contract.endsAtMs??nowMs)-nowMs)/3600000));
  const number=(n:number)=>n.toLocaleString();
  return <View style={{gap:16,...(!compact?{backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:16,padding:16}:{})}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
      <Text style={{fontSize:11,letterSpacing:1.3,fontWeight:'600',color:C.muted}}>{st('WEEKLY PARTY')}</Text>
      <Text style={{fontSize:12,color:C.muted}}>{expired?st('Week ended'):st('{count}h left',{count:hoursLeft})}</Text>
    </View>
    <View style={{gap:5}}>
      <Text style={{fontSize:compact?22:26,lineHeight:32,color:C.text,fontWeight:'600'}}>{summary.earned?st('{tier} reached',{tier:st(weeklyTierLabel(summary.earned.tier))}):st('Adventure together')}</Text>
      <Text style={{fontSize:13,lineHeight:20,color:C.muted}}>{st('{hours} shared hours',{hours:(contract.totalPoints/1000).toLocaleString(undefined,{maximumFractionDigits:1})})}{summary.next?' · '+st('Next: {tier}',{tier:st(weeklyTierLabel(summary.next.tier))}):' · '+st('All tiers reached')}</Text>
    </View>
    {target&&<ContractProgress tone="good" label={st('Party progress · {tier}',{tier:st(weeklyTierLabel(target.tier))})} current={contract.totalPoints} total={target.targetPoints}/>}
    {compact?<>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{tiers.map(t=><View key={t.tier} style={{paddingHorizontal:9,paddingVertical:6,borderRadius:7,backgroundColor:t.reached?C.goodSurface:C.panel2}}><Text style={{fontSize:11,color:t.reached?C.good:C.muted}}>{t.reached?'✓ ':''}{st(weeklyTierLabel(t.tier))}</Text></View>)}</View>
      {summary.claimable.length>0&&<Text style={{fontSize:13,color:C.good}}>{st('{gold} gold ready to claim',{gold:number(summary.claimable.reduce((sum,t)=>sum+t.gold,0))})}</Text>}
    </>:<>
      <Text style={{fontSize:13,lineHeight:20,color:C.muted}}>{st('Combat and gathering count equally. 1 hour = 1,000 points. Resets Monday, 00:00 UTC.')}</Text>
      <View style={{padding:12,gap:8,borderRadius:10,backgroundColor:C.panel2}}>
        <ContractProgress personal tone="good" label={summary.personalNext?st('Your contribution · {tier}',{tier:st(weeklyTierLabel(summary.personalNext.tier))}):st('Your contribution')} current={contract.personalPoints??0} total={summary.personalNext?.minimumPersonalPoints??6400}/>
        <Text style={{fontSize:12,lineHeight:18,color:C.muted}}>{st('Contribute 8% of each tier’s target to qualify. Rewards are per player.')}</Text>
      </View>
      <View style={{gap:0}}>{tiers.map(t=>{
        const ready=summary.claimable.some(row=>row.tier===t.tier);
        const status=t.claimed?st('Claimed'):ready?st('Ready to claim'):t.reached?(t.qualified?st('Reward pending'):st('More contribution needed')):st('Not reached');
        return <View key={t.tier} style={{paddingVertical:15,borderTopWidth:1,borderColor:C.line,gap:10}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
            <View style={{width:34,height:38,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:t.reached?C.good:C.line,backgroundColor:t.reached?C.goodSurface:C.panel2}}><Text accessibilityLabel={status} style={{color:t.reached?C.good:C.muted,fontSize:18}}>{t.reached?'✓':'◇'}</Text></View>
            <View style={{flex:1,minWidth:0,gap:3}}><Text style={{fontSize:16,fontWeight:'600',color:C.text}}>{st(weeklyTierLabel(t.tier))}</Text><Text style={{fontSize:12,color:C.muted}}>{st('{hours} shared hours',{hours:t.targetPoints/1000})}</Text></View>
            <View style={{alignItems:'flex-end',gap:3}}><View style={{flexDirection:'row',alignItems:'center',gap:4}}><ResourceIcon resourceId="gold" size={17}/><Text style={{fontSize:16,fontWeight:'600',color:C.text}}>+{number(t.gold)}</Text></View><Text style={{fontSize:11,color:C.muted}}>{st('{gold} total',{gold:number(t.cumulativeGold)})}</Text></View>
          </View>
          {ready?<SocialActionButton primary label={st('Claim {gold} gold',{gold:number(t.gold)})} disabled={!onClaimReward} onPress={()=>{if(t.rewardId)onClaimReward?.(t.rewardId)}}/>:<Text style={{fontSize:12,lineHeight:18,color:t.claimed?C.good:C.muted}}>{status}{!t.claimed&&!t.qualified?' · '+st('{points} personal points left',{points:number(Math.max(0,t.minimumPersonalPoints-(contract.personalPoints??0)))}):''}</Text>}
        </View>;
      })}</View>
      <Text style={{fontSize:12,lineHeight:18,color:C.muted}}>{st('Claim each tier as you earn it. Keep contributing for bigger rewards.')}</Text>
    </>}
  </View>;
}
