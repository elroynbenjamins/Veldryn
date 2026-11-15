/**
 * Presentation-only adapter for the existing Fallen Knight settlement message.
 * The settlement remains authoritative and this parser never grants rewards.
 * Unknown formats retain their original copy rather than hiding a reward.
 */
export type StoryBossLootDisplay={name:string;quantity:number};
export type StoryBossRewardDisplay={
  gold:number|null;
  xp:number|null;
  essence:number|null;
  bondstones:number|null;
  bondstoneCapped:boolean;
  weeklyClear:string|null;
  bountyCompleted:boolean;
  bounty:StoryBossLootDisplay[];
  drops:StoryBossLootDisplay[];
  recognized:boolean;
};

function amount(message:string,label:string){
  const match=message.match(new RegExp('\\+([\\d,]+)\\s+'+label+'\\b','i'));
  return match?Number(match[1].replace(/,/g,'')):null;
}

function lootList(text:string):StoryBossLootDisplay[]{
  if(!text||/^no (?:bonus |item )?drops?$/i.test(text.trim()))return [];
  return text.split(/,\s*(?=\d+\s*(?:[×x]|\s))/i).map(chunk=>{
    const match=chunk.trim().match(/^(\d+)\s*(?:[×x]\s*|\s+)(.+)$/i);
    return match?{quantity:Number(match[1]),name:match[2].trim().replace(/\.$/,'')}:null;
  }).filter((row):row is StoryBossLootDisplay=>Boolean(row&&row.quantity>0&&row.name));
}

export function storyBossRewardDisplay(message:string):StoryBossRewardDisplay{
  const clean=message.trim();
  const gold=amount(clean,'Gold'),xp=amount(clean,'XP'),essence=amount(clean,'(?:Companion\\s+)?Essence');
  const bondstones=amount(clean,'Bondstones?');
  const weeklyClear=clean.match(/weekly clear\s+(\d+\s*\/\s*\d+)/i)?.[1].replace(/\s/g,'')??null;
  const bounty=clean.match(/Oathglass Bounty completed:\s*(.*?)(?=\s*·\s*Boss drops:|$)/i);
  const drops=clean.match(/Boss drops:\s*(.*)$/i);
  const dropText=drops?.[1].split(/\s*·\s*/)[0].trim().replace(/\.$/,'')??'';
  return {
    gold,xp,essence,bondstones,
    bondstoneCapped:/Bondstone weekly cap already reached/i.test(clean),
    weeklyClear,
    bountyCompleted:Boolean(bounty),
    bounty:lootList(bounty?.[1]??''),
    drops:lootList(dropText),
    recognized:gold!==null||xp!==null||Boolean(bounty)||Boolean(drops),
  };
}
