import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Swing App",
    short_name: "Swing App",
    description: "Private golf swing analysis from a real coach.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfcf8",
    theme_color: "#2f6f4e",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" }
    ]
  };
}
