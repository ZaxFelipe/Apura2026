import { useState } from 'react';
import { urlFoto } from '../tse';

interface Props {
  eleicao: string;
  uf: string;
  sqcand: string;
  nome: string;
  cor: string;
  tamanho?: number;
}

/** Foto do candidato vinda do TSE, com as iniciais como reserva. */
export function Foto({ eleicao, uf, sqcand, nome, cor, tamanho = 40 }: Props) {
  const [falhou, setFalhou] = useState(false);
  const iniciais = nome
    .split(' ')
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
  return (
    <span className="foto" style={{ width: tamanho, height: tamanho, background: cor }}>
      {falhou ? (
        <span className="foto-iniciais">{iniciais}</span>
      ) : (
        <img src={urlFoto(eleicao, uf, sqcand)} alt="" loading="lazy" onError={() => setFalhou(true)} />
      )}
    </span>
  );
}
