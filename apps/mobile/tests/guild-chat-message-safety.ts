import {normalizeGuildChatMessages} from '../src/core/guild-chat-message-safety';

function ok(value:unknown,message:string):asserts value {if(!value)throw new Error(message);}
function eq(actual:unknown,expected:unknown,message:string){ok(JSON.stringify(actual)===JSON.stringify(expected),message+': '+JSON.stringify(actual));}

// Reproduce the known production shape: two members, an officer sending four
// ordinary messages, and a leader receiving them; no private text is copied.
const history=Array.from({length:4},(_,index)=>({
 id:'message-'+index,account_id:'officer-account',sender_name:'Guild Officer',
 body:index===1?'We are preparing the next guild expedition.':'Hello!',
 created_at:new Date(Date.UTC(2026,9,26,0,index,0)).toISOString(),
 guild_tag:'SOV',guild_tag_color_id:'tag_silver',guild_role:'officer',
}));
const normal=normalizeGuildChatMessages(history);
ok(normal.length===4,'All authorized Sovereign-shaped messages remain visible.');
eq(normal.map(row=>row.id),history.map(row=>row.id),'Message order and read-cursor IDs are preserved.');
ok(normal.every(row=>row.guild_role==='officer'&&row.guild_tag==='SOV'),'Officer badges and guild tag remain visible.');
ok(normal[1].body===history[1].body,'Valid message text remains unchanged.');
const leader=normalizeGuildChatMessages([{...history[0],id:'leader-message',guild_role:'leader'}]);
ok(leader[0].guild_role==='leader','Leader badge remains available.');

const malformed=normalizeGuildChatMessages([
 {...history[0],id:'bad-identity',sender_name:null,body:0,created_at:'not a date',guild_role:'guild_master',
 guild_tag:'INVALID',player_name_style:{mode:'gradient',gradientColors:{broken:true}},player_badges:{staff:['admin'],validUntilMs:'never'}},
 {...history[1],id:'bad-style',player_name_style:{mode:'gradient',gradientColors:[42,'#abc',null],animation:'flow'}},
 {...history[2],id:'bad-badge',player_badges:{staff:'admin',supporter:true,validUntilMs:9999999999999}},
 {id:'no-text',account_id:null,body:'Still readable',sender_name:{unexpected:true},created_at:null},
 {...history[0],id:'bad-identity'},null,{body:'no id'},'garbled',
]);
eq(malformed.map(row=>row.id),['bad-identity','bad-style','bad-badge','no-text'],'Malformed or duplicate IDs are excluded without discarding valid messages.');
ok(malformed[0].sender_name==='Adventurer'&&malformed[0].body==='Message unavailable'&&malformed[0].created_at==='','Unexpected sender, text and date values fall back safely.');
ok(malformed[0].guild_role===null&&malformed[0].guild_tag===null,'Unknown role and tag do not reach native badges.');
ok(!malformed[0].player_badges&&!malformed[0].player_name_style,'Malformed cosmetics do not reach native components.');
ok(malformed[1].player_name_style?.mode==='solid','Partially valid gradients safely degrade to a solid name.');
ok(malformed[2].player_badges?.staff==='admin','Valid projected badges are preserved.');
ok(malformed[3].body==='Still readable'&&malformed[3].account_id==='','A missing account identity does not discard safe text.');
eq(normalizeGuildChatMessages(null),[],'Missing history is treated as empty.');
eq(normalizeGuildChatMessages({messages:history}),[],'Non-array history cannot break ChatLog.');
console.log('PASS: Guild Chat leader/officer history, plain text preservation, malformed payload and cosmetics resilience');
