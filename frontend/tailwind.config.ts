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
        void: "#070B14",
        field: "#0D1424",
        "field-2": "#131C31",
        hairline: "#1E2A44",
        starlight: "#E9EDF6",
        dim: "#8A94AD",
        faint: "#4A5674",
        ember: "#E8A33D",
        glow: "#FFD9A0",
        sage: "#3FBFAD",
        coral: "#E5534B",
        moth: "#B9A7E8",
        bg: "#070B14",
        panel: "#0D1424",
        line: "#1E2A44",
        text: "#E9EDF6",
        muted: "#8A94AD",
        warning: "#E8A33D"
      },
      fontFamily: {
        display: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "SFMono-Regular", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
