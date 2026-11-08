import type { Profile, ProductId } from "./types";

export interface ProductInfo {
  id: ProductId;
  name: string;
  short: string;
  what: string;
  usage: string[];
  precautions: string[];
  sunscreen: boolean;
  exfoliating: boolean;
}

// General educational guidance only. No concentrations, efficacy claims or invented instructions.
export const PRODUCTS: ProductInfo[] = [
  {
    id: "sa-facewash",
    name: "Be Bodywise 1% Salicylic Acid Face Wash",
    short: "Salicylic Acid Face Wash",
    what: "A face wash that lists salicylic acid, a beta hydroxy acid (BHA), as a key ingredient. BHAs are commonly used in cleansers aimed at oily or acne-prone skin.",
    usage: [
      "Follow the directions printed on your product's label and packaging.",
      "Cleansers are generally rinsed off — avoid leaving them on longer than the label suggests.",
      "If the label gives a frequency, stick to it rather than increasing it to speed up results.",
    ],
    precautions: [
      "Acid-based products can cause dryness or tightness for some people, especially at the start.",
      "Avoid contact with eyes and broken or irritated skin.",
      "Be cautious layering with other exfoliating products unless advised by a professional.",
    ],
    sunscreen: true,
    exfoliating: true,
  },
  {
    id: "snail-serum",
    name: "Be Bodywise Snail Mucin Serum",
    short: "Snail Mucin Serum",
    what: "A leave-on serum featuring snail mucin, an ingredient commonly used in hydrating skincare.",
    usage: [
      "Follow the directions printed on your product's label and packaging.",
      "Serums are usually applied to clean skin before moisturiser — check your label for order.",
    ],
    precautions: [
      "Anyone with a known sensitivity to snail-derived ingredients should avoid it.",
      "Stop use if you notice persistent redness, itching or burning.",
    ],
    sunscreen: false,
    exfoliating: false,
  },
  {
    id: "pigmentation",
    name: "Be Bodywise Pigmentation Care product",
    short: "Pigmentation Care",
    what: "A product positioned for pigmentation or uneven tone. Ingredients vary by specific product — check your label for exactly what yours contains.",
    usage: [
      "Follow the directions printed on your specific product's label.",
      "Products for tone concerns often take consistent, label-directed use; results vary between people.",
    ],
    precautions: [
      "Some tone-targeting ingredients can increase sun sensitivity — check your label.",
      "Stop use and seek advice if irritation persists.",
    ],
    sunscreen: true,
    exfoliating: false,
  },
  {
    id: "other",
    name: "Other product",
    short: "Your product",
    what: "A product you've added yourself. FIRST 30 doesn't have specific information for it, so rely on its official label.",
    usage: ["Follow the directions printed on your product's label and packaging."],
    precautions: [
      "Stop use and seek medical advice if you notice burning, swelling, or significant irritation.",
    ],
    sunscreen: true,
    exfoliating: false,
  },
];

export function getProduct(id: ProductId) {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[3]!;
}

export function productName(p: Profile) {
  return p.productId === "other" ? p.customProductName || "Your product" : getProduct(p.productId).short;
}
