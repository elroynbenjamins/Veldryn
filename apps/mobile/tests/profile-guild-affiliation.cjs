const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.join(__dirname,'../src');
function load(file,dependencies={}){const sandbox={exports:{},require:name=>dependencies[name]??{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,sandbox);return sandbox.exports}
(async()=>{
 const {localProfileGuild}=load('core/profile-guild.ts');
 assert.equal(localProfileGuild({account:{guildMember:false,guildBannerId:'world_tree_green'}}),null);
 assert.equal(localProfileGuild({account:{guildMember:true,guildBannerId:'phoenix_crimson'}}).bannerId,'phoenix_crimson');
 let query=[];const mockClient={from:table=>({select:fields=>({eq:(key,value)=>({maybeSingle:async()=>{query.push({table,fields,key,value});return {data:{id:'g1',name:'The Bloomwardens',tag:'BLM',tag_color_id:'tag_emerald',name_color_id:'name_emerald',banner_id:'world_tree_green'},error:null}}})})})};
 const social=load('online/social.ts',{'./supabase':{supabase:mockClient}});
 const guild=await social.profileGuildByTag('BLM');assert.equal(guild.name,'The Bloomwardens');assert.equal(guild.bannerId,'world_tree_green');assert.equal(query[0].table,'guilds');assert.equal(query[0].key,'tag');assert.equal(query[0].value,'BLM');
 const fixture={accountId:'player',character:{name:'Aster'},masteryShowcaseActionIds:[]};
 let profileResult=fixture,tag='BLM',lookupCount=0,fail=false,gone=false;
 const profiles=load('online/profile-extension-v43.ts',{
  './supabase':{supabase:{rpc:async()=>({data:profileResult,error:null})}},
  './social':{guildIdentities:async()=>new Map([['player',{guild_tag:tag,guild_tag_color_id:'tag_emerald'}]]),profileGuildByTag:async()=>{lookupCount++;if(fail)throw Error('offline');return gone?null:guild}},
 });
 assert.equal((await profiles.publicPlayerProfileV43('player')).guild.name,'The Bloomwardens');
 fail=true;const fallback=await profiles.publicPlayerProfileV43('player');assert.equal(fallback.guild.tag,'BLM');assert.equal(fallback.guild.bannerId,undefined,'failed lookup must not invent heraldry');
 fail=false;gone=true;assert.equal((await profiles.publicPlayerProfileV43('player')).guild,null);
 tag=null;lookupCount=0;assert.equal((await profiles.publicPlayerProfileV43('player')).guild,null);assert.equal(lookupCount,0);
 profileResult=null;tag='BLM';assert.equal(await profiles.publicPlayerProfileV43('player'),null);assert.equal(lookupCount,0,'hidden profiles never trigger guild enrichment');
 const personal=fs.readFileSync(path.join(root,'components/ProfileScenePreview.tsx'),'utf8');
 assert.ok(!personal.includes('ProfileGuildAffiliation'),'Personal card has no guild button');
 assert.ok(personal.includes('PLAYER SHOWCASE')&&personal.includes('s.identityPlate'),'Personal identity overlays the artwork');
 assert.ok(!personal.includes('s.info'),'Personal card has no separate details footer');
 assert.ok(fs.readFileSync(path.join(root,'screens/ProfileScreen.tsx'),'utf8').includes('showGuild={false}'),'Online self profile also hides the guild button');
 let detailsCalls=0,tagCalls=0,unavailable=false;
 const cards=load('online/profile-guild-card.ts',{'./social':{
  profileGuildByTag:async()=>{tagCalls++;return unavailable?null:{id:'g1'}},
  guildDetails:async id=>{detailsCalls++;assert.equal(id,'g1');return {id,name:'Wardens of the Silver',tag:'BLM',level:12,banner_id:'world_tree_green',profile_frame_id:'silver_fellowship',background_id:'forest_sanctum',motto:'Together.'}},
 }});
 assert.equal((await cards.loadProfileGuildCard({name:'Local Guild',level:1})).name,'Local Guild');assert.equal(detailsCalls,0);
 const full=await cards.loadProfileGuildCard({id:'g1',name:'Stale name'});assert.equal(full.name,'Wardens of the Silver');assert.equal(full.frameId,'silver_fellowship');assert.equal(full.backgroundId,'forest_sanctum');assert.equal(tagCalls,0);
 await cards.loadProfileGuildCard({tag:'BLM'});assert.equal(tagCalls,1);assert.equal(detailsCalls,2);
 unavailable=true;await assert.rejects(cards.loadProfileGuildCard({tag:'GON'}),/Guild unavailable/);assert.equal(detailsCalls,2);
 const link=fs.readFileSync(path.join(root,'components/ProfileGuildAffiliation.tsx'),'utf8');
 assert.ok(link.includes('accessibilityRole="button"'));assert.ok(link.includes('<ProfileGuildCardModal'));assert.ok(!link.includes('GuildBannerArtwork'));
 const scene=fs.readFileSync(path.join(root,'components/PublicProfileScene.tsx'),'utf8');assert.ok(scene.includes('s.guildAnchor'));assert.ok(scene.includes("left:22,bottom:20"));assert.ok(!scene.includes('guildFooter'));
 assert.ok(link.includes('minHeight:28')&&link.includes('hitSlop='),'Slim visual keeps an extended touch area');
 assert.ok(scene.includes("CLASSES.find(row=>row.id===classId)!.name"),'Public class uses its authored display name');
 assert.ok(!scene.includes("classId.replace("),'Internal uppercase class IDs are not displayed');
 assert.ok(personal.includes('profileShowcaseStyles(C)')&&scene.includes('profileShowcaseStyles(C)'),'Cards share readable identity styling');
 const {profileShowcaseStyles}=load('theme/profile-showcase-styles.ts',{'react-native':{StyleSheet:{create:value=>value}},'./theme':{radii:{md:8},typography:{bodyStrong:{}}}});
 for(const dark of [true,false]){
  const styles=profileShowcaseStyles({dark,text:dark?'#fff':'#111',lineStrong:'#789'});
  assert.ok(styles.name.fontSize>styles.title.fontSize&&styles.title.fontSize>=11);
  assert.ok(styles.meta.fontSize>=10);assert.equal(styles.meta.textTransform,undefined);
  assert.equal(styles.title.fontStyle,undefined);
 }
 console.log('PASS: live guild projection, no-guild and hidden-profile handling, failure fallback, and shared card rendering');
})().catch(error=>{console.error(error);process.exitCode=1});
