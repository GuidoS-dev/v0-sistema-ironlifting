'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Trophy, Calendar, Target } from "lucide-react"
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
          backgroundImage: `url("https://69b2ade2ece241a369f33537.imgix.net/gettyimages-587621868-2048x2048.jpg?w=1568&h=997&object-removal-rect=1222%2C834%2C826%2C132&rect=242%2C246%2C1568%2C997")`,
        }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-background/85" />

      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <LogoHorizontal height={80} />
          </div>

          {/* Badge */}
          <Badge
            variant="outline"
            className="mb-6 border-[#e8c547]/30 bg-[#e8c547]/10 text-[#e8c547] px-4 py-1"
          >
            Programación científica y técnica profesional para todos los niveles
          </Badge>

          {/* Headline */}
          <h1 className="mb-6 text-balance font-[family-name:var(--font-display)] text-4xl tracking-wide text-foreground sm:text-5xl lg:text-6xl">
            TRANSFORMA TU ENTRENAMIENTO DE{" "}
            <span className="text-[#e8c547]">HALTEROFILIA</span>
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
              className="bg-[#e8c547] hover:bg-[#f5d96a] text-[#0a0c12] font-semibold px-8"
            >
              <a href="#planes">Comenzar ahora</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-[#e8c547]/30 text-[#e8c547] hover:bg-[#e8c547]/10 px-8"
            >
              <a href="#metodologia">Conocer metodología</a>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-lg border border-border/50 bg-card/50 p-4 backdrop-blur-sm"
              >
                <stat.icon className="mb-2 h-6 w-6 text-[#e8c547]" />
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <button 
          onClick={() => {
            const element = document.getElementById("metodologia") || document.querySelector("section:nth-of-type(2)")
            element?.scrollIntoView({ behavior: "smooth" })
          }}
          className="flex flex-col items-center gap-3 text-[#e8c547] hover:text-[#f5d96a] transition-colors duration-300 group cursor-pointer"
        >
          <span className="text-sm font-semibold uppercase tracking-wider">Descubre más</span>
          <div className="h-10 w-6 rounded-full border-2 border-[#e8c547] group-hover:border-[#f5d96a] p-2 transition-colors">
            <div className="h-2 w-full rounded-full bg-[#e8c547] group-hover:bg-[#f5d96a] animate-bounce transition-colors" />
          </div>
        </button>
      </div>
    </section>
  )
}
