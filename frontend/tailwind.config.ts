import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 因果ストーリー カテゴリ色（社会=黄 / 安全=青 / 未来=緑）
        cat: {
          social: { DEFAULT: "#f59e0b", soft: "#fef3c7", ring: "#d97706" },
          safety: { DEFAULT: "#3b82f6", soft: "#dbeafe", ring: "#1d4ed8" },
          future: { DEFAULT: "#10b981", soft: "#d1fae5", ring: "#047857" },
        },
        // ブランドカラー（デザインチーム提供）
        brand: {
          primary: "#0178C8",
          accent: "#E09B40",
          "bg-light": "#ecf5fa",
          "bg-page": "#faf8f5",
        },
        ink: {
          primary: "#334155",
          secondary: "#64748b",
        },
        status: {
          "ok-fg": "#3a9e55",
          "ok-bg": "#dff5e3",
          "warn-fg": "#c88a2e",
          "warn-bg": "#fef4e1",
          "ng-fg": "#c44040",
          "ng-bg": "#fde8e8",
          "inactive-fg": "#6b7c94",
          "inactive-bg": "#e8edf3",
        },
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-jp)", "Noto Sans JP", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
