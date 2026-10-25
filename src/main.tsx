import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { iniciar } from './dados';
import './estilos.css';

void iniciar();

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
