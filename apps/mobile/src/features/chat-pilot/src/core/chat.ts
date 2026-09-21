/** VELDRYN chat pilot: shared state logic. No UI dependency; no production networking. */
export type ChannelId = 'world' | 'guild' | 'party' | 'system' | `whisper:${string}`;
export type Segment = { type: 'text'; text: string } | { type: 'emote'; emoteId: string };
export interface Emote { id: string; label: string; category: string; file: string; defaultAvailable: boolean }
export interface Profile { id: string; name: string; className: string; level: number; portrait: string; guild?: string; title?: string; online: boolean; featuredPetId?: string }
export interface Message { id: string; channelId: ChannelId; senderId: string; segments: Segment[]; createdAt: number; clientRequestId?: string; delivery: 'pending' | 'sent' | 'failed'; error?: string }
export interface SendRequest { channelId: ChannelId; clientRequestId: string; segments: Segment[] }
/** A real adapter must bind sender identity from auth, not trust a caller-supplied name. */
export interface Transport { send(request: SendRequest): Promise<Message> }
export interface Settings { schemaVersion: 1; tray: string[]; worldOptIn: boolean }
export interface SettingsStore { load(accountId: string): Promise<Settings | null>; save(accountId: string, settings: Settings): Promise<void> }
export interface Permissions { connected: boolean; worldOptIn: boolean; guildMember: boolean; partyMember: boolean; blockedIds: string[] }
export interface Snapshot { revision: number; channelId: ChannelId; drafts: Record<string, string>; messages: Message[]; permissions: Permissions; savedTray: string[]; settingsReady: boolean; settingsError: string | null; sending: string[]; unread: Record<string, number>; atBottom: boolean }
export const TRAY_SIZE = 8;
export const MAX_MESSAGE_UNITS = 500;
export const MAX_EMOTES = 2;
export const MAX_RAW_LENGTH = 4000;
export function defaultTray(catalog: readonly Emote[]): string[] {
  const result = catalog.filter(e => e.defaultAvailable).slice(0, TRAY_SIZE).map(e => e.id);
  if (result.length !== TRAY_SIZE) throw new Error('At least 8 free default emotes are required.');
  return result;
}
export function validateTray(ids: readonly string[], catalog: readonly Emote[], owned: ReadonlySet<string>): string | null {
  if (ids.length !== TRAY_SIZE) return 'Choose exactly 8 emotes before saving.';
  if (new Set(ids).size !== TRAY_SIZE) return 'Each of your 8 emotes must be different.';
  const known = new Set(catalog.map(e => e.id));
  if (ids.some(id => !known.has(id))) return 'One of the selected emotes is no longer available.';
  if (ids.some(id => !owned.has(id))) return 'You have not unlocked one of the selected emotes.';
  return null;
}
export function reconcileTray(ids: readonly string[], catalog: readonly Emote[], owned: ReadonlySet<string>): string[] {
  const known = new Set(catalog.map(e => e.id));
  const result: string[] = [];
  for (const id of [...ids, ...defaultTray(catalog), ...catalog.filter(e => e.defaultAvailable).map(e => e.id)]) {
    if (result.length === TRAY_SIZE) break;
    if (known.has(id) && owned.has(id) && !result.includes(id)) result.push(id);
  }
  if (result.length !== TRAY_SIZE) throw new Error('Not enough available emotes to restore this tray.');
  return result;
}
export function moveEmote(ids: readonly string[], from: number, to: number): string[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return [...ids];
  const result = [...ids]; const [item] = result.splice(from, 1); result.splice(to, 0, item); return result;
}
export function insertEmote(raw: string, id: string, cursor: number): { text: string; cursor: number } {
  const offset = Math.max(0, Math.min(raw.length, cursor)); const token = `:${id}:`;
  return { text: raw.slice(0, offset) + token + raw.slice(offset), cursor: offset + token.length };
}
/** The editor keeps plain text shortcodes; messages use validated structured segments. */
export function parseDraft(raw: string, catalog: readonly Emote[]): Segment[] {
  const known = new Set(catalog.map(e => e.id)); const parts: Segment[] = []; const rx = /:([a-z0-9_]+):/g; let end = 0;
  for (let m = rx.exec(raw); m; m = rx.exec(raw)) {
    if (!known.has(m[1])) continue;
    if (m.index > end) parts.push({ type: 'text', text: raw.slice(end, m.index) });
    parts.push({ type: 'emote', emoteId: m[1] }); end = m.index + m[0].length;
  }
  if (end < raw.length) parts.push({ type: 'text', text: raw.slice(end) });
  return parts;
}
export function messageUnits(segments: readonly Segment[]): number { return segments.reduce((n, s) => n + (s.type === 'emote' ? 1 : [...s.text].length), 0); }
export function validateMessage(segments: readonly Segment[], catalog: readonly Emote[], owned: ReadonlySet<string>): string | null {
  if (!segments.some(s => s.type === 'emote' || s.text.trim().length > 0)) return 'Write a message or choose an emote.';
  if (messageUnits(segments) > MAX_MESSAGE_UNITS) return `Messages can contain up to ${MAX_MESSAGE_UNITS} characters.`;
  const ids = segments.filter((s): s is Extract<Segment, {type:'emote'}> => s.type === 'emote').map(s => s.emoteId);
  if (ids.length > MAX_EMOTES) return `Use at most ${MAX_EMOTES} emotes in one message.`;
  const known = new Set(catalog.map(e => e.id));
  if (ids.some(id => !known.has(id) || !owned.has(id))) return 'That emote is not available to send.';
  return null;
}
export function channelReason(channel: ChannelId, p: Permissions, selfId = ''): string | null {
  if (channel === 'system') return 'System notices are read-only.';
  if (!p.connected) return 'Offline. Your draft is kept until you reconnect.';
  if (channel === 'world' && !p.worldOptIn) return 'Join World chat to read and send messages.';
  if (channel === 'guild' && !p.guildMember) return 'Join a guild to use Guild chat.';
  if (channel === 'party' && !p.partyMember) return 'Join a party to use Party chat.';
  if (channel.startsWith('whisper:')) {
    const peer = channel.slice(8);
    if (!peer || peer === selfId) return 'Choose another adventurer to whisper to.';
    if (p.blockedIds.includes(peer)) return 'Unblock this player before sending a whisper.';
  }
  return null;
}
export function canRead(channel: ChannelId, p: Permissions): boolean {
  if (channel === 'world') return p.worldOptIn;
  if (channel === 'guild') return p.guildMember;
  if (channel === 'party') return p.partyMember;
  if (channel.startsWith('whisper:')) return !p.blockedIds.includes(channel.slice(8));
  return true;
}
/** Merge server echoes and retry results without duplicating optimistic messages. */
export function mergeMessages(current: readonly Message[], incoming: readonly Message[]): Message[] {
  const result = current.map(m => ({...m}));
  for (const msg of incoming) {
    const i = result.findIndex(m => m.id === msg.id || (msg.clientRequestId && m.clientRequestId === msg.clientRequestId && m.channelId === msg.channelId && m.senderId === msg.senderId));
    if (i < 0) result.push({...msg});
    else if (!(result[i].delivery === 'sent' && msg.delivery !== 'sent')) result[i] = {...msg};
  }
  return result.sort((a,b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
export function visibleMessages(s: Snapshot): Message[] {
  if (!canRead(s.channelId, s.permissions)) return [];
  return s.messages.filter(m => m.channelId === s.channelId && !s.permissions.blockedIds.includes(m.senderId));
}
export function channelLabel(id: ChannelId, profiles: readonly Profile[]): string {
  return id.startsWith('whisper:') ? `Whisper · ${profiles.find(p => p.id === id.slice(8))?.name ?? 'Adventurer'}` : id[0].toUpperCase()+id.slice(1);
}
export class ChatController {
  private value: Snapshot; private listeners = new Set<() => void>(); private seq = 0; private inFlight = new Set<string>();
  readonly owned: ReadonlySet<string>;
  constructor(readonly accountId: string, readonly viewer: Profile, readonly catalog: readonly Emote[], readonly transport: Transport, readonly storage: SettingsStore, initial: Message[] = [], owned?: ReadonlySet<string>) {
    this.owned = owned ?? new Set(catalog.filter(e=>e.defaultAvailable).map(e=>e.id));
    this.value = { revision:0, channelId:'world', drafts:{}, messages:initial, permissions:{connected:true,worldOptIn:false,guildMember:false,partyMember:false,blockedIds:[]}, savedTray:reconcileTray([],catalog,this.owned), settingsReady:false, settingsError:null, sending:[], unread:{}, atBottom:true };
  }
  getSnapshot = (): Snapshot => this.value;
  subscribe = (fn: () => void): (() => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private update(patch: Partial<Snapshot>): void { this.value={...this.value,...patch,revision:this.value.revision+1}; this.listeners.forEach(fn=>fn()); }
  async loadSettings(): Promise<void> {
    try {
      const saved=await this.storage.load(this.accountId);
      this.update({ savedTray:reconcileTray(saved?.tray??[],this.catalog,this.owned), permissions:{...this.value.permissions,worldOptIn:saved?.worldOptIn===true},settingsReady:true,settingsError:null });
    } catch { this.update({settingsReady:true,settingsError:'Could not load saved chat preferences. Defaults are in use.'}); }
  }
  async saveTray(ids: readonly string[]): Promise<string|null> {
    const error=validateTray(ids,this.catalog,this.owned);if(error)return error;
    try {
      await this.storage.save(this.accountId,{schemaVersion:1,tray:[...ids],worldOptIn:this.value.permissions.worldOptIn});
      this.update({savedTray:[...ids],settingsError:null});return null;
    } catch {return 'Could not save. Your previous tray is unchanged; please try again.';}
  }
  async joinWorld(): Promise<void> {
    if(!this.value.settingsReady)return;
    this.update({permissions:{...this.value.permissions,worldOptIn:true}});
    try {await this.storage.save(this.accountId,{schemaVersion:1,tray:this.value.savedTray,worldOptIn:true});}
    catch {this.update({settingsError:'World chat is joined for this session, but the preference could not be saved.'});}
  }
  selectChannel(channelId: ChannelId): void {this.update({channelId,atBottom:true,unread:{...this.value.unread,[channelId]:0}});}
  setDraft(text: string): void {this.update({drafts:{...this.value.drafts,[this.value.channelId]:text.slice(0,MAX_RAW_LENGTH)}});}
  setPermissions(patch: Partial<Permissions>): void {this.update({permissions:{...this.value.permissions,...patch}});}
  setAtBottom(atBottom: boolean): void {if(this.value.atBottom!==atBottom)this.update({atBottom,unread:atBottom?{...this.value.unread,[this.value.channelId]:0}:this.value.unread});}
  receive(msg: Message): void {
    const existed=this.value.messages.some(m=>m.id===msg.id || (msg.clientRequestId && m.clientRequestId===msg.clientRequestId && m.senderId===msg.senderId && m.channelId===msg.channelId));
    const notify=!existed && msg.senderId!==this.viewer.id && canRead(msg.channelId,this.value.permissions) && !this.value.permissions.blockedIds.includes(msg.senderId) && (msg.channelId!==this.value.channelId || !this.value.atBottom);
    this.update({messages:mergeMessages(this.value.messages,[msg]),unread:notify?{...this.value.unread,[msg.channelId]:(this.value.unread[msg.channelId]??0)+1}:this.value.unread});
  }
  prependHistory(messages: Message[]): void {this.update({messages:mergeMessages(this.value.messages,messages)});}
  async sendDraft(): Promise<string|null> {
    const channel=this.value.channelId;const p=this.value.permissions;
    const reason=channelReason(channel,p,this.viewer.id);if(reason)return reason;
    if(this.value.sending.includes(channel))return 'Your previous message is still being sent.';
    const segments=parseDraft(this.value.drafts[channel]??'',this.catalog);const error=validateMessage(segments,this.catalog,this.owned);if(error)return error;
    const req=`${this.viewer.id}-${Date.now()}-${++this.seq}`;
    const msg:Message={id:`local:${req}`,channelId:channel,senderId:this.viewer.id,segments,createdAt:Date.now(),clientRequestId:req,delivery:'pending'};
    this.update({drafts:{...this.value.drafts,[channel]:''},messages:mergeMessages(this.value.messages,[msg]),sending:[...this.value.sending,channel]});
    return this.deliver(msg);
  }
  async retry(id: string): Promise<string|null> {
    const msg=this.value.messages.find(m=>m.id===id);
    if(!msg || msg.delivery!=='failed' || msg.senderId!==this.viewer.id || !msg.clientRequestId)return 'That message cannot be retried.';
    const reason=channelReason(msg.channelId,this.value.permissions,this.viewer.id);if(reason)return reason;
    if(this.inFlight.has(msg.clientRequestId)||this.value.sending.includes(msg.channelId))return 'A message is already sending.';
    this.update({messages:mergeMessages(this.value.messages,[{...msg,delivery:'pending',error:undefined}]),sending:[...this.value.sending,msg.channelId]});return this.deliver(msg);
  }
  private async deliver(msg: Message): Promise<string|null> {
    const id=msg.clientRequestId!;this.inFlight.add(id);
    try {
      const ack=await this.transport.send({channelId:msg.channelId,clientRequestId:id,segments:msg.segments});
      if(ack.channelId!==msg.channelId || ack.senderId!==this.viewer.id || ack.clientRequestId!==id)throw new Error('Mismatched delivery receipt.');
      this.receive({...ack,delivery:'sent'});return null;
    } catch(e) {
      const error=e instanceof Error?e.message:'Message could not be sent.';
      this.update({messages:mergeMessages(this.value.messages,[{...msg,delivery:'failed',error}])});return error;
    } finally {
      this.inFlight.delete(id);this.update({sending:this.value.sending.filter(c=>c!==msg.channelId)});
    }
  }
  toggleLocalBlock(id:string):void {
    if(id===this.viewer.id)return;
    const ids=this.value.permissions.blockedIds;
    this.setPermissions({blockedIds:ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]});
  }
}
/** In-memory adapter for the offline visual pilot, explicitly NOT a social backend. */
export function createDemoTransport(viewer: Profile, delayMs = 450): Transport & { failNext(): void; setOffline(value: boolean): void } {
  let fail=false,offline=false;const delivered=new Map<string,Message>();
  return {
    failNext(){fail=true;},setOffline(v){offline=v;},
    async send(req){
      await new Promise(resolve=>setTimeout(resolve,delayMs));
      if(offline)throw new Error('Offline. Reconnect and use Retry.');
      if(delivered.has(req.clientRequestId))return delivered.get(req.clientRequestId)!;
      if(fail){fail=false;throw new Error('Simulated send failure. Tap Retry.');}
      if(req.channelId==='system')throw new Error('System is read-only.');
      const msg:Message={...req,id:`demo:${req.clientRequestId}`,senderId:viewer.id,createdAt:Date.now(),delivery:'sent'};delivered.set(req.clientRequestId,msg);return msg;
    }
  };
}
export function createMemorySettingsStore(): SettingsStore {
  const values=new Map<string,Settings>();return {async load(id){return values.get(id)??null;},async save(id,s){values.set(id,JSON.parse(JSON.stringify(s)));}};
}
export const demoProfiles: Profile[] = [
  {id:'you',name:'Your Adventurer',className:'Ironwarden',level:12,portrait:'portraits/adventurer_male',online:true,title:'Recruit'},
  {id:'aric',name:'Aric Stonebrow',className:'Ironwarden',level:42,portrait:'portraits/adventurer_male',online:true,guild:'Bloomwake Sentinels',title:'Trusted Companion',featuredPetId:'pet_set_a_04'},
  {id:'lunaria',name:'Lunaria',className:'Dawnkeeper',level:31,portrait:'portraits/adventurer_female',online:true,guild:'Bloomwake Sentinels',title:'Guiding Hand'}
];
export function demoMessages(catalog: readonly Emote[] = []): Message[] {
  const samples:[ChannelId,string,string][]=[['world','aric','Anyone up for the Ancient Ruins? Need one damage dealer!'],['world','lunaria','The sunset in Veldryn is still unmatched. :female_01:'],['world','aric','Taking a short gathering break. Good luck on your drops!'],['world','lunaria','That fox is adorable! :pet_set_b_02:'],['world','aric','Small companions. Big journeys. :pet_set_a_04:'],['world','lunaria','Remember to save your favourite 8 emotes in Chat Settings.'],['guild','aric','Welcome to the guild! Ask here when you need a hand.'],['party','lunaria','Ready when everyone is here.'],['system','system','This is an offline UI preview. No message is sent to other players.']];
  return samples.map(([channelId,senderId,text],i)=>({id:`sample-${i}`,channelId,senderId,segments:parseDraft(text,catalog),createdAt:Date.now()-900000+i*45000,delivery:'sent'}));
}
