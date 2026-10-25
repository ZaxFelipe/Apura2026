const inteiro = new Intl.NumberFormat('pt-BR');

export const votos = (v: number) => inteiro.format(Math.round(v));

export function pct(v: number, casas = 2) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function milhoes(v: number) {
  if (v >= 1e6) return `${pct(v / 1e6, 1)} milhões`;
  if (v >= 1e3) return `${pct(v / 1e3, 1)} mil`;
  return votos(v);
}

/** Remove acentos e caixa para comparar textos na busca. */
export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Mistura uma cor hex com branco (t=0 → branco, t=1 → cor). */
export function tom(hex: string, t: number) {
  const c = parseInt(hex.slice(1), 16);
  const mix = (v: number) => Math.round(255 + (v - 255) * t);
  const r = mix((c >> 16) & 255);
  const g = mix((c >> 8) & 255);
  const b = mix(c & 255);
  return `rgb(${r},${g},${b})`;
}
