import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        void: "#050408",
        field: "#10090F",
        "field-2": "#1A1018",
        hairline: "#342031",
        starlight: "#F3ECE3",
        dim: "#A08D9B",
        faint: "#5D4B58",
        ember: "#F5476B",
        glow: "#FF93A8",
        gold: "#F2A65A",
        sage: "#63C9A5",
        coral: "#FF6F5E",
        moth: "#A98BFA",
        bg: "#050408",
        panel: "#10090F",
        line: "#342031",
        text: "#F3ECE3",
        muted: "#A08D9B",
        warning: "#F2A65A"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "SFMono-Regular", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
