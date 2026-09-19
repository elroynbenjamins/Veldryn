"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grantItems = grantItems;
exports.consumeItems = consumeItems;
function grantItems(current, grants, defs, maxSlots) { const out = current.map(x => ({ ...x })); for (const g of grants) {
    const d = defs[g.itemId];
    if (!d || g.quantity <= 0)
        throw new Error('invalid_item_grant');
    let left = g.quantity;
    const bound = !!g.bind || !!d.bindOnPickup;
    if (d.stackable) {
        for (const s of out.filter(s => s.itemId === g.itemId && s.bound === bound && s.quantity < d.maxStack)) {
            const add = Math.min(left, d.maxStack - s.quantity);
            s.quantity += add;
            left -= add;
            if (!left)
                break;
        }
    }
    while (left > 0) {
        if (out.length >= maxSlots)
            throw new Error('inventory_full');
        const q = d.stackable ? Math.min(left, d.maxStack) : 1;
        out.push({ itemId: g.itemId, quantity: q, bound });
        left -= q;
    }
} return out; }
function consumeItems(current, costs) { const out = current.map(x => ({ ...x })); for (const c of costs) {
    let left = c.quantity;
    for (const s of out.filter(s => s.itemId === c.itemId)) {
        const take = Math.min(left, s.quantity);
        s.quantity -= take;
        left -= take;
        if (!left)
            break;
    }
    if (left)
        throw new Error('insufficient_items');
} return out.filter(s => s.quantity > 0); }
