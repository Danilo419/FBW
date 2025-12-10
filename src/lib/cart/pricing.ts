// src/lib/cart/pricing.ts

export type CartItem = {
  id: string;
  name: string;
  price: number;   // preço em euros (ex.: 34.99)
  quantity: number;
};

/**
 * Expande os itens do carrinho em unidades individuais
 * Ex.: { price: 30, quantity: 2 } → [{30}, {30}]
 */
function explodeUnits(cartItems: CartItem[]): { price: number }[] {
  const units: { price: number }[] = [];

  for (const item of cartItems) {
    const qty = Math.max(0, item.quantity || 0);
    for (let i = 0; i < qty; i++) {
      units.push({ price: item.price });
    }
  }

  return units;
}

/**
 * Aplica as promoções:
 * - LEVE 5, PAGUE 3 (2 grátis por cada 5)
 * - LEVE 3, PAGUE 2 (1 grátis por cada 3 no resto)
 * Sempre dá grátis os PRODUTOS MAIS BARATOS.
 *
 * Estratégia:
 * 1) Usa o máximo possível de grupos de 5 (melhor promo: 2/5 grátis)
 * 2) No que sobrar, usa grupos de 3 (1/3 grátis)
 * 3) O desconto é a soma dos N itens mais baratos (N = nº de unidades grátis)
 */
export function applyPromotions(cartItems: CartItem[]) {
  const units = explodeUnits(cartItems);
  if (!units.length) {
    return {
      discount: 0,
      freeUnitsCount: 0,
      hasPromotion: false,
    };
  }

  // Ordena por preço ASC (mais baratos primeiro)
  const sorted = [...units].sort((a, b) => a.price - b.price);
  const totalUnits = sorted.length;

  // Primeiro: grupos de 5 (Leve 5, Pague 3 → 2 grátis em cada 5)
  const groupsOf5 = Math.floor(totalUnits / 5);
  const remainingAfter5 = totalUnits - groupsOf5 * 5;

  // Depois: grupos de 3 no que sobra (Leve 3, Pague 2 → 1 grátis em cada 3)
  const groupsOf3 = Math.floor(remainingAfter5 / 3);

  const freeUnitsFrom5 = groupsOf5 * 2;
  const freeUnitsFrom3 = groupsOf3 * 1;
  const freeUnitsCount = freeUnitsFrom5 + freeUnitsFrom3;

  if (freeUnitsCount <= 0) {
    return {
      discount: 0,
      freeUnitsCount: 0,
      hasPromotion: false,
    };
  }

  // O desconto é a soma dos N itens mais baratos (onde N = freeUnitsCount)
  let discount = 0;
  for (let i = 0; i < freeUnitsCount && i < sorted.length; i++) {
    discount += sorted[i].price;
  }

  return {
    discount,
    freeUnitsCount,
    hasPromotion: freeUnitsCount > 0,
  };
}

/**
 * Calcula o shipping:
 * - 0 unidades → 0€
 * - Se tiver promoção ativa (hasPromotion = true e pelo menos 3 unidades) → 0€ (free shipping)
 * - Se tiver 1 unidade → 5€
 * - Se tiver 2 unidades sem promoção → 5€
 * - Se tiver mais unidades e não tiver promoção → 5€ (podes mudar fácil aqui)
 */
export function calculateShipping(totalUnits: number, hasPromotion: boolean): number {
  if (totalUnits <= 0) return 0;

  // Free shipping quando o cliente usa as promoções (Leve 3 / Leve 5)
  if (hasPromotion && totalUnits >= 3) {
    return 0;
  }

  // Sem promoção aplicada:
  if (totalUnits === 1) {
    return 5;
  }

  if (totalUnits === 2) {
    return 5;
  }

  // Se futuramente quiseres outra regra (ex.: 3+ sem promo = 7€, etc.),
  // é só trocar este valor.
  return 5;
}

/**
 * Função principal para calcular tudo:
 * - subtotal (sem promo)
 * - desconto das promoções
 * - shipping
 * - total final
 */
export function calculateCartTotals(cartItems: CartItem[]) {
  if (!cartItems.length) {
    return {
      subtotal: 0,
      discount: 0,
      shipping: 0,
      total: 0,
      promotion: {
        discount: 0,
        freeUnitsCount: 0,
        hasPromotion: false,
      },
    };
  }

  const totalUnits = cartItems.reduce(
    (acc, item) => acc + (item.quantity || 0),
    0
  );

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * (item.quantity || 0),
    0
  );

  const promo = applyPromotions(cartItems);
  const shipping = calculateShipping(totalUnits, promo.hasPromotion);

  const total = subtotal - promo.discount + shipping;

  return {
    subtotal,
    discount: promo.discount,
    shipping,
    total,
    promotion: promo,
  };
}
