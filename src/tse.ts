// Acesso à API pública de resultados do TSE (resultados.tse.jus.br).
// Arquivos usados:
//   <uf><mun>-c<cargo>-e<eleicao>-u.json  resultado de uma abrangência (Brasil, UF ou município)
//   <uf>-e<eleicao>-ab.json               andamento de cada UF (br) ou de cada município (uf)
//   fotos/<uf>/<sqcand>.jpeg              foto do candidato

export const BASE = 'https://resultados.tse.jus.br/oficial/ele2026';

export const ELEICAO = {
  presidente2t: '6258',
  presidente1t: '6257',
  estadual2t: '6260',
  estadual1t: '6259',
} as const;

export const CARGO = { presidente: '1', governador: '3', senador: '5' } as const;

export type Andamento = 'n' | 'p' | 'f';

export interface Candidato {
  numero: string;
  nome: string;
  nomeCompleto: string;
  partido: string;
  sqcand: string;
  votos: number;
  pct: number;
  eleito: boolean;
  situacao: string;
  vice: string | null;
}

export interface Resultado {
  eleicao: string;
  abrangencia: string;
  andamento: Andamento;
  atualizado: string;
  totalizacaoFinal: boolean;
  secoes: number;
  totalizadas: number;
  pctTotalizadas: number;
  eleitorado: number;
  eleitoradoApurado: number;
  comparecimento: number;
  abstencao: number;
  validos: number;
  brancos: number;
  nulos: number;
  candidatos: Candidato[];
}

export interface Progresso {
  /** o arquivo de andamento mistura níveis: br, uf e mun */
  tipo: 'br' | 'uf' | 'mun';
  codigo: string;
  andamento: Andamento;
  secoes: number;
  totalizadas: number;
  pctTotalizadas: number;
  eleitorado: number;
}

const n = (v: unknown) => (v == null || v === '' ? 0 : Number(String(v).replace(',', '.')) || 0);
const pad = (v: string, t: number) => v.padStart(t, '0');

export function urlResultado(eleicao: string, cargo: string, uf: string, mun = '') {
  const u = uf.toLowerCase();
  return `${BASE}/${eleicao}/dados/${u}/${u}${mun}-c${pad(cargo, 4)}-e${pad(eleicao, 6)}-u.json`;
}

export function urlAndamento(eleicao: string, uf: string) {
  const u = uf.toLowerCase();
  return `${BASE}/${eleicao}/dados/${u}/${u}-e${pad(eleicao, 6)}-ab.json`;
}

export function urlFoto(eleicao: string, uf: string, sqcand: string) {
  return `${BASE}/${eleicao}/fotos/${uf.toLowerCase()}/${sqcand}.jpeg`;
}

async function buscar<T>(url: string): Promise<T | null> {
  // no-cache: o navegador revalida com ETag, e o TSE responde 304 quando nada mudou
  const r = await fetch(url, { cache: 'no-cache' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`TSE respondeu ${r.status}`);
  return r.json() as Promise<T>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function lerResultado(j: any): Resultado {
  const cargo = j.carg?.[0];
  const candidatos: Candidato[] = [];
  for (const agr of cargo?.agr ?? []) {
    for (const par of agr.par ?? []) {
      for (const c of par.cand ?? []) {
        candidatos.push({
          numero: c.n,
          nome: titulo(c.nmu),
          nomeCompleto: c.nm,
          partido: par.sg,
          sqcand: c.sqcand,
          votos: n(c.vap),
          pct: n(c.pvapn),
          eleito: c.e === 's',
          situacao: c.st ?? '',
          vice: c.vs?.[0]?.nmu ? titulo(c.vs[0].nmu) : null,
        });
      }
    }
  }
  candidatos.sort((a, b) => b.votos - a.votos || Number(a.numero) - Number(b.numero));
  return {
    eleicao: j.ele,
    abrangencia: j.cdabr,
    andamento: j.and,
    atualizado: `${j.dg} ${j.hg}`,
    totalizacaoFinal: j.tf === 's',
    secoes: n(j.s?.ts),
    totalizadas: n(j.s?.st),
    pctTotalizadas: n(j.s?.pstn),
    eleitorado: n(j.e?.te),
    eleitoradoApurado: n(j.e?.est),
    comparecimento: n(j.e?.c),
    abstencao: n(j.e?.a),
    validos: n(j.v?.vv),
    brancos: n(j.v?.vb),
    nulos: n(j.v?.tvn),
    candidatos,
  };
}

function lerAndamento(j: any): Progresso[] {
  return (j.abr ?? []).map((a: any) => ({
    tipo: a.tpabr,
    codigo: a.cdabr,
    andamento: a.and,
    secoes: n(a.s?.ts),
    totalizadas: n(a.s?.st),
    pctTotalizadas: n(a.s?.pstn),
    eleitorado: n(a.e?.te),
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function resultado(eleicao: string, cargo: string, uf: string, mun = '') {
  const j = await buscar(urlResultado(eleicao, cargo, uf, mun));
  return j ? lerResultado(j) : null;
}

export async function andamento(eleicao: string, uf: string) {
  const j = await buscar(urlAndamento(eleicao, uf));
  return j ? lerAndamento(j) : [];
}

const MINUSCULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
export function titulo(s: string) {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join('');
}

/** Executa tarefas assíncronas com no máximo `limite` em paralelo. */
export async function emLotes<T>(itens: T[], limite: number, tarefa: (item: T) => Promise<void>) {
  let i = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (i < itens.length) {
      const item = itens[i++];
      try {
        await tarefa(item);
      } catch (e) {
        console.warn('[tse]', e);
      }
    }
  });
  await Promise.all(trabalhadores);
}
