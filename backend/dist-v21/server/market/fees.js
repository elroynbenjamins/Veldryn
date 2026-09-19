"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SALE_FEE_RATE = exports.LISTING_FEE_RATE = void 0;
exports.marketFees = marketFees;
exports.LISTING_FEE_RATE = .02;
exports.SALE_FEE_RATE = .03;
function marketFees(unitPrice, qty) { if (!Number.isInteger(unitPrice) || unitPrice < 1 || !Number.isInteger(qty) || qty < 1)
    throw new Error('invalid_market_values'); const gross = unitPrice * qty; return { gross, listingFee: Math.max(1, Math.floor(gross * exports.LISTING_FEE_RATE)), saleFee: Math.max(1, Math.floor(gross * exports.SALE_FEE_RATE)), sellerNet: gross - Math.max(1, Math.floor(gross * exports.SALE_FEE_RATE)) }; }
