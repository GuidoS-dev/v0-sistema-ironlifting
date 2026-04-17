import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "María González",
    role: "Atleta competitiva",
    content:
      "Después de 2 años con el sistema, pasé de no competir a perder el miedo y poder participar en todos los torneos. La metodología es clara y los resultados son reales.",
    rating: 5,
  },
  {
    name: "Andrés Rodríguez",
    role: "Crossfitter avanzado",
    content:
      "Buscaba mejorar mi técnica de arranque y envión. En 6 meses logré PRs que no había tocado en años. El análisis de video es fundamental para progresar.",
    rating: 5,
  },
  {
    name: "Laura Méndez",
    role: "Atleta  juvenil",
    content:
      "El coach Hugo tiene una paciencia y conocimiento técnico únicos. Me preparó para mis primeros juegos juveniles con una metodología impecable.",
    rating: 5,
  },
  {
    name: "Carlos Vega",
    role: "Entrenador de box",
    content:
      "Como entrenador, aprendí muchísimo de la programación y la periodización. Ahora aplico estos principios con mis propios atletas.",
    rating: 4,
  },
];

export function Testimonials() {
  return (
    <section id="testimonios" className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <Badge
              variant="outline"
              className="mb-4 border-primary/30 bg-primary/10 text-primary"
            >
              Resultados Reales
            </Badge>
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground sm:text-4xl">
              Lo que dicen nuestros atletas
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Historias reales de atletas que han transformado su entrenamiento
              con Sistema Ironlifting.
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.name}
                className="border-border/50 bg-card/50"
              >
                <CardContent className="p-6">
                  <Quote className="mb-4 h-8 w-8 text-primary/30" />

                  <p className="mb-4 text-foreground leading-relaxed">
                    {`"${testimonial.content}"`}
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {testimonial.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                    <div className="flex gap-0.5" aria-hidden="true">
                      {Array.from({ length: testimonial.rating }).map(
                        (_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 fill-primary text-primary"
                          />
                        ),
                      )}
                    </div>
                    <span className="sr-only">
                      {testimonial.rating} de 5 estrellas
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
