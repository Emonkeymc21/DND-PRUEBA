import Link from "next/link";
import { Container } from "@/components/ui";
import { CONTACT, SITE, hasAnyContact } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-border/60 py-10">
      <Container className="space-y-6">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <div className="max-w-sm space-y-2">
            <div className="font-display text-lg font-bold text-primary">{SITE.name}</div>
            <p className="text-sm text-muted">
              Mesas de rol en español, online y en Mendoza. Si nunca jugaste, ese es exactamente el punto de partida
              que esperamos.
            </p>
          </div>

          <nav className="flex flex-col gap-2 text-sm">
            <Link href="/campanias" className="text-text/80 hover:text-primary">
              Campañas
            </Link>
            <Link href="/simulador" className="text-text/80 hover:text-primary">
              Simulador
            </Link>
            <Link href="/videos" className="text-text/80 hover:text-primary">
              Videos
            </Link>
          </nav>

          {hasAnyContact() ? (
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Contacto</span>
              {CONTACT.instagram ? (
                <a
                  className="text-text/80 hover:text-primary"
                  href={`https://instagram.com/${CONTACT.instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              ) : null}
              {CONTACT.discord ? (
                <a
                  className="text-text/80 hover:text-primary"
                  href={CONTACT.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Discord
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="border-t border-border/50 pt-5 text-xs text-muted">
          <p>
            © {year} {SITE.name}. Que tengas buenas tiradas 🎲
          </p>
          <p className="mt-1">
            Proyecto de comunidad sin fines comerciales. No afiliado a Wizards of the Coast.
          </p>
        </div>
      </Container>
    </footer>
  );
}
