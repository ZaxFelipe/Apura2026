import { useSyncExternalStore } from 'react';
import { UFS } from './constantes';
import {
  CARGO,
  ELEICAO,
  andamento,
  emLotes,
  resultado,
  type Progresso,
  type Resultado,
} from './tse';

export const INTERVALO_MS = 30_000;
const PARALELO = 12;
const CHAVE_HISTORICO = 'apuracao26:historico';

export interface Municipio {
  tse: string;
  ibge: string | null;
  nome: string;
  uf: string;
  capital: boolean;
}

export interface PontoProjecao {
  t: number;
  apurado: number;
  /** fatia do candidato de menor número entre os dois, em % */
  atual: number;
  projetado: number;
}

/** Resultados municipais de um cargo, indexados pelo código TSE do município. */
export interface Camada {
  resultados: Record<string, Resultado>;
  progresso: Record<string, Progresso>;
  /** ufs cujo andamento municipal já foi lido */
  ufsLidas: Record<string, number>;
}

export interface Estado {
  municipios: Municipio[];
  presBr: Resultado | null;
  presUf: Record<string, Resultado>;
  presMun: Camada;
  pres1tUf: Record<string, Resultado>;
  gov2tUfs: string[];
  gov2t: Record<string, Resultado>;
  govMun: Camada;
  gov1t: Record<string, Resultado>;
  senado1t: Record<string, Resultado>;
  exterior: Camada;
  fila: { feitos: number; total: number };
  ultimaLeitura: number;
  proximaLeitura: number;
  erro: string | null;
  historico: PontoProjecao[];
}

const camadaVazia = (): Camada => ({ resultados: {}, progresso: {}, ufsLidas: {} });

let estado: Estado = {
  municipios: [],
  presBr: null,
  presUf: {},
  presMun: camadaVazia(),
  pres1tUf: {},
  gov2tUfs: [],
  gov2t: {},
  govMun: camadaVazia(),
  gov1t: {},
  senado1t: {},
  exterior: camadaVazia(),
  fila: { feitos: 0, total: 0 },
  ultimaLeitura: 0,
  proximaLeitura: 0,
  erro: null,
  historico: lerHistorico(),
};

const ouvintes = new Set<() => void>();
function atualizar(parcial: Partial<Estado>) {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((o) => o());
}

export function useDados<T>(seletor: (e: Estado) => T): T {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    () => seletor(estado),
  );
}

export const obterEstado = () => estado;

function lerHistorico(): PontoProjecao[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_HISTORICO) ?? '[]');
  } catch {
    return [];
  }
}

function salvarHistorico(h: PontoProjecao[]) {
  try {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(h));
  } catch {
    /* armazenamento indisponível: o gráfico vale só para esta sessão */
  }
}

/* ---------- camadas municipais ---------- */

type NomeCamada = 'presMun' | 'govMun' | 'exterior';

const FONTE: Record<NomeCamada, { eleicao: string; cargo: string }> = {
  presMun: { eleicao: ELEICAO.presidente2t, cargo: CARGO.presidente },
  exterior: { eleicao: ELEICAO.presidente2t, cargo: CARGO.presidente },
  govMun: { eleicao: ELEICAO.estadual2t, cargo: CARGO.governador },
};

let filaFeitos = 0;
let filaTotal = 0;
let pendentes: Partial<Record<NomeCamada, Record<string, Resultado>>> = {};
let agendado = 0;

function publicarPendentes() {
  agendado = 0;
  const parcial: Partial<Estado> = { fila: { feitos: filaFeitos, total: filaTotal } };
  for (const nome of Object.keys(pendentes) as NomeCamada[]) {
    const c = estado[nome];
    parcial[nome] = { ...c, resultados: { ...c.resultados, ...pendentes[nome] } };
  }
  pendentes = {};
  if (filaFeitos >= filaTotal) filaFeitos = filaTotal = 0;
  atualizar(parcial);
}

function agendarPublicacao() {
  if (!agendado) agendado = window.setTimeout(publicarPendentes, 350);
}

/** Lê o andamento municipal de uma UF e baixa só os municípios que mudaram. */
async function atualizarCamada(nome: NomeCamada, uf: string) {
  const { eleicao, cargo } = FONTE[nome];
  const lista = await andamento(eleicao, uf);
  const atual = estado[nome];
  const progresso = { ...atual.progresso };
  const mudaram: string[] = [];
  for (const p of lista) {
    if (p.tipo !== 'mun') continue;
    progresso[p.codigo] = p;
    const anterior = atual.resultados[p.codigo];
    if (p.totalizadas > 0 && (!anterior || anterior.totalizadas !== p.totalizadas)) {
      mudaram.push(p.codigo);
    }
  }
  atualizar({
    [nome]: { ...estado[nome], progresso, ufsLidas: { ...estado[nome].ufsLidas, [uf]: Date.now() } },
  });
  if (!mudaram.length) return;
  filaTotal += mudaram.length;
  await emLotes(mudaram, PARALELO, async (cod) => {
    const r = await resultado(eleicao, cargo, uf, cod);
    filaFeitos++;
    if (r) (pendentes[nome] ??= {})[cod] = r;
    agendarPublicacao();
  });
}

