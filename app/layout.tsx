import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Grimorio D&D — Aprendé, mirá, jugá",
    template: "%s | Grimorio D&D"
  },
  description: SITE.description,
  openGraph: {
    title: "Grimorio D&D",
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    images: [{ url: SITE.ogImage }],
    locale: "es_AR",
    type: "website"
  },
  twitter: { card: "summary_large_image", title: "Grimorio D&D", description: SITE.description, images: [SITE.ogImage] },
  robots: { index: True, follow: True }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="dnd-shell">
        <div className="fog" aria-hidden="true" />
        <ThemeProvider>
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 py-10">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
