import {SocialScreen} from './SocialScreen';
/** Dedicated Party route. Keep shared server-authoritative party operations in SocialScreen. */
export function PartyScreen({characterLevel,partyUnlocked,onAccount,onRecruitment,onInvitationsChanged}:{characterLevel:number;partyUnlocked:boolean;onAccount:()=>void;onRecruitment:(area:'party'|'guild')=>void;onInvitationsChanged?:()=>void}){
 return <SocialScreen mode="party" initialTab="party" characterLevel={characterLevel} partyUnlocked={partyUnlocked} onAccount={onAccount} onGuild={()=>onRecruitment('guild')} onRecruitment={onRecruitment} onInvitationsChanged={onInvitationsChanged}/>;
}
