# Architecture — Sistema Ironlifting

> Documento vivo. Se construye en paralelo a la atomización del monolito. Al finalizar la refactorización reemplaza a `GLOSARIO_MONOLITO.md`.

## Estado actual

🚧 En proceso de refactorización (ver [REFACTOR_PLAN.md](./REFACTOR_PLAN.md)).

El sistema parte de un único archivo monolítico (`app/sistema/coach-app.jsx`, ~36k líneas) que se está atomizando en módulos por dominio.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Lenguaje:** TypeScript en partes nuevas, JavaScript (.jsx) en el monolito legacy
- **UI:** Radix UI primitives + Tailwind v4 + componentes custom
- **Backend:** Supabase (auth + Postgres). Cliente HTTP custom en el monolito (no usa `@supabase/supabase-js` para queries; sí para auth en `app/api/`).
- **Estado:** local component state + localStorage + delta sync con Supabase (LWW)
- **Sync entre tabs:** `BroadcastChannel("liftplan:db-sync")`
- **Charts:** Recharts (carga dinámica)
- **Testing:** Vitest + React Testing Library (unit) + Playwright (E2E)

## Carpetas top-level

```
app/                  # Next.js App Router pages + API routes
  api/                # Server routes (notify-registration, supabase-proxy)
  sistema/            # Aplicación principal coach (foco del refactor)
components/           # Componentes compartidos a nivel de proyecto
  cronometro/         # TabataTimer y subcomponentes (ya modular)
  ui/                 # Primitivas shadcn-style
lib/                  # Utilidades a nivel proyecto (rate-limit, etc.)
design-system/        # Tokens y guías de diseño
public/               # Assets estáticos
scripts/              # Scripts auxiliares
tests/                # Suite de tests (Vitest + Playwright)
```

## Dominios funcionales

| Dominio | Descripción | Estado refactor |
|---------|-------------|-----------------|
| Auth | Login/registro/reset, sesión, perfil coach/atleta | Pendiente |
| Atletas | CRUD atletas, ficha, ciclo menstrual, normativos por atleta | Pendiente |
| Mesociclos | CRUD, edición de volumen, distribución semanal | Pendiente |
| Planilla turno | Edición principal con intensidades, complementarios, copy/paste | Pendiente |
| Planilla básica | Bloques %/S/R/Kg, clusters | Pendiente |
| Planilla pretemporada | Multi-ejercicio con links (+/c/-) | Pendiente |
| Sembrado | Grilla mensual semanas × turnos, intensity picker | Pendiente |
| Resumen | Métricas y gráficos del meso | Pendiente |
| PDF | Vista imprimible | Pendiente |
| Plantillas | CRUD plantillas (escuela/pretemp/regular) | Pendiente |
| Normativos | Global del coach + override por atleta | Pendiente |
| Calculadora | Tablas IRM y series/reps | Pendiente |
| Cronómetro | TabataTimer (ya modular en `components/cronometro/`) | ✅ Hecho |
| Panel referencia | Sidebar read-only cross-tab | Pendiente |
| Sync/Backup | BroadcastChannel, visibility resume, JSON backup | Pendiente |

## Convenciones (durante el refactor)

1. **Helpers puros** (sin React) en `app/sistema/lib/` con tests unitarios.
2. **Datos estáticos** en `app/sistema/data/`.
3. **Componentes** agrupados por dominio en `app/sistema/components/<dominio>/`.
4. **Hooks reutilizables** en `app/sistema/hooks/`.
5. **Imports relativos cortos** dentro de `app/sistema/`. Imports cross-domain pasan por barrels (`index.js`) cuando ayuda a la legibilidad.
6. **No nuevas dependencias** durante la fase 1. Mejoras posteriores van a fase 2 (ver `REFACTOR_NOTES.md`).
7. **No cambios de lógica** en commits de extracción. Cualquier mejora detectada se anota en `REFACTOR_NOTES.md`.

## Próximos pasos

Ver `REFACTOR_PLAN.md` para el roadmap detallado.
