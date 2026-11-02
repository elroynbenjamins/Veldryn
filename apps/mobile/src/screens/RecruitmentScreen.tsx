import {SocialScreen} from './SocialScreen';
/** Dedicated Recruitment route, with independently selected Party and Guild boards. */
export function RecruitmentScreen({initialArea='party',characterLevel,partyUnlocked,onParty,onGuild,onAccount,onAreaChange,onInvitationsChanged}:{initialArea?:'party'|'guild';characterLevel:number;partyUnlocked:boolean;onParty:()=>void;onGuild:()=>void;onAccount:()=>void;onAreaChange?:(area:'party'|'guild')=>void;onInvitationsChanged?:()=>void}){
 return <SocialScreen mode="recruitment" initialTab={initialArea} characterLevel={characterLevel} partyUnlocked={partyUnlocked} onTabChange={tab=>{if(tab==='party'||tab==='guild')onAreaChange?.(tab)}} onParty={onParty} onGuild={onGuild} onAccount={onAccount} onInvitationsChanged={onInvitationsChanged}/>;
}
