import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "¿Necesito experiencia previa en halterofilia?",
    answer: "No es necesario. Nuestro sistema está diseñado para atletas de todos los niveles, desde principiantes hasta competidores avanzados. La programación se adapta a tu nivel actual y progresa contigo.",
  },
  {
    question: "¿Qué equipo necesito para entrenar?",
    answer: "Lo ideal es tener acceso a una barra olímpica, discos, rack y plataforma. Sin embargo, podemos adaptar la programación si tienes limitaciones de equipo.",
  },
  {
    question: "¿Cómo funciona el análisis de video?",
    answer: "Grabas tus levantamientos desde los ángulos indicados y los envías a través de WhatsApp. El coach Hugo los revisa personalmente y te envía retroalimentación detallada con correcciones específicas para tu técnica.",
  },
  {
    question: "¿Puedo combinar esto con CrossFit u otro deporte?",
    answer: "Sí, muchos de nuestros atletas combinan la halterofilia con CrossFit u otros deportes. Ajustamos la programación para que complemente tu entrenamiento principal sin generar sobreentrenamiento.",
  },
  {
    question: "¿Qué pasa si no puedo entrenar alguna semana?",
    answer: "La programación es flexible y podemos ajustarla según tus necesidades. Si tienes que pausar, simplemente nos avisas y retomamos cuando estés listo.",
  },
  {
    question: "En cuanto tiempo se generan las primeras adaptaciones?",
    answer: "Entre 8–11 semanas con mínimo 3 sesiones semanales consistentes.",
  },
  {
    question: "¿Puedo cambiar de plan más adelante?",
    answer: "Por supuesto. Puedes subir o bajar de plan en cualquier momento. Adaptandolo a los nuevos objetivos.",
  },
  {
    question: "¿La programación es genérica o personalizada?",
    answer: "Depende del plan. El plan Básico incluye programación estructurada de alta calidad que asi mismo debe ser personalizada ya que es un deporte de tiempo y marca. Los planes Intermedio y Pro incluyen programación 100% personalizada basada en tu evaluación inicial, objetivos y progreso.",
  },
]

export function FAQ() {
  return (
    <section className="bg-card py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-12 max-w-2xl">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Preguntas Frecuentes
            </span>
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground sm:text-4xl">
              ¿Tienes dudas?
            </h2>
            <p className="text-muted-foreground">
              Aquí respondemos las preguntas más comunes sobre Sistema Ironlifting.
            </p>
          </div>

          {/* Accordion */}
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.question}
                value={faq.question}
                className="border-border/50"
              >
                <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
