const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const IconeBusca = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);

export const IconeGlobo = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
  </svg>
);

export const IconeCompartilhar = () => (
  <svg {...base}>
    <path d="M12 15V3M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);

export const IconeLua = () => (
  <svg {...base}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);

export const IconeSol = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconeTelaCheia = () => (
  <svg {...base}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export const IconeFechar = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconeSeta = ({ direcao }: { direcao: 'esq' | 'dir' }) => (
  <svg {...base}>
    <path d={direcao === 'esq' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
  </svg>
);

export const IconeMais = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconeMenos = () => (
  <svg {...base}>
    <path d="M5 12h14" />
  </svg>
);
