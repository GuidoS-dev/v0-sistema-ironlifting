import { Badge } from "@/components/ui/badge";
import { Award, Medal, Target, Users } from "lucide-react";

const highlights = [
  { icon: Medal, text: "Participaciones Olímpicas como entrenador" },
  { icon: Award, text: "Múltiples medallistas internacionales" },
  { icon: Users, text: "Formador de campeones sudamericanos" },
  { icon: Target, text: "Metodología científica y personalizada" },
];

export function Coach() {
  return (
    <section id="coach" className="bg-card py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Image */}
            <div className="relative">
              <div className="aspect-4/5 overflow-hidden rounded-lg bg-muted">
                <img
                  src="/hugo-palacios.jpg"
                  alt="Hugo Palacios - Entrenador"
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <Badge
                variant="outline"
                className="mb-4 border-primary/30 bg-primary/10 text-primary"
              >
                Nuestro Coach Principal
              </Badge>

              <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground sm:text-4xl">
                Hugo Palacios
              </h2>

              <p className="mb-6 text-lg text-muted-foreground leading-relaxed">
                Entrenador con más de 30 años de experiencia en Halterofilia,
                con participaciones en Juegos Olímpicos como entrenador de
                atletas de élite. Su metodología científica y su enfoque técnico
                han formado campeones nacionales, sudamericanos y panamericanos.
              </p>

              <p className="mb-8 text-muted-foreground leading-relaxed">
                Su filosofía se basa en la constancia, la técnica perfecta y la
                programación individualizada. Cada atleta recibe un plan
                adaptado a sus necesidades, capacidades y objetivos específicos.
              </p>

              {/* Highlights */}
              <div className="grid gap-4 sm:grid-cols-2">
                {highlights.map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground leading-relaxed">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
