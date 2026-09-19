"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legalListingPrice = legalListingPrice;
exports.buyXCheapest = buyXCheapest;
function legalListingPrice(unitPrice, band) {
    return Number.isFinite(unitPrice) && unitPrice >= band.minPrice && unitPrice <= band.maxPrice;
}
function buyXCheapest(listings, itemId, requestedQuantity, maxUnitPrice) {
    let remaining = Math.max(0, Math.floor(requestedQuantity));
    const eligible = listings
        .filter(x => x.itemId === itemId && x.quantity > 0 && (maxUnitPrice === undefined || x.unitPrice <= maxUnitPrice))
        .slice()
        .sort((a, b) => a.unitPrice - b.unitPrice || a.createdAt - b.createdAt || a.listingId.localeCompare(b.listingId));
    const fills = [];
    let total = 0;
    for (const l of eligible) {
        if (remaining <= 0)
            break;
        const qty = Math.min(remaining, l.quantity);
        fills.push({ listingId: l.listingId, sellerId: l.sellerId, quantity: qty, unitPrice: l.unitPrice, subtotal: qty * l.unitPrice });
        total += qty * l.unitPrice;
        remaining -= qty;
    }
    const filled = requestedQuantity - remaining;
    return {
        requestedQuantity,
        filledQuantity: filled,
        unfilledQuantity: remaining,
        totalCost: total,
        averageUnitPrice: filled > 0 ? total / filled : 0,
        highestUnitPrice: fills.length ? fills[fills.length - 1].unitPrice : 0,
        listingsUsed: fills.length,
        fills
    };
}
