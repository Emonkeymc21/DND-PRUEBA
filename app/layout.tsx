import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SITE } from "@/lib/site";
import { Preloader } from "@/components/effects/preloader";
import { Particles } from "@/components/effects/particles";
import { MagicCursor } from "@/components/effects/magic-cursor";
import { MusicControl } from "@/components/music-control";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "La Mesa Perdida — Rol 2026",
    template: "%s | La Mesa Perdida"
  },
  description: "Stranger Things, Fantasía o Anime. Vos decidís el destino. Postulate ahora.",
  openGraph: {
    title: "La Mesa Perdida | Convocatoria de Rol 2026",
    description: "Stranger Things, Fantasía o Anime. Vos decidís el destino. Postulate ahora.",
    url: SITE.url,
    siteName: "La Mesa Perdida",
    images: [{ url: "https://cdn.nerdist.com/wp-content/uploads/2026/01/07083919/StrangerThings_S5_1000_R.jpg" }],
    locale: "es_AR",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="dnd-shell">
        <div className="fog" aria-hidden="true" />
        <Particles />
        <Preloader />
        <MagicCursor />
        <MusicControl />
        <ThemeProvider>
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 py-10 pb-28 md:pb-10">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
