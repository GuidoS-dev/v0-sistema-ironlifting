import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Trophy, Calendar, Target, ChevronDown } from "lucide-react"
import { LogoHorizontal } from "@/components/logos"

const stats = [
  { icon: Users, value: "100+", label: "Atletas entrenados" },
  { icon: Calendar, value: "35+", label: "Años de experiencia" },
  { icon: Trophy, value: "2", label: "Participaciones Olímpicas" },
  { icon: Target, value: "50+", label: "Medallas internacionales" },
]

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url("/hero-bg.jpg")`,
        }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-background/85" />

      <div className="container relative z-10 mx-auto px-4 py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <LogoHorizontal height={80} />
          </div>

          {/* Badge */}
          <Badge
            variant="outline"
            className="mb-6 border-primary/30 bg-primary/10 text-primary px-4 py-1 max-w-full whitespace-normal text-center leading-snug"
          >
            Programación científica y técnica profesional para todos los niveles
          </Badge>

          {/* Headline */}
          <h1 className="mb-6 text-balance font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground sm:text-5xl lg:text-6xl">
            TRANSFORMA TU ENTRENAMIENTO DE{" "}
            <span className="text-primary">HALTEROFILIA</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-8 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            Programación científica y técnica profesional con más de 35 años de experiencia.
            Metodología probada con resultados comprobados a nivel olímpico.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-[var(--gold-light)] text-primary-foreground font-semibold px-8"
            >
              <a href="#planes">Comenzar ahora</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary/30 text-primary hover:bg-primary/10 px-8"
            >
              <a href="#metodologia">Conocer metodología</a>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-lg border border-border/60 bg-background/40 p-4"
              >
                <stat.icon className="mb-2 h-6 w-6 text-primary" />
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#metodologia"
        aria-label="Ir a metodología"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 rounded-sm text-primary opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="text-xs font-medium uppercase tracking-wider">Descubre más</span>
        <ChevronDown className="h-5 w-5" aria-hidden="true" />
      </a>
    </section>
  )
}