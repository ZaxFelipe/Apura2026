import { useDados } from '../dados';
import { lados } from '../disputa';
import { pct } from '../formato';
import { ELEICAO } from '../tse';
import { Foto } from './Foto';

function Anel({ valor }: { valor: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 40 40" className="anel" aria-label={`${pct(valor, 0)}% apurado`}>
      <circle cx="20" cy="20" r={r} className="anel-fundo" />
      <circle
        cx="20"
        cy="20"
        r={r}
        className="anel-valor"
        strokeDasharray={`${(valor / 100) * c} ${c}`}
        transform="rotate(-90 20 20)"
      />
      <text x="20" y="23.5" textAnchor="middle">
        {pct(valor, 0)}%
      </text>
    </svg>
  );
}

export function PainelGovernadores({ onUF }: { onUF: (uf: string) => void }) {
  const ufs = useDados((e) => e.gov2tUfs);
  const gov2t = useDados((e) => e.gov2t);
  const definidas = Object.values(gov2t).filter((r) => r.candidatos.some((c) => c.eleito)).length;

  return (
    <aside className="painel painel-esq caixa" aria-label="Disputas para governador">
      <section className="bloco">
        <header className="bloco-cab">
          <h3>Governadores</h3>
          <span className="chip">2º turno em {ufs.length} estados</span>
        </header>
        <p className="suave">
          {definidas ? `${definidas} ${definidas === 1 ? 'resultado definido' : 'resultados definidos'}` : 'Nenhum resultado definido ainda'}
        </p>
        <p className="numero-grande">
          {27 - ufs.length} <span>definidos no 1º turno</span>
        </p>
      </section>
      <section className="bloco">
        <header className="bloco-cab">
          <h3>As disputas</h3>
        </header>
        {ufs.map((uf) => {
          const r = gov2t[uf];
          const ls = lados(r);
          const total = ls.reduce((s, l) => s + l.c.votos, 0);
          const fe = total && ls[0] ? (100 * ls[0].c.votos) / total : 50;
          return (
            <button key={uf} className="disputa-gov" onClick={() => onUF(uf)}>
              <div className="disputa-gov-uf">
                <span className="chip-uf neutro">{uf}</span>
                <Anel valor={r?.pctTotalizadas ?? 0} />
              </div>
              <div className="disputa-gov-corpo">
                {ls.length === 2 ? (
                  <>
                    <div className="disputa-gov-cand">
                      <Foto eleicao={ELEICAO.estadual2t} uf={uf} sqcand={ls[0].c.sqcand} nome={ls[0].c.nome} cor={ls[0].cor} tamanho={30} />
                      <span>{ls[0].c.nome}</span>
                      <strong>{total ? `${pct(ls[0].c.pct, 1)}%` : ''}</strong>
                    </div>
                    <div className="barra-fina">
                      <div style={{ width: `${fe}%`, background: total ? ls[0].cor : undefined }} />
                      <div style={{ width: `${100 - fe}%`, background: total ? ls[1].cor : undefined }} />
                      <i />
                    </div>
                    <div className="disputa-gov-cand">
                      <Foto eleicao={ELEICAO.estadual2t} uf={uf} sqcand={ls[1].c.sqcand} nome={ls[1].c.nome} cor={ls[1].cor} tamanho={30} />
                      <span>{ls[1].c.nome}</span>
                      <strong>{total ? `${pct(ls[1].c.pct, 1)}%` : ''}</strong>
                    </div>
                  </>
                ) : (
                  <span className="suave">Carregando…</span>
                )}
              </div>
            </button>
          );
        })}
      </section>
    </aside>
  );
}
