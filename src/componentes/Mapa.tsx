import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { UFS_CHAMADA } from '../constantes';
import { ALTURA, LARGURA, MARGEM_CHAMADAS, type Geometria } from '../geo';
import { IconeMais, IconeMenos } from './Icones';

type Caixa = [number, number, number, number];
const CHEIA: Caixa = [0, 0, LARGURA, ALTURA];

export interface Alvo {
  tipo: 'uf' | 'mun';
  id: string;
}

export interface RotuloUF {
  texto?: string;
  cor?: string;
}

interface Props {
  geo: Geometria;
  ufFoco: string | null;
  munFoco: string | null;
  mostrarMunicipios: boolean;
  corMun: (ibge: string) => string | null;
  corUF: (uf: string) => string | null;
  hachurado?: (uf: string) => boolean;
  rotuloUF?: (uf: string) => RotuloUF | null;
  cidades?: { ibge: string; nome: string }[];
  onUF: (uf: string) => void;
  onMun: (ibge: string) => void;
  dica: (alvo: Alvo) => ReactNode;
  rotuloAcessivel: string;
}

function caixaDaUF(geo: Geometria, uf: string, proporcao: number): Caixa {
  const f = geo.ufs.find((u) => u.uf === uf);
  if (!f) return CHEIA;
  const [[x0, y0], [x1, y1]] = f.caixa;
  const folga = 0.12;
  let w = (x1 - x0) * (1 + 2 * folga);
  let h = (y1 - y0) * (1 + 2 * folga);
  // mantém a proporção do contêiner para o estado ocupar o espaço disponível
  if (w / h > proporcao) h = w / proporcao;
  else w = h * proporcao;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return [cx - w / 2, cy - h / 2, w, h];
}

const Municipios = memo(function Municipios({
  geo,
  cor,
}: {
  geo: Geometria;
  cor: (ibge: string) => string | null;
}) {
  return (
    <g className="camada-mun">
      {geo.municipios.map((m) => (
        <path key={m.ibge} d={m.d} data-mun={m.ibge} fill={cor(m.ibge) ?? 'var(--mapa-vazio)'} />
      ))}
    </g>
  );
});

