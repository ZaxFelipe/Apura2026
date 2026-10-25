import { FAIXAS, INTENSIDADE, type Lado } from '../disputa';
import { tom } from '../formato';

export const VERDE_APURADO = '#12A150';

interface Props {
  modo: 'cor' | 'apurado';
  ls: Lado[];
  /** quantas áreas cada candidato lidera, por número */
  contagem: Record<string, number>;
  unidade: [string, string];
  hachura?: string;
  pendente?: string;
}

export function Legenda({ modo, ls, contagem, unidade, hachura, pendente }: Props) {
  if (modo === 'apurado') {
    return (
      <div className="legenda caixa">
        <div
          className="legenda-gradiente"
          style={{ background: `linear-gradient(90deg, ${tom(VERDE_APURADO, 0.12)}, ${VERDE_APURADO})` }}
        />
        <p className="legenda-escala">
          <span>0%</span>
          <span>seções apuradas</span>
          <span>100%</span>
        </p>
      </div>
    );
  }
  const algum = ls.some((l) => contagem[l.c.numero]);
  return (
    <div className="legenda caixa">
      {algum &&
        ls.map((l) => {
          const n = contagem[l.c.numero] ?? 0;
          return (
            <p key={l.c.numero} className="legenda-linha">
              <span className="legenda-faixas">
                {INTENSIDADE.map((t) => (
                  <i key={t} style={{ background: tom(l.cor, t) }} />
                ))}
              </span>
              <strong>{l.c.partido}</strong> {n} {n === 1 ? unidade[0] : unidade[1]}
            </p>
          );
        })}
      {algum && <p className="legenda-escala-texto">vantagem de até {FAIXAS.join(' · ')} · mais pontos</p>}
      {pendente && (
        <p className="legenda-linha">
          <i className="legenda-amostra" style={{ background: 'var(--mapa-pendente)' }} />
          {pendente}
        </p>
      )}
      {hachura && (
        <p className="legenda-linha">
          <i className="legenda-amostra hachura" />
          {hachura}
        </p>
      )}
    </div>
  );
}
