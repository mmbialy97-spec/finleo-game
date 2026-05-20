import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: "#0a0a0a",
          panel: "#111114",
          border: "#1f1f24",
          user: "#00f0ff",
          oracle: "#ffaa00",
          gain: "#22c55e",
          loss: "#ef4444",
          dim: "#6b7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
        "ticker-scroll": "tickerScroll 40s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.7", filter: "drop-shadow(0 0 6px rgba(255,170,0,0.4))" },
          "50%": { opacity: "1", filter: "drop-shadow(0 0 18px rgba(255,170,0,0.8))" },
        },
        tickerScroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
