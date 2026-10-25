import { useMemo } from 'react';
import { UF_POR_SIGLA } from '../constantes';
import { projetar, useDados, type PontoProjecao } from '../dados';
import { lados, vantagem, type Lado } from '../disputa';
import { pct } from '../formato';
import { ELEICAO } from '../tse';
import { Foto } from './Foto';

function Grafico({ pontos, base, outro }: { pontos: PontoProjecao[]; base: Lado; outro: Lado }) {
  const L = 260;
  const A = 140;
  const m = { e: 34, d: 6, t: 8, b: 20 };
  const valores = pontos.flatMap((p) => [p.projetado, p.atual]);
  const meia = Math.max(1.5, ...valores.map((v) => Math.abs(v - 50) + 0.4));
  const x = (v: number) => m.e + (v / 100) * (L - m.e - m.d);
  const y = (v: number) => m.t + ((50 + meia - v) / (2 * meia)) * (A - m.t - m.b);
  const linha = (k: 'projetado' | 'atual') =>
    pontos.map((p, i) => `${i ? 'L' : 'M'}${x(p.apurado).toFixed(1)},${y(p[k]).toFixed(1)}`).join('');
  const ultimo = pontos[pontos.length - 1];
  const corUltimo = ultimo && ultimo.projetado >= 50 ? base.cor : outro.cor;

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="grafico" role="img" aria-label="A projeção ao longo da apuração">
      {[50 + meia, 50, 50 - meia].map((v) => (
        <g key={v}>
          <line x1={m.e} x2={L - m.d} y1={y(v)} y2={y(v)} className={v === 50 ? 'grade meio' : 'grade'} />
          <text x={m.e - 4} y={y(v) + 3} textAnchor="end" className="grafico-texto">
            {pct(v, 1)}%
          </text>
        </g>
      ))}
      <text x={m.e} y={A - 4} className="grafico-texto">
        0%
      </text>
      <text x={(m.e + L) / 2} y={A - 4} textAnchor="middle" className="grafico-texto">
        seções apuradas
      </text>
      <text x={L - m.d} y={A - 4} textAnchor="end" className="grafico-texto">
        100%
      </text>
      {pontos.length > 1 && (
        <>
          <path d={linha('atual')} className="serie atual" />
          <path d={linha('projetado')} className="serie projetada" style={{ stroke: corUltimo }} />
        </>
      )}
      {ultimo && <circle cx={x(ultimo.apurado)} cy={y(ultimo.projetado)} r={4} fill={corUltimo} className="ponto" />}
    </svg>
  );
}

export function PainelPresidente({ onUF }: { onUF: (uf: string) => void }) {
  const presBr = useDados((e) => e.presBr);
  const presUf = useDados((e) => e.presUf);
  const pres1tUf = useDados((e) => e.pres1tUf);
  const historico = useDados((e) => e.historico);
  const ls = lados(presBr);

  const projecao = useMemo(
    () => (presBr && presBr.pctTotalizadas >= 1 ? projetar({ presBr, presUf, pres1tUf }) : null),
    [presBr, presUf, pres1tUf],
  );

  const porLider = useMemo(() => {
    const grupos: Record<string, { uf: string; pontos: number }[]> = {};
    for (const [uf, r] of Object.entries(presUf)) {
      if (uf === 'ZZ' || uf === 'BR') continue;
      const v = vantagem(r);
      if (!v) continue;
      (grupos[v.lider.numero] ??= []).push({ uf, pontos: v.pontos });
    }
    for (const g of Object.values(grupos)) g.sort((a, b) => b.pontos - a.pontos);
    return grupos;
  }, [presUf]);

  const apertados = useMemo(
    () =>
      Object.entries(presUf)
        .filter(([uf, r]) => uf !== 'ZZ' && r.pctTotalizadas > 0)
        .map(([uf, r]) => ({ uf, r, v: vantagem(r)! }))
        .filter((x) => x.v)
        .sort((a, b) => a.v.pontos - b.v.pontos)
        .slice(0, 5),
    [presUf],
  );

  if (ls.length < 2) return <aside className="painel caixa">Carregando…</aside>;
  const [base, outro] = ls;

  return (
    <aside className="painel painel-esq caixa" aria-label="Projeção e estados">
      <section className="bloco">
        <header className="bloco-cab">
          <h3>Projeção</h3>
          <span className="chip chip-amarelo">estimativa</span>
        </header>
        <p className="suave">Como a apuração deve terminar</p>
        <div className="projecao">
          {ls.map((l) => {
            const v = projecao ? projecao.pct[projecao.numeros.indexOf(l.c.numero)] : null;
            return (
              <div key={l.c.numero} className="projecao-cand">
                <Foto eleicao={ELEICAO.presidente2t} uf="br" sqcand={l.c.sqcand} nome={l.c.nome} cor={l.cor} tamanho={36} />
                <div>
                  <span>{l.c.nome}</span>
                  <strong style={{ color: v != null && v > 50 ? l.cor : undefined }}>
                    {v != null ? `${pct(v, 1)}%` : '—'}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
        <p className="legenda-ponto">
          {presBr && presBr.pctTotalizadas < 1
            ? 'Começa com 1% das seções apuradas'
            : `Linha cheia: projeção de ${base.c.nome} · tracejada: apurado`}
        </p>
        <Grafico pontos={historico} base={base} outro={outro} />
        <p className="suave pequeno">
          Modelo simples: estima os votos que faltam em cada estado pelo eleitorado ainda não apurado e pelo
          desempenho já observado. Não é uma previsão oficial.
        </p>
      </section>

      <section className="bloco">
        <header className="bloco-cab">
          <h3>Quem lidera nos estados</h3>
        </header>
        {ls.map((l) => {
          const lista = porLider[l.c.numero] ?? [];
          return (
            <div key={l.c.numero} className="lideranca">
              <p>
                <span className="quadrado" style={{ background: l.cor }} /> {l.c.nome}{' '}
                <strong>
                  {lista.length} {lista.length === 1 ? 'estado' : 'estados'}
                </strong>
              </p>
              <div className="chips-uf">
                {lista.length ? (
                  lista.map((x) => (
                    <button
                      key={x.uf}
                      className="chip-uf"
                      style={{ background: l.cor }}
                      title={`${UF_POR_SIGLA.get(x.uf)?.nome}: +${pct(x.pontos, 1)} pontos`}
                      onClick={() => onUF(x.uf)}
                    >
                      {x.uf}
                    </button>
                  ))
                ) : (
                  <span className="suave">Nenhum estado até agora</span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {apertados.length > 0 && (
        <section className="bloco">
          <header className="bloco-cab">
            <h3>Disputas mais apertadas</h3>
          </header>
          {apertados.map(({ uf, r, v }) => {
            const cor = ls.find((l) => l.c.numero === v.lider.numero)?.cor;
            return (
              <button key={uf} className="apertado" onClick={() => onUF(uf)}>
                <span className="chip-uf neutro">{uf}</span>
                <span className="apertado-nome">
                  {v.lider.nome} <small>{pct(r.pctTotalizadas, 0)}% apurado</small>
                </span>
                <strong style={{ background: cor }}>+{pct(v.pontos, 1)}</strong>
              </button>
            );
          })}
        </section>
      )}
    </aside>
  );
}
