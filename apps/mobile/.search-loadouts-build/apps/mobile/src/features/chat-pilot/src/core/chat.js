"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoProfiles = exports.ChatController = exports.MAX_RAW_LENGTH = exports.MAX_EMOTES = exports.MAX_MESSAGE_UNITS = exports.TRAY_SIZE = void 0;
exports.defaultTray = defaultTray;
exports.validateTray = validateTray;
exports.reconcileTray = reconcileTray;
exports.moveEmote = moveEmote;
exports.insertEmote = insertEmote;
exports.parseDraft = parseDraft;
exports.messageUnits = messageUnits;
exports.validateMessage = validateMessage;
exports.channelReason = channelReason;
exports.canRead = canRead;
exports.mergeMessages = mergeMessages;
exports.visibleMessages = visibleMessages;
exports.channelLabel = channelLabel;
exports.createDemoTransport = createDemoTransport;
exports.createMemorySettingsStore = createMemorySettingsStore;
exports.demoMessages = demoMessages;
exports.TRAY_SIZE = 20;
exports.MAX_MESSAGE_UNITS = 500;
exports.MAX_EMOTES = 8;
exports.MAX_RAW_LENGTH = 4000;
function defaultTray(catalog) {
    const result = catalog.filter(e => e.defaultAvailable).slice(0, exports.TRAY_SIZE).map(e => e.id);
    if (result.length !== exports.TRAY_SIZE)
        throw new Error('At least 20 free default emotes are required.');
    return result;
}
function validateTray(ids, catalog, owned) {
    if (ids.length !== exports.TRAY_SIZE)
        return 'Choose exactly 20 emotes before saving.';
    if (new Set(ids).size !== exports.TRAY_SIZE)
        return 'Each of your 20 emotes must be different.';
    const known = new Set(catalog.map(e => e.id));
    if (ids.some(id => !known.has(id)))
        return 'One of the selected emotes is no longer available.';
    if (ids.some(id => !owned.has(id)))
        return 'You have not unlocked one of the selected emotes.';
    return null;
}
function reconcileTray(ids, catalog, owned) {
    const known = new Set(catalog.map(e => e.id));
    const result = [];
    for (const id of [...ids, ...defaultTray(catalog), ...catalog.filter(e => e.defaultAvailable).map(e => e.id)]) {
        if (result.length === exports.TRAY_SIZE)
            break;
        if (known.has(id) && owned.has(id) && !result.includes(id))
            result.push(id);
    }
    if (result.length !== exports.TRAY_SIZE)
        throw new Error('Not enough available emotes to restore this tray.');
    return result;
}
function moveEmote(ids, from, to) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= ids.length || to >= ids.length)
        return [...ids];
    const result = [...ids];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
}
function insertEmote(raw, id, cursor) {
    const offset = Math.max(0, Math.min(raw.length, cursor));
    const token = `:${id}:`;
    return { text: raw.slice(0, offset) + token + raw.slice(offset), cursor: offset + token.length };
}
/** The editor keeps plain text shortcodes; messages use validated structured segments. */
function parseDraft(raw, catalog) {
    const known = new Set(catalog.map(e => e.id));
    const parts = [];
    const rx = /:([a-z0-9_]+):/g;
    let end = 0;
    for (let m = rx.exec(raw); m; m = rx.exec(raw)) {
        if (!known.has(m[1]))
            continue;
        if (m.index > end)
            parts.push({ type: 'text', text: raw.slice(end, m.index) });
        parts.push({ type: 'emote', emoteId: m[1] });
        end = m.index + m[0].length;
    }
    if (end < raw.length)
        parts.push({ type: 'text', text: raw.slice(end) });
    return parts;
}
function messageUnits(segments) { return segments.reduce((n, s) => n + (s.type === 'emote' ? 1 : [...s.text].length), 0); }
function validateMessage(segments, catalog, owned) {
    if (!segments.some(s => s.type === 'emote' || s.text.trim().length > 0))
        return 'Write a message or choose an emote.';
    if (messageUnits(segments) > exports.MAX_MESSAGE_UNITS)
        return `Messages can contain up to ${exports.MAX_MESSAGE_UNITS} characters.`;
    const ids = segments.filter((s) => s.type === 'emote').map(s => s.emoteId);
    if (ids.length > exports.MAX_EMOTES)
        return `Use at most ${exports.MAX_EMOTES} emotes in one message.`;
    const known = new Set(catalog.map(e => e.id));
    if (ids.some(id => !known.has(id) || !owned.has(id)))
        return 'That emote is not available to send.';
    return null;
}
function channelReason(channel, p, selfId = '') {
    if (channel === 'system')
        return 'System notices are read-only.';
    if (!p.connected)
        return 'Offline. Your draft is kept until you reconnect.';
    if (channel === 'world' && !p.worldOptIn)
        return 'Join World chat to read and send messages.';
    if (channel === 'guild' && !p.guildMember)
        return 'Join a guild to use Guild chat.';
    if (channel === 'party' && !p.partyMember)
        return 'Join a party to use Party chat.';
    if (channel.startsWith('whisper:')) {
        const peer = channel.slice(8);
        if (!peer || peer === selfId)
            return 'Choose another adventurer to whisper to.';
        if (p.blockedIds.includes(peer))
            return 'Unblock this player before sending a whisper.';
    }
    return null;
}
function canRead(channel, p) {
    if (channel === 'world')
        return p.worldOptIn;
    if (channel === 'guild')
        return p.guildMember;
    if (channel === 'party')
        return p.partyMember;
    if (channel.startsWith('whisper:'))
        return !p.blockedIds.includes(channel.slice(8));
    return true;
}
/** Merge server echoes and retry results without duplicating optimistic messages. */
function mergeMessages(current, incoming) {
    const result = current.map(m => ({ ...m }));
    for (const msg of incoming) {
        const i = result.findIndex(m => m.id === msg.id || (msg.clientRequestId && m.clientRequestId === msg.clientRequestId && m.channelId === msg.channelId && m.senderId === msg.senderId));
        if (i < 0)
            result.push({ ...msg });
        else if (!(result[i].delivery === 'sent' && msg.delivery !== 'sent'))
            result[i] = { ...msg };
    }
    return result.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
function visibleMessages(s) {
    if (!canRead(s.channelId, s.permissions))
        return [];
    return s.messages.filter(m => m.channelId === s.channelId && !s.permissions.blockedIds.includes(m.senderId));
}
function channelLabel(id, profiles) {
    return id.startsWith('whisper:') ? `Whisper · ${profiles.find(p => p.id === id.slice(8))?.name ?? 'Adventurer'}` : id[0].toUpperCase() + id.slice(1);
}
class ChatController {
    accountId;
    viewer;
    catalog;
    transport;
    storage;
    value;
    listeners = new Set();
    seq = 0;
    inFlight = new Set();
    owned;
    constructor(accountId, viewer, catalog, transport, storage, initial = [], owned) {
        this.accountId = accountId;
        this.viewer = viewer;
        this.catalog = catalog;
        this.transport = transport;
        this.storage = storage;
        this.owned = owned ?? new Set(catalog.filter(e => e.defaultAvailable).map(e => e.id));
        this.value = { revision: 0, channelId: 'world', drafts: {}, messages: initial, permissions: { connected: true, worldOptIn: false, guildMember: false, partyMember: false, blockedIds: [] }, savedTray: reconcileTray([], catalog, this.owned), settingsReady: false, settingsError: null, sending: [], unread: {}, atBottom: true };
    }
    getSnapshot = () => this.value;
    subscribe = (fn) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
    update(patch) { this.value = { ...this.value, ...patch, revision: this.value.revision + 1 }; this.listeners.forEach(fn => fn()); }
    async loadSettings() {
        try {
            const saved = await this.storage.load(this.accountId);
            this.update({ savedTray: reconcileTray(saved?.tray ?? [], this.catalog, this.owned), permissions: { ...this.value.permissions, worldOptIn: saved?.worldOptIn === true }, settingsReady: true, settingsError: null });
        }
        catch {
            this.update({ settingsReady: true, settingsError: 'Could not load saved chat preferences. Defaults are in use.' });
        }
    }
    async saveTray(ids) {
        const error = validateTray(ids, this.catalog, this.owned);
        if (error)
            return error;
        try {
            await this.storage.save(this.accountId, { schemaVersion: 1, tray: [...ids], worldOptIn: this.value.permissions.worldOptIn });
            this.update({ savedTray: [...ids], settingsError: null });
            return null;
        }
        catch {
            return 'Could not save. Your previous tray is unchanged; please try again.';
        }
    }
    async joinWorld() {
        if (!this.value.settingsReady)
            return;
        this.update({ permissions: { ...this.value.permissions, worldOptIn: true } });
        try {
            await this.storage.save(this.accountId, { schemaVersion: 1, tray: this.value.savedTray, worldOptIn: true });
        }
        catch {
            this.update({ settingsError: 'World chat is joined for this session, but the preference could not be saved.' });
        }
    }
    selectChannel(channelId) { this.update({ channelId, atBottom: true, unread: { ...this.value.unread, [channelId]: 0 } }); }
    setDraft(text) { this.update({ drafts: { ...this.value.drafts, [this.value.channelId]: text.slice(0, exports.MAX_RAW_LENGTH) } }); }
    setPermissions(patch) { this.update({ permissions: { ...this.value.permissions, ...patch } }); }
    setAtBottom(atBottom) { if (this.value.atBottom !== atBottom)
        this.update({ atBottom, unread: atBottom ? { ...this.value.unread, [this.value.channelId]: 0 } : this.value.unread }); }
    receive(msg) {
        const existed = this.value.messages.some(m => m.id === msg.id || (msg.clientRequestId && m.clientRequestId === msg.clientRequestId && m.senderId === msg.senderId && m.channelId === msg.channelId));
        const notify = !existed && msg.senderId !== this.viewer.id && canRead(msg.channelId, this.value.permissions) && !this.value.permissions.blockedIds.includes(msg.senderId) && (msg.channelId !== this.value.channelId || !this.value.atBottom);
        this.update({ messages: mergeMessages(this.value.messages, [msg]), unread: notify ? { ...this.value.unread, [msg.channelId]: (this.value.unread[msg.channelId] ?? 0) + 1 } : this.value.unread });
    }
    prependHistory(messages) { this.update({ messages: mergeMessages(this.value.messages, messages) }); }
    async sendDraft() {
        const channel = this.value.channelId;
        const p = this.value.permissions;
        const reason = channelReason(channel, p, this.viewer.id);
        if (reason)
            return reason;
        if (this.value.sending.includes(channel))
            return 'Your previous message is still being sent.';
        const segments = parseDraft(this.value.drafts[channel] ?? '', this.catalog);
        const error = validateMessage(segments, this.catalog, this.owned);
        if (error)
            return error;
        const req = `${this.viewer.id}-${Date.now()}-${++this.seq}`;
        const msg = { id: `local:${req}`, channelId: channel, senderId: this.viewer.id, segments, createdAt: Date.now(), clientRequestId: req, delivery: 'pending' };
        this.update({ drafts: { ...this.value.drafts, [channel]: '' }, messages: mergeMessages(this.value.messages, [msg]), sending: [...this.value.sending, channel] });
        return this.deliver(msg);
    }
    async retry(id) {
        const msg = this.value.messages.find(m => m.id === id);
        if (!msg || msg.delivery !== 'failed' || msg.senderId !== this.viewer.id || !msg.clientRequestId)
            return 'That message cannot be retried.';
        const reason = channelReason(msg.channelId, this.value.permissions, this.viewer.id);
        if (reason)
            return reason;
        if (this.inFlight.has(msg.clientRequestId) || this.value.sending.includes(msg.channelId))
            return 'A message is already sending.';
        this.update({ messages: mergeMessages(this.value.messages, [{ ...msg, delivery: 'pending', error: undefined }]), sending: [...this.value.sending, msg.channelId] });
        return this.deliver(msg);
    }
    async deliver(msg) {
        const id = msg.clientRequestId;
        this.inFlight.add(id);
        try {
            const ack = await this.transport.send({ channelId: msg.channelId, clientRequestId: id, segments: msg.segments });
            if (ack.channelId !== msg.channelId || ack.senderId !== this.viewer.id || ack.clientRequestId !== id)
                throw new Error('Mismatched delivery receipt.');
            this.receive({ ...ack, delivery: 'sent' });
            return null;
        }
        catch (e) {
            const error = e instanceof Error ? e.message : 'Message could not be sent.';
            this.update({ messages: mergeMessages(this.value.messages, [{ ...msg, delivery: 'failed', error }]) });
            return error;
        }
        finally {
            this.inFlight.delete(id);
            this.update({ sending: this.value.sending.filter(c => c !== msg.channelId) });
        }
    }
    toggleLocalBlock(id) {
        if (id === this.viewer.id)
            return;
        const ids = this.value.permissions.blockedIds;
        this.setPermissions({ blockedIds: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
    }
}
exports.ChatController = ChatController;
/** In-memory adapter for the offline visual pilot, explicitly NOT a social backend. */
function createDemoTransport(viewer, delayMs = 450) {
    let fail = false, offline = false;
    const delivered = new Map();
    return {
        failNext() { fail = true; }, setOffline(v) { offline = v; },
        async send(req) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            if (offline)
                throw new Error('Offline. Reconnect and use Retry.');
            if (delivered.has(req.clientRequestId))
                return delivered.get(req.clientRequestId);
            if (fail) {
                fail = false;
                throw new Error('Simulated send failure. Tap Retry.');
            }
            if (req.channelId === 'system')
                throw new Error('System is read-only.');
            const msg = { ...req, id: `demo:${req.clientRequestId}`, senderId: viewer.id, createdAt: Date.now(), delivery: 'sent' };
            delivered.set(req.clientRequestId, msg);
            return msg;
        }
    };
}
function createMemorySettingsStore() {
    const values = new Map();
    return { async load(id) { return values.get(id) ?? null; }, async save(id, s) { values.set(id, JSON.parse(JSON.stringify(s))); } };
}
exports.demoProfiles = [
    { id: 'you', name: 'Your Adventurer', className: 'Ironwarden', level: 12, portrait: 'portraits/adventurer_male', online: true, title: 'Recruit' },
    { id: 'aric', name: 'Aric Stonebrow', className: 'Ironwarden', level: 42, portrait: 'portraits/adventurer_male', online: true, guild: 'Bloomwake Sentinels', title: 'Trusted Companion', featuredPetId: 'pet_set_a_04' },
    { id: 'lunaria', name: 'Lunaria', className: 'Dawnkeeper', level: 31, portrait: 'portraits/adventurer_female', online: true, guild: 'Bloomwake Sentinels', title: 'Guiding Hand' }
];
function demoMessages(catalog = []) {
    const samples = [['world', 'aric', 'Anyone up for the Ancient Ruins? Need one damage dealer!'], ['world', 'lunaria', 'The sunset in Veldryn is still unmatched. :female_01:'], ['world', 'aric', 'Taking a short gathering break. Good luck on your drops!'], ['world', 'lunaria', 'That fox is adorable! :pet_set_b_02:'], ['world', 'aric', 'Small companions. Big journeys. :pet_set_a_04:'], ['world', 'lunaria', 'Remember to save your favourite 20 emotes in Chat Settings.'], ['guild', 'aric', 'Welcome to the guild! Ask here when you need a hand.'], ['party', 'lunaria', 'Ready when everyone is here.'], ['system', 'system', 'This is an offline UI preview. No message is sent to other players.']];
    return samples.map(([channelId, senderId, text], i) => ({ id: `sample-${i}`, channelId, senderId, segments: parseDraft(text, catalog), createdAt: Date.now() - 900000 + i * 45000, delivery: 'sent' }));
}
