import { coresDisputa } from './constantes';
import { tom } from './formato';
import type { Candidato, Resultado } from './tse';

export interface Lado {
  c: Candidato;
  cor: string;
}

/** Os dois primeiros candidatos, em ordem estável de número, com suas cores. */
export function lados(r: Resultado | null | undefined): Lado[] {
  if (!r) return [];
  const doisPrimeiros = r.candidatos.slice(0, 2).sort((a, b) => Number(a.numero) - Number(b.numero));
  const cores = coresDisputa(doisPrimeiros.map((c) => c.partido));
  return doisPrimeiros.map((c, i) => ({ c, cor: cores[i] }));
}

export const coresPorNumero = (r: Resultado | null | undefined) =>
  Object.fromEntries(lados(r).map((l) => [l.c.numero, l.cor])) as Record<string, string>;

/** Faixas de vantagem do líder, em pontos percentuais. */
export const FAIXAS = [10, 25, 45];
const INTENSIDADE = [0.38, 0.58, 0.8, 1];

export function vantagem(r: Resultado) {
  const [a, b] = r.candidatos;
  if (!a || a.votos === 0) return null;
  return { lider: a, pontos: a.pct - (b?.pct ?? 0) };
}

export function corLider(r: Resultado | undefined, cores: Record<string, string>) {
  if (!r) return null;
  const v = vantagem(r);
  if (!v) return null;
  const cor = cores[v.lider.numero];
  if (!cor) return null;
  const faixa = FAIXAS.findIndex((f) => v.pontos < f);
  return tom(cor, INTENSIDADE[faixa === -1 ? 3 : faixa]);
}

export { INTENSIDADE };
