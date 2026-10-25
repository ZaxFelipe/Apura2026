import { useCallback, useEffect, useMemo, useState } from 'react';
import { UF_POR_SIGLA } from './constantes';
import { atualizarAgora, definirFoco, useDados, type Municipio } from './dados';
import { coresPorNumero, corLider, lados, vantagem } from './disputa';
import { pct, tom } from './formato';
import { carregarGeometria, type Geometria } from './geo';
import { ELEICAO, titulo } from './tse';
import { Dica } from './componentes/Dica';
import {
  IconeBusca,
  IconeCompartilhar,
  IconeGlobo,
  IconeLua,
  IconeSol,
  IconeTelaCheia,
} from './componentes/Icones';
import { Legenda, VERDE_APURADO } from './componentes/Legenda';
import { Mapa, type Alvo } from './componentes/Mapa';
import { Busca, Exterior, type Escolha } from './componentes/Modais';
import { PainelGovernadores } from './componentes/PainelGovernadores';
import { PainelPresidente } from './componentes/PainelPresidente';
import { PainelUF } from './componentes/PainelUF';
import { Placar } from './componentes/Placar';

type Cargo = 'presidente' | 'governadores';

/* ---------- rota no endereço: #/cargo/UF/municipioTSE ---------- */

interface Rota {
  cargo: Cargo;
  uf: string | null;
  mun: string | null;
}

function lerRota(): Rota {
  const [, c, uf, mun] = location.hash.split('/');
  const sigla = uf?.toUpperCase();
  const valida = !!sigla && UF_POR_SIGLA.has(sigla);
  return {
    cargo: c === 'governadores' ? 'governadores' : 'presidente',
    uf: valida ? sigla : null,
    mun: valida && mun ? mun : null,
  };
}

function enderecoDe(r: Rota) {
  return '#/' + [r.cargo, r.uf, r.uf && r.mun].filter(Boolean).join('/');
}

/* ---------- utilidades de tela ---------- */

const CHAVE_TEMA = 'apuracao26:tema';

function temaInicial(): 'light' | 'dark' {
  const salvo = document.documentElement.dataset.theme;
  if (salvo === 'light' || salvo === 'dark') return salvo;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useAgora(intervalo: number) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), intervalo);
    return () => window.clearInterval(t);
  }, [intervalo]);
  return agora;
}

const hora = (t: number) => new Date(t).toLocaleTimeString('pt-BR');

