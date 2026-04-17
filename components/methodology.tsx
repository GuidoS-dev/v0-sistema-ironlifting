import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Target, TrendingUp, Video, BarChart3, HeartPulse } from "lucide-react"

const methods = [
  {
    icon: Brain,
    title: "Programación Científica",
    description: "Planes de entrenamiento basados en principios científicos de periodización y adaptación neuromuscular.",
  },
  {
    icon: Target,
    title: "Técnica Profesional",
    description: "Enfoque detallado en la ejecución técnica de los movimientos: arranque y envión.",
  },
  {
    icon: TrendingUp,
    title: "Progresión Individualizada",
    description: "Cada atleta avanza a su propio ritmo con objetivos claros y medibles semana a semana.",
  },
  {
    icon: Video,
    title: "Análisis de Video",
    description: "Revisión técnica mediante video para correcciones precisas y mejora continua.",
  },
  {
    icon: BarChart3,
    title: "Seguimiento de Datos",
    description: "Control exhaustivo de cargas, volúmenes e intensidades para optimizar el rendimiento.",
  },
  {
    icon: HeartPulse,
    title: "Recuperación Inteligente",
    description: "Protocolos de recuperación y prevención de lesiones integrados en la programación.",
  },
]

export function Methodology() {
  return (
    <section id="metodologia" className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-12 max-w-2xl">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Nuestra Metodología
            </span>
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground sm:text-4xl">
              Sistema de entrenamiento comprobado
            </h2>
            <p className="text-muted-foreground">
              Una metodología desarrollada durante más de tres décadas,
              perfeccionada con cada atleta y validada en competencias internacionales.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {methods.map((method) => (
              <Card
                key={method.title}
                className="border-border/50 bg-card/50 transition-colors hover:border-primary/30"
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <method.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-foreground">{method.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {method.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
