import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { UFS } from '../constantes';
import { carregarExterior, useDados, type Municipio } from '../dados';
import { coresPorNumero, lados } from '../disputa';
import { normalizar, pct, votos } from '../formato';
import { ELEICAO, titulo } from '../tse';
import { IconeFechar } from './Icones';
import { LinhaCandidato, Progresso } from './PainelUF';

function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onFechar]);
  return (
    <div className="fundo-modal" onClick={onFechar}>
      <div className="modal caixa" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <header className="modal-cab">
          <h2>{titulo}</h2>
          <button className="botao icone" onClick={onFechar} aria-label="Fechar">
            <IconeFechar />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export type Escolha =
  | { tipo: 'uf'; uf: string }
  | { tipo: 'mun'; m: Municipio }
  | { tipo: 'gov'; uf: string };

export function Busca({ onFechar, onEscolher }: { onFechar: () => void; onEscolher: (e: Escolha) => void }) {
  const [q, setQ] = useState('');
  const campo = useRef<HTMLInputElement>(null);
  const municipios = useDados((e) => e.municipios);
  const gov2t = useDados((e) => e.gov2t);
  const presBr = useDados((e) => e.presBr);
  useEffect(() => campo.current?.focus(), []);

  const indice = useMemo(
    () => municipios.filter((m) => m.uf !== 'ZZ').map((m) => ({ m, chave: normalizar(m.nome) })),
    [municipios],
  );

  const termo = normalizar(q.trim());
  const ufs = termo ? UFS.filter((u) => normalizar(u.nome).includes(termo) || u.sigla.toLowerCase() === termo) : [];
  const muns = termo.length >= 2
    ? indice
        .filter((x) => x.chave.includes(termo))
        .sort((a, b) => Number(!a.chave.startsWith(termo)) - Number(!b.chave.startsWith(termo)) || Number(b.m.capital) - Number(a.m.capital))
        .slice(0, 8)
    : [];
  const candidatos = termo.length >= 2
    ? [
        ...(presBr?.candidatos.map((c) => ({ c, uf: null as string | null })) ?? []),
        ...Object.entries(gov2t).flatMap(([uf, r]) => r.candidatos.map((c) => ({ c, uf }))),
      ].filter(({ c }) => normalizar(c.nome).includes(termo) || normalizar(c.nomeCompleto).includes(termo))
    : [];

  const vazio = termo && !ufs.length && !muns.length && !candidatos.length;

  return (
    <Modal titulo="Buscar" onFechar={onFechar}>
      <input
        ref={campo}
        className="campo"
        placeholder="Município, estado ou candidato"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="resultados-busca">
        {ufs.length > 0 && <h4>Estados</h4>}
        {ufs.map((u) => (
          <button key={u.sigla} className="item-busca" onClick={() => onEscolher({ tipo: 'uf', uf: u.sigla })}>
            <span className="chip-uf neutro">{u.sigla}</span> {u.nome}
          </button>
        ))}
        {muns.length > 0 && <h4>Municípios</h4>}
        {muns.map(({ m }) => (
          <button key={m.tse} className="item-busca" onClick={() => onEscolher({ tipo: 'mun', m })}>
            <span className="chip-uf neutro">{m.uf}</span> {titulo(m.nome)}
            {m.capital && <span className="chip chip-amarelo">capital</span>}
          </button>
        ))}
        {candidatos.length > 0 && <h4>Candidatos</h4>}
        {candidatos.map(({ c, uf }) => (
          <button
            key={`${uf}-${c.sqcand}`}
            className="item-busca"
            onClick={() => onEscolher(uf ? { tipo: 'gov', uf } : { tipo: 'uf', uf: '' })}
          >
            <span className="chip-uf neutro">{uf ?? 'BR'}</span> {c.nome}{' '}
            <span className="suave">
              {c.partido} {c.numero} · {uf ? 'Governador' : 'Presidente'}
            </span>
          </button>
        ))}
        {vazio && <p className="suave">Nada encontrado para “{q}”.</p>}
        {!termo && <p className="suave">Digite ao menos duas letras.</p>}
      </div>
    </Modal>
  );
}

export function Exterior({ onFechar }: { onFechar: () => void }) {
  const zz = useDados((e) => e.presUf.ZZ);
  const camada = useDados((e) => e.exterior);
  const municipios = useDados((e) => e.municipios);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    void carregarExterior().finally(() => setCarregando(false));
  }, []);

  const cores = coresPorNumero(zz);
  const nomes = useMemo(() => new Map(municipios.filter((m) => m.uf === 'ZZ').map((m) => [m.tse, m.nome])), [municipios]);
  const cidades = Object.entries(camada.resultados)
    .map(([cod, r]) => ({ cod, r, nome: titulo(nomes.get(cod) ?? cod) }))
    .sort((a, b) => b.r.validos - a.r.validos);

  return (
    <Modal titulo="Votos do exterior" onFechar={onFechar}>
      <Progresso r={zz} />
      {lados(zz)
        .sort((a, b) => b.c.votos - a.c.votos)
        .map((l) => (
          <LinhaCandidato key={l.c.numero} l={l} eleicao={ELEICAO.presidente2t} uf="br" total />
        ))}
      <h4 className="subtitulo">
        Por cidade {carregando && <span className="suave">· carregando…</span>}
      </h4>
      <div className="tabela-exterior">
        {cidades.map(({ cod, r, nome }) => {
          const [a, b] = r.candidatos;
          const fa = a && b && a.votos + b.votos ? (100 * a.votos) / (a.votos + b.votos) : 50;
          return (
            <div key={cod} className="linha-exterior">
              <span className="linha-exterior-nome">{nome}</span>
              <span className="suave">{votos(r.validos)} válidos</span>
              <div className="barra-fina">
                <div style={{ width: `${fa}%`, background: a ? cores[a.numero] : undefined }} />
                <div style={{ width: `${100 - fa}%`, background: b ? cores[b.numero] : undefined }} />
              </div>
              <strong>
                {a?.nome} {a && pct(a.pct, 1)}%
              </strong>
            </div>
          );
        })}
        {!carregando && !cidades.length && <p className="suave">Nenhuma cidade apurada ainda.</p>}
      </div>
    </Modal>
  );
}
