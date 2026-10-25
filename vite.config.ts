import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // caminhos relativos: o build funciona em qualquer subpasta
  base: './',
});
