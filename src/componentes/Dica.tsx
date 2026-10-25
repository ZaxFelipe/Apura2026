import { lados } from '../disputa';
import { pct } from '../formato';
import type { Resultado } from '../tse';

interface Props {
  titulo: string;
  sub?: string;
  r: Resultado | undefined;
  /** texto quando não há votos para mostrar */
  vazio?: string;
}

/** Conteúdo da dica do mapa: os dois primeiros e quanto já foi apurado. */
export function Dica({ titulo, sub, r, vazio = 'Nenhuma seção apurada ainda' }: Props) {
  const ls = lados(r).sort((a, b) => b.c.votos - a.c.votos);
  const temVotos = r && ls.some((l) => l.c.votos > 0);
  return (
    <>
      <p className="dica-titulo">
        {titulo} {sub && <span className="suave">{sub}</span>}
      </p>
      {temVotos ? (
        <>
          {ls.map((l) => (
            <p key={l.c.numero} className="dica-linha">
              <span className="quadrado" style={{ background: l.cor }} />
              <span className="dica-nome">{l.c.nome}</span>
              <strong>{pct(l.c.pct, 1)}%</strong>
            </p>
          ))}
          <p className="suave pequeno">{pct(r.pctTotalizadas, 1)}% das seções apuradas</p>
        </>
      ) : (
        <p className="suave pequeno">{vazio}</p>
      )}
    </>
  );
}
