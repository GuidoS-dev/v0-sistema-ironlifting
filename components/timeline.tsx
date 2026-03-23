"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Medal, Trophy, ChevronRight } from "lucide-react"

const mainEvents = [
  { year: "2002", event: "Juegos Sudamericanos", location: "São Paulo", highlight: false },
  { year: "2004", event: "Mundial Junior", location: "Budapest", highlight: false },
  { year: "2006", event: "Campeonato Panamericano", location: "Guatemala", highlight: false },
  { year: "2008", event: "Juegos Olímpicos", location: "Beijing", athlete: "Carlos Espeleta", highlight: true },
  { year: "2011", event: "Juegos Panamericanos", location: "Guadalajara", highlight: false },
  { year: "2014", event: "Juegos Sudamericanos", location: "Santiago", highlight: false },
  { year: "2016", event: "Juegos Olímpicos", location: "Río de Janeiro", athlete: "Joana Palacios", highlight: true },
  { year: "2019", event: "Juegos Panamericanos", location: "Lima", highlight: false },
]

const allAchievements = [
  {
    athlete: "Carlos Espeleta",
    achievements: [
      "Juegos Olímpicos Beijing 2008",
      "Múltiples medallas en Juegos Sudamericanos",
      "Campeón Panamericano Junior",
      "Récords nacionales en arranque y envión",
    ],
  },
  {
    athlete: "Sebastián Espeleta",
    achievements: [
      "Medallas en Juegos Sudamericanos",
      "Campeón Nacional múltiples veces",
      "Participación en Mundiales",
    ],
  },
  {
    athlete: "Iván Palacios",
    achievements: [
      "Medallista Panamericano",
      "Campeón Sudamericano",
      "Récords nacionales juveniles",
    ],
  },
  {
    athlete: "Joana Palacios",
    achievements: [
      "Juegos Olímpicos Río 2016",
      "Múltiples medallas Panamericanas",
      "Campeona Sudamericana",
      "Récords nacionales femeninos",
    ],
  },
  {
    athlete: "Agustín Palacios",
    achievements: [
      "Medallista en Campeonatos Sudamericanos",
      "Participación en eventos internacionales",
      "Campeón Nacional juvenil",
    ],
  },
]

export function Timeline() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section id="trayectoria" className="bg-card py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <Badge 
              variant="outline" 
              className="mb-4 border-[#e8c547]/30 bg-[#e8c547]/10 text-[#e8c547]"
            >
              Nuestra Trayectoria
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Un viaje de constancia y superación
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Más de tres décadas formando atletas de élite, 
              con participaciones en los escenarios más importantes del mundo.
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border md:block hidden" />
            
            {/* Events */}
            <div className="space-y-8">
              {mainEvents.map((event, index) => (
                <div
                  key={`${event.year}-${event.event}`}
                  className={`flex flex-col md:flex-row items-center gap-4 ${
                    index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Content */}
                  <div className={`flex-1 ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                    <div
                      className={`inline-block rounded-lg border p-4 transition-all ${
                        event.highlight
                          ? "border-[#e8c547] bg-[#e8c547]/10"
                          : "border-border/50 bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {event.highlight ? (
                          <Trophy className="h-5 w-5 text-[#e8c547]" />
                        ) : (
                          <Medal className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="font-bold text-foreground">{event.year}</span>
                        {event.highlight && (
                          <Badge className="bg-[#e8c547] text-[#0a0c12] text-xs">
                            Olímpicos
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 font-medium text-foreground">{event.event}</p>
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                      {event.athlete && (
                        <p className="mt-1 text-sm font-medium text-[#e8c547]">
                          {event.athlete}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Center dot */}
                  <div
                    className={`hidden md:flex h-4 w-4 shrink-0 rounded-full ${
                      event.highlight ? "bg-[#e8c547]" : "bg-muted-foreground"
                    }`}
                  />

                  {/* Spacer */}
                  <div className="hidden md:block flex-1" />
                </div>
              ))}
            </div>
          </div>

          {/* View All Button */}
          <div className="mt-12 text-center">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-[#e8c547] hover:bg-[#f5d96a] text-[#0a0c12] font-semibold"
                >
                  Ver recorrido completo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-card">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-foreground">
                    Todos nuestros logros
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-8">
                    {allAchievements.map((athlete) => (
                      <div key={athlete.athlete}>
                        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                          <Trophy className="h-5 w-5 text-[#e8c547]" />
                          {athlete.athlete}
                        </h3>
                        <ul className="space-y-2 pl-7">
                          {athlete.achievements.map((achievement) => (
                            <li
                              key={achievement}
                              className="text-muted-foreground before:mr-2 before:text-[#e8c547] before:content-['•']"
                            >
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </section>
  )
}
