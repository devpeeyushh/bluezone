/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        radio: {
          dark: "#050914",
          panel: "#0a1122",
          surface: "#0e182f",
          border: "#1a2c4e",
          cyan: "#00f0ff",
          cyanDim: "#0099aa",
          blue: "#1a73e8",
          amber: "#ffb703",
          amberDim: "#b37400",
          red: "#ff3344",
          redDim: "#991122",
          text: "#a4c2e6",
          textBright: "#d8e7ff",
          textMuted: "#4b6584",
        },
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      boxShadow: {
        "cyan-glow": "0 0 15px rgba(0, 240, 255, 0.35)",
        "amber-glow": "0 0 15px rgba(255, 183, 3, 0.35)",
        "red-glow": "0 0 15px rgba(255, 51, 68, 0.4)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scanline": "scanline 8s linear infinite",
        "flicker": "flicker 0.15s infinite",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
      },
    },
  },
  plugins: [],
}
