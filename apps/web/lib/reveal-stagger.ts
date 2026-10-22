export function revealStagger(index: number): number {
  if (Number.isNaN(index) || index <= 0) return 0;
  return Math.min(Math.floor(index), 6) * 60;
}
