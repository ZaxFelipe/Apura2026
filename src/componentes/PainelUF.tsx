import { UFS, UF_POR_SIGLA, corPartido } from '../constantes';
import { useDados, type Municipio } from '../dados';
import { lados, type Lado } from '../disputa';
import { milhoes, pct, votos } from '../formato';
import { ELEICAO, titulo, type Resultado } from '../tse';
import { Foto } from './Foto';
import { IconeFechar, IconeSeta } from './Icones';

interface Props {
  uf: string;
  cargo: 'presidente' | 'governadores';
  municipio: Municipio | null;
  onUF: (uf: string | null) => void;
  onFecharMunicipio: () => void;
}

export function Progresso({ r, rotulo = 'seções apuradas' }: { r: Resultado | undefined; rotulo?: string }) {
  if (!r) return null;
  const faltam = Math.max(0, r.eleitorado - r.eleitoradoApurado);
  return (
    <div className="progresso">
      <div className="progresso-linha">
        <strong className="destaque-verde">{pct(r.pctTotalizadas)}%</strong>
        <span>
          {rotulo}
          {faltam > 0 && <small>faltam {milhoes(faltam)} de eleitores</small>}
        </span>
      </div>
      <div className="trilho">
        <div style={{ width: `${r.pctTotalizadas}%` }} />
      </div>
    </div>
  );
}

export function LinhaCandidato({
  l,
  eleicao,
  uf,
  total,
}: {
  l: Lado;
  eleicao: string;
  uf: string;
  total?: boolean;
}) {
  return (
    <div className="linha-cand">
      <Foto eleicao={eleicao} uf={uf} sqcand={l.c.sqcand} nome={l.c.nome} cor={l.cor} tamanho={42} />
      <div className="linha-cand-info">
        <span className="linha-cand-nome">{l.c.nome}</span>
        <span className="linha-cand-partido">
          {l.c.partido} {l.c.numero}
          {total && <> · {votos(l.c.votos)} votos</>}
        </span>
        <div className="mini-barra">
          <div style={{ width: `${l.c.pct}%`, background: l.cor }} />
        </div>
      </div>
      <strong className="linha-cand-pct">{pct(l.c.pct, 1)}%</strong>
    </div>
  );
}

function Disputa({ r, eleicao, uf }: { r: Resultado | undefined; eleicao: string; uf: string }) {
  const ls = lados(r);
  if (!r || !ls.length) return <p className="suave">Aguardando dados…</p>;
  const ordenados = [...ls].sort((a, b) => b.c.votos - a.c.votos);
  return (
    <>
      {ordenados.map((l) => (
        <LinhaCandidato key={l.c.numero} l={l} eleicao={eleicao} uf={uf} total />
      ))}
    </>
  );
}

function Eleitos({ r, uf, eleicao }: { r: Resultado | undefined; uf: string; eleicao: string }) {
  if (!r) return <p className="suave">Carregando…</p>;
  return (
    <>
      {r.candidatos
        .filter((c) => c.eleito)
        .map((c, i) => (
          <LinhaCandidato key={c.numero} l={{ c, cor: corPartido(c.partido, i) }} eleicao={eleicao} uf={uf} />
        ))}
    </>
  );
}

