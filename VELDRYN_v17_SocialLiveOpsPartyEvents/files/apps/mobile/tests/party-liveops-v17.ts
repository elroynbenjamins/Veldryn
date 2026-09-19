import { milestoneProgressPercent, nextUnreachedMilestone, type LiveOpsMilestoneView } from '../src/core/party-social';
function assert(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
const milestones:LiveOpsMilestoneView[]=[{points:250,reached:true,claimed:true},{points:750,reached:true,claimed:false},{points:1500,reached:false,claimed:false}];
assert(milestoneProgressPercent(375,750)===50,'milestone percent');
assert(nextUnreachedMilestone(800,milestones)?.points===1500,'next unreached milestone');
console.log('mobile-party-liveops-v17 ok');