/* ---------- ciclo de leitura ---------- */

let foco: { cargo: 'presidente' | 'governadores'; uf: string | null } = {
  cargo: 'presidente',
  uf: null,
};
let ultimoAndamentoUf: Record<string, number> = {};
let rodando = false;
let temporizador = 0;

export function definirFoco(cargo: 'presidente' | 'governadores', uf: string | null) {
  const mudou = foco.cargo !== cargo || foco.uf !== uf;
  foco = { cargo, uf };
  if (mudou) void carregarFoco();
}

async function carregarFoco() {
  const { cargo, uf } = foco;
  if (uf) {
    void carregarSenadoEGovernador1t(uf);
    if (cargo === 'governadores' && estado.gov2tUfs.includes(uf) && !estado.govMun.ufsLidas[uf]) {
      await atualizarCamada('govMun', uf);
    }
  }
  if (cargo === 'governadores' && !Object.keys(estado.gov1t).length) void carregarGovernadores1t();
}

async function lerPresidente() {
  const [br, ab] = await Promise.all([
    resultado(ELEICAO.presidente2t, CARGO.presidente, 'br'),
    andamento(ELEICAO.presidente2t, 'br'),
  ]);
  const ufs = ab.filter((p) => p.tipo === 'uf');
  if (br) atualizar({ presBr: br });

  const mudaram = ufs
    .map((p) => p.codigo.toUpperCase())
    .filter((uf) => {
      const p = ufs.find((x) => x.codigo.toUpperCase() === uf)!;
      return !estado.presUf[uf] || ultimoAndamentoUf[uf] !== p.totalizadas;
    });
  const presUf = { ...estado.presUf };
  await emLotes(mudaram, PARALELO, async (uf) => {
    const r = await resultado(ELEICAO.presidente2t, CARGO.presidente, uf);
    if (r) presUf[uf] = r;
  });
  atualizar({ presUf });

  // municípios: só as UFs que andaram desde a última leitura
  const ufsMun = ufs.filter((p) => {
    const uf = p.codigo.toUpperCase();
    return uf !== 'ZZ' && p.totalizadas > 0 && ultimoAndamentoUf[uf] !== p.totalizadas;
  });
  for (const p of ufs) ultimoAndamentoUf[p.codigo.toUpperCase()] = p.totalizadas;
  registrarProjecao();
  // a UF em foco vem primeiro para o mapa dela preencher logo
  ufsMun.sort((a, b) => Number(b.codigo.toUpperCase() === foco.uf) - Number(a.codigo.toUpperCase() === foco.uf));
  await emLotes(ufsMun, 3, (p) => atualizarCamada('presMun', p.codigo));
}

async function lerGovernadores() {
  if (!estado.gov2tUfs.length) {
    const ab = await andamento(ELEICAO.estadual2t, 'br');
    atualizar({ gov2tUfs: ab.filter((p) => p.tipo === 'uf').map((p) => p.codigo.toUpperCase()).sort() });
  }
  const gov2t = { ...estado.gov2t };
  await emLotes(estado.gov2tUfs, PARALELO, async (uf) => {
    const r = await resultado(ELEICAO.estadual2t, CARGO.governador, uf);
    if (r) gov2t[uf] = r;
  });
  atualizar({ gov2t });
  if (foco.cargo === 'governadores' && foco.uf && estado.gov2tUfs.includes(foco.uf)) {
    await atualizarCamada('govMun', foco.uf);
  }
}

async function carregarPrimeiroTurnoPresidente() {
  if (Object.keys(estado.pres1tUf).length) return;
  const pres1tUf: Record<string, Resultado> = {};
  await emLotes([...UFS.map((u) => u.sigla), 'ZZ'], PARALELO, async (uf) => {
    const r = await resultado(ELEICAO.presidente1t, CARGO.presidente, uf);
    if (r) pres1tUf[uf] = r;
  });
  atualizar({ pres1tUf });
}

async function carregarGovernadores1t() {
  const gov1t: Record<string, Resultado> = {};
  await emLotes(UFS.map((u) => u.sigla), PARALELO, async (uf) => {
    const r = await resultado(ELEICAO.estadual1t, CARGO.governador, uf);
    if (r) gov1t[uf] = r;
  });
  atualizar({ gov1t: { ...estado.gov1t, ...gov1t } });
}

async function carregarSenadoEGovernador1t(uf: string) {
  const tarefas: Promise<void>[] = [];
  if (!estado.senado1t[uf]) {
    tarefas.push(
      resultado(ELEICAO.estadual1t, CARGO.senador, uf).then((r) => {
        if (r) atualizar({ senado1t: { ...estado.senado1t, [uf]: r } });
      }),
    );
  }
  if (!estado.gov1t[uf]) {
    tarefas.push(
      resultado(ELEICAO.estadual1t, CARGO.governador, uf).then((r) => {
        if (r) atualizar({ gov1t: { ...estado.gov1t, [uf]: r } });
      }),
    );
  }
  await Promise.all(tarefas);
}

