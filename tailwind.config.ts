import type { Config } from "tailwindcss";
const { heroui } = require("@heroui/react");

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'octo': {
          'dark': '#0B1A1A',
          'mint': '#00F0A8',
          'magenta': '#FF008C',
          'text': '#E0F7FA',
        },
        'jsr': {
          'yellow': '#FDFD96',
          'orange': '#FF8C00',
          'blue': '#00BFFF',
          'black': '#000000',
        },
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};

export default config;
