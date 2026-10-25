export interface UF {
  sigla: string;
  nome: string;
  ibge: string;
}

export const UFS: UF[] = [
  { sigla: 'AC', nome: 'Acre', ibge: '12' },
  { sigla: 'AL', nome: 'Alagoas', ibge: '27' },
  { sigla: 'AP', nome: 'Amapá', ibge: '16' },
  { sigla: 'AM', nome: 'Amazonas', ibge: '13' },
  { sigla: 'BA', nome: 'Bahia', ibge: '29' },
  { sigla: 'CE', nome: 'Ceará', ibge: '23' },
  { sigla: 'DF', nome: 'Distrito Federal', ibge: '53' },
  { sigla: 'ES', nome: 'Espírito Santo', ibge: '32' },
  { sigla: 'GO', nome: 'Goiás', ibge: '52' },
  { sigla: 'MA', nome: 'Maranhão', ibge: '21' },
  { sigla: 'MT', nome: 'Mato Grosso', ibge: '51' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', ibge: '50' },
  { sigla: 'MG', nome: 'Minas Gerais', ibge: '31' },
  { sigla: 'PA', nome: 'Pará', ibge: '15' },
  { sigla: 'PB', nome: 'Paraíba', ibge: '25' },
  { sigla: 'PR', nome: 'Paraná', ibge: '41' },
  { sigla: 'PE', nome: 'Pernambuco', ibge: '26' },
  { sigla: 'PI', nome: 'Piauí', ibge: '22' },
  { sigla: 'RJ', nome: 'Rio de Janeiro', ibge: '33' },
  { sigla: 'RN', nome: 'Rio Grande do Norte', ibge: '24' },
  { sigla: 'RS', nome: 'Rio Grande do Sul', ibge: '43' },
  { sigla: 'RO', nome: 'Rondônia', ibge: '11' },
  { sigla: 'RR', nome: 'Roraima', ibge: '14' },
  { sigla: 'SC', nome: 'Santa Catarina', ibge: '42' },
  { sigla: 'SP', nome: 'São Paulo', ibge: '35' },
  { sigla: 'SE', nome: 'Sergipe', ibge: '28' },
  { sigla: 'TO', nome: 'Tocantins', ibge: '17' },
];

export const UF_POR_SIGLA = new Map(UFS.map((u) => [u.sigla, u]));
export const UF_POR_IBGE = new Map(UFS.map((u) => [u.ibge, u]));

/** Estados pequenos que ganham rótulo fora do mapa, ligados por uma linha. */
export const UFS_CHAMADA = ['RN', 'PB', 'PE', 'AL', 'SE', 'ES', 'RJ', 'DF'];

const CORES_PARTIDO: Record<string, string> = {
  PT: '#FF4B4B',
  PL: '#3B6CFF',
  PSD: '#FF9F1C',
  MDB: '#2EC4B6',
  PP: '#00A6FB',
  'UNIÃO': '#1B4DD8',
  REPUBLICANOS: '#00B86B',
  PSB: '#FFC300',
  PDT: '#D7263D',
  PSDB: '#4CC9F0',
  NOVO: '#FF6B00',
  PSOL: '#FFD000',
  PODE: '#8F3FFF',
  'PC do B': '#B5179E',
  PV: '#38B000',
  REDE: '#06D6A0',
  AVANTE: '#F15BB5',
  SOLIDARIEDADE: '#FF7F51',
  CIDADANIA: '#EF476F',
  PRD: '#118AB2',
  MOBILIZA: '#9B5DE5',
  DEMOCRATA: '#264653',
  PRTB: '#2A9D8F',
};

const RESERVA = ['#9B5DE5', '#00BBF9', '#F15BB5', '#00F5D4', '#FEE440', '#FB5607'];

export function corPartido(partido: string, indice = 0) {
  return CORES_PARTIDO[partido] ?? RESERVA[indice % RESERVA.length];
}

/** Cores de uma disputa: garante que dois candidatos nunca tenham a mesma cor. */
export function coresDisputa(partidos: string[]) {
  const cores: string[] = [];
  partidos.forEach((p, i) => {
    let c = corPartido(p, i);
    if (cores.includes(c)) c = RESERVA.find((r) => !cores.includes(r)) ?? c;
    cores.push(c);
  });
  return cores;
}
