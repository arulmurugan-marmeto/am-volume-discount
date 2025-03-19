// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

export function run(input) {
  const eligibleDiscounts = input.cart.lines.flatMap((cartLine) => {
    const product = cartLine.merchandise.product;
    const volumeDiscountConfig = product?.metafield?.value;
    const isProductEligibleForDiscount = product?.hasAnyTag;

    if (!volumeDiscountConfig || !isProductEligibleForDiscount) return [];

    try {
      const discountTiers = JSON.parse(volumeDiscountConfig);
      if (!Array.isArray(discountTiers)) return [];

      const validDiscountTiers = discountTiers
        .filter((tier) => tier.quantity > 0 && tier.discount > 0)
        .sort((a, b) => a.quantity - b.quantity);

      const applicableTier = validDiscountTiers.reduce((bestTier, currentTier) =>
        cartLine.quantity >= currentTier.quantity ? currentTier : bestTier,
        null
      );

      if (!applicableTier) return [];

      return [
        {
          targets: [{ cartLine: { id: cartLine.id } }],
          value: { percentage: { value: applicableTier.discount.toString() } },
          message:
            applicableTier.message ||
            `${applicableTier.discount}% off for bulk purchase`,
        },
      ];
    } catch {
      return [];
    }
  });

  return eligibleDiscounts.length > 0
    ? {
      discounts: eligibleDiscounts,
      discountApplicationStrategy: DiscountApplicationStrategy.All,
    }
    : EMPTY_DISCOUNT;
}