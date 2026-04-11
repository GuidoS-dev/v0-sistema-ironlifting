"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Check, Shield, Sparkles } from "lucide-react";

const WHATSAPP_NUMBER = "5493412424210";

const whatsappMessages: Record<string, string> = {
  Básico: `Hola, me interesa el Plan Básico de Sistema Ironlifting. 
Quiero agendar una cita para que me expliquen el programa y empezar lo antes posible. 
Gracias!`,
  Intermedio: `Hola, me interesa el Plan Intermedio de Sistema Ironlifting. 
Quiero agendar una cita para evaluar mi nivel actual y arrancar con la programación personalizada. 
Gracias!`,
  Pro: `Hola, me interesa el Plan Pro de Sistema Ironlifting. 
Quiero agendar una cita para que revisemos mi caso en detalle y empecemos con el seguimiento completo. 
Gracias!`,
};

const formatPrice = (n: number) =>
  n.toLocaleString("es-AR");

const getWhatsAppUrl = (planName: string) => {
  const message = encodeURIComponent(whatsappMessages[planName] || "");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
};

const plans = [
  {
    name: "Básico",
    description: "Ideal para comenzar tu camino en la halterofilia",
    originalPrice: 75600,
    discountedPrice: 49140,
    spots: 20,
    popular: false,
    features: [
      "Programación semanal personalizada",
      "Acceso a biblioteca de videos",
      "Analisis quincenal por videos",
      "Actualizaciones mensuales",
    ],
  },
  {
    name: "Intermedio",
    description: "Para atletas que buscan llevar su nivel al siguiente paso",
    originalPrice: 215600,
    discountedPrice: 140140,
    spots: 10,
    popular: true,
    features: [
      "Todo lo del plan Básico",
      "Análisis de video semanal",
      "Clase presencial mensual",
      "Llamada mensual 1-a-1",
    ],
  },
  {
    name: "Pro",
    description: "Entrenamiento élite para competidores serios",
    originalPrice: 428400,
    discountedPrice: 278460,
    spots: 2,
    popular: false,
    features: [
      "Todo lo del plan Intermedio",
      "Programación diaria detallada",
      "Análisis de video ilimitado",
      "Llamadas semanales 1-a-1",
      "Clase presencial quincenal",
      "Preparación para competencia",
      "Acceso directo al coach",
    ],
  },
];

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="planes" className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <Badge
              variant="outline"
              className="mb-4 border-[#e8c547]/30 bg-[#e8c547]/10 text-[#e8c547]"
            >
              Planes de Membresía
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Elige tu plan
            </h2>
          </div>

          {/* Opportunity text */}
          <div className="mx-auto mb-10 max-w-3xl rounded-lg border border-[#e8c547]/20 bg-[#e8c547]/5 p-6 text-center">
            <Sparkles className="mx-auto mb-3 h-6 w-6 text-[#e8c547]" />
            <p className="text-foreground leading-relaxed">
              <span className="font-semibold">
                Una oportunidad única gracias a internet:
              </span>{" "}
              ahora puedes acceder al sistema completo y la metodología de Hugo
              Palacios —entrenador con experiencia olímpica— desde cualquier
              lugar del mundo, a un precio mucho más accesible de lo que
              normalmente sería posible.
            </p>
          </div>

          {/* Toggle */}
          <div className="mb-10 flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}
            >
              Mensual
            </span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-[#e8c547]"
            />
            <span
              className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}
            >
              Anual
            </span>
            {isAnnual && (
              <Badge className="bg-[#e8c547] text-[#0a0c12]">35% OFF</Badge>
            )}
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const price = isAnnual
                ? Math.round(plan.discountedPrice * 12 * 0.65)
                : plan.discountedPrice;
              const originalMonthly = isAnnual
                ? Math.round(plan.originalPrice * 12)
                : plan.originalPrice;
              const dailyPrice = Math.round(
                (isAnnual ? price : plan.discountedPrice * 12) / 365
              );

              return (
                <Card
                  key={plan.name}
                  className={`relative flex flex-col border-border/50 bg-card ${
                    plan.popular ? "border-[#e8c547] ring-1 ring-[#e8c547]" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[#e8c547] text-[#0a0c12] px-3">
                        Más elegido
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center">
                    <CardTitle className="text-xl text-foreground">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1">
                    {/* Pricing */}
                    <div className="mb-6 text-center">
                      <div className="mb-1 text-lg text-muted-foreground line-through">
                        ${formatPrice(originalMonthly)}
                        {isAnnual ? "/año" : "/mes"}
                      </div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-foreground">
                          ${formatPrice(price)}
                        </span>
                        <span className="text-muted-foreground">
                          {isAnnual ? "/año" : "/mes"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Solo ${formatPrice(dailyPrice)} por día
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-2 border-[#e8c547]/50 bg-[#e8c547]/10 text-[#e8c547]"
                      >
                        35% OFF
                      </Badge>
                    </div>

                    {/* Spots */}
                    <div
                      className={`mb-6 rounded-lg p-3 text-center ${
                        plan.spots <= 5 ? "bg-[#e8c547]/10" : "bg-muted/50"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          plan.spots <= 5
                            ? "text-[#e8c547]"
                            : "text-muted-foreground"
                        }`}
                      >
                        Cupos disponibles:{" "}
                        <span className="font-bold">{plan.spots}</span>
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#e8c547]" />
                          <span className="text-sm text-muted-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      asChild
                      className={`w-full ${
                        plan.popular
                          ? "bg-[#e8c547] hover:bg-[#f5d96a] text-[#0a0c12] font-semibold"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      <a
                        href={getWhatsAppUrl(plan.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Quiero empezar con este plan
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Guarantee */}
          <div className="mt-10 flex items-center justify-center gap-3 text-center">
            <Shield className="h-6 w-6 text-[#e8c547]" />
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">
                Garantía de progreso real:
              </span>{" "}
              90 días para ver resultados (36 entrenamientos) o te devolvemos tu
              dinero.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
