import { operation as removePrice } from "./generated/platform/delete-api-v1-platform-plan-prices-publicid";
import { operation as remove } from "./generated/platform/delete-api-v1-platform-plans-publicid";
import { operation as price } from "./generated/platform/get-api-v1-platform-plan-prices-publicid";
import { operation as plans } from "./generated/platform/get-api-v1-platform-plans";
import { operation as plan } from "./generated/platform/get-api-v1-platform-plans-publicid";
import { operation as effective } from "./generated/platform/get-api-v1-platform-plans-publicid-effective-price";
import { operation as prices } from "./generated/platform/get-api-v1-platform-plans-publicid-prices";
import { operation as updatePrice } from "./generated/platform/patch-api-v1-platform-plan-prices-publicid";
import { operation as update } from "./generated/platform/patch-api-v1-platform-plans-publicid";
import { operation as create } from "./generated/platform/post-api-v1-platform-plans";
import { operation as createPrice } from "./generated/platform/post-api-v1-platform-plans-publicid-prices";

/** S9's eleven Platform catalogue management contracts. */
export const platformPlanOperations = {
  plans,
  plan,
  prices,
  price,
  effective,
  create,
  update,
  remove,
  createPrice,
  updatePrice,
  removePrice,
};
