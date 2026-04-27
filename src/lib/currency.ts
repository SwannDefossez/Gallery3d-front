export function formatCurrencyFromEuros(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function formatCurrencyFromCents(value: number) {
  return formatCurrencyFromEuros(value / 100);
}