export function PainelUF({ uf, cargo, municipio, onUF, onFecharMunicipio }: Props) {
  const presUf = useDados((e) => e.presUf[uf]);
  const presMun = useDados((e) => (municipio ? e.presMun.resultados[municipio.tse] : undefined));
  const govMun = useDados((e) => (municipio ? e.govMun.resultados[municipio.tse] : undefined));
  const gov2tUfs = useDados((e) => e.gov2tUfs);
  const gov2t = useDados((e) => e.gov2t[uf]);
  const gov1t = useDados((e) => e.gov1t[uf]);
  const senado = useDados((e) => e.senado1t[uf]);
  const nome = UF_POR_SIGLA.get(uf)?.nome ?? uf;
  const i = UFS.findIndex((u) => u.sigla === uf);
  const tem2t = gov2tUfs.includes(uf);
  const munResultado = cargo === 'governadores' && tem2t ? govMun : presMun;
  const munEleicao = cargo === 'governadores' && tem2t ? ELEICAO.estadual2t : ELEICAO.presidente2t;

  const blocoGovernador = (
    <section className="bloco">
      <header className="bloco-cab">
        <h3>Governador</h3>
        <span className="chip">{tem2t ? '2º turno' : 'Eleito no 1º turno'}</span>
      </header>
      {tem2t ? (
        <>
          <Progresso r={gov2t} />
          <Disputa r={gov2t} eleicao={ELEICAO.estadual2t} uf={uf} />
        </>
      ) : (
        <Eleitos r={gov1t} uf={uf} eleicao={ELEICAO.estadual1t} />
      )}
    </section>
  );

  return (
    <aside className="painel painel-uf caixa" aria-label={`Resultados em ${nome}`}>
      <header className="painel-uf-cab">
        <span className="selo-uf">{uf}</span>
        <div>
          <h2>{nome}</h2>
          <span className="suave">{presUf ? `${milhoes(presUf.eleitorado)} de eleitores` : ' '}</span>
        </div>
        <div className="painel-uf-acoes">
          <button className="botao icone" aria-label="Estado anterior" onClick={() => onUF(UFS[(i + 26) % 27].sigla)}>
            <IconeSeta direcao="esq" />
          </button>
          <button className="botao icone" aria-label="Próximo estado" onClick={() => onUF(UFS[(i + 1) % 27].sigla)}>
            <IconeSeta direcao="dir" />
          </button>
          <button className="botao icone" aria-label="Fechar o estado" onClick={() => onUF(null)}>
            <IconeFechar />
          </button>
        </div>
      </header>

      {municipio && (
        <section className="bloco municipio caixa-interna">
          <header className="bloco-cab">
            <h3>
              {titulo(municipio.nome)}
              {municipio.capital && <span className="chip chip-amarelo">capital</span>}
            </h3>
            <button className="botao icone pequeno" aria-label="Fechar o município" onClick={onFecharMunicipio}>
              <IconeFechar />
            </button>
          </header>
          {munResultado ? (
            <>
              <Progresso r={munResultado} />
              <Disputa r={munResultado} eleicao={munEleicao} uf={munEleicao === ELEICAO.presidente2t ? 'br' : uf} />
              <p className="suave pequeno">
                Comparecimento {pct((100 * munResultado.comparecimento) / (munResultado.eleitoradoApurado || 1), 1)}% ·
                brancos {votos(munResultado.brancos)} · nulos {votos(munResultado.nulos)}
              </p>
            </>
          ) : (
            <p className="suave">Nenhuma seção apurada neste município ainda.</p>
          )}
        </section>
      )}

      {cargo === 'governadores' && blocoGovernador}

      <section className="bloco">
        <header className="bloco-cab">
          <h3>Presidente em {nome}</h3>
        </header>
        <Progresso r={presUf} />
        <Disputa r={presUf} eleicao={ELEICAO.presidente2t} uf="br" />
        {presUf && presUf.comparecimento > 0 && (
          <p className="suave pequeno">
            Comparecimento {pct((100 * presUf.comparecimento) / presUf.eleitoradoApurado, 1)}% · brancos{' '}
            {votos(presUf.brancos)} · nulos {votos(presUf.nulos)}
          </p>
        )}
      </section>

      {cargo === 'presidente' && blocoGovernador}

      <section className="bloco">
        <header className="bloco-cab">
          <h3>Senado</h3>
          <span className="chip">Eleitos no 1º turno</span>
        </header>
        <Eleitos r={senado} uf={uf} eleicao={ELEICAO.estadual1t} />
      </section>
    </aside>
  );
}
