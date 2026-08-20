import type { Config } from "tailwindcss";

const config: Config = {
  // El tema se decide por un atributo data-theme en <html>, no por la media
  // query del sistema: el usuario puede elegir y su elección manda.
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        border: "var(--border)",
        muted: "var(--muted)",
        // Tokens que antes eran rgba(255,255,255,x) hardcodeados. En modo
        // claro esos blancos quedaban invisibles, así que ahora todo lo que
        // depende del tema pasa por acá.
        divider: "var(--divider)",
        "divider-soft": "var(--divider-soft)",
        "border-strong": "var(--glass-input-border-focus)",
        hover: "var(--hover-bg)",
        active: "var(--active-bg)",
        scrim: "var(--scrim)",
      },
    },
  },
  plugins: [],
};
export default config;
