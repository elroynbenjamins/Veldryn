export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};

function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const theme=read('src/theme/theme.ts');
ok(theme.includes('accentSurface:string'),'Theme colors must expose a semantic accent surface');
ok(theme.includes('special:string')&&theme.includes('specialSurface:string'),'Theme colors must expose a theme-safe special/discovery accent');
for(const token of ["accentSurface:'#2B2417'","accentSurface:'#332A12'","accentSurface:'#FFF2D0'","special:'#C79AF3'","special:'#D3A7FF'","special:'#6F3F8F'","specialSurface:'#261A33'","specialSurface:'#2A1B39'","specialSurface:'#F0E4F7'"]){
  ok(theme.includes(token),'All three themes must define '+token);
}

const checks:Array<[string,string[],string[]]>= [
  ['src/components/SearchField.tsx',['backgroundColor:C.inputBg','focused:{borderColor:C.selectionLine}'],["backgroundColor:'#101B27'","focused:{borderColor:'#8BAFC2'}"]],
  ['src/components/SettingToggle.tsx',['backgroundColor:C.panel','backgroundColor:C.panel2','backgroundColor:C.selection','backgroundColor:C.selectionLine'],["backgroundColor:'#101B27'","backgroundColor:'#263449'","backgroundColor:'#234C65'","backgroundColor:'#B8E5F5'"]],
  ['src/components/StatBar.tsx',['backgroundColor:C.panel2'],["backgroundColor:'#080c12'"]],
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
  ['src/screens/ProgressionPlannerScreen.tsx',['backgroundColor:C.goodSurface','backgroundColor:C.infoSurface','backgroundColor:C.overlay'],["backgroundColor:'#14261d'","backgroundColor:'#102536'","backgroundColor:'#0008'"]],
  ['src/screens/ClassSelectScreen.tsx',['backgroundColor:C.badSurface'],["backgroundColor:'#2a1b20'"]],
  ['src/screens/CombatScreen.tsx',["C.dark?'rgba(7,12,20,.8)':'rgba(255,255,255,.78)'"],["shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(7,12,20,.8)'"]],
  ['src/screens/RankingsScreen.tsx',['chipTextSelected:{color:C.text}','backgroundColor:C.accentSurface','backgroundColor:C.panel2','youText:{fontSize:6.5,color:C.text'],["chipTextSelected:{color:'#d9f3ff'}","backgroundColor:'#302713'","backgroundColor:'#202833'","backgroundColor:'#2d2118'","youText:{fontSize:6.5,color:'#d9f3ff'"]],
  ['src/screens/EventScreen.tsx',['backgroundColor:C.accentSurface','backgroundColor:C.goodSurface','tabActive:{backgroundColor:C.selection}'],["backgroundColor:'#20180f'","backgroundColor:'#2b2317'","backgroundColor:'#17352a'","tabActive:{backgroundColor:'#20384A'}"]],
  ['src/components/RewardPopup.tsx',['backgroundColor:C.accentSurface','backgroundColor:C.goodSurface','backgroundColor:C.warningSurface','backgroundColor:C.infoSurface','backgroundColor:C.specialSurface','color:C.special'],["backgroundColor:'#05090f'","backgroundColor:'#2b2417'","backgroundColor:'#14261d'","backgroundColor:'#132333'","backgroundColor:'#332515'","#cba0f5","#d6b1ee","#f4d8ff","#5d3674"]],
  ['src/screens/QuestScreen.tsx',['C.special'],['#b88ae3']],
];

for(const [path,required,forbidden] of checks){
  const source=read(path);
  for(const token of required)ok(source.includes(token),path+' must keep semantic theme token '+token);
  for(const token of forbidden)ok(!source.includes(token),path+' must not regress to dark-only UI literal '+token);
}
console.log('PASS: shared UI surfaces remain compatible with Veldryn, Obsidian Contrast, and Ivory Steel');
