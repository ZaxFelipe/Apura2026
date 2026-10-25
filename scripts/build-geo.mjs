// Gera os arquivos estáticos do mapa:
//  - public/geo/brasil.topo.json  malha municipal do IBGE simplificada (TopoJSON)
//  - public/data/municipios.json  tabela código TSE -> código IBGE, nome, UF, capital
// Uso: npm run geo
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const IBGE =
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio';
const TSE_CM = 'https://resultados.tse.jus.br/oficial/ele2026/6258/config/mun-e006258-cm.json';

async function baixar(url) {
  console.log('baixando', url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} em ${url}`);
  return r.text();
}

await mkdir(join(raiz, 'public/geo'), { recursive: true });
await mkdir(join(raiz, 'public/data'), { recursive: true });

// Malha municipal -> TopoJSON simplificado
const tmp = join(tmpdir(), `apuracao-geo-${Date.now()}`);
await mkdir(tmp, { recursive: true });
const bruto = join(tmp, 'municipios.json');
await writeFile(bruto, await baixar(IBGE));
const saida = join(raiz, 'public/geo/brasil.topo.json');
const mapshaper = join(raiz, 'node_modules/mapshaper/bin/mapshaper');
execFileSync(
  process.execPath,
  [
    mapshaper,
    bruto,
    '-rename-layers', 'municipios',
    '-each', 'cd=codarea, delete codarea',
    '-simplify', '8%', 'keep-shapes',
    '-o', saida, 'format=topojson', 'quantization=1e5',
  ],
  { stdio: 'inherit' },
);
await rm(tmp, { recursive: true, force: true });

// Tabela de municípios do TSE
const cm = JSON.parse(await baixar(TSE_CM));
const municipios = [];
for (const uf of cm.abr) {
  for (const m of uf.mu) {
    municipios.push({
      tse: m.cd,
      ibge: m.cdi || null,
      nome: m.nm,
      uf: uf.cd.toUpperCase(),
      capital: m.c === 's',
    });
  }
}
await writeFile(join(raiz, 'public/data/municipios.json'), JSON.stringify(municipios));
const tam = (await readFile(saida)).length;
console.log(`ok: ${municipios.length} municípios, malha com ${(tam / 1024).toFixed(0)} KB`);