export function Mapa(p: Props) {
  const { geo } = p;
  const svg = useRef<SVGSVGElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const [caixa, setCaixa] = useState<Caixa>(CHEIA);
  const [tela, setTela] = useState({ w: LARGURA, h: ALTURA });
  const proporcao = tela.w / tela.h;
  // o estado só muda ao trocar de área; a posição da dica vai direto no DOM
  const [sobre, setSobre] = useState<Alvo | null>(null);
  const dicaRef = useRef<HTMLDivElement>(null);
  const posDica = useRef({ x: 0, y: 0 });
  const animacao = useRef(0);
  const atual = useRef<Caixa>(CHEIA);
  const arraste = useRef<{ x: number; y: number; caixa: Caixa; moveu: boolean } | null>(null);

  useEffect(() => {
    const el = caixaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width && height) setTela({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function animarPara(destino: Caixa) {
    cancelAnimationFrame(animacao.current);
    const origem = atual.current;
    const inicio = performance.now();
    const dur = 550;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / dur);
      const k = 1 - Math.pow(1 - t, 3);
      const c = origem.map((v, i) => v + (destino[i] - v) * k) as Caixa;
      atual.current = c;
      setCaixa(c);
      if (t < 1) animacao.current = requestAnimationFrame(passo);
    };
    animacao.current = requestAnimationFrame(passo);
  }

  useEffect(() => {
    animarPara(p.ufFoco ? caixaDaUF(geo, p.ufFoco, proporcao) : CHEIA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.ufFoco, geo, proporcao]);

  function zoom(fator: number, cx?: number, cy?: number) {
    const [x, y, w, h] = atual.current;
    const nw = Math.min(LARGURA * 1.2, Math.max(25, w * fator));
    const nh = nw * (h / w);
    const px = cx ?? x + w / 2;
    const py = cy ?? y + h / 2;
    const c: Caixa = [px - ((px - x) * nw) / w, py - ((py - y) * nh) / h, nw, nh];
    atual.current = c;
    setCaixa(c);
  }

  function pontoSvg(ev: { clientX: number; clientY: number }) {
    const r = svg.current!.getBoundingClientRect();
    const [x, y, w, h] = atual.current;
    // preserveAspectRatio "meet": calcula a escala real usada
    const escala = Math.min(r.width / w, r.height / h);
    const ox = (r.width - w * escala) / 2;
    const oy = (r.height - h * escala) / 2;
    return [x + (ev.clientX - r.left - ox) / escala, y + (ev.clientY - r.top - oy) / escala, escala] as const;
  }

  function transformDica() {
    const { x, y } = posDica.current;
    return `translate(${Math.min(x + 16, (caixaRef.current?.clientWidth ?? 0) - 250)}px, ${y + 16}px)`;
  }

  function alvoDe(el: EventTarget | null): Alvo | null {
    const t = el as SVGElement | null;
    if (!t?.dataset) return null;
    if (t.dataset.mun) return { tipo: 'mun', id: t.dataset.mun };
    if (t.dataset.uf) return { tipo: 'uf', id: t.dataset.uf };
    return null;
  }

  const formaSobre = useMemo(() => {
    if (!sobre) return null;
    if (sobre.tipo === 'mun') return geo.municipios.find((m) => m.ibge === sobre.id)?.d;
    return geo.ufs.find((u) => u.uf === sobre.id)?.d;
  }, [sobre, geo]);

  const formaFoco = useMemo(
    () => (p.munFoco ? geo.municipios.find((m) => m.ibge === p.munFoco)?.d : null),
    [p.munFoco, geo],
  );

  const chamadas = useMemo(() => {
    const itens = geo.ufs
      .filter((u) => UFS_CHAMADA.includes(u.uf) && u.uf !== 'DF')
      .sort((a, b) => a.centro[1] - b.centro[1]);
    let y = -Infinity;
    return itens.map((u) => {
      y = Math.max(u.centro[1], y + 42);
      return { ...u, ly: y };
    });
  }, [geo]);

  const escalaTexto = caixa[2] / LARGURA;
  // unidades do SVG por pixel de tela (o viewBox usa "meet")
  const porPixel = 1 / Math.min(tela.w / caixa[2], tela.h / caixa[3]);
  const nacional = !p.ufFoco;

  // cidades na ordem recebida, sem as que cairiam em cima de um rótulo já posto
  const cidades = useMemo(() => {
    const postas: { nome: string; centro: [number, number] }[] = [];
    const minimo = 90 * porPixel;
    for (const c of p.cidades ?? []) {
      const m = geo.municipios.find((x) => x.ibge === c.ibge);
      if (!m) continue;
      const perto = postas.some(
        (o) => Math.abs(o.centro[1] - m.centro[1]) < minimo / 3 && Math.abs(o.centro[0] - m.centro[0]) < minimo * 1.6,
      );
      if (!perto) postas.push({ nome: c.nome, centro: m.centro });
    }
    return postas;
  }, [p.cidades, geo, porPixel]);

  return (
    <div className="mapa" ref={caixaRef}>
      <svg
        ref={svg}
        viewBox={caixa.join(' ')}
        role="img"
        aria-label={p.rotuloAcessivel}
        onPointerDown={(e) => {
          arraste.current = { x: e.clientX, y: e.clientY, caixa: atual.current, moveu: false };
        }}
        onPointerMove={(e) => {
          const a = arraste.current;
          if (a && e.buttons === 1) {
            const dx = e.clientX - a.x;
            const dy = e.clientY - a.y;
            if (!a.moveu && Math.hypot(dx, dy) < 5) return;
            a.moveu = true;
            svg.current!.setPointerCapture(e.pointerId);
            const [, , escala] = pontoSvg(e);
            const c: Caixa = [a.caixa[0] - dx / escala, a.caixa[1] - dy / escala, a.caixa[2], a.caixa[3]];
            atual.current = c;
            setCaixa(c);
            setSobre(null);
            return;
          }
          const alvo = alvoDe(e.target);
          const r = caixaRef.current!.getBoundingClientRect();
          posDica.current = { x: e.clientX - r.left, y: e.clientY - r.top };
          if (dicaRef.current) dicaRef.current.style.transform = transformDica();
          if (alvo?.id !== sobre?.id || alvo?.tipo !== sobre?.tipo) setSobre(alvo);
        }}
        onPointerLeave={() => setSobre(null)}
        onPointerUp={(e) => {
          const a = arraste.current;
          arraste.current = null;
          if (a?.moveu) return;
          const alvo = alvoDe(e.target);
          if (!alvo) return;
          if (alvo.tipo === 'uf') p.onUF(alvo.id);
          else {
            const m = geo.municipios.find((x) => x.ibge === alvo.id);
            if (m && m.uf !== p.ufFoco) p.onUF(m.uf);
            else p.onMun(alvo.id);
          }
        }}
        onWheel={(e) => {
          const [x, y] = pontoSvg(e);
          zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, x, y);
        }}
      >
        <defs>
          <pattern id="hachura" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="var(--mapa-vazio)" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--tinta)" strokeWidth="1.2" opacity="0.35" />
          </pattern>
        </defs>

        {p.mostrarMunicipios ? (
          <Municipios geo={geo} cor={p.corMun} />
        ) : (
          <g className="camada-uf">
            {geo.ufs.map((u) => (
              <path
                key={u.uf}
                d={u.d}
                data-uf={u.uf}
                fill={p.hachurado?.(u.uf) ? 'url(#hachura)' : (p.corUF(u.uf) ?? 'var(--mapa-vazio)')}
              />
            ))}
          </g>
        )}

        {p.ufFoco && (
          <g className="fora-do-foco">
            {geo.ufs
              .filter((u) => u.uf !== p.ufFoco)
              .map((u) => (
                <path key={u.uf} d={u.d} data-uf={u.uf} />
              ))}
          </g>
        )}

        <path className="divisas" d={geo.divisasUF} />
        <path className="contorno" d={geo.contorno} />

        {nacional && p.rotuloUF && (
          <g className="rotulos" style={{ fontSize: 22 * escalaTexto }}>
            {geo.ufs
              .filter((u) => !UFS_CHAMADA.includes(u.uf))
              .map((u) => {
                const r = p.rotuloUF!(u.uf);
                return (
                  <g key={u.uf} transform={`translate(${u.centro[0]},${u.centro[1]})`}>
                    <text className="rotulo-uf" textAnchor="middle" y={r?.texto ? '-0.2em' : '0.35em'}>
                      {u.uf}
                    </text>
                    {r?.texto && (
                      <text className="rotulo-pct" textAnchor="middle" y="1em">
                        {r.texto}
                      </text>
                    )}
                  </g>
                );
              })}
            {(() => {
              const df = geo.ufs.find((u) => u.uf === 'DF')!;
              const r = p.rotuloUF!('DF');
              return (
                <g transform={`translate(${df.centro[0] + 6},${df.centro[1]})`}>
                  <circle r={4} cx={-6} fill="var(--tinta)" />
                  <text className="rotulo-uf" x={2} y="0.35em">
                    DF {r?.texto && <tspan className="rotulo-pct">{r.texto}</tspan>}
                  </text>
                </g>
              );
            })()}
            {chamadas.map((u) => {
              const r = p.rotuloUF!(u.uf);
              const x = LARGURA - MARGEM_CHAMADAS + 40;
              return (
                <g key={u.uf} className="chamada" data-uf={u.uf}>
                  <polyline
                    points={`${u.centro[0]},${u.centro[1]} ${x - 18},${u.ly} ${x},${u.ly}`}
                    className="chamada-linha"
                  />
                  <rect
                    x={x}
                    y={u.ly - 17}
                    width={108}
                    height={34}
                    rx={6}
                    data-uf={u.uf}
                    fill={r?.cor ?? 'var(--cartao)'}
                    className="chamada-caixa"
                  />
                  <text x={x + 9} y={u.ly} dy="0.35em" className="rotulo-uf" pointerEvents="none">
                    {u.uf} {r?.texto && <tspan className="rotulo-pct">{r.texto}</tspan>}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {!nacional && cidades.length > 0 && (
          <g className="rotulos cidades" style={{ fontSize: 13 * porPixel }}>
            {cidades.map((c) => (
              <g key={c.nome} transform={`translate(${c.centro[0]},${c.centro[1]})`} pointerEvents="none">
                <circle r={3.5 * porPixel} fill="var(--tinta)" stroke="var(--cartao)" strokeWidth={1.5 * porPixel} />
                <text x={7 * porPixel} y="0.35em" className="rotulo-cidade">
                  {c.nome}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>

      {/* destaques numa camada à parte: mudar o hover não repinta os 5.570 municípios */}
      <svg className="mapa-sobreposto" viewBox={caixa.join(' ')} aria-hidden>
        {formaFoco && <path className="realce foco" d={formaFoco} />}
        {formaSobre && <path className="realce" d={formaSobre} />}
      </svg>

      {sobre && (
        <div ref={dicaRef} className="dica caixa" style={{ transform: transformDica() }}>
          {p.dica(sobre)}
        </div>
      )}

      <div className="zoom" role="group" aria-label="Zoom do mapa">
        <button className="botao icone" onClick={() => zoom(1 / 1.4)} aria-label="Aproximar o mapa">
          <IconeMais />
        </button>
        <button className="botao icone" onClick={() => zoom(1.4)} aria-label="Afastar o mapa">
          <IconeMenos />
        </button>
      </div>
    </div>
  );
}
