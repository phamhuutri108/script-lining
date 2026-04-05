import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // ── Editorial Minimalist Semantic Tokens ─────────────────────────────
      colors: {
        // Canvas
        canvas: "#F8F7F4",         // Off-white background (không dùng #FFFFFF)
        surface: "#EFEDE9",        // Elevated cards / zebra rows

        // Ink
        ink: {
          DEFAULT: "#18181B",      // Off-black primary text (Zinc-950)
          secondary: "#3F3F46",    // Zinc-700
          muted: "#71717A",        // Zinc-500
          ghost: "#A1A1AA",        // Zinc-400
        },

        // Accent — Sage Green (from style-guide.json)
        accent: {
          DEFAULT: "#19e66f",
          dim: "rgba(25,230,111,0.12)",
          hover: "#15c960",
        },

        // Semantic border
        border: "rgba(24,24,27,0.08)",
        "border-strong": "rgba(24,24,27,0.16)",

        // shadcn/ui CSS variable mappings
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
      },

      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
