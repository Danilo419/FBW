// Pequenos utilitários para eixos e datas

/** Quantas labels cabem sem se sobreporem */
export function computeXAxisInterval(dataLen: number, maxLabels = 12) {
  // 0 = mostra todas; n = salta n ticks entre labels
  if (dataLen <= maxLabels) return 0;
  return Math.ceil(dataLen / maxLabels) - 1;
}

/** Formata datas "YYYY-MM-DD" ou Date para "dd MMM" */
export function formatDateLabel(d: string | number | Date) {
  const date = new Date(d);
  // Ajusta o locale se quiseres "pt-PT"
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
