import {guildMemberManagement,partyMemberManagement} from '../src/core/social-management';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
function ok(value:unknown,message:string){if(!value)fail(message)}

const partyLeader=partyMemberManagement(true,'leader','member');
ok(partyLeader.canTransfer&&partyLeader.canRemove,'Party leader can transfer leadership and remove another member');
const partySelf=partyMemberManagement(true,'leader','leader');
equal(partySelf.canTransfer,false,'Party leader cannot transfer leadership to self');
equal(partySelf.canRemove,false,'Party leader cannot kick self');
const partyMember=partyMemberManagement(false,'member','other');
equal(partyMember.canTransfer,false,'Ordinary Party member cannot transfer leadership');
equal(partyMember.canRemove,false,'Ordinary Party member cannot kick others');

const leaderMember=guildMemberManagement('leader','member',false);
ok(leaderMember.canPromote&&leaderMember.canRemove&&leaderMember.canTransferLeadership&&!leaderMember.canDemote,'Guild leader can promote/remove or transfer leadership to ordinary members');
const leaderOfficer=guildMemberManagement('leader','officer',false);
ok(leaderOfficer.canDemote&&leaderOfficer.canRemove&&leaderOfficer.canTransferLeadership&&!leaderOfficer.canPromote,'Guild leader can demote/remove or transfer leadership to officers');
const officerMember=guildMemberManagement('officer','member',false);
ok(officerMember.canRemove&&!officerMember.canPromote&&!officerMember.canDemote&&!officerMember.canTransferLeadership,'Guild officer can remove ordinary members only');
const officerOfficer=guildMemberManagement('officer','officer',false);
equal(Object.values(officerOfficer).some(Boolean),false,'Guild officer cannot manage another officer');
const leaderTarget=guildMemberManagement('leader','leader',false);
equal(Object.values(leaderTarget).some(Boolean),false,'Guild leader role is protected from member controls');
const selfTarget=guildMemberManagement('leader','member',true);
equal(Object.values(selfTarget).some(Boolean),false,'Guild member controls cannot target self');

console.log('PASS: Party/Guild member management permission matrix');
