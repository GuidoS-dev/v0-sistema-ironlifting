import { Badge } from "@/components/ui/badge"
import { UserPlus, ClipboardList, Dumbbell } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Elige tu plan",
    description: "Selecciona el plan que mejor se adapte a tus objetivos y nivel actual. Cada plan incluye diferentes niveles de seguimiento y personalización.",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Evaluación inicial",
    description: "Realizamos una evaluación completa de tu técnica, fuerza y movilidad para crear un programa 100% personalizado para ti.",
  },
  {
    number: "03",
    icon: Dumbbell,
    title: "Comienza a entrenar",
    description: "Accede a tu programación semanal, videos técnicos y seguimiento continuo. Progresa con constancia y método.",
  },
]

export function HowItWorks() {
  return (
    <section className="bg-card py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <Badge
              variant="outline"
              className="mb-4 border-[#e8c547]/30 bg-[#e8c547]/10 text-[#e8c547]"
            >
              Cómo Funciona
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              3 pasos para comenzar
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Un proceso simple para que empiezes a entrenarte metodologicamente.
            </p>
          </div>

          {/* Steps */}
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 top-12 hidden h-px w-full bg-border md:block" />
                )}

                <div className="relative flex flex-col items-center text-center">
                  {/* Number badge */}
                  <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#e8c547] bg-[#e8c547]/10">
                    <step.icon className="h-10 w-10 text-[#e8c547]" />
                  </div>

                  <span className="mb-2 text-sm font-bold text-[#e8c547]">
                    PASO {step.number}
                  </span>

                  <h3 className="mb-2 text-xl font-bold text-foreground">
                    {step.title}
                  </h3>

                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
