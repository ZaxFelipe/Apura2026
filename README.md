# Apuração 2026

Acompanhamento ao vivo do 2º turno das eleições de 2026 (presidente e governadores), com mapa por município e dados oficiais da API pública do TSE.

Feito por Felipe Moreira.

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicação

Cada push na branch `main` gera o build e publica no GitHub Pages pelo workflow em `.github/workflows/deploy.yml`.

## Dados do mapa

`public/geo/brasil.topo.json` (malha municipal do IBGE) e `public/data/municipios.json` (tabela de municípios do TSE) já estão no repositório. Para gerá-los de novo:

```bash
npm run geo
```
