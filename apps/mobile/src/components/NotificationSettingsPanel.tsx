import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {SettingToggle} from './SettingToggle';
import {useAuthSession} from '../online/AuthSessionProvider';
import {registerDungeonReminderTimeZone} from '../online/dungeon-weekly-reminder';
import {
 loadNotificationPreferences,saveNotificationPreferences,type NotificationPreferences,
} from '../online/notification-preferences';
import {useGameTheme} from '../theme/ThemeContext';
import {typography,type ThemeColors} from '../theme/theme';
import {recentScreenText} from '../i18n/recent-screens';
import type {GameState} from '../core/types';

const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MINUTES=[0,15,30,45];
const LEADS=[{value:0,title:'At maximum'},{value:30,title:'30 minutes before'},{value:60,title:'1 hour before'}] as const;
const pad=(v:number)=>String(v).padStart(2,'0');

function Choice({title,selected,disabled,onPress}:{title:string;selected:boolean;disabled:boolean;onPress:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{selected,disabled}}
  disabled={disabled} onPress={onPress} style={({pressed})=>[s.choice,selected&&s.chosen,pressed&&s.pressed,disabled&&s.disabled]}>
   <Text style={[s.choiceText,selected&&{color:C.selectionLine}]}>{title}</Text>
 </Pressable>;
}

