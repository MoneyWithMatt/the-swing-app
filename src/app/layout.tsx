import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Swing App",
  description: "Affordable, on-demand video swing analysis from a real golf coach.",
  applicationName: "The Swing App",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Swing App",
    statusBarStyle: "black-translucent"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="border-t border-ink/10 bg-white px-5 py-6 text-center text-sm text-ink/60">
          <p>© {new Date().getFullYear()} The Swing App</p>
          <nav className="mt-2 flex justify-center gap-4" aria-label="Legal information">
            <Link className="font-semibold text-moss hover:underline" href="/privacy">Privacy</Link>
            <Link className="font-semibold text-moss hover:underline" href="/cookies">Cookies</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
