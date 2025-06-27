import type { Config } from 'tailwindcss';
import scrollbarHide from './tailwind-scrollbar-hide'; 

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}', 
  ],
  theme: {
    extend: {
      animation: {
        shimmer: "shimmer 1.5s infinite", 
      },
    },
  },
  plugins: [scrollbarHide], 
};

export default config;
