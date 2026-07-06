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
        void: "#070509",
        field: "#150D12",
        "field-2": "#1E1419",
        hairline: "#2C1E26",
        starlight: "#F3ECE3",
        dim: "#AB9CA5",
        faint: "#6E5C66",
        ember: "#F5476B",
        glow: "#FF93A8",
        gold: "#F2A65A",
        sage: "#63C9A5",
        coral: "#FF6F5E",
        moth: "#A98BFA",
        bg: "#070509",
        panel: "#150D12",
        line: "#2C1E26",
        text: "#F3ECE3",
        muted: "#AB9CA5",
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
