"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authCallbackCode = authCallbackCode;
exports.accountEmail = accountEmail;
exports.accountPassword = accountPassword;
exports.chunkedAuthStorage = chunkedAuthStorage;
function authCallbackCode(raw, redirectTo) {
    const url = new URL(raw), allowed = new URL(redirectTo);
    if (url.protocol !== allowed.protocol || url.host !== allowed.host || url.pathname.replace(/\/$/, '') !== allowed.pathname.replace(/\/$/, ''))
        return null;
    const failure = url.searchParams.has('error') ? url.searchParams : new URLSearchParams(url.hash.replace(/^#/, ''));
    if (failure.has('error'))
        throw new Error(failure.get('error_description') ?? 'The account link could not be verified.');
    const code = url.searchParams.get('code');
    return code && code.length <= 2048 ? code : null;
}
function accountEmail(value) { const clean = value.trim().toLowerCase(); if (clean.length > 254 || !/^\S+@\S+\.\S+$/.test(clean))
    throw new Error('Enter a valid email address.'); return clean; }
function accountPassword(value) { if (value.length < 8 || value.length > 128)
    throw new Error('Choose a password with 8–128 characters.'); return value; }
/** SecureStore values can exceed platform limits for JWT sessions; store encrypted chunks behind a manifest. */
function chunkedAuthStorage(storage) {
    let pending = Promise.resolve();
    const manifest = (raw) => { try {
        const value = JSON.parse(raw ?? 'null');
        return Number.isInteger(value?.authChunks) && value.authChunks > 0 && value.authChunks < 100 && typeof value.generation === 'string' ? value : null;
    }
    catch {
        return null;
    } };
    const keys = (key, row) => Array.from({ length: row.authChunks }, (_, i) => `${key}.${row.generation}.${i}`);
    const enqueue = (fn) => { const operation = pending.then(fn); pending = operation.catch(() => { }); return operation; };
    return {
        async getItem(key) { await pending; const raw = await storage.getItem(key), row = manifest(raw); if (!row)
            return raw; const parts = await Promise.all(keys(key, row).map(part => storage.getItem(part))); return parts.some(part => part === null) ? null : parts.join(''); },
        setItem: (key, value) => enqueue(async () => { const old = manifest(await storage.getItem(key)); const parts = value.match(/[\s\S]{1,1700}/g) ?? ['']; const row = { authChunks: parts.length, generation: `${Date.now()}-${Math.random().toString(36).slice(2)}` }; await Promise.all(keys(key, row).map((part, i) => storage.setItem(part, parts[i]))); await storage.setItem(key, JSON.stringify(row)); if (old)
            await Promise.all(keys(key, old).map(part => storage.removeItem(part))); }),
        removeItem: key => enqueue(async () => { const old = manifest(await storage.getItem(key)); await storage.removeItem(key); if (old)
            await Promise.all(keys(key, old).map(part => storage.removeItem(part))); }),
    };
}
