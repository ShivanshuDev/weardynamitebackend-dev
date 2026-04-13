/**
 * PromotionEngine.ts
 * Centralized logic for calculating discounts and taxes for WearDynamite.
 */

export interface CartItem {
  productId: string;
  price: number;
  salePrice?: number;
  quantity: number;
  taxonomy?: string;
  promotionType?: string;
  taxPercent?: number;
  isTaxable?: boolean;
  isShippingApplicable?: boolean;
  shippingCost?: number;
}

export interface PromotionResult {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  cgst: number;
  sgst: number;
  taxPercent: number;
  shippingTotal: number;
  total: number;
  appliedPromos: string[];
}

export class PromotionEngine {
  /**
   * Calculates the final price components for a set of items.
   */
  static calculate(items: CartItem[], options: { couponCode?: string; isFirstTimeUser?: boolean } = {}): PromotionResult {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let cgst = 0;
    let sgst = 0;
    let shippingTotal = 0;
    const appliedPromos: string[] = [];

    // 1. Group items by product for Buy X Get Y logic
    const groups = new Map<string, CartItem[]>();
    for (const item of items) {
      const list = groups.get(item.productId) || [];
      list.push(item);
      groups.set(item.productId, list);
    }

    // 2. Process each product group
    groups.forEach((groupItems, productId) => {
      const representative = groupItems[0];
      const totalQty = groupItems.reduce((acc, i) => acc + i.quantity, 0);
      
      // Use salePrice if available, otherwise base price
      const basePrice = representative.salePrice || representative.price || 0;
      const groupSubtotal = groupItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      
      subtotal += groupSubtotal;

      // A. Promotion Type Logic (B1G1, B2G1 etc.)
      if (representative.promotionType === 'B1G1') {
        const freeUnits = Math.floor(totalQty / 2);
        if (freeUnits > 0) {
          const discount = freeUnits * basePrice;
          discountTotal += discount;
          appliedPromos.push(`B1G1 on ${representative.productId}`);
        }
      } else if (representative.promotionType === 'B2G1') {
        const freeUnits = Math.floor(totalQty / 3);
        if (freeUnits > 0) {
          const discount = freeUnits * basePrice;
          discountTotal += discount;
          appliedPromos.push(`B2G1 on ${representative.productId}`);
        }
      }

      // B. Flat Percentage Discount (if not already factored into salePrice)
      // Note: If salePrice is already lower than price, those are handled in subtotal vs basePrice differences
      // But we can add extra logic here if needed.

      // C. Tax Calculation (Split into CGST/SGST)
      if (representative.isTaxable !== false) {
        const taxableAmount = groupSubtotal - (representative.promotionType?.startsWith('B') ? (Math.floor(totalQty / (representative.promotionType === 'B2G1' ? 3 : 2)) * basePrice) : 0);
        // Note: This taxableAmount calculation is a bit simplified; in reality, we should apply all discounts first.
        // We'll refine this in the final totals step below.
      }
    });

    // 3. Overall Order Level Discounts
    if (options.isFirstTimeUser) {
      const firstTimeDiscount = (subtotal - discountTotal) * 0.10;
      discountTotal += firstTimeDiscount;
      appliedPromos.push('First Time Order (10%)');
    }

    // 4. Coupon Logic (Placeholder/Basic)
    if (options.couponCode === 'DYNAMITE20') {
      const couponDiscount = (subtotal - discountTotal) * 0.20;
      discountTotal += couponDiscount;
      appliedPromos.push('Coupon: DYNAMITE20 (20%)');
    }

    let maxTaxPercent = 0;
    // 5. Final Tax Calculation (Inclusive Dynamic Split)
    groups.forEach((groupItems, productId) => {
      const representative = groupItems[0];
      const groupSubtotal = groupItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      
      const groupWeight = groupSubtotal / subtotal;
      const groupDiscount = discountTotal * groupWeight;
      const netAmount = groupSubtotal - groupDiscount;

      if (representative.isTaxable !== false) {
        const rate = representative.taxPercent || 0;
        maxTaxPercent = Math.max(maxTaxPercent, rate);
        
        // Inclusive Tax Formula: Tax = Total - (Total / (1 + Rate/100))
        const groupTax = netAmount - (netAmount / (1 + (rate / 100)));
        
        taxTotal += groupTax;
        cgst += groupTax / 2;
        sgst += groupTax / 2;
      }

      // D. Shipping Calculation
      if (representative.isShippingApplicable) {
        const totalQty = groupItems.reduce((acc, i) => acc + i.quantity, 0);
        shippingTotal += (representative.shippingCost || 29) * totalQty;
      }
    });

    return {
      subtotal,
      discountTotal: Math.round(discountTotal * 100) / 100,
      taxTotal,
      cgst,
      sgst,
      taxPercent: maxTaxPercent,
      shippingTotal,
      total: Math.round((subtotal - discountTotal + shippingTotal) * 100) / 100,
      appliedPromos
    };
  }
}
