/** The Russian form of a counted noun: one, few (2–4) or many. */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const d = n % 10, h = n % 100;
  if (d === 1 && h !== 11) return one;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
  return many;
}

/** «участник», «участника», «участников». */
export const members = (n: number) => pluralRu(n, 'участник', 'участника', 'участников');
