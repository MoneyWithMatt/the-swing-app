import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        moss: "#2f6f4e",
        fairway: "#5ba86c",
        flag: "#f2b84b",
        clay: "#c96f4a",
        mist: "#eef3ef",
        paper: "#fbfcf8"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 33, 27, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
