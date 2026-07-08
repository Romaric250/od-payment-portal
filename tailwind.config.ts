import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "od-navy": "var(--od-navy)",
        "od-navy-dark": "var(--od-navy-dark)",
        "od-orange": "var(--od-orange)",
        "od-orange-dark": "var(--od-orange-dark)",
        "od-white": "var(--od-white)",
        "od-bg": "var(--od-bg)",
        "od-border": "var(--od-border)",
        "od-text": "var(--od-text)",
        "od-text-muted": "var(--od-text-muted)",
        "od-success": "var(--od-success)",
        "od-warning": "var(--od-warning)",
        "od-error": "var(--od-error)",
        "od-info": "var(--od-info)",
      },
    },
  },
  plugins: [],
};
export default config;
