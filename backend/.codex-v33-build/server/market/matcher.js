"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchOrders = matchOrders;
function matchOrders(orders) { const buys = orders.filter(x => x.side === 'buy' && x.remaining > 0).sort((a, b) => b.unitPrice - a.unitPrice || a.createdAtMs - b.createdAtMs), sells = orders.filter(x => x.side === 'sell' && x.remaining > 0).sort((a, b) => a.unitPrice - b.unitPrice || a.createdAtMs - b.createdAtMs), fills = []; while (buys.length && sells.length && buys[0].unitPrice >= sells[0].unitPrice) {
    const b = buys[0], s = sells[0], q = Math.min(b.remaining, s.remaining), price = s.createdAtMs <= b.createdAtMs ? s.unitPrice : b.unitPrice;
    fills.push({ buyId: b.id, sellId: s.id, unitPrice: price, quantity: q });
    b.remaining -= q;
    s.remaining -= q;
    if (!b.remaining)
        buys.shift();
    if (!s.remaining)
        sells.shift();
} return fills; }
