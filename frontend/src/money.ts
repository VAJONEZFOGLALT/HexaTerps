export function formatCzk(amount: string | number): string {
  const numberValue = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(numberValue)) return String(amount);

  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(numberValue);
}
