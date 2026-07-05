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
        void: "#0B0609",
        field: "#150C12",
        "field-2": "#1F1319",
        hairline: "#2C1C25",
        starlight: "#F3ECE3",
        dim: "#A08D9B",
        faint: "#5D4B58",
        ember: "#F5476B",
        glow: "#FF93A8",
        gold: "#F2A65A",
        sage: "#63C9A5",
        coral: "#FF6F5E",
        moth: "#A98BFA",
        bg: "#0B0609",
        panel: "#150C12",
        line: "#2C1C25",
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
