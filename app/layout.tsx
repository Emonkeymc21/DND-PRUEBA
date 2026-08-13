import type { Metadata, Viewport } from "next";
import { Cinzel, Roboto } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SITE } from "@/lib/site";
import { Particles } from "@/components/effects/particles";
import { MusicControl } from "@/components/music-control";
import { BackupFlush } from "@/components/system/backup-flush";

/**
 * Fuentes con next/font en vez de @import en globals.css.
 * El @import estaba DESPUÉS de las directivas @tailwind y en CSS un @import
 * que no está al principio del archivo se descarta: Cinzel nunca llegó a
 * cargar. Además next/font las auto-hospeda (sin request a Google) y reserva
 * el espacio, así que desaparece el salto de layout al cargar.
 */
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-display",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "La Mesa Perdida — Mesas de rol en español",
    template: "%s | La Mesa Perdida",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "dungeons and dragons",
    "d&d en español",
    "rol argentina",
    "buscar jugadores de rol",
    "mesa de rol online",
    "partidas de rol para principiantes",
  ],
  openGraph: {
    title: "La Mesa Perdida — Mesas de rol en español",
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: SITE.name }],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "La Mesa Perdida — Mesas de rol en español",
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cinzel.variable} ${roboto.variable}`}>
      <body className="dnd-shell">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[999] focus:rounded-md focus:border focus:border-primary focus:bg-black focus:px-4 focus:py-2 focus:text-primary"
        >
          Saltar al contenido
        </a>

        <div className="fog" aria-hidden="true" />
        <Particles />
        <BackupFlush />
        <MusicControl />

        <ThemeProvider>
          <Header />
          <main id="contenido" className="mx-auto w-full max-w-6xl px-4 py-10 pb-28 md:pb-10">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
