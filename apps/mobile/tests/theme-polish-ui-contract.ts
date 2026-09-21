export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};

function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const theme=read('src/theme/theme.ts');
ok(theme.includes('accentSurface:string'),'Theme colors must expose a semantic accent surface');
for(const token of ["accentSurface:'#2B2417'","accentSurface:'#332A12'","accentSurface:'#FFF2D0'"]){
  ok(theme.includes(token),'All three themes must define '+token);
}

const checks:Array<[string,string[],string[]]>= [
  ['src/components/PrimaryNavigation.tsx',['C.notification','C.notificationText'],['#d93646',"color:'#fff'"]],
  ['src/components/GameTopBar.tsx',['backgroundColor:C.good','C.dark?C.bg:C.primaryButtonText'],['#49d783','#1a1205']],
  ['src/components/ActiveActivityBar.tsx',['backgroundColor:C.panel','borderBottomColor:C.bad','borderBottomColor:C.info','backgroundColor:C.panel2'],['#101724','#A74D58','#3D93A8','#273142']],
  ['src/components/ConfirmModal.tsx',['backgroundColor:C.overlay'],["rgba(4,8,14,.82)"]],
  ['src/components/ItemCard.tsx',['backgroundColor:C.warningSurface'],["backgroundColor:'#332515'"]],
  ['src/components/RecipeCard.tsx',['backgroundColor:C.goodSurface','backgroundColor:C.warningSurface'],["backgroundColor:'#172b24'","backgroundColor:'#332515'"]],
  ['src/screens/QuestScreen.tsx',['C.goodSurface','filterTextSelected:{color:C.text}'],["'#14272A'","filterTextSelected:{color:'#d9f3ff'}"]],
  ['src/screens/SocialScreen.tsx',['accentSurface={C.infoSurface}','backgroundColor:C.badSurface'],['accentSurface="#102536"',"backgroundColor:'#2a1b20'"]],
  ['src/screens/GuildScreen.tsx',['tabTextSelected:{color:C.text}','backgroundColor:C.bad'],["tabTextSelected:{color:'#d9f3ff'}","backgroundColor:'#b85c68'"]],
  ['src/screens/AchievementsScreen.tsx',['filterTextSelected:{color:C.text}'],["filterTextSelected:{color:'#d9f3ff'}"]],
  ['src/screens/CompanionsScreen.tsx',['backgroundColor:C.warningSurface'],["backgroundColor:'#332515'"]],
  ['src/screens/DailySuppliesScreen.tsx',['backgroundColor:C.goodSurface','backgroundColor:C.overlay'],["backgroundColor:'#172b24'","backgroundColor:'#0009'"]],
  ['src/screens/WorldScreen.tsx',['backgroundColor:C.infoSurface'],["backgroundColor:'#102536'"]],
  ['src/screens/CollectionsScreen.tsx',['backgroundColor:C.accentSurface','backgroundColor:C.stage'],["backgroundColor:'#272417'","backgroundColor:'#101923'"]],
  ['src/screens/EventScreen.tsx',['backgroundColor:C.accentSurface','backgroundColor:C.goodSurface','tabActive:{backgroundColor:C.selection}'],["backgroundColor:'#20180f'","backgroundColor:'#2b2317'","backgroundColor:'#17352a'","tabActive:{backgroundColor:'#20384A'}"]],
  ['src/components/RewardPopup.tsx',['backgroundColor:C.accentSurface','backgroundColor:C.goodSurface','backgroundColor:C.warningSurface','backgroundColor:C.infoSurface'],["backgroundColor:'#05090f'","backgroundColor:'#2b2417'","backgroundColor:'#14261d'","backgroundColor:'#132333'","backgroundColor:'#332515'"]],
];

for(const [path,required,forbidden] of checks){
  const source=read(path);
  for(const token of required)ok(source.includes(token),path+' must keep semantic theme token '+token);
  for(const token of forbidden)ok(!source.includes(token),path+' must not regress to dark-only UI literal '+token);
}
console.log('PASS: shared UI surfaces remain compatible with Veldryn, Obsidian Contrast, and Ivory Steel');
