export const SERIES_COLORS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
];

export function colorForIndex(index: number) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

export const INITIALS = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

// Iniciales que no colisionan aunque dos amigos compartan nombre o apellido
// (p.ej. "Marco Laporta" y "Marco Leiva" darian "ML" los dos con INITIALS).
export function uniqueInitials(people: { id: string; name: string }[]): Record<string, string> {
  const counts = new Map<string, number>();
  people.forEach((p) => {
    const key = INITIALS(p.name);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const result: Record<string, string> = {};
  people.forEach((p) => {
    const base = INITIALS(p.name);
    if ((counts.get(base) || 0) <= 1) {
      result[p.id] = base;
      return;
    }
    const parts = p.name.split(' ').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    result[p.id] = `${parts[0]?.[0] || ''}${last.slice(0, 2)}`.toUpperCase();
  });
  return result;
}
