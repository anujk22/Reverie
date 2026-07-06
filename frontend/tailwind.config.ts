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
        void: "#F3EADC",
        field: "#FAF5EC",
        "field-2": "#FFFDF8",
        hairline: "#E6D9C6",
        starlight: "#2B2119",
        dim: "#6F6258",
        faint: "#9B8A7B",
        ember: "#D85C3F",
        glow: "#F1784A",
        gold: "#D78B09",
        sage: "#778267",
        coral: "#E26345",
        moth: "#946A49",
        bg: "#F3EADC",
        panel: "#FAF5EC",
        line: "#E6D9C6",
        text: "#2B2119",
        muted: "#6F6258",
        warning: "#D78B09"
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
