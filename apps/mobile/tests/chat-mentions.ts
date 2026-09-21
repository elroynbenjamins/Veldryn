import {applyChatMentionSuggestion,chatMentionQueryAtEnd,chatMentionSegments,chatMentionSuggestions,messageMentionsName} from '../src/core/chat-mentions';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
function ok(value:unknown,message:string){if(!value)fail(message)}

ok(messageMentionsName('Nice pull @Aelric','Aelric'),'Direct mention matches current player');
ok(messageMentionsName('Thanks @Iron Warden!','Iron Warden'),'Names with spaces can be mentioned');
equal(messageMentionsName('Thanks Aelric','Aelric'),false,'Plain names are not mentions');
equal(messageMentionsName('Ping @Aelric','Eira'),false,'Other player mention is not a self mention');

const segments=chatMentionSegments('Hi @Eira, ask @Iron-Warden too.','Eira');
equal(segments.find(row=>row.text.toLowerCase()==='@eira')?.kind,'self_mention','Current player mention receives self treatment');
equal(segments.find(row=>row.text.toLowerCase()==='@iron-warden')?.kind,'mention','Other mention receives ordinary mention treatment');

const spaced=chatMentionSegments('Welcome @Iron Warden to the group.','Iron Warden');
equal(spaced.find(row=>row.text.toLowerCase()==='@iron warden')?.kind,'self_mention','Current player names with spaces remain one highlighted segment');

console.log('PASS: chat mention parsing and self-highlight');

const query=chatMentionQueryAtEnd('Hello @Ir');
equal(query?.query,'ir','Mention query is read from the end of the draft');
const suggestions=chatMentionSuggestions('Hello @I',['Eira','Iron Warden','Isolde','Iron Warden'],'Eira');
equal(suggestions.join('|'),'Iron Warden|Isolde','Mention suggestions are prefix-filtered, deduplicated and exclude self');
equal(applyChatMentionSuggestion('Hello @Ir','Iron Warden'),'Hello @Iron Warden ','Mention suggestion replaces the active query');
equal(chatMentionQueryAtEnd('email@test')===null,true,'At-sign inside a word does not open suggestions');
