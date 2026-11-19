import type {GameState} from './types';
import {dailySuppliesStatus,dailySupplyActiveLabels,dailySupplyBank,dailySupplyBoostLabel,dailySupplyBonusText} from './daily-supplies';

export interface DailySuppliesHomeSummary{
 visible:boolean;
 canClaim:boolean;
 claimLabel?:string;
 activeLabel?:string;
 activeRemainingSeconds?:number;
 bankedCharges:number;
}
export function dailySuppliesHomeSummary(state:GameState,nowMs=Date.now()):DailySuppliesHomeSummary{
 const status=dailySuppliesStatus(state,nowMs),active=dailySupplyActiveLabels(state),bank=dailySupplyBank(state);
 const bankedCharges=Object.values(bank).reduce((sum,value)=>sum+(value?.length??0),0);
 const claimLabel=status.canClaim
  ? status.reward.kind==='milestone'
   ? 'Supply Blessing · '+dailySupplyBonusText(status.reward.bonus)+' of your choice · '+Math.round(status.reward.seconds/3600)+'h'
   : '+'+Math.round(status.reward.seconds/3600)+'h · '+dailySupplyBonusText(status.reward.bonus)+' '+dailySupplyBoostLabel(status.reward.type)
  :undefined;
 return {visible:status.canClaim||active.length>0||bankedCharges>0,canClaim:status.canClaim,claimLabel,
  activeLabel:active.length===1?dailySupplyBonusText(active[0].bonus)+' '+active[0].label:active.length?active.length+' boosts active':undefined,
  activeRemainingSeconds:active.length?Math.max(...active.map(row=>row.remainingSeconds)):undefined,bankedCharges};
}
