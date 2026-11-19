"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseEligibilityError = purchaseEligibilityError;
exports.orderCommercePurchases = orderCommercePurchases;
function purchaseEligibilityError(productId, owned) {
    switch (productId) {
        case 'vip': return owned.vip ? 'VIP is already owned.' : null;
        case 'vip_plus': return owned.vipPlus ? 'VIP+ is already owned.' : null;
        case 'supporter_monthly': return owned.supporter ? 'Supporter is already active. Manage your subscription in Google Play.' : null;
        default: return 'Unknown Google Play product.';
    }
}
// All current products grant independently, so restore order has no prerequisites.
function orderCommercePurchases(rows) {
    return [...rows];
}
