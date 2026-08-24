import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#060709",
          deep: "#040507",
          light: "#0a0c10",
        },
        surface: {
          DEFAULT: "#0c0e14",
          subtle: "#10131c",
          card: "#141824",
          elevated: "#1a1f2e",
          hover: "#202638",
          active: "#262d42",
          border: "#1d2334",
          borderLight: "#2b334a",
          borderFocus: "#4f46e5",
        },
        orba: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        accent: {
          cyan: "#06b6d4",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
          indigo: "#6366f1",
          purple: "#a855f7",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      animation: {
        "orbit-slow": "spin 28s linear infinite",
        "orbit-medium": "spin 14s linear infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.04)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        "glass-subtle": "0 2px 8px -2px rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(255, 255, 255, 0.05) inset",
        "glass-card": "0 4px 20px -4px rgba(0, 0, 0, 0.6), 0 1px 1px 0 rgba(255, 255, 255, 0.06) inset",
        "glow-orba": "0 0 20px -5px rgba(99, 102, 241, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
