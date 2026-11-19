export function fromPaisa(amount: number): string {
  return (amount / 100).toFixed(2);
}
