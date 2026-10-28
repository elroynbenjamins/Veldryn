import {canManageGuild,guildRecruitmentVisible,guildMemberManagement} from '../src/core/social-management';
import type {RecruitmentPostType} from '../src/core/party-social';

function check(actual:boolean,expected:boolean,why:string){
 if(actual!==expected)throw new Error(why+': '+String(actual)+' !== '+String(expected));
}
for(const role of ['leader','officer','member',null,undefined] as const)
 check(canManageGuild(role),role==='leader'||role==='officer','Guild management access: '+role);
for(const postType of ['looking_for_guild','guild_recruiting','looking_for_party','party_recruiting'] as RecruitmentPostType[]){
 check(guildRecruitmentVisible({postType},null,'guild'),postType==='looking_for_guild'||postType==='guild_recruiting','Guild feed type: '+postType);
 check(guildRecruitmentVisible({postType},{guild_id:'G1',role:'member'},'party'),postType==='looking_for_party'||postType==='party_recruiting','Party feed type: '+postType);
}
const officer=guildMemberManagement('officer','member',false);
check(officer.canRemove,true,'Officers can remove regular members');
check(officer.canTransferLeadership,false,'Officers cannot transfer leadership');
const self=guildMemberManagement('leader','member',true);
check(self.canRemove,false,'Leader cannot remove self');
console.log('PASS: Guild role and recruitment context helpers');
