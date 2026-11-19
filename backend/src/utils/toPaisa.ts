export function toPaisa(amount: number | string): number {
  return Math.round(Number(amount) * 100);
}
