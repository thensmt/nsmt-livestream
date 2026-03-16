import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tickets': 'https://rjl5qaqz7k.execute-api.us-east-1.amazonaws.com/prod',
    },
  },
});