export async function carregarExterior() {
  await atualizarCamada('exterior', 'ZZ');
}

async function ciclo() {
  if (rodando) return;
  rodando = true;
  window.clearTimeout(temporizador);
  try {
    await Promise.all([lerPresidente(), lerGovernadores()]);
    atualizar({ erro: null, ultimaLeitura: Date.now() });
  } catch (e) {
    atualizar({ erro: e instanceof Error ? e.message : 'Falha ao ler o TSE' });
  } finally {
    rodando = false;
    const proxima = Date.now() + INTERVALO_MS;
    atualizar({ proximaLeitura: proxima });
    temporizador = window.setTimeout(ciclo, INTERVALO_MS);
  }
}

export async function iniciar() {
  const municipios: Municipio[] = await fetch(`${import.meta.env.BASE_URL}data/municipios.json`).then((r) =>
    r.json(),
  );
  atualizar({ municipios });
  void carregarPrimeiroTurnoPresidente().then(registrarProjecao);
  await ciclo();
  void carregarFoco();
}

export const atualizarAgora = () => void ciclo();

/* ---------- projeção ---------- */

export interface Projecao {
  numeros: [string, string];
  /** % dos válidos projetada para cada um dos dois */
  pct: [number, number];
}

/**
 * Projeção simples: em cada UF, os votos que faltam são estimados pelo eleitorado
 * ainda não apurado × comparecimento e taxa de votos válidos observados até agora.
 * Eles são divididos pela fatia atual dos candidatos na UF; onde há poucos votos
 * apurados, a fatia parte da distribuição da UF no 1º turno, ajustada pela
 * variação média já observada no país.
 */
export function projetar(e: Pick<Estado, 'presBr' | 'presUf' | 'pres1tUf'>): Projecao | null {
  const br = e.presBr;
  if (!br || br.candidatos.length < 2 || br.validos === 0) return null;
  const [a, b] = br.candidatos.slice(0, 2).map((c) => c.numero) as [string, string];
  const votosDe = (r: Resultado | undefined, num: string) => r?.candidatos.find((c) => c.numero === num)?.votos ?? 0;
  const fatia = (r: Resultado | undefined) => {
    const va = votosDe(r, a);
    const vb = votosDe(r, b);
    return va + vb > 0 ? va / (va + vb) : null;
  };

  // variação média entre a fatia atual e a do 1º turno, ponderada pelos votos já apurados
  let somaVar = 0;
  let pesoVar = 0;
  const ufs = Object.keys(e.presUf);
  for (const uf of ufs) {
    const r = e.presUf[uf];
    const agora = fatia(r);
    const antes = fatia(e.pres1tUf[uf]);
    if (agora != null && antes != null && r.validos > 0) {
      somaVar += (agora - antes) * r.validos;
      pesoVar += r.validos;
    }
  }
  const variacao = pesoVar ? somaVar / pesoVar : 0;
  const comparecimentoBr = br.eleitoradoApurado ? br.comparecimento / br.eleitoradoApurado : 0.78;
  const validosBr = br.comparecimento ? br.validos / br.comparecimento : 0.95;
  const fatiaBr = fatia(br) ?? 0.5;

  let totalA = 0;
  let totalB = 0;
  for (const uf of ufs) {
    const r = e.presUf[uf];
    const va = votosDe(r, a);
    const vb = votosDe(r, b);
    const restante = Math.max(0, r.eleitorado - r.eleitoradoApurado);
    const comp = r.eleitoradoApurado > 2000 ? r.comparecimento / r.eleitoradoApurado : comparecimentoBr;
    const val = r.comparecimento > 2000 ? r.validos / r.comparecimento : validosBr;
    const novos = restante * comp * val;
    const antes = fatia(e.pres1tUf[uf]);
    const base = antes != null ? Math.min(0.98, Math.max(0.02, antes + variacao)) : fatiaBr;
    const agora = fatia(r);
    const w = r.validos / (r.validos + 20000);
    const f = agora != null ? w * agora + (1 - w) * base : base;
    totalA += va + novos * f;
    totalB += vb + novos * (1 - f);
  }
  const total = totalA + totalB;
  if (!total) return null;
  return { numeros: [a, b], pct: [(100 * totalA) / total, (100 * totalB) / total] };
}

function registrarProjecao() {
  const br = estado.presBr;
  if (!br || br.pctTotalizadas < 1 || !Object.keys(estado.pres1tUf).length) return;
  const p = projetar(estado);
  if (!p) return;
  // a série é sempre do candidato de menor número, para não inverter se a liderança mudar
  const [ref, outro] = [...br.candidatos.slice(0, 2)].sort((x, y) => Number(x.numero) - Number(y.numero));
  const fatiaAtual = (100 * ref.votos) / (ref.votos + outro.votos || 1);
  const historico = estado.historico.filter((h) => h.apurado < br.pctTotalizadas);
  historico.push({
    t: Date.now(),
    apurado: br.pctTotalizadas,
    atual: fatiaAtual,
    projetado: p.pct[p.numeros.indexOf(ref.numero)],
  });
  salvarHistorico(historico);
  atualizar({ historico });
}
