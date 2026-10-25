import { lados } from '../disputa';
import { milhoes, pct, votos } from '../formato';
import type { Resultado } from '../tse';
import { Foto } from './Foto';

interface Props {
  r: Resultado | null;
  eleicao: string;
  ufFoto: string;
  rotulo?: string;
  onCandidato?: (numero: string) => void;
}

function manchete(r: Resultado) {
  const eleito = r.candidatos.find((c) => c.eleito);
  if (eleito) return `${eleito.nome} está eleito${eleito.situacao.endsWith('a') ? 'a' : ''}`;
  if (r.totalizadas === 0) return 'Aguardando o início da apuração';
  if (r.pctTotalizadas < 1) return 'Ainda é cedo: menos de 1% das seções';
  const [a, b] = r.candidatos;
  const dif = a.votos - (b?.votos ?? 0);
  if (r.pctTotalizadas > 50) return `${a.nome} lidera por ${milhoes(dif)} de votos`;
  return `${a.nome} na frente com ${pct(r.pctTotalizadas, 0)}% apurado`;
}

export function Placar({ r, eleicao, ufFoto, rotulo, onCandidato }: Props) {
  const ls = lados(r);
  if (!r || ls.length < 2) {
    return <section className="placar caixa placar-vazio">Carregando resultados do TSE…</section>;
  }
  const [e, d] = ls;
  const totalDois = e.c.votos + d.c.votos;
  const fe = totalDois ? (100 * e.c.votos) / totalDois : 50;
  const faltam = Math.max(0, r.eleitorado - r.eleitoradoApurado);

  return (
    <section className="placar caixa" aria-label={rotulo ?? 'Resultado'}>
      <button className="placar-foto" onClick={() => onCandidato?.(e.c.numero)} aria-label={`Ver ${e.c.nome}`}>
        <Foto eleicao={eleicao} uf={ufFoto} sqcand={e.c.sqcand} nome={e.c.nome} cor={e.cor} tamanho={64} />
      </button>
      <div className="placar-centro">
        <div className="placar-nomes">
          <span className="placar-nome">
            {e.c.nome}
            <span className="etiqueta" style={{ background: e.cor }}>
              {e.c.partido} {e.c.numero}
            </span>
          </span>
          <h2 className="manchete">
            {rotulo && <span className="manchete-rotulo">{rotulo}</span>}
            {manchete(r)}
          </h2>
          <span className="placar-nome direita">
            <span className="etiqueta" style={{ background: d.cor }}>
              {d.c.partido} {d.c.numero}
            </span>
            {d.c.nome}
          </span>
        </div>
        <div
          className="barra"
          role="img"
          aria-label={`${e.c.nome} ${pct(e.c.pct)}%, ${d.c.nome} ${pct(d.c.pct)}% dos votos válidos`}
        >
          <div className="barra-lado" style={{ width: `${fe}%`, background: e.cor }}>
            <strong className="barra-pct">
              {pct(e.c.pct)}
              <small>%</small>
            </strong>
            <span className="barra-votos">{votos(e.c.votos)} votos</span>
          </div>
          <div className="barra-lado direita" style={{ width: `${100 - fe}%`, background: d.cor }}>
            <span className="barra-votos">{votos(d.c.votos)} votos</span>
            <strong className="barra-pct">
              {pct(d.c.pct)}
              <small>%</small>
            </strong>
          </div>
          <span className="barra-meio">50%</span>
        </div>
        <div className="placar-rodape">
          <span className="destaque-verde">{pct(r.pctTotalizadas)}%</span> das seções apuradas
          {faltam > 0 && <> · faltam {milhoes(faltam)} de eleitores</>}
          {r.totalizacaoFinal && <> · totalização concluída</>}
        </div>
      </div>
      <button className="placar-foto" onClick={() => onCandidato?.(d.c.numero)} aria-label={`Ver ${d.c.nome}`}>
        <Foto eleicao={eleicao} uf={ufFoto} sqcand={d.c.sqcand} nome={d.c.nome} cor={d.cor} tamanho={64} />
      </button>
    </section>
  );
}
