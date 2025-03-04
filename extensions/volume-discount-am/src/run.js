// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // Parse metafield value safely
  const configuration = JSON.parse(input?.discountNode?.metafield?.value ?? "{}");
  if (!configuration?.discounts || !Array.isArray(configuration.discounts)) {
    return EMPTY_DISCOUNT;
  }

  let discountApplication = [];

  discountApplication = input.cart.lines.map((line) => {
    if (line.merchandise.__typename === "ProductVariant" && line.merchandise.product.hasAnyTag) {
      // Sort discounts in descending order of quantity (so we check the highest valid tier first)
      let metaData = configuration.discounts.slice().sort((a, b) => b.quantity - a.quantity);
      
      // Find the highest applicable discount for the line quantity
      let metaInfo = metaData.find((tier) => line.quantity >= tier.quantity);
      
      if (metaInfo) {
        return {
          message: metaInfo.message,
          targets: [
            {
              cartLine: {
                id: line.id,
              },
            },
          ],
          value: {
            percentage: {
              value: metaInfo.discount,
            },
          },
        };
      }
    }
    return null;
  }).filter((value) => value !== null);

  return discountApplication.length > 0
    ? {
        discountApplicationStrategy: DiscountApplicationStrategy.Maximum,
        discounts: discountApplication,
      }
    : EMPTY_DISCOUNT;
}