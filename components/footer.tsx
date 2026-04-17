import { LogoILSolo } from "@/components/logos";
import { Button } from "@/components/ui/button";
import { Instagram, MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "5493412424210";
const WHATSAPP_BASE_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export function Footer() {
  return (
    <>
      {/* Final CTA */}
      <section className="bg-linear-to-b from-background to-card py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground sm:text-4xl">
              ¿Listo para transformar tu entrenamiento?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Únete a más de 100 atletas que ya están progresando con Sistema
              Ironlifting. Metodología científica, técnica profesional y
              resultados comprobados.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-[var(--gold-light)] text-primary-foreground font-semibold px-8"
              >
                <a href="#planes">Elegir mi plan ahora</a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-primary/30 text-primary hover:bg-primary/10 px-8"
              >
                <a
                  href={WHATSAPP_BASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contactar
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 md:grid-cols-4">
              {/* Brand */}
              <div className="md:col-span-2">
                <a
                  href="#inicio"
                  className="mb-4 flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <LogoILSolo size={32} />
                  <span className="font-[family-name:var(--font-display)] text-lg tracking-wider text-primary">
                    IRONLIFTING
                  </span>
                </a>
                <p className="mb-4 max-w-md text-sm text-muted-foreground leading-relaxed">
                  Programa de Halterofilia con más de 35 años de experiencia.
                  Metodología científica y técnica profesional para atletas de
                  todos los niveles.
                </p>
                <div className="flex gap-4">
                  <a
                    href="https://instagram.com/sistema.ironlifting"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                  <a
                    href={WHATSAPP_BASE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Links */}
              <div>
                <h4 className="mb-4 font-semibold text-foreground">Enlaces</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="#inicio"
                      className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Inicio
                    </a>
                  </li>
                  <li>
                    <a
                      href="#metodologia"
                      className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Metodología
                    </a>
                  </li>
                  <li>
                    <a
                      href="#coach"
                      className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Nuestro Coach
                    </a>
                  </li>
                  <li>
                    <a
                      href="#trayectoria"
                      className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Trayectoria
                    </a>
                  </li>
                  <li>
                    <a
                      href="#planes"
                      className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Planes
                    </a>
                  </li>
                </ul>
              </div>

              {/* Contacto */}
              <div>
                <h4 className="mb-4 font-semibold text-foreground">Contacto</h4>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a
                      href="https://instagram.com/sistema.ironlifting"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Instagram className="h-4 w-4" />
                      @sistema.ironlifting
                    </a>
                  </li>
                  <li>
                    <a
                      href={WHATSAPP_BASE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <MessageCircle className="h-4 w-4" />
                      +54 9 341 242-4210
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom */}
            <div className="mt-12 border-t border-border pt-8 text-center">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Sistema Ironlifting. Todos los
                derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
