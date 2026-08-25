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
          DEFAULT: "#050507",
          deep: "#030305",
          light: "#0a0c11",
        },
        surface: {
          DEFAULT: "#0a0c12",
          subtle: "#0e1119",
          card: "#111520",
          elevated: "#181d2c",
          hover: "#1e2538",
          active: "#252d44",
          border: "#1a2030",
          borderLight: "#252d45",
          borderFocus: "#6366f1",
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
          pink: "#ec4899",
        },
      },
      fontFamily: {
        sans: ["Inter", "var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      animation: {
        "orbit-slow": "spin 28s linear infinite",
        "orbit-medium": "spin 14s linear infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "glow-pulse": "glowPulse 4s ease-in-out infinite",
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
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 12px -4px rgba(99, 102, 241, 0.2)" },
          "50%": { boxShadow: "0 0 20px -4px rgba(99, 102, 241, 0.4)" },
        },
      },
      boxShadow: {
        "glass-subtle": "0 2px 8px -2px rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(255, 255, 255, 0.04) inset",
        "glass-card": "0 4px 24px -4px rgba(0, 0, 0, 0.6), 0 1px 1px 0 rgba(255, 255, 255, 0.05) inset",
        "glass-elevated": "0 8px 32px -8px rgba(0, 0, 0, 0.7), 0 1px 1px 0 rgba(255, 255, 255, 0.06) inset",
        "glow-orba": "0 0 24px -6px rgba(99, 102, 241, 0.35)",
        "glow-cyan": "0 0 24px -6px rgba(6, 182, 212, 0.3)",
        "glow-rose": "0 0 20px -6px rgba(244, 63, 94, 0.3)",
        "inner-highlight": "inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(ellipse at center, var(--tw-gradient-stops))",
        "gradient-mesh": "radial-gradient(at 20% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(6, 182, 212, 0.06) 0%, transparent 50%), radial-gradient(at 50% 80%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)",
      },
    },
  },
  plugins: [],
};

export default config;