/** Existing Settings styling; no new theme/palette or redesigned navigation. */
export function NotificationSettingsPanel({online,language}:{online:boolean;language:GameState['settings']['language']}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const {session}=useAuthSession(),accountId=session?.user.id;
 const a=(v:string)=>recentScreenText(language,v);
 const [loaded,setLoaded]=useState<{accountId:string;current:NotificationPreferences;original:NotificationPreferences}|null>(null);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[success,setSuccess]=useState(false);
 const data=loaded?.accountId===accountId?loaded:null,draft=data?.current;
 const disabled=!online||!accountId||!draft||busy||loading;
 const change=(partial:Partial<NotificationPreferences>)=>{
  setLoaded(prev=>prev?.accountId===accountId?{...prev,current:{...prev.current,...partial}}:prev);
  setSuccess(false);
 };
 useEffect(()=>{
  if(!online||!accountId){setLoaded(null);return;}
  let alive=true;
  setLoaded(null);setError('');setLoading(true);setSuccess(false);
  void (async()=>{
   try{
    await registerDungeonReminderTimeZone();
    const value=await loadNotificationPreferences();
    if(alive)setLoaded({accountId,current:value,original:value});
   }catch{
    if(alive)setError('Notification settings are unavailable. Try again after updating the app.');
   }finally{if(alive)setLoading(false);}
  })();
  return()=>{alive=false;};
 },[accountId,online]);
 const save=async()=>{
  if(disabled||!draft||!accountId)return;
  setBusy(true);setError('');setSuccess(false);
  try{
   await saveNotificationPreferences(draft);
   const latest=await loadNotificationPreferences();
   setLoaded(prev=>prev?.accountId===accountId?{accountId,current:latest,original:latest}:prev);
   setSuccess(true);
  }catch{
   setError('Unable to save notification settings. Please try again.');
  }finally{setBusy(false);}
 };
 const changed=Boolean(data&&JSON.stringify(data.current)!==JSON.stringify(data.original));
 return <Panel>
  <Text style={s.title}>{a('Notifications')}</Text>
  <Text style={s.caption}>{a('Choose when in-app reminders appear. Phone push alerts are not available yet.')}</Text>
  {!online||!accountId?<Text style={s.caption}>{a('Sign in to customize account reminders.')}</Text>:null}
  {loading?<Text style={s.caption}>{a('Loading notification settings...')}</Text>:null}
  {draft?<View style={s.stack}>
   <SettingToggle language={language} label={a('Enable reminders')}
    description={a('Turn all Dungeon and AFK reminders on or off.')}
    value={draft.notificationsEnabled} onValueChange={v=>change({notificationsEnabled:v})} disabled={disabled}/>
   <View style={s.section}>
    <SettingToggle language={language} label={a('Dungeon charges')}
     description={a('A weekly reminder when enhanced dungeon rewards are still available.')}
     value={draft.dungeonEnabled} onValueChange={v=>change({dungeonEnabled:v})}
     disabled={disabled||!draft.notificationsEnabled}/>
    {draft.dungeonEnabled?<View style={s.controls}>
     <Text style={s.label}>{a('Day of the week')}</Text>
     <View style={s.choices}>{DAYS.map((name,i)=><Choice key={name} title={a(name)}
      selected={draft.dungeonWeekday===i+1}
      disabled={Boolean(disabled||!draft.notificationsEnabled)}
      onPress={()=>change({dungeonWeekday:i+1})}/>)}</View>
     <Text style={s.label}>{a('Local time')}</Text>
     <View style={s.timeRow}>
      <Choice title="−" selected={false} disabled={Boolean(disabled||!draft.notificationsEnabled)}
       onPress={()=>change({dungeonHour:(draft.dungeonHour+23)%24})}/>
      <Text style={s.clock}>{pad(draft.dungeonHour)}:{pad(draft.dungeonMinute)}</Text>
      <Choice title="+" selected={false} disabled={Boolean(disabled||!draft.notificationsEnabled)}
       onPress={()=>change({dungeonHour:(draft.dungeonHour+1)%24})}/>
     </View>
     <View style={s.choices}>{MINUTES.map(minute=><Choice key={minute} title={':'+pad(minute)}
      selected={draft.dungeonMinute===minute}
      disabled={Boolean(disabled||!draft.notificationsEnabled)}
      onPress={()=>change({dungeonMinute:minute})}/>)}</View>
     <Text style={s.caption}>{a('Time zone')}: {draft.timeZone}</Text>
    </View>:null}
   </View>
   <View style={s.section}>
    <SettingToggle language={language} label={a('AFK reserve')}
     description={a('Notify when an active character is approaching its personal AFK cap.')}
     value={draft.afkEnabled} onValueChange={v=>change({afkEnabled:v})}
     disabled={disabled||!draft.notificationsEnabled}/>
    {draft.afkEnabled?<View style={s.controls}>
     <Text style={s.label}>{a('Remind me')}</Text>
     <View style={s.choices}>{LEADS.map(lead=><Choice key={lead.value} title={a(lead.title)}
       selected={draft.afkLeadMinutes===lead.value}
       disabled={Boolean(disabled||!draft.notificationsEnabled)}
       onPress={()=>change({afkLeadMinutes:lead.value})}/>)}</View>
    </View>:null}
   </View>
   <SettingToggle language={language} label={a('Quiet hours (23:00–08:00)')}
    description={a('Hold in-app reminders until morning in your local time zone.')}
    value={draft.quietEnabled} onValueChange={v=>change({quietEnabled:v})} disabled={disabled}/>
   <GameButton title={a('Save notification settings')} onPress={()=>void save()}
    disabled={!changed||disabled} loading={busy}/>
   {success?<Text style={s.success}>{a('Notification settings saved.')}</Text>:null}
  </View>:null}
  {error?<Text style={s.error}>{a(error)}</Text>:null}
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 title:{...typography.bodyStrong,color:C.text},
 caption:{...typography.caption,color:C.muted},
 label:{...typography.bodyStrong,color:C.text},
 clock:{...typography.bodyStrong,color:C.text,minWidth:70,textAlign:'center'},
 stack:{gap:12},section:{gap:8},controls:{gap:8,paddingHorizontal:4},
 timeRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12},
 choices:{flexDirection:'row',flexWrap:'wrap',gap:6},
 choice:{minHeight:42,minWidth:42,paddingHorizontal:10,paddingVertical:8,
  borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2,
  justifyContent:'center',alignItems:'center'},
 chosen:{borderColor:C.selectionLine,backgroundColor:C.selection},
 choiceText:{...typography.caption,color:C.text},
 disabled:{opacity:.5},pressed:{opacity:.75},
 error:{...typography.caption,color:C.bad},success:{...typography.caption,color:C.good},
});}
