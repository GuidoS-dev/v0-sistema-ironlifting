import { ClipboardList, Dumbbell, UserPlus } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Elige tu plan",
    description:
      "Selecciona el plan que mejor se adapte a tus objetivos y nivel actual. Cada plan incluye diferentes niveles de seguimiento y personalización.",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Evaluación inicial",
    description:
      "Realizamos una evaluación completa de tu técnica, fuerza y movilidad para crear un programa 100% personalizado para ti.",
  },
  {
    number: "03",
    icon: Dumbbell,
    title: "Comienza a entrenar",
    description:
      "Accede a tu programación semanal, videos técnicos y seguimiento continuo. Progresa con constancia y método.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-card py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Cómo Funciona
            </span>
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground sm:text-4xl">
              3 pasos para comenzar
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Un proceso simple para que empiezes a entrenarte
              metodologicamente.
            </p>
          </div>

          {/* Steps */}
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 top-7 hidden h-px w-full bg-border md:block" />
                )}

                <div className="relative flex flex-col items-start gap-4 text-left sm:flex-row sm:items-center">
                  {/* Big display number */}
                  <span
                    aria-hidden="true"
                    className="font-[family-name:var(--font-display)] text-5xl leading-none tracking-wide text-primary/30 sm:text-6xl"
                  >
                    {step.number}
                  </span>

                  {/* Small icon circle */}
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                    <step.icon
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-primary">
                    Paso {step.number}
                  </span>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
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
  );
}
