import { Button } from "@/components/ui/button"
import { Instagram, MessageCircle } from "lucide-react"
import { LogoILSolo } from "@/components/logos"

const WHATSAPP_NUMBER = "5493412424210"
const WHATSAPP_BASE_URL = `https://wa.me/${WHATSAPP_NUMBER}`

export function Footer() {
  return (
    <>
      {/* Final CTA */}
      <section className="bg-linear-to-b from-background to-card py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              ¿Listo para transformar tu entrenamiento?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Únete a más de 100 atletas que ya están progresando con Sistema Ironlifting.
              Metodología científica, técnica profesional y resultados comprobados.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-[#e8c547] hover:bg-[#f5d96a] text-[#0a0c12] font-semibold px-8"
              >
                <a href="#planes">Elegir mi plan ahora</a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-[#e8c547]/30 text-[#e8c547] hover:bg-[#e8c547]/10 px-8"
              >
                <a href={WHATSAPP_BASE_URL} target="_blank" rel="noopener noreferrer">
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
                <a href="#inicio" className="mb-4 flex items-center gap-3">
                  <LogoILSolo size={32} />
                  <span className="font-[family-name:var(--font-display)] text-lg tracking-wider text-[#e8c547]">
                    IRONLIFTING
                  </span>
                </a>
                <p className="mb-4 max-w-md text-sm text-muted-foreground leading-relaxed">
                  Programa de Halterofilia con más de 35 años de experiencia.
                  Metodología científica y técnica profesional para atletas de todos los niveles.
                </p>
                <div className="flex gap-4">
                  <a
                    href="https://instagram.com/sistema.ironlifting"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-[#e8c547] hover:text-[#0a0c12]"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                  <a
                    href={WHATSAPP_BASE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-[#e8c547] hover:text-[#0a0c12]"
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
                    <a href="#inicio" className="text-muted-foreground hover:text-foreground">
                      Inicio
                    </a>
                  </li>
                  <li>
                    <a href="#metodologia" className="text-muted-foreground hover:text-foreground">
                      Metodología
                    </a>
                  </li>
                  <li>
                    <a href="#coach" className="text-muted-foreground hover:text-foreground">
                      Nuestro Coach
                    </a>
                  </li>
                  <li>
                    <a href="#trayectoria" className="text-muted-foreground hover:text-foreground">
                      Trayectoria
                    </a>
                  </li>
                  <li>
                    <a href="#planes" className="text-muted-foreground hover:text-foreground">
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
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
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
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
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
                © {new Date().getFullYear()} Sistema Ironlifting. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
