import type {AlertButton,AlertOptions} from 'react-native';
import type {UiThemeId} from '../theme/theme';
import type {Language} from '../i18n/languages';

export interface GameAlertRequest{id:number;title:string;message?:string;buttons:AlertButton[];options?:AlertOptions}
export interface GameAlertSnapshot{queue:readonly GameAlertRequest[];themeId?:UiThemeId;language:Language;reduceMotion:boolean}
export function createGameAlertStore(){
 let nextId=0,snapshot:GameAlertSnapshot={queue:[],language:'en',reduceMotion:false};
 const listeners=new Set<()=>void>();
 const publish=(next:GameAlertSnapshot)=>{snapshot=next;listeners.forEach(listener=>listener());};
 const take=(id:number)=>{const current=snapshot.queue[0];if(current?.id!==id)return;publish({...snapshot,queue:snapshot.queue.slice(1)});return current;};
 return {
  subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
  getSnapshot:()=>snapshot,
  configure(settings:Omit<GameAlertSnapshot,'queue'>){if(snapshot.themeId!==settings.themeId||snapshot.language!==settings.language||snapshot.reduceMotion!==settings.reduceMotion)publish({...snapshot,...settings});},
  alert(title:string,message?:string,buttons?:AlertButton[],options?:AlertOptions){
   publish({...snapshot,queue:[...snapshot.queue,{id:++nextId,title,message,buttons:buttons?.length?buttons:[{}],options}]});
  },
  press(id:number,index:number){const current=snapshot.queue[0];if(current?.id!==id||!current.buttons[index])return;const action=take(id);action?.buttons[index].onPress?.();},
  dismiss(id:number){const current=take(id);if(!current)return;current.buttons.find(button=>button.style==='cancel')?.onPress?.();current.options?.onDismiss?.();},
 };
}
export const gameAlerts=createGameAlertStore();
/** Drop-in alert API. Only explicit button presses execute destructive actions. */
export const gameAlert={alert:gameAlerts.alert};
