export function applyPromotions(cartItems: { price: number }[]) {
  if (!cartItems.length) return { discount: 0, freeItems: [] };

  // Ordenar ASC pelos mais baratos (muito importante)
  const sorted = [...cartItems].sort((a, b) => a.price - b.price);

  const totalItems = sorted.length;
  let freeItems: number[] = []; // guarda os preços dos produtos grátis

  /* ========================================================
     Promoção 1: LEVE 3, PAGUE 2  (1 grátis a cada 3)
     ======================================================== */
  const groupsOf3 = Math.floor(totalItems / 3);
  for (let i = 0; i < groupsOf3; i++) {
    freeItems.push(sorted[i].price);
  }

  /* ========================================================
     Promoção 2: LEVE 5, PAGUE 3  (2 grátis a cada 5)
     ======================================================== */
  const groupsOf5 = Math.floor(totalItems / 5);
  for (let i = 0; i < groupsOf5; i++) {
    // dois grátis por cada grupo de 5
    freeItems.push(sorted[i * 2]?.price || 0);
    freeItems.push(sorted[i * 2 + 1]?.price || 0);
  }

  const discount = freeItems.reduce((acc, n) => acc + n, 0);

  return {
    discount,
    freeItems,
  };
}
