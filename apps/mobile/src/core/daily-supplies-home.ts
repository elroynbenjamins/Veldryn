import type {GameState} from './types';
import {DAILY_SUPPLY_BONUS,dailySuppliesStatus,dailySupplyActiveLabels,dailySupplyBank,dailySupplyBoostLabel} from './daily-supplies';

export interface DailySuppliesHomeSummary{
  visible:boolean;
  canClaim:boolean;
  claimLabel?:string;
  activeLabel?:string;
  activeRemainingSeconds?:number;
  bankedCharges:number;
}

export function dailySuppliesHomeSummary(state:GameState,nowMs=Date.now()):DailySuppliesHomeSummary{
  const status=dailySuppliesStatus(state,nowMs),active=dailySupplyActiveLabels(state.character),bank=dailySupplyBank(state.character);
  const bankedCharges=Object.values(bank).reduce((sum,value)=>sum+(value??0),0);
  const claimLabel=status.canClaim
    ? status.reward.kind==='premium'
      ? `+${status.reward.amount} premium currency`
      : `+2h · +${Math.round(DAILY_SUPPLY_BONUS*100)}% ${dailySupplyBoostLabel(status.reward.type)}`
    : undefined;
  return {
    visible:status.canClaim||active.length>0||bankedCharges>0,
    canClaim:status.canClaim,
    claimLabel,
    activeLabel:active.length===1?`+${Math.round(DAILY_SUPPLY_BONUS*100)}% ${active[0].label}`:active.length?`${active.length} boosts active`:undefined,
    activeRemainingSeconds:active.length?Math.max(...active.map(row=>row.remainingSeconds)):undefined,
    bankedCharges,
  };
}