export function App() {
  const [rota, setRota] = useState(lerRota);
  const [modo, setModo] = useState<'cor' | 'apurado'>('cor');
  const [modal, setModal] = useState<'busca' | 'exterior' | null>(null);
  const [tema, setTema] = useState(temaInicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const [geo, setGeo] = useState<Geometria | null>(null);
  const { cargo, uf } = rota;

  const municipios = useDados((e) => e.municipios);
  const presBr = useDados((e) => e.presBr);
  const presUf = useDados((e) => e.presUf);
  const presMun = useDados((e) => e.presMun);
  const govMun = useDados((e) => e.govMun);
  const gov2t = useDados((e) => e.gov2t);
  const gov2tUfs = useDados((e) => e.gov2tUfs);
  const erro = useDados((e) => e.erro);
  const ultimaLeitura = useDados((e) => e.ultimaLeitura);
  const proximaLeitura = useDados((e) => e.proximaLeitura);
  const fila = useDados((e) => e.fila);
  const agora = useAgora(1000);

  useEffect(() => {
    carregarGeometria().then(setGeo, (e) => console.error('[geo]', e));
  }, []);

  useEffect(() => {
    const voltar = () => setRota(lerRota());
    window.addEventListener('popstate', voltar);
    return () => window.removeEventListener('popstate', voltar);
  }, []);

  useEffect(() => definirFoco(cargo, uf), [cargo, uf]);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch {
      /* sem armazenamento: o tema vale só para esta visita */
    }
  }, [tema]);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 2500);
    return () => window.clearTimeout(t);
  }, [aviso]);

  const ir = useCallback((nova: Rota) => {
    setRota(nova);
    const h = enderecoDe(nova);
    if (h !== location.hash) history.pushState(null, '', h);
  }, []);

  const irUF = useCallback((u: string | null) => ir({ ...rota, uf: u, mun: null }), [ir, rota]);

  // atalhos: "/" abre a busca, Esc volta um nível
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (modal || (e.target as HTMLElement).closest('input, textarea')) return;
      if (e.key === '/') {
        e.preventDefault();
        setModal('busca');
      } else if (e.key === 'Escape') {
        if (rota.mun) ir({ ...rota, mun: null });
        else if (rota.uf) ir({ ...rota, uf: null });
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [modal, rota, ir]);

  /* ---------- índices de municípios ---------- */

  const porIbge = useMemo(
    () => new Map(municipios.filter((m) => m.ibge).map((m) => [m.ibge!, m])),
    [municipios],
  );
  const municipio: Municipio | null = useMemo(
    () => (rota.mun ? (municipios.find((m) => m.tse === rota.mun) ?? null) : null),
    [rota.mun, municipios],
  );

  /* ---------- o que o mapa mostra ---------- */

  const govEmFoco = cargo === 'governadores' && !!uf && gov2tUfs.includes(uf);
  const mostrarMunicipios = cargo === 'presidente' || govEmFoco;
  const refMun = govEmFoco ? gov2t[uf!] : presBr;
  const camada = govEmFoco ? govMun : presMun;
  const coresMun = useMemo(() => coresPorNumero(refMun), [refMun]);
  const coresBr = useMemo(() => coresPorNumero(presBr), [presBr]);

  const corMun = useCallback(
    (ibge: string) => {
      const m = porIbge.get(ibge);
      if (!m || (govEmFoco && m.uf !== uf)) return null;
      if (modo === 'apurado') {
        const p = camada.progresso[m.tse];
        return p && p.pctTotalizadas > 0 ? tom(VERDE_APURADO, 0.12 + (0.88 * p.pctTotalizadas) / 100) : null;
      }
      return corLider(camada.resultados[m.tse], coresMun);
    },
    [porIbge, govEmFoco, uf, modo, camada, coresMun],
  );

  const corUF = useCallback(
    (u: string) => {
      if (!gov2tUfs.includes(u)) return null;
      const r = gov2t[u];
      if (modo === 'apurado') {
        return r && r.pctTotalizadas > 0 ? tom(VERDE_APURADO, 0.12 + (0.88 * r.pctTotalizadas) / 100) : 'var(--mapa-pendente)';
      }
      return corLider(r, coresPorNumero(r)) ?? 'var(--mapa-pendente)';
    },
    [gov2t, gov2tUfs, modo],
  );

  const hachurado = useCallback(
    (u: string) => cargo === 'governadores' && gov2tUfs.length > 0 && !gov2tUfs.includes(u),
    [cargo, gov2tUfs],
  );

  const rotuloUF = useCallback(
    (u: string) => {
      const r = cargo === 'presidente' ? presUf[u] : gov2tUfs.includes(u) ? gov2t[u] : undefined;
      const v = r && vantagem(r);
      if (!r || !v) return cargo === 'governadores' && gov2tUfs.includes(u) ? { cor: 'var(--mapa-pendente)' } : null;
      const cores = cargo === 'presidente' ? coresBr : coresPorNumero(r);
      return { texto: `${pct(v.lider.pct, 0)}%`, cor: corLider(r, cores) ?? undefined };
    },
    [cargo, presUf, gov2t, gov2tUfs, coresBr],
  );

  // a capital e as maiores cidades do estado em foco
  const cidades = useMemo(() => {
    if (!uf) return [];
    const doEstado = municipios.filter((m) => m.uf === uf && m.ibge);
    const tamanho = (m: Municipio) => presMun.progresso[m.tse]?.eleitorado ?? 0;
    // sem o andamento municipal ainda não há como saber as maiores: fica só a capital
    const maiores = doEstado
      .filter((m) => !m.capital && tamanho(m) > 0)
      .sort((a, b) => tamanho(b) - tamanho(a))
      .slice(0, 3);
    return [...doEstado.filter((m) => m.capital), ...maiores].map((m) => ({ ibge: m.ibge!, nome: titulo(m.nome) }));
  }, [uf, municipios, presMun.progresso]);

  /* ---------- legenda ---------- */

  const lsLegenda = useMemo(() => lados(cargo === 'governadores' && !govEmFoco ? null : refMun), [cargo, govEmFoco, refMun]);

  // municípios liderados por cada candidato, só os do estado quando há um em foco
  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    if (!mostrarMunicipios) return c;
    const doEstado = uf ? new Set(municipios.filter((m) => m.uf === uf).map((m) => m.tse)) : null;
    for (const [tse, r] of Object.entries(camada.resultados)) {
      if (doEstado && !doEstado.has(tse)) continue;
      const v = vantagem(r);
      if (v) c[v.lider.numero] = (c[v.lider.numero] ?? 0) + 1;
    }
    return c;
  }, [mostrarMunicipios, uf, municipios, camada.resultados]);

  /* ---------- dica do mapa ---------- */

  const dica = useCallback(
    (alvo: Alvo) => {
      if (alvo.tipo === 'uf') {
        const nome = UF_POR_SIGLA.get(alvo.id)?.nome ?? alvo.id;
        if (cargo === 'governadores') {
          return gov2tUfs.includes(alvo.id) ? (
            <Dica titulo={nome} sub="Governador" r={gov2t[alvo.id]} />
          ) : (
            <Dica titulo={nome} r={undefined} vazio="Governador definido no 1º turno" />
          );
        }
        return <Dica titulo={nome} sub="Presidente" r={presUf[alvo.id]} />;
      }
      const m = porIbge.get(alvo.id);
      if (!m) return null;
      return <Dica titulo={titulo(m.nome)} sub={m.uf} r={camada.resultados[m.tse]} />;
    },
    [cargo, gov2t, gov2tUfs, presUf, porIbge, camada.resultados],
  );

  /* ---------- ações do cabeçalho ---------- */

  async function compartilhar() {
    const dados = { title: document.title, url: location.href };
    try {
      if (navigator.share) await navigator.share(dados);
      else {
        await navigator.clipboard.writeText(location.href);
        setAviso('Link copiado');
      }
    } catch {
      /* compartilhamento cancelado */
    }
  }

  function telaCheia() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }

  function escolher(e: Escolha) {
    setModal(null);
    if (e.tipo === 'mun') ir({ ...rota, uf: e.m.uf, mun: e.m.tse });
    else if (e.tipo === 'gov') ir({ cargo: 'governadores', uf: e.uf, mun: null });
    else if (e.uf) ir({ ...rota, uf: e.uf, mun: null });
    else ir({ cargo: 'presidente', uf: null, mun: null });
  }

  /* ---------- placar ---------- */

  const nomeUF = uf ? (UF_POR_SIGLA.get(uf)?.nome ?? uf) : '';
  const placar =
    cargo === 'presidente' ? (
      <Placar r={presBr} eleicao={ELEICAO.presidente2t} ufFoto="br" rotulo="Presidente" />
    ) : govEmFoco ? (
      <Placar r={gov2t[uf!] ?? null} eleicao={ELEICAO.estadual2t} ufFoto={uf!} rotulo={`Governador · ${nomeUF}`} />
    ) : null;

  const segundos = Math.max(0, Math.ceil((proximaLeitura - agora) / 1000));

  return (
    <div className="app">
      <header className="topo">
        <a className="marca" href="#/presidente" onClick={(e) => (e.preventDefault(), ir({ cargo: 'presidente', uf: null, mun: null }))}>
          <span className="marca-selo">26</span>
          <span>
            Apuração<small>2º turno · ao vivo</small>
          </span>
        </a>

        <div className="segmentos" role="group" aria-label="Cargo">
          {(['presidente', 'governadores'] as const).map((c) => (
            <button key={c} aria-pressed={cargo === c} onClick={() => ir({ cargo: c, uf, mun: null })}>
              {c === 'presidente' ? 'Presidente' : 'Governadores'}
            </button>
          ))}
        </div>

        <nav className="acoes" aria-label="Ações">
          <button className="botao icone" onClick={() => setModal('busca')} aria-label="Buscar município, estado ou candidato" title="Buscar ( / )">
            <IconeBusca />
          </button>
          <button className="botao icone" onClick={() => setModal('exterior')} aria-label="Ver os votos do exterior" title="Exterior">
            <IconeGlobo />
          </button>
          <button className="botao com-texto" onClick={compartilhar} aria-label="Compartilhar">
            <IconeCompartilhar /> <span>Compartilhar</span>
          </button>
          <button
            className="botao icone"
            onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}
            aria-label={tema === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {tema === 'dark' ? <IconeSol /> : <IconeLua />}
          </button>
          <button className="botao icone ocultar-celular" onClick={telaCheia} aria-label="Tela cheia">
            <IconeTelaCheia />
          </button>
        </nav>
      </header>

      {placar}

      <main className={`corpo ${uf ? 'com-uf' : ''}`}>
        {cargo === 'presidente' ? <PainelPresidente onUF={irUF} /> : <PainelGovernadores onUF={irUF} />}

        <section className="area-mapa" aria-label="Mapa">
          <div className="barra-mapa">
            <nav className="trilha" aria-label="Onde você está">
              <button onClick={() => irUF(null)} disabled={!uf}>
                Brasil
              </button>
              {uf && (
                <>
                  <span aria-hidden>›</span>
                  <button onClick={() => ir({ ...rota, mun: null })} disabled={!rota.mun}>
                    {nomeUF}
                  </button>
                </>
              )}
              {municipio && (
                <>
                  <span aria-hidden>›</span>
                  <span>{titulo(municipio.nome)}</span>
                </>
              )}
            </nav>
            <div className="segmentos pequeno" role="group" aria-label="O mapa mostra">
              <button aria-pressed={modo === 'cor'} onClick={() => setModo('cor')}>
                Quem lidera
              </button>
              <button aria-pressed={modo === 'apurado'} onClick={() => setModo('apurado')}>
                Apurado
              </button>
            </div>
          </div>

          {geo ? (
            <Mapa
              geo={geo}
              ufFoco={uf}
              munFoco={municipio?.ibge ?? null}
              mostrarMunicipios={mostrarMunicipios}
              corMun={corMun}
              corUF={corUF}
              hachurado={hachurado}
              rotuloUF={rotuloUF}
              cidades={cidades}
              onUF={irUF}
              onMun={(ibge) => {
                const m = porIbge.get(ibge);
                if (m) ir({ ...rota, uf: m.uf, mun: m.tse });
              }}
              dica={dica}
              rotuloAcessivel={
                cargo === 'presidente'
                  ? 'Mapa do Brasil com o candidato a presidente que lidera em cada município'
                  : 'Mapa das disputas para governador no 2º turno'
              }
            />
          ) : (
            <div className="mapa carregando">Desenhando o mapa…</div>
          )}

          <Legenda
            modo={modo}
            ls={lsLegenda}
            contagem={contagem}
            unidade={['município', 'municípios']}
            pendente={cargo === 'governadores' && !govEmFoco ? 'Aguardando os votos' : undefined}
            hachura={cargo === 'governadores' && !govEmFoco ? 'Definido no 1º turno' : undefined}
          />
        </section>

        {uf && (
          <PainelUF
            uf={uf}
            cargo={cargo}
            municipio={municipio}
            onUF={irUF}
            onFecharMunicipio={() => ir({ ...rota, mun: null })}
          />
        )}
      </main>

      <footer className="rodape">
        <span className={`status ${erro ? 'erro' : ''}`}>
          <i className="status-ponto" />
          {erro
            ? `Falha ao ler o TSE (${erro}) · nova tentativa em ${segundos}s`
            : ultimaLeitura
              ? `Atualizado às ${hora(ultimaLeitura)} · próxima leitura em ${segundos}s`
              : 'Conectando ao TSE…'}
          <button className="link" onClick={atualizarAgora}>
            atualizar agora
          </button>
        </span>
        {fila.total > 0 && (
          <span className="fila">
            municípios: {fila.feitos} de {fila.total}
            <span className="trilho">
              <span style={{ width: `${(100 * fila.feitos) / fila.total}%` }} />
            </span>
          </span>
        )}
        <span className="autoria">Feito por Felipe Moreira</span>
        <a href="https://resultados.tse.jus.br/oficial/app/index.html" target="_blank" rel="noreferrer">
          Dados oficiais do TSE
        </a>
      </footer>

      {modal === 'busca' && <Busca onFechar={() => setModal(null)} onEscolher={escolher} />}
      {modal === 'exterior' && <Exterior onFechar={() => setModal(null)} />}
      {aviso && (
        <div className="aviso" role="status">
          {aviso}
        </div>
      )}
    </div>
  );
}
