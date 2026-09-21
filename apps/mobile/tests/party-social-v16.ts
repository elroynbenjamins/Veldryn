import {
  filterRecruitmentCards,
  partyOpenSpots,
  personalContributionEligible,
  recruitmentTimeLabel,
  recruitmentPostTypePresentation,
  recruitmentContextLabels,
  shouldShowPartyChat,
  type PartyContractView,
  type PersistentPartySummary,
  type RecruitmentCardView,
  contractProgressPercent,
  contractEligibilityLabel,
} from '../src/core/party-social';
function assert(value: unknown,message:string): asserts value { if(!value) throw new Error(message); }
const party:PersistentPartySummary={id:'p',focus:'mixed',maxMembers:4,members:[{accountId:'a1',characterId:'c1',characterName:'A',className:'Wayfinder',role:'damage',isLeader:true}]};
assert(partyOpenSpots(party)===3,'party open spots');
assert(shouldShowPartyChat(party,'a1'),'member sees party chat');
assert(!shouldShowPartyChat(party,'a2'),'nonmember must not see party chat');
assert(!shouldShowPartyChat(null,'a1'),'Party Chat disappears after leaving or disbanding');
const contract:PartyContractView={id:'c',name:'Weekly',category:'mixed',cadence:'weekly',endsAtMs:10,totalPoints:100,targetPoints:500,minimumPersonalPoints:40,personalPoints:39,objectives:[]};
assert(!personalContributionEligible(contract),'minimum personal contribution should be visible to client');
const now=Date.UTC(2026,8,12,12);assert(recruitmentTimeLabel(now+5*3600000,now).urgency==='soon','six-hour expiry warning');
const card:RecruitmentCardView={id:'r',postType:'looking_for_party',ownerName:'A',title:'Weekend party',body:'Mixed contracts',roles:['damage'],focus:'mixed',activityTags:['contracts'],playstyleTags:['casual'],availabilityTags:['weekends'],guildInterestTags:[],expiresAtMs:now+86400000};
assert(filterRecruitmentCards([card],{query:'weekend',postTypes:['looking_for_party'],focuses:['mixed'],roles:['damage'],activityTags:['contracts']}).length===1,'filters should compose');
const filters={query:'',postTypes:[],focuses:[],roles:[],activityTags:[],availabilityTags:['weekends'],playstyleTags:['casual'],region:'eu',maxMinCombatLevel:20};
assert(filterRecruitmentCards([{...card,region:'EU',minCombatLevel:10}],filters,now).length===1,'extended availability/playstyle/region/level filters');
assert(filterRecruitmentCards([{...card,expiresAtMs:now}],{...filters,region:undefined},now).length===0,'expired cards disappear at the exact deadline');
assert(filterRecruitmentCards([{...card,status:'closed'}],{...filters,region:undefined},now).length===0,'closed advert cannot remain visible');
assert(recruitmentPostTypePresentation('looking_for_party').shortLabel==='LFG','Looking for Party uses compact LFG identity');
assert(recruitmentPostTypePresentation('party_recruiting').shortLabel==='LFM','Party recruiting uses compact LFM identity');
assert(recruitmentPostTypePresentation('looking_for_guild').subject==='PLAYER','Guild seeker is presented as a player identity');
assert(recruitmentPostTypePresentation('guild_recruiting').subject==='GUILD','Guild recruiting is presented as a Guild identity');
const context=recruitmentContextLabels({...card,activityLevel:'active',language:'English',region:'eu',minCombatLevel:12,minTotalLevel:80});
assert(context.includes('Active')&&context.includes('English')&&context.includes('EU'),'Recruitment context keeps pace/language/region');
assert(context.includes('Combat 12+')&&context.includes('Total 80+'),'Recruitment context shows exact level requirements');
const v161Contract:PartyContractView={id:'c161',name:'Mixed weekly',focus:'mixed',description:'',targetPoints:4000,totalPoints:2100,combatPoints:1200,skillingPoints:900,personalPoints:400,eligible:true,complete:false,expiresAt:'2026-09-14T00:00:00Z'};
assert(contractProgressPercent(v161Contract)===53,'v16.1 presentation progress');
assert(contractEligibilityLabel(v161Contract)==='Reward eligible','v16.1 eligibility label');
console.log('mobile party social v16 tests passed');
