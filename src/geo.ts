import { geoMercator, geoPath } from 'd3-geo';
import { feature, merge, mesh } from 'topojson-client';
import type { GeometryCollection, MultiPolygon, Polygon, Topology } from 'topojson-specification';

type Prop = { cd: string };
const codigo = (g: { properties?: unknown }) => String((g.properties as Prop | undefined)?.cd);
import { UFS, UF_POR_IBGE } from './constantes';

export const LARGURA = 1120;
export const ALTURA = 960;
/** faixa à direita reservada para os rótulos dos estados pequenos */
export const MARGEM_CHAMADAS = 150;

export interface FormaMunicipio {
  ibge: string;
  uf: string;
  d: string;
  centro: [number, number];
}

export interface FormaUF {
  uf: string;
  d: string;
  centro: [number, number];
  caixa: [[number, number], [number, number]];
}

export interface Geometria {
  municipios: FormaMunicipio[];
  ufs: FormaUF[];
  divisasUF: string;
  contorno: string;
}

// pontos de rótulo ajustados à mão onde o centróide cai mal
const AJUSTE_CENTRO: Record<string, [number, number]> = {
  GO: [-10, 25],
  MG: [0, 10],
  PA: [0, 15],
  BA: [10, 0],
  SC: [10, 0],
  PI: [5, 5],
  MA: [-5, -5],
  RO: [-5, 0],
};

let promessa: Promise<Geometria> | null = null;

export function carregarGeometria() {
  promessa ??= (async () => {
    const topo = (await fetch(`${import.meta.env.BASE_URL}geo/brasil.topo.json`).then((r) =>
      r.json(),
    )) as Topology<{ municipios: GeometryCollection<Prop> }>;
    const obj = topo.objects.municipios;
    const brasil = feature(topo, obj);
    const projecao = geoMercator().fitExtent(
      [
        [20, 20],
        [LARGURA - MARGEM_CHAMADAS, ALTURA - 20],
      ],
      brasil,
    );
    const caminho = geoPath(projecao);

    const municipios: FormaMunicipio[] = brasil.features.map((f) => {
      const ibge = String(f.properties!.cd);
      return {
        ibge,
        uf: UF_POR_IBGE.get(ibge.slice(0, 2))?.sigla ?? '',
        d: caminho(f) ?? '',
        centro: caminho.centroid(f) as [number, number],
      };
    });

    const ufs: FormaUF[] = UFS.map((u) => {
      const geo = merge(
        topo,
        obj.geometries.filter((g) => codigo(g).startsWith(u.ibge)) as (Polygon | MultiPolygon)[],
      );
      const c = caminho.centroid(geo) as [number, number];
      const ajuste = AJUSTE_CENTRO[u.sigla] ?? [0, 0];
      return {
        uf: u.sigla,
        d: caminho(geo) ?? '',
        centro: [c[0] + ajuste[0], c[1] + ajuste[1]],
        caixa: caminho.bounds(geo) as [[number, number], [number, number]],
      };
    });

    const ufDe = (g: { properties?: unknown }) => codigo(g).slice(0, 2);
    const divisasUF = caminho(mesh(topo, obj, (a, b) => a !== b && ufDe(a) !== ufDe(b))) ?? '';
    const contorno = caminho(mesh(topo, obj, (a, b) => a === b)) ?? '';
    return { municipios, ufs, divisasUF, contorno };
  })();
  return promessa;
}
